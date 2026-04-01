/**
 * Script para limpiar Firestore - Elimina todos los datos excepto los de mjsdiegoverde@gmail.com
 * Ejecutar: node scripts/clean-firestore.js
 * Requiere: Firebase Admin SDK configurado
 */

const admin = require('firebase-admin');

// Inicializar con service account
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TARGET_EMAIL = 'mjsdiegoverde@gmail.com';
const COLLECTIONS = [
  'users',
  'goals',
  'transactions',
  'study_sessions',
  'reminders',
  'achievements',
  'xp_states',
  'notifications',
  'user_course_progress',
  'community_members',
];

async function cleanFirestore() {
  console.log(`🔍 Buscando UID para ${TARGET_EMAIL}...`);
  
  // Buscar el UID del usuario objetivo
  const usersSnapshot = await db.collection('users').get();
  let targetUid = null;
  
  for (const doc of usersSnapshot.docs) {
    if (doc.data().email === TARGET_EMAIL) {
      targetUid = doc.id;
      break;
    }
  }
  
  if (!targetUid) {
    console.error('❌ No se encontró el usuario objetivo. Asegúrate de que haya iniciado sesión al menos una vez.');
    process.exit(1);
  }
  
  console.log(`✅ UID encontrado: ${targetUid}`);
  console.log('🧹 Iniciando limpieza...\n');
  
  let totalDeleted = 0;
  
  for (const collectionName of COLLECTIONS) {
    console.log(`📁 Procesando colección: ${collectionName}`);
    
    const snapshot = await db.collection(collectionName).get();
    let deletedCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docUid = data.userId || data.uid;
      
      // Mantener solo los datos del usuario objetivo
      if (docUid !== targetUid) {
        await doc.ref.delete();
        deletedCount++;
      }
    }
    
    console.log(`   ✅ Eliminados ${deletedCount} documentos`);
    totalDeleted += deletedCount;
  }
  
  console.log(`\n🎉 Limpieza completada. Total eliminados: ${totalDeleted}`);
  console.log(`📊 Los datos de ${TARGET_EMAIL} (UID: ${targetUid}) han sido preservados.`);
}

cleanFirestore().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
