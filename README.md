# @bytecrate/react-editor

A lightweight, robust, and feature-rich React email template editor. Built with native `contentEditable` APIs for maximum compatibility and minimal bundle size.

## Features

*   **Rich Text Formatting**: Bold, Italic, Underline, Strikethrough, Heading levels.
*   **Typography Control**: Font Family selection and precise Font Size (px) control.
*   **Styling**: Text color picker with presets and custom color support.
*   **Layout**: Advanced padding controls for individual sides (Top, Right, Bottom, Left) on specific blocks.
*   **Structure**: Ordered and Unordered lists, Blockquotes.
*   **Media & Links**: Image insertion via URL, File Upload (Base64 default, custom async upload supported), and Hyperlink management.
*   **Templating**: Built-in Variable/Merge Tag insertion support (e.g., `{{firstName}}`).
*   **History**: Undo/Redo functionality.
*   **Zero Styles Configuration**: Works out of the box with internal styling, but accepts external classes.

## Installation

```bash
npm install @bytecrate/react-editor
# or
yarn add @bytecrate/react-editor
```

## Usage

### Uncontrolled (seed once with `initialValue`)

```tsx
import React, { useState } from 'react';
import { EmailEditor } from '@bytecrate/react-editor';

const MyEmailApp = () => {
  const [htmlContent, setHtmlContent] = useState('');

  return (
    <div className="p-10">
      <EmailEditor 
        initialValue="<p>Hello there,</p>"
        onChange={(html) => setHtmlContent(html)}
        placeholder="Start crafting your email..."
        style={{ minHeight: '400px' }}
      />
      
      <div className="mt-4">
        <h3>Output:</h3>
        <pre>{htmlContent}</pre>
      </div>
    </div>
  );
};

export default MyEmailApp;
```

### Controlled (`value` + `onChange`)

Use `value` when the parent owns the HTML (template switchers, forms, load-from-API). The editor DOM updates when `value` changes and differs from the current content. Prefer not to rewrite `value` on every keystroke with transformed HTML that differs only in formatting — that can move the caret.

```tsx
const [html, setHtml] = useState('<p>Hello</p>');

<EmailEditor value={html} onChange={setHtml} />

// Reset without remounting:
// setHtml(SAMPLE_HTML);
```

If both `value` and `initialValue` are passed, **`value` wins** after mount.

### Imperative ref API

```tsx
import React, { useRef } from 'react';
import { EmailEditor, type EmailEditorRef } from '@bytecrate/react-editor';

const editorRef = useRef<EmailEditorRef>(null);

<EmailEditor ref={editorRef} onChange={setHtml} />

// editorRef.current?.focus()
// editorRef.current?.getHTML()
// editorRef.current?.setHTML('<p>Hi</p>')  // also calls onChange
// editorRef.current?.clear()
// editorRef.current?.getContentElement()
```

## Image Upload Handling

By default, images selected from the device are converted to Base64 strings. To upload images to a server (e.g., AWS S3, Cloudinary) and use the resulting URL, provide the `onImageUpload` prop.

```tsx
<EmailEditor 
  onImageUpload={async (file) => {
    // Example: Upload file to your server
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    return data.url; // Return the hosted image URL
  }} 
/>
```

## Custom Variables

You can pass a custom list of variables (merge tags) that appear in the `{}` toolbar dropdown.

```tsx
const myVariables = [
  { label: 'User Name', value: '{{user.name}}' },
  { label: 'Order ID', value: '{{order.id}}' },
  { label: 'Unsubscribe', value: '{{unsubscribe_url}}' }
];

<EmailEditor 
  variables={myVariables} 
  onChange={handleChange} 
/>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialValue` | `string` | `""` | Uncontrolled seed HTML applied on mount only. |
| `value` | `string` | `-` | Controlled HTML. When set, DOM syncs when the string changes. |
| `onChange` | `(html: string) => void` | `-` | Callback fired whenever content changes (including `ref.setHTML` / `clear`). |
| `variables` | `Array<{ label: string, value: string }>` | `DEFAULT_VARIABLES` | Array of variables for the insert dropdown. |
| `placeholder` | `string` | `"Start writing..."` | Placeholder text shown when empty. |
| `defaultPadding` | `string` | `"24px"` | Default padding applied to the main container. |
| `onImageUpload` | `(file: File) => Promise<string>` | `-` | Callback to handle custom image uploads (overrides Base64). |
| `style` | `React.CSSProperties` | `-` | Inline styles for the outer editor container. |
| `className` | `string` | `""` | CSS class names for the outer editor container. |

### Ref methods (`EmailEditorRef`)

| Method | Description |
|--------|-------------|
| `focus()` | Focus the contenteditable surface. |
| `getHTML()` | Return current serialized HTML. |
| `setHTML(html)` | Replace editor HTML and notify `onChange`. |
| `clear()` | Clear content (equivalent to `setHTML("")`). |
| `getContentElement()` | Return the contenteditable `HTMLDivElement`, or `null`. |

## Development

Consumers install from npm and import `@bytecrate/react-editor` as shown above. The published package ships dual ESM/CJS builds and TypeScript types under `dist/`.

Run the in-repo playground to exercise the editor without installing it into another project (dev aliases the package to source for HMR):

```bash
npm install
npm run dev   # http://localhost:3000
```

Other local checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build   # emit dist/ (also runs via prepublishOnly before publish)
```

## Dependencies

This package relies on [lucide-react](https://lucide.dev/) for its icons, which is installed automatically as a dependency.

## License

MIT