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
*   **Keyboard shortcuts**: Mod+B/I/U for formatting, Mod+K for links, Mod+Z / Mod+Shift+Z / Mod+Y for undo/redo (disable with `enableShortcuts={false}`).
*   **Accessibility baseline**: Named toolbar controls, labeled editor surface, picker dialogs/menus, and Escape-to-close.
*   **Paste / HTML sanitization**: By default, paste and external HTML entry points strip common unsafe patterns (scripts, event handlers, dangerous URLs) while keeping email-friendly markup and merge tags.
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

## HTML sanitization and paste

By default (`sanitize={true}`), the editor sanitizes common unsafe patterns for email HTML on:

* Paste into the contenteditable surface
* Mount seed (`initialValue` / controlled `value`)
* Imperative `ref.setHTML(...)`
* Link and image URL apply (toolbar / prompt)

**Allowed URL schemes** for `href` / `src`: `http:`, `https:`, `mailto:`, `cid:`, `#` anchors, relative paths, `data:image/*`, and full merge tags such as `{{unsubscribe}}`. Dangerous schemes like `javascript:` and `data:text/html` are rejected (links/images not applied; attributes stripped from HTML).

This is **not** a claim of being XSS-proof. Hosts that load untrusted templates should still treat output carefully. For trusted admin tools only, you can disable sanitization:

```tsx
// Escape hatch — only for fully trusted content
<EmailEditor sanitize={false} initialValue={trustedHtml} />
```

Optional paste override (replaces the built-in sanitizer for **clipboard HTML only** — seed/`setHTML`/URLs still use the built-in policy when `sanitize` is true). Treat `onPasteHtml` as a full trust boundary for paste: return only safe HTML.

```tsx
<EmailEditor onPasteHtml={(html) => mySanitize(html)} />
```

## Accessibility

The toolbar uses `role="toolbar"` and icon buttons expose accessible names via `aria-label` (and `aria-pressed` for toggles). The content surface is a multiline `textbox` labeled by `ariaLabel`, falling back to `placeholder`, then `"Email content"`.

```tsx
<EmailEditor
  ariaLabel="Newsletter body"
  placeholder="Start crafting your email..."
/>
```

Picker dropdowns use `aria-expanded` / `aria-haspopup` on triggers and `role="dialog"` or `role="menu"` on panels. Press **Escape** to close an open picker and return focus to its trigger.

## Keyboard shortcuts

When focus is inside the editor surface (`enableShortcuts` defaults to `true`), the following shortcuts apply. **Mod** is ⌘ on macOS and Ctrl elsewhere.

| Shortcut | Action |
|----------|--------|
| Mod+B | Bold |
| Mod+I | Italic |
| Mod+U | Underline |
| Mod+K | Open link picker (selection is saved first) |
| Mod+Z | Undo |
| Mod+Shift+Z / Mod+Y | Redo |

Shortcuts are not handled while typing in toolbar inputs (link URL, color picker, selects). Disable with `enableShortcuts={false}` if the host app provides its own bindings.

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialValue` | `string` | `""` | Uncontrolled seed HTML applied on mount only. |
| `value` | `string` | `-` | Controlled HTML. When set, DOM syncs when the string changes. |
| `onChange` | `(html: string) => void` | `-` | Callback fired whenever content changes (including `ref.setHTML` / `clear`). |
| `variables` | `Array<{ label: string, value: string }>` | `DEFAULT_VARIABLES` | Array of variables for the insert dropdown. |
| `placeholder` | `string` | `"Start writing..."` | Placeholder text shown when empty; also used as the surface accessible name when `ariaLabel` is omitted. |
| `ariaLabel` | `string` | `-` | Accessible name for the contenteditable surface (overrides `placeholder` for a11y). |
| `enableShortcuts` | `boolean` | `true` | Handle Mod+B/I/U/K/Z (and redo) while the editor surface is focused. |
| `defaultPadding` | `string` | `"24px"` | Default padding applied to the main container. |
| `onImageUpload` | `(file: File) => Promise<string>` | `-` | Callback to handle custom image uploads (overrides Base64). |
| `sanitize` | `boolean` | `true` | Sanitize paste, external HTML, and block dangerous link/image URLs. Set `false` only for trusted admin tools. |
| `onPasteHtml` | `(html: string) => string` | `-` | Optional paste transform; when set, used instead of the built-in sanitizer for clipboard HTML. |
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