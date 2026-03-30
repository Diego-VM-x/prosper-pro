import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, '../app');

const dirsToHide = ['(web)', 'promo'];

console.log('🚀 Iniciando compilación selectiva para Android Studio...');

try {
  // 1. Ocultar carpetas web y publicidad
  dirsToHide.forEach(dir => {
    const oldPath = path.join(appDir, dir);
    const newPath = path.join(appDir, `_${dir}`);
    if (fs.existsSync(oldPath)) {
      console.log(`Ocultando: ${dir} -> _${dir}`);
      fs.renameSync(oldPath, newPath);
    }
  });

  // 2. Mover `app/app` a la raíz `app/(app)`
  const appModulePath = path.join(appDir, 'app');
  const appRootPath = path.join(appDir, '(app)');
  if (fs.existsSync(appModulePath)) {
     console.log('Elevando módulo APP a la raíz...');
     fs.renameSync(appModulePath, appRootPath);
  }

  // Limpiar caché de Next.js para evitar errores de tipos de rutas ocultas
  const nextCache = path.join(__dirname, '../.next');
  if (fs.existsSync(nextCache)) {
    console.log('Limpiando caché de Next.js...');
    fs.rmSync(nextCache, { recursive: true, force: true });
  }

  // 3. Compilar
  console.log('Compilando exportación estática de Next.js...');
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, BUILD_TARGET: 'android' } });

  console.log('✅ Exportación finalizada.');

} catch (error) {
  console.error('❌ Error durante la compilación:', error.message);
} finally {
  console.log('Restaurando estructura original...');
  // Restaurar módulo APP
  const appRootPath = path.join(appDir, '(app)');
  const appModulePath = path.join(appDir, 'app');
  if (fs.existsSync(appRootPath)) {
    fs.renameSync(appRootPath, appModulePath);
  }
  
  // Restaurar carpetas ocultas
  dirsToHide.forEach(dir => {
    const hiddenPath = path.join(appDir, `_${dir}`);
    const originalPath = path.join(appDir, dir);
    if (fs.existsSync(hiddenPath)) {
      fs.renameSync(hiddenPath, originalPath);
    }
  });
  
  // 4. Sincronizar Capacitor si existe la carpeta
  if (fs.existsSync(path.join(__dirname, '../capacitor.config.ts'))) {
     console.log('📱 Sincronizando con Android Studio (Capacitor)...');
     try {
       execSync('npx cap sync android', { stdio: 'inherit' });
       console.log('🎉 Sincronización exitosa. ¡Listo para Android Studio!');
     } catch (e) {
       console.log('⚠️ No se pudo sincronizar Capacitor. Asegúrate de haber ejecutado npx cap add android primero.');
     }
  }
}
