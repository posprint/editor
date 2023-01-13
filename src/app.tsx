import { FC, useEffect, useRef, useState } from 'react';
import { Alignment, Button, ButtonGroup, Icon, Intent, Navbar, Tab, Tabs, Tag, Toaster, Tooltip } from '@blueprintjs/core';
import Split from 'react-split';
import { hydrate } from '@posprint/template';
import Previewer from '@posprint/previewer-react';
import { buildCommand } from '@posprint/command-builder/index';
import { usePersistState } from './utils';
import Editor from './editor';
import Settings, { ISettings } from './settings'

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

const defaultSettings: ISettings = {
  encoding: 'GBK',
}

const App: FC = () => {
  const toaster = useRef<Toaster>(null);

  const [panelVisible, setPanelVisible] = usePersistState<Record<string, boolean>>('panelVisible', { template: true });
  const [template, setTemplate] = usePersistState<string>('template', '');
  const [styleString, setStyleString] = usePersistState<string>('style', '');
  const [dataString, setDataString] = usePersistState<string>('data', '');
  const [escPaperWidth, setEscPaperWidth] = usePersistState('escPaperWidth', 80);
  const [tscPaperWidth, setTscPaperWidth] = usePersistState('tscPaperWidth', [40, 60]);

  const [dom, setDom] = useState();
  const [isTsc, setIsTsc] = useState<boolean>();
  const [hydrateError, setHydrateError] = useState<HyrdateError>();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = usePersistState<ISettings>('settings', defaultSettings)

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
          const paperSize = isTsc ? tscPaperWidth : escPaperWidth
          const dom = hydrate(template, style, data, { paperSize, encoding: settings.encoding });
          setDom(dom);
          
          console.log(JSON.stringify(dom));
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
  }, [template, styleString, dataString, isTsc, escPaperWidth, tscPaperWidth, settings.encoding]);

  const print = async () => {
    if (!settings.printer) {
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
    const cmd = await buildCommand(copyDom, { type, encoding: settings.encoding, paperSize });
    const buffer = cmd.getBuffer().flush();
    window.__POS_PRINT__.print(settings.printer, buffer);
  };

  const previewerWidth = isTsc ? `${tscPaperWidth[0] * 3.8}px` : `${escPaperWidth * 3.5}px`
  const previewerHeight = isTsc ? `${tscPaperWidth[1] * 3.8}px` : undefined
  const previewerSize = { width: previewerWidth, height: previewerHeight, padding: '2px' }

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
                <Tabs className="paper-size-selector" selectedTabId={tscPaperWidth.join('x')} onChange={x => {
                  const array = (x as string).split('x') as unknown as number[]
                  setTscPaperWidth(array)
                }}>
                  <Tab id='40x60' title="40 x 60 mm" />
                  <Tab id='40x30' title="40 x 30 mm" />
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
      <Settings
        visible={showSettings}
        value={settings}
        onCancel={() => setShowSettings(false)}
        onConfirm={value => {
          setSettings(value)
          setShowSettings(false)
        }}
      />
    </>
  );
};

export default App;
