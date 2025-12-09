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
| `initialValue` | `string` | `""` | The initial HTML content of the editor. |
| `onChange` | `(html: string) => void` | `-` | Callback fired whenever content changes. |
| `variables` | `Array<{ label: string, value: string }>` | `DEFAULT_VARIABLES` | Array of variables for the insert dropdown. |
| `placeholder` | `string` | `"Start writing..."` | Placeholder text shown when empty. |
| `defaultPadding` | `string` | `"24px"` | Default padding applied to the main container. |
| `onImageUpload` | `(file: File) => Promise<string>` | `-` | Callback to handle custom image uploads (overrides Base64). |
| `style` | `React.CSSProperties` | `-` | Inline styles for the outer editor container. |
| `className` | `string` | `""` | CSS class names for the outer editor container. |

## Dependencies

This package relies on [lucide-react](https://lucide.dev/) for its icons, which is installed automatically as a dependency.

## License

MIT