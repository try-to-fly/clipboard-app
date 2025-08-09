// Monaco Editor 主题配置，匹配应用的设计系统

export const lightTheme = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: '1d4ed8' },
    { token: 'string', foreground: '059669' },
    { token: 'number', foreground: 'dc2626' },
    { token: 'delimiter', foreground: '374151' },
  ],
  colors: {
    'editor.background': '#ffffff', // --background
    'editor.foreground': '#0f172a', // --foreground
    'editor.lineHighlightBackground': '#f1f5f9', // --muted
    'editor.selectionBackground': '#dbeafe', // primary with alpha
    'editor.inactiveSelectionBackground': '#f1f5f9',
    'editorLineNumber.foreground': '#64748b', // --muted-foreground
    'editorLineNumber.activeForeground': '#0f172a',
    'editor.selectionHighlightBackground': '#e0f2fe',
    'editorIndentGuide.background': '#e2e8f0',
    'editorIndentGuide.activeBackground': '#cbd5e1',
    'editorWhitespace.foreground': '#cbd5e1',
    'editorCursor.foreground': '#0ea5e9', // --primary
    'editor.findMatchBackground': '#fef3c7',
    'editor.findMatchHighlightBackground': '#fef9c3',
    'scrollbarSlider.background': '#cbd5e140',
    'scrollbarSlider.hoverBackground': '#94a3b860',
    'scrollbarSlider.activeBackground': '#64748b80',
  },
};

export const darkTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
    { token: 'keyword', foreground: '60a5fa' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'f87171' },
    { token: 'delimiter', foreground: 'd1d5db' },
  ],
  colors: {
    'editor.background': '#0f172a', // --background (dark)
    'editor.foreground': '#f1f5f9', // --foreground (dark)
    'editor.lineHighlightBackground': '#1e293b', // --muted (dark)
    'editor.selectionBackground': '#1e40af80', // primary with alpha
    'editor.inactiveSelectionBackground': '#1e293b',
    'editorLineNumber.foreground': '#64748b', // --muted-foreground (dark)
    'editorLineNumber.activeForeground': '#f1f5f9',
    'editor.selectionHighlightBackground': '#1e40af40',
    'editorIndentGuide.background': '#334155',
    'editorIndentGuide.activeBackground': '#475569',
    'editorWhitespace.foreground': '#475569',
    'editorCursor.foreground': '#0ea5e9', // --primary
    'editor.findMatchBackground': '#92400e80',
    'editor.findMatchHighlightBackground': '#a16207a0',
    'scrollbarSlider.background': '#47556940',
    'scrollbarSlider.hoverBackground': '#64748b60',
    'scrollbarSlider.activeBackground': '#94a3b880',
  },
};

// 定义Monaco主题
export const defineMonacoThemes = (monaco: any) => {
  monaco.editor.defineTheme('clipboard-light', lightTheme);
  monaco.editor.defineTheme('clipboard-dark', darkTheme);
};
