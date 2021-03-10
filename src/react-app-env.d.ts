/// <reference types="react-scripts" />

declare module 'react-split';
declare module '@posprint/template';
declare module '@posprint/previewer-react';
declare module '@posprint/command-builder/index';

interface Window {
  __POS_PRINT__: any;
}
