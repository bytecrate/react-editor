import React, { useCallback, useState } from 'react';
import { EmailEditor, ToolbarConfig, Variable } from '@bytecrate/react-editor';

const SAMPLE_HTML = `
  <h1>Welcome, {{user.name}}!</h1>
  <p>Thanks for trying the <strong>@bytecrate/react-editor</strong> playground.</p>
  <p>Edit this content, try formatting, variables, images, and watch the live HTML output below.</p>
`.trim();

const DEMO_VARIABLES: Variable[] = [
  { label: 'User Name', value: '{{user.name}}' },
  { label: 'Order ID', value: '{{order.id}}' },
  { label: 'Company', value: '{{company}}' },
  { label: 'Unsubscribe', value: '{{unsubscribe_url}}' },
];

const FULL_TOOLBAR: ToolbarConfig = [
  ['undo', 'redo'],
  ['fontFamily'],
  ['fontSize'],
  ['padding'],
  ['color'],
  ['variables'],
  ['h1', 'h2', 'p'],
  ['bold', 'italic', 'underline', 'strikeThrough'],
  ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'],
  ['unorderedList', 'orderedList'],
  ['link', 'image', 'blockquote', 'removeFormat'],
];

const COMPACT_TOOLBAR: ToolbarConfig = [
  ['undo', 'redo'],
  ['bold', 'italic', 'underline'],
  ['variables'],
  ['link', 'image'],
];

const pageStyles: React.CSSProperties = {
  minHeight: '100vh',
  margin: 0,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: '#f4f4f5',
  color: '#18181b',
};

const shellStyles: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '32px 20px 64px',
};

const cardStyles: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e4e4e7',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  overflow: 'hidden',
};

const panelStyles: React.CSSProperties = {
  marginTop: 24,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e4e4e7',
  padding: 16,
};

const preStyles: React.CSSProperties = {
  margin: 0,
  padding: 12,
  background: '#18181b',
  color: '#e4e4e7',
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
  overflow: 'auto',
  maxHeight: 280,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const previewStyles: React.CSSProperties = {
  border: '1px solid #e4e4e7',
  borderRadius: 8,
  padding: 16,
  minHeight: 80,
  background: '#fafafa',
};

const buttonStyles: React.CSSProperties = {
  border: '1px solid #d4d4d8',
  background: '#fff',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 13,
  cursor: 'pointer',
};

const activeButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  background: '#18181b',
  color: '#fff',
  borderColor: '#18181b',
};

async function mockImageUpload(file: File): Promise<string> {
  // Simulate a short network delay, then return an object URL (no backend).
  await new Promise((resolve) => setTimeout(resolve, 300));
  return URL.createObjectURL(file);
}

export function App() {
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [compactToolbar, setCompactToolbar] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleChange = useCallback((next: string) => {
    setHtml(next);
  }, []);

  const handleReset = () => {
    setHtml(SAMPLE_HTML);
    setEditorKey((k) => k + 1);
  };

  return (
    <div style={pageStyles}>
      <div style={shellStyles}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
            @bytecrate/react-editor
          </h1>
          <p style={{ margin: 0, color: '#52525b', fontSize: 15 }}>
            Local playground — edit content, try toolbar features, and inspect
            live HTML output. No external app required.
          </p>
        </header>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={!compactToolbar ? activeButtonStyles : buttonStyles}
            onClick={() => setCompactToolbar(false)}
          >
            Full toolbar
          </button>
          <button
            type="button"
            style={compactToolbar ? activeButtonStyles : buttonStyles}
            onClick={() => setCompactToolbar(true)}
          >
            Compact toolbar
          </button>
          <button type="button" style={buttonStyles} onClick={handleReset}>
            Reset content
          </button>
        </div>

        <div style={cardStyles}>
          <EmailEditor
            key={`${editorKey}-${compactToolbar ? 'compact' : 'full'}`}
            initialValue={SAMPLE_HTML}
            onChange={handleChange}
            variables={DEMO_VARIABLES}
            onImageUpload={mockImageUpload}
            toolbarConfig={compactToolbar ? COMPACT_TOOLBAR : FULL_TOOLBAR}
            placeholder="Start crafting your email..."
            style={{ minHeight: 360, border: 'none', borderRadius: 12 }}
          />
        </div>

        <section style={panelStyles}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Live preview</h2>
          <div
            style={previewStyles}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>

        <section style={panelStyles}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>HTML output</h2>
          <pre style={preStyles}>{html || '(empty)'}</pre>
        </section>
      </div>
    </div>
  );
}
