const electron = require('electron');
console.log('Electron loaded:', typeof electron);
console.log('electron.app exists:', typeof electron.app);
console.log('electron keys:', Object.keys(electron).slice(0, 10));

if (electron.app) {
  console.log('SUCCESS: electron.app is available');
  electron.app.whenReady().then(() => {
    console.log('App is ready!');
    electron.app.quit();
  });
} else {
  console.error('FAILED: electron.app is undefined');
  process.exit(1);
}
