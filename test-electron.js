console.log('=== ELECTRON TEST ===');
const electron = require('electron');
console.log('electron type:', typeof electron);
console.log('electron.app type:', typeof electron.app);
console.log('electron.app:', electron.app);

if (electron.app) {
  console.log('SUCCESS: electron.app is available!');
  electron.app.quit();
} else {
  console.log('FAIL: electron.app is undefined');
  process.exit(1);
}
