const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const apiDir = path.join(root, 'app', 'api');
const backupDir = path.join(root, 'app', '_api');
const webConfig = path.join(root, 'next.config.ts');
const mobileConfig = path.join(root, 'next.config.mobile.ts');
const webConfigBackup = path.join(root, 'next.config.web.ts');

function moveApiFolder() {
  if (fs.existsSync(apiDir)) {
    console.log('[mobile-build] Moving app/api to app/_api for static export...');
    fs.renameSync(apiDir, backupDir);
  }
}

function restoreApiFolder() {
  if (fs.existsSync(backupDir)) {
    console.log('[mobile-build] Restoring app/api...');
    fs.renameSync(backupDir, apiDir);
  }
}

function swapToMobileConfig() {
  if (fs.existsSync(mobileConfig)) {
    console.log('[mobile-build] Swapping to next.config.mobile.ts...');
    fs.renameSync(webConfig, webConfigBackup);
    fs.renameSync(mobileConfig, webConfig);
  }
}

function restoreWebConfig() {
  if (fs.existsSync(webConfigBackup)) {
    console.log('[mobile-build] Restoring next.config.ts...');
    fs.renameSync(webConfig, mobileConfig);
    fs.renameSync(webConfigBackup, webConfig);
  }
}

function run(cmd) {
  console.log(`[mobile-build] Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

try {
  moveApiFolder();
  swapToMobileConfig();
  run('npm run build');
} catch (err) {
  console.error('[mobile-build] Build failed:', err.message);
  process.exitCode = 1;
} finally {
  restoreWebConfig();
  restoreApiFolder();
}
