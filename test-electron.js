// Simple test to see if electron module loads correctly
const electron = require('electron');

console.log('Type of electron:', typeof electron);
console.log('Has app?:', typeof electron.app);

if (typeof electron.app !== 'undefined') {
  console.log('SUCCESS: Electron module loaded correctly!');
  electron.app.whenReady().then(() => {
    console.log('Electron app is ready!');
    electron.app.quit();
  });
} else {
  console.log('FAIL: Electron module did not load correctly');
  console.log('Electron value:', electron);
}
