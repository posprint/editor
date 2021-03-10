type TPrinterType = 'LAN' | 'USB' | 'BLE'
type TEncoding = 'GBK' | 'BIG5' | 'CP850' | 'CP437'

type TPrinter = {
  type: 'LAN';
  ip: string;
  port?: number;
} | {
  type: 'USB';
  vid?: string;
  pid?: string;
} | {
  type: 'BLE';
}
