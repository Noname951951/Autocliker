const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'), // volitelné
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);

