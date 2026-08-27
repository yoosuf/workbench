import React, { useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';

interface SqlMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  schemaTables?: { name: string; schema: string }[];
}

export const SqlMonacoEditor: React.FC<SqlMonacoEditorProps> = ({
  value,
  onChange,
  onExecute,
  schemaTables = [],
}) => {
  const monacoRef = useRef<Monaco | null>(null);
  const { resolvedTheme } = useTheme();

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;

    // Register Cmd+Enter / Ctrl+Enter shortcut for execution
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute();
    });

    // Provide SQL Autocomplete suggestions
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const keywords = [
          'SELECT',
          'FROM',
          'WHERE',
          'JOIN',
          'LEFT JOIN',
          'RIGHT JOIN',
          'INNER JOIN',
          'ON',
          'GROUP BY',
          'ORDER BY',
          'HAVING',
          'LIMIT',
          'OFFSET',
          'INSERT INTO',
          'VALUES',
          'UPDATE',
          'SET',
          'DELETE FROM',
          'CREATE TABLE',
          'ALTER TABLE',
          'DROP TABLE',
          'AS',
          'DISTINCT',
          'COUNT',
          'SUM',
          'AVG',
          'MIN',
          'MAX',
        ];

        const keywordSuggestions = keywords.map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        }));

        const tableSuggestions = schemaTables.map((t) => ({
          label: t.name,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.name,
          detail: `Table (${t.schema})`,
          range,
        }));

        return {
          suggestions: [...tableSuggestions, ...keywordSuggestions],
        };
      },
    });
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
};
