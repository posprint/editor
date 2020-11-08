import React, { FC, useEffect, useRef } from 'react';
import { Colors, Label } from '@blueprintjs/core';
import MonacoEditor from '@monaco-editor/react';
import { withResizeDetector } from 'react-resize-detector';
import 'fontsource-jetbrains-mono';

interface IProps {
  width: number;
  height: number;
  title: string;
  lang: string;
  text?: string;
  onChange(text: string): void;
}

const Editor: FC<IProps> = ({ width, height, title, lang, text, onChange }) => {
  const monacoEditor = useRef<any>();

  const editorDidMount = (_: any, editor: any) => {
    monacoEditor.current = editor;
    editor.getModel().updateOptions({ tabSize: 2 });
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      onChange(content);
    });
  };

  useEffect(() => {
    monacoEditor.current &&  monacoEditor.current.layout();
  }, [width, height]);

  return (
    <div className="editor">
      <Label style={{ color: Colors.BLUE5 }}>{title}</Label>
      <MonacoEditor
        options={{
          fontFamily: '"JetBrains Mono", monospace',
          fontLigatures: true,
          fontSize: 12,
          lineNumbers: 'off',
          minimap: { enabled: false },
        }}
        language={lang}
        value={text}
        editorDidMount={editorDidMount}
      />
    </div>
  );
};

export default withResizeDetector(Editor);
