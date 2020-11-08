import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import * as windowState from 'electron-window-state';
import { Socket } from 'net';

let win: BrowserWindow | null = null;

function createWindow() {
  const mainWindowState = windowState({
    defaultWidth: 1000,
    defaultHeight: 800,
  });

  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'runtime.js'),
    },
  });

  mainWindowState.manage(win);

  if (isDev) {
    win.loadURL('http://localhost:9009/index.html');
  } else {
    // 'build/index.html'
    win.loadURL(`file://${__dirname}/../index.html`);
  }

  win.on('closed', () => (win = null));

  // Hot Reloading
  if (isDev) {
    // 'node_modules/.bin/electronPath'
    require('electron-reload')(__dirname, {
      electron: path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '.bin',
        'electron',
      ),
      forceHardReset: true,
      hardResetMethod: 'exit',
    });

    // DevTools
    installExtension(REACT_DEVELOPER_TOOLS)
      .then(name => console.log(`Added Extension:  ${name}`))
      .catch(err => console.log('An error occurred: ', err));

    win.webContents.openDevTools({ mode: 'bottom' });
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

ipcMain.handle('print', async (_, printer: IPrinter, buffer: Buffer) => {
  console.log(printer, buffer);
  const { ip, port } = printer;
  const socket = new Socket();
  socket.on('connect', () => console.log('connect'));
  socket.on('error', () => console.log('error'));
  socket.on('timeout', () => console.log('timeout'));
  socket.on('close', () => console.log('close'));
  const client = socket.connect({ host: ip, port: port || 9100 }, () => {
    client.write(buffer, () => {
      client.end(() => {
        socket.end();
      });
    });
  });
});

ipcMain.handle('openDevTools', () => {
  win && win.webContents.openDevTools();
});
