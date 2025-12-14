console.log('__filename:', __filename);
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('process.argv:', process.argv);

const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Electron value:', typeof electron === 'string' ? electron.substring(0, 100) : electron);

const { app, BrowserWindow } = electron;

console.log('Type of app:', typeof app);

if (app) {
  app.whenReady().then(() => {
    console.log('SUCCESS! Electron app loaded correctly!');
    app.quit();
  });
} else {
  console.log('FAIL! app is undefined');
  process.exit(1);
}
