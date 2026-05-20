/**
 * Script para borrar datos de usuarios.
 * 
 * MODOS:
 * 1. Por nombre: node scripts/wipe-users-by-name.js --name "Diego"
 * 2. Por saldo alto: node scripts/wipe-users-by-name.js --high-balance 1000000
 * 3. Por UID: node scripts/wipe-users-by-name.js --uid "abc123..."
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ No se encontró service-account.json');
  console.error('Descárgalo desde Firebase Console → Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const COLLECTIONS_TO_WIPE = [
  'transactions',
  'accounts',
  'goals',
  'plans',
  'reminders',
  'notifications',
  'expense_requests',
  'recurring_payments',
  'feedback',
  'user_course_progress',
];

async function wipeUser(uid, displayName, email) {
  console.log(`\n🗑️  Eliminando datos de ${displayName || 'N/A'} (${uid})...`);
  let totalDeleted = 0;

  for (const colName of COLLECTIONS_TO_WIPE) {
    try {
      const snapshot = await db.collection(colName).where('ownerId', '==', uid).get();
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   ✓ ${colName}: ${snapshot.size} docs eliminados`);
        totalDeleted += snapshot.size;
      }
    } catch (err) {
      console.error(`   ✗ Error en ${colName}:`, err.message);
    }
  }

  try {
    const receivedSnap = await db.collection('expense_requests').where('toOwnerId', '==', uid).get();
    if (!receivedSnap.empty) {
      const batch = db.batch();
      receivedSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`   ✓ expense_requests (received): ${receivedSnap.size} docs eliminados`);
      totalDeleted += receivedSnap.size;
    }
  } catch (err) {
    console.error(`   ✗ Error en expense_requests (received):`, err.message);
  }

  try {
    await db.collection('users').doc(uid).delete();
    console.log(`   ✓ users (profile): eliminado`);
    totalDeleted += 1;
  } catch (err) {
    console.error(`   ✗ Error en users:`, err.message);
  }

  try {
    await admin.auth().deleteUser(uid);
    console.log(`   ✓ auth user: eliminado`);
  } catch (err) {
    console.error(`   ✗ Error en auth:`, err.message);
  }

  console.log(`   📊 Total eliminado: ${totalDeleted} documentos`);
}

async function findUsersByName(targetName) {
  const targetLower = targetName.toLowerCase();
  console.log(`🔍 Buscando usuarios con nombre que contenga: "${targetName}"`);

  const usersSnap = await db.collection('users').get();
  const matchingUsers = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const displayName = (data.displayName || '').toLowerCase();
    const email = (data.email || '').toLowerCase();

    if (displayName.includes(targetLower) || email.includes(targetLower)) {
      matchingUsers.push({ uid: doc.id, ...data });
    }
  });

  if (matchingUsers.length === 0) {
    console.log('✅ No se encontraron usuarios con ese nombre.');
    return [];
  }

  console.log(`\n📋 ${matchingUsers.length} usuario(s) encontrado(s):`);
  matchingUsers.forEach((u) => {
    console.log(`   - UID: ${u.uid} | Nombre: ${u.displayName} | Email: ${u.email}`);
  });

  return matchingUsers;
}

async function findUsersByHighBalance(threshold) {
  console.log(`🔍 Buscando usuarios con más de ${threshold.toLocaleString()} Bs en transacciones...`);

  const usersSnap = await db.collection('users').get();
  const results = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();

    let totalIncome = 0;
    let totalExpense = 0;
    let totalSaving = 0;
    let txCount = 0;

    try {
      const txSnap = await db.collection('transactions').where('ownerId', '==', uid).get();
      txSnap.forEach((txDoc) => {
        const tx = txDoc.data();
        const amount = tx.amount || 0;
        txCount++;
        if (tx.type === 'income') totalIncome += amount;
        else if (tx.type === 'expense') totalExpense += amount;
        else if (tx.type === 'saving') totalSaving += amount;
      });
    } catch (err) {
      console.error(`   ✗ Error leyendo transacciones de ${uid}:`, err.message);
    }

    const totalMoved = totalIncome + totalExpense + totalSaving;

    if (totalMoved > threshold) {
      results.push({
        uid,
        displayName: data.displayName || 'N/A',
        email: data.email || 'N/A',
        totalIncome,
        totalExpense,
        totalSaving,
        totalMoved,
        txCount,
      });
    }
  }

  if (results.length === 0) {
    console.log('✅ No se encontraron usuarios con ese saldo.');
    return [];
  }

  console.log(`\n📋 ${results.length} usuario(s) con alto volumen de transacciones:`);
  results.forEach((u) => {
    console.log(`   - UID: ${u.uid}`);
    console.log(`     Nombre: ${u.displayName} | Email: ${u.email}`);
    console.log(`     Transacciones: ${u.txCount}`);
    console.log(`     Ingresos: ${u.totalIncome.toLocaleString()} Bs`);
    console.log(`     Gastos: ${u.totalExpense.toLocaleString()} Bs`);
    console.log(`     Ahorro: ${u.totalSaving.toLocaleString()} Bs`);
    console.log(`     TOTAL MOVIDO: ${u.totalMoved.toLocaleString()} Bs`);
    console.log('');
  });

  return results;
}

async function wipeByUid(uid) {
  console.log(`🔍 Buscando usuario con UID: ${uid}`);
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log('❌ Usuario no encontrado en Firestore.');
      // Intentar en Auth
      try {
        const authUser = await admin.auth().getUser(uid);
        console.log(`   UID existe en Auth: ${authUser.email}`);
        await wipeUser(uid, authUser.displayName, authUser.email);
        return;
      } catch {
        console.log('❌ UID no existe en Auth ni Firestore.');
        return;
      }
    }
    const data = userDoc.data();
    await wipeUser(uid, data.displayName, data.email);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Parsear argumentos
const args = process.argv.slice(2);
const mode = args[0];
const value = args[1];

if (!mode || !value) {
  console.log('Uso:');
  console.log('  node scripts/wipe-users-by-name.js --name "Diego"');
  console.log('  node scripts/wipe-users-by-name.js --high-balance 1000000');
  console.log('  node scripts/wipe-users-by-name.js --uid "abc123..."');
  process.exit(1);
}

async function main() {
  let targetUsers = [];

  if (mode === '--name') {
    targetUsers = await findUsersByName(value);
  } else if (mode === '--high-balance') {
    targetUsers = await findUsersByHighBalance(Number(value));
  } else if (mode === '--uid') {
    await wipeByUid(value);
    return;
  } else {
    console.error('Modo no válido. Usa --name, --high-balance, o --uid');
    process.exit(1);
  }

  if (targetUsers.length === 0) return;

  console.log('\n⚠️  Esto eliminará TODOS los datos de estos usuarios.');
  console.log('Presiona Ctrl+C ahora para cancelar, o espera 5 segundos para continuar...');
  await new Promise((r) => setTimeout(r, 5000));

  for (const user of targetUsers) {
    await wipeUser(user.uid, user.displayName, user.email);
  }

  console.log('\n✅ Borrado completado.');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
