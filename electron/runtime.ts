import * as path from 'path';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('__POS_PRINT__', {
  get version() {
    const { version } = require(path.join(__dirname, '..', '..', 'package.json'));
    return version
  },
  print(printer: TPrinter, buffer: Buffer) {
    return ipcRenderer.invoke('print', printer, buffer);
  },
  openDevTools() {
    return ipcRenderer.invoke('openDevTools');
  }
});
