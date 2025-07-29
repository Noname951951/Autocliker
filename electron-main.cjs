const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Funkce pro vytvoření hlavního okna
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Volitelný preload skript
      nodeIntegration: false, // Důležité pro bezpečnost
      contextIsolation: true, // Důležité pro bezpečnost
    },
  });

  // Načtení index.html
  // V produkčním režimu načítáme ze složky 'dist'
  // Ve vývojovém režimu načítáme z Vite dev serveru
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173' // Předpokládaný port Vite dev serveru
    : url.format({
        pathname: path.join(__dirname, 'dist', 'client', 'index.html'), // Cesta k sestavenému HTML
        protocol: 'file:',
        slashes: true,
      });

  mainWindow.loadURL(startUrl);

  // Otevře DevTools, pokud jste ve vývojovém režimu
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Když je Electron připraven, vytvoří okno
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // Na macOS je běžné znovu vytvořit okno v aplikaci, když ikona docku
    // je kliknuta a nejsou otevřená žádná další okna.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Ukončí aplikaci, když jsou všechna okna zavřena, kromě macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Zde byste přidali logiku pro key presser
// Příklad: Posílání zpráv z renderovacího procesu do hlavního procesu
ipcMain.on('perform-keypress', (event, key) => {
  console.log(`Key press requested: ${key}`);
  // Zde byste použili modul pro simulaci stisku klávesy
  // Např. 'robotjs' nebo 'iohook' (vyžadují instalaci a správnou konfiguraci)
  // Upozornění: Simulace klávesových stisků je složitá a závisí na OS.
  // Vyžaduje instalaci specifických nativních modulů.
  // Příklad (pouze pro ilustraci, vyžaduje robotjs):
  // const robot = require('robotjs');
  // robot.keyTap(key);
});
