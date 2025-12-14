const { app, BrowserWindow } = require('electron');

console.log('Type of app:', typeof app);

if (app) {
  app.whenReady().then(() => {
    console.log('SUCCESS! Electron app is ready!');
    app.quit();
  });
} else {
  console.log('FAIL! app is undefined');
}
