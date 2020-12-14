type TPrinter = {
  type: 'LAN';
  ip: string;
  port?: number;
} | {
  type: 'USB';
  vid?: string;
  pid?: string;
}