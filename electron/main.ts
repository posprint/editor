import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import * as windowState from 'electron-window-state';
import { Socket } from 'net';
import * as Usb from 'usb';

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

const writeLan = (ip: string, port: number, buffer: Buffer) => {
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
};

const writeUsb = (buffer: Buffer) => {
  const devices = Usb.getDeviceList();
  let interfaceNumber: number | undefined;
  const device = devices.find(x =>
    x.configDescriptor.interfaces.some(
      y => y.some(z => {
        if (z.bInterfaceClass === Usb.LIBUSB_CLASS_PRINTER) {
          interfaceNumber = z.bInterfaceNumber;
          return true;
        } else {
          return false;
        }
      }),
    ),
  );
  if (!device || interfaceNumber == null) {
    throw new Error('No usb printer found.');
  }
  device.open();
  const iface = device.interface(interfaceNumber);
  iface.claim();
  const outEndpoint = iface.endpoints.find(x => x.direction === 'out') as Usb.OutEndpoint;
  outEndpoint.transferType = Usb.LIBUSB_TRANSFER_TYPE_BULK;
  outEndpoint.transfer(buffer, (err) => {
    console.error(err);
  });
};

ipcMain.handle('print', async (_, printer: TPrinter, buffer: Buffer) => {
  console.log(printer, buffer);
  if (printer.type === 'LAN') {
    const { ip, port } = printer;
    writeLan(ip, port || 9100, buffer);
  } else if (printer.type === 'USB') {
    writeUsb(buffer);
  }
});

ipcMain.handle('openDevTools', () => {
  win && win.webContents.openDevTools();
});
