import React, { FC, Fragment, useEffect, useRef, useState } from 'react';
import { Alignment, Button, ButtonGroup, Classes, Dialog, FormGroup, Icon, InputGroup, Intent, MenuItem, Navbar, Tab, Tabs, Tag, Toaster, Tooltip } from '@blueprintjs/core';
import { Select } from "@blueprintjs/select";
import Split from 'react-split';
import ipRegex from 'ip-regex';
import { hydrate } from '@posprint/template';
import Previewer from '@posprint/previewer-react';
import { buildCommand } from '@posprint/command-builder/index';
import { usePersistState } from './utils';
import Editor from './editor';

class HyrdateError extends Error {
  private _error: Error
  private _type: 'TEMPLATE' | 'STYLE' | 'DATA'
  get type() { return this._type }

  constructor(type: 'TEMPLATE' | 'STYLE' | 'DATA', error: Error) {
    super(error.message)
    this._error = error
    this._type = type
  }
}

const App: FC = () => {
  const toaster = useRef<Toaster>(null);

  const [panelVisible, setPanelVisible] = usePersistState<Record<string, boolean>>('panelVisible', { template: true });
  const [template, setTemplate] = usePersistState<string>('template', '');
  const [styleString, setStyleString] = usePersistState<string>('style', '');
  const [dataString, setDataString] = usePersistState<string>('data', '');
  const [escPaperWidth, setEscPaperWidth] = usePersistState('escPaperWidth', 80);
  const [tscPaperWidth, setTscPaperWidth] = usePersistState('tscPaperWidth', [40, 30]);
  const [printerType, setPrinterType] = usePersistState<string>('printerType', 'LAN');
  const [printerAddress, setPrinterAddress] = usePersistState<string>('printerAddress', '');
  const [encoding, setEncoding] = usePersistState<string>('encoding', 'GBK');

  const [dom, setDom] = useState();
  const [isTsc, setIsTsc] = useState<boolean>();
  const [hydrateError, setHydrateError] = useState<HyrdateError>();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [printerAddressInvalid, setPrinterAddressInvalid] = useState<boolean>(false);
  const [printer, setPrinter] = useState<TPrinter>();

  const togglePanel = (key: string) => {
    const newValue = {
      ...panelVisible,
      [key]: !panelVisible[key]
    }
    if (!editorPanels.some(x => newValue[x.key])) {
      newValue.template = true
    }
    setPanelVisible(newValue)
  };

  const showConsole = () => {
    window.__POS_PRINT__.openDevTools();
  };

  // Try to hydrate when code changed.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!template) return;

        let style: any, data: any;
        try {
          style = JSON.parse(styleString || '{}');
        } catch (e) {
          throw new HyrdateError('STYLE', e)
        }
        try {
          data = JSON.parse(dataString || '{}');
        } catch (e) {
          throw new HyrdateError('DATA', e)
        }

        try {
          const dom = hydrate(template, style, data, {});
          setDom(dom);
          console.debug(JSON.stringify(dom));
          if (dom && dom.attributes && dom.attributes.isa && dom.attributes.isa.toLowerCase() === 'tsc') {
            setIsTsc(true);
          } else {
            setIsTsc(false);
          }
        } catch (e) {
          throw new HyrdateError('TEMPLATE', e)
        }
        setHydrateError(undefined)
      } catch (e) {
        setHydrateError(e)
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [template, styleString, dataString]);

  const print = async () => {
    if (!printer) {
      toaster.current && toaster.current.show({
        icon: 'cog',
        intent: Intent.WARNING,
        message: 'Configure a printer to start.'
      });
      setShowSettings(true);
      return;
    }
    const copyDom = JSON.parse(JSON.stringify(dom));
    const type = isTsc ? 'tsc' : 'esc'
    const paperSize = isTsc ? tscPaperWidth : [escPaperWidth]
    const cmd = await buildCommand(copyDom, { type, encoding, paperSize });
    const buffer = cmd.getBuffer().flush();
    window.__POS_PRINT__.print(printer, buffer);
  };

  const getPrinter = (): TPrinter | undefined => {
    if (printerType === 'USB') {
      return { type: 'USB' }
    } else if (printerType === 'LAN') {
      const [ip, portString] = printerAddress.split(':');
      if (!ipRegex({ exact: true }).test(ip)) {
        return;
      }
      if (typeof portString !== 'undefined') {
        const port = Number(portString);
        if (Number.isNaN(port) || port > 65535 || port < 1) {
          return;
        }
        return { type: 'LAN', ip, port };
      } else {
        return { type: 'LAN', ip };
      }
    }
  }

  const saveSettings = () => {
    const printer = getPrinter();
    if (!printer) {
      setPrinterAddressInvalid(true);
    } else {
      setPrinterAddressInvalid(false);
      setPrinter(printer);
      setShowSettings(false);
    }
  };

  const closeSettings = () => {
    setPrinterAddressInvalid(false);
    setShowSettings(false);
  };

  const previewerWidth = isTsc ? `${tscPaperWidth[0] * 3.5}px` : `${escPaperWidth * 3.5}px`
  const previewerHeight = isTsc ? `${tscPaperWidth[1] * 2.75}px` : undefined
  const previewerSize = { width: previewerWidth, height: previewerHeight }

  const editorPanels = [
    { key: 'template', title: 'Template', lang: 'javascript', content: template, onContentChange: setTemplate },
    { key: 'style', title: 'Style', lang: 'json', content: styleString, onContentChange: setStyleString },
    { key: 'data', title: 'Data', lang: 'json', content: dataString, onContentChange: setDataString },
  ];

  const visiblePanels = editorPanels.filter(x => panelVisible[x.key])

  return (
    <>
      <Toaster ref={toaster} maxToasts={1} />
      <Navbar>
        <Navbar.Group align={Alignment.LEFT}>
          <ButtonGroup>
            {editorPanels.map(x => (
              <Button
                key={x.key}
                text={x.title}
                active={panelVisible[x.key]}
                onClick={() => togglePanel(x.key)}
              />
            ))}
          </ButtonGroup>
        </Navbar.Group>
        {window.__POS_PRINT__ && (
          <Navbar.Group align={Alignment.RIGHT}>
            <Tag minimal onDoubleClick={showConsole}>
              {`Version: ${window.__POS_PRINT__.version}`}
            </Tag>
            <Navbar.Divider />
            <Button minimal icon="print" text="Print" onClick={print} />
            <Navbar.Divider />
            <Button minimal icon="cog" onClick={() => setShowSettings(true)} />
          </Navbar.Group>
        )}
      </Navbar>
      <main className="main">
        <Split
          className="editor-container"
          key={visiblePanels.map(x => x.key).join()}
          gutterSize={8}
          snapOffset={0}
        >
          {visiblePanels.map(x => (
            <Editor
              key={x.key}
              title={x.title}
              lang={x.lang}
              text={x.content}
              onChange={x.onContentChange}
            />
          ))}
        </Split>
        <div className={'sidebar' + (hydrateError ? ' has-error' : '')}>
          {dom && (
            <>
              {isTsc ? (
                <Tabs className="paper-size-selector" selectedTabId={1} onChange={x => setTscPaperWidth([40, 30])}>
                  <Tab id={1} title="40 x 30 mm" />
                </Tabs>
              ) : (
                <Tabs className="paper-size-selector" selectedTabId={escPaperWidth} onChange={x => setEscPaperWidth(x as number)}>
                  <Tab id={80} title="80 mm" />
                  <Tab id={72} title="72 mm" />
                  <Tab id={58} title="58 mm" />
                </Tabs>
              )}
              <div className="preview" style={previewerSize}>
                <Previewer dom={dom} />
                {hydrateError && (
                  <Tooltip
                    className="error-tooltip"
                    position="bottom-left"
                    intent="danger"
                    content={(
                      <div>
                        <strong>{hydrateError.type} ERROR</strong>
                        <pre>{hydrateError.stack}</pre>
                      </div>
                    )}
                  >
                    <Icon intent="danger" icon="warning-sign" />
                  </Tooltip>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Dialog
        icon="cog"
        title="Settings"
        isOpen={showSettings}
        onClose={closeSettings}
      >
        <div className={Classes.DIALOG_BODY}>
          <FormGroup label="Printer" labelFor="printer-input">
            <InputGroup
              autoFocus
              id="printer-input"
              value={printerAddress}
              disabled={printerType !== 'LAN'}
              onChange={(e: any) => {
                setPrinterAddressInvalid(false);
                setPrinterAddress(e.target.value);
              }}
              intent={printerAddressInvalid ? Intent.DANGER : undefined}
              placeholder="IP Address, e.g. 192.168.1.100 or 192.168.1.100:9100"
              leftElement={(
                <Select
                  filterable={false}
                  items={['LAN', 'Bluetooth', 'USB']}
                  itemRenderer={item => (
                    <MenuItem
                      active={item === printerType}
                      key={item}
                      text={item}
                      onClick={() => setPrinterType(item)}
                    />
                  )}
                  onItemSelect={() => {}}
                >
                  <Button
                    minimal
                    rightIcon="caret-down"
                    text={printerType}
                  />
                </Select>
              )}
            />
          </FormGroup>
          <FormGroup label="Encoding">
            <Select
              filterable={false}
              items={['GBK', 'BIG5', 'CP850', 'CP437']}
              itemRenderer={item => (
                <MenuItem
                  active={item === encoding}
                  key={item}
                  text={item}
                  onClick={() => setEncoding(item)}
                />
              )}
              onItemSelect={() => {}}
            >
              <Button
                rightIcon="caret-down"
                text={encoding}
              />
            </Select>
          </FormGroup>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button intent={Intent.PRIMARY} onClick={saveSettings}>Save</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default App;
