# @bytecrate/react-editor

A lightweight, robust, and feature-rich React email template editor. Built with native `contentEditable` APIs for maximum compatibility and minimal bundle size.

## Features

*   **Rich Text Formatting**: Bold, Italic, Underline, Strikethrough, Heading levels.
*   **Typography Control**: Font Family selection and precise Font Size (px) control.
*   **Styling**: Text color picker with presets and custom color support.
*   **Layout**: Advanced padding controls for individual sides (Top, Right, Bottom, Left) on specific blocks.
*   **Structure**: Ordered and Unordered lists, Blockquotes.
*   **Media & Links**: Image insertion (via URL) and Hyperlink management.
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
| `initialValue` | `string` | `""` | The initial HTML content of the editor. |
| `onChange` | `(html: string) => void` | `-` | Callback fired whenever content changes. |
| `variables` | `Array<{ label: string, value: string }>` | `DEFAULT_VARIABLES` | Array of variables for the insert dropdown. |
| `placeholder` | `string` | `"Start writing..."` | Placeholder text shown when empty. |
| `defaultPadding` | `string` | `"24px"` | Default padding applied to the main container. |
| `style` | `React.CSSProperties` | `-` | Inline styles for the outer editor container. |
| `className` | `string` | `""` | CSS class names for the outer editor container. |

## Dependencies

This package relies on [lucide-react](https://lucide.dev/) for its icons, which is installed automatically as a dependency.

## License

MIT
