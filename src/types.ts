import React from "react";

export interface Variable {
  label: string;
  value: string;
}

/** Imperative handle exposed via ref on EmailEditor. */
export interface EmailEditorRef {
  /** Focus the contenteditable surface */
  focus: () => void;
  /** Current serialized HTML */
  getHTML: () => string;
  /**
   * Replace editor HTML. Updates the DOM and calls `onChange` when provided
   * so uncontrolled parents stay consistent.
   */
  setHTML: (html: string) => void;
  /** Clear content */
  clear: () => void;
  /** Underlying contenteditable element, if mounted */
  getContentElement: () => HTMLDivElement | null;
}

export interface EmailEditorProps {
  /**
   * Uncontrolled initial HTML. Applied on mount (and ignored for later prop
   * changes unless `value` is also used — prefer `value` for controlled mode).
   */
  initialValue?: string;
  /**
   * Controlled HTML. When provided, the editor DOM is updated when `value`
   * changes and differs from the current DOM HTML.
   */
  value?: string;
  onChange?: (html: string) => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  /**
   * Accessible name for the contenteditable surface.
   * Defaults to `placeholder`, then `"Email content"`.
   */
  ariaLabel?: string;
  /**
   * When true (default), handle common formatting shortcuts (Mod+B/I/U/K/Z, etc.)
   * while focus is inside the editor surface.
   */
  enableShortcuts?: boolean;
  variables?: Variable[];
  defaultPadding?: string;
  /**
   * Optional callback to handle image uploads.
   * If provided, this function will be called when a user selects an image from their device.
   * It should return a Promise that resolves to the image URL.
   * If not provided, images will be converted to Base64.
   */
  onImageUpload?: (file: File) => Promise<string>;
  toolbarConfig?: ToolbarConfig;
  /**
   * When true (default), sanitize paste, seed HTML, controlled `value`, and
   * `setHTML` input, and block dangerous link/image URLs.
   * Set to `false` only for trusted admin tools.
   */
  sanitize?: boolean;
  /**
   * Optional paste override. When provided (and `sanitize` is not false),
   * clipboard HTML is passed through this function instead of the built-in
   * sanitizer before insert.
   */
  onPasteHtml?: (html: string) => string;
}

export type ToolbarItem =
  | 'undo'
  | 'redo'
  | 'fontFamily'
  | 'fontSize'
  | 'padding'
  | 'color'
  | 'variables'
  | 'h1'
  | 'h2'
  | 'p'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'justifyFull'
  | 'unorderedList'
  | 'orderedList'
  | 'link'
  | 'image'
  | 'blockquote'
  | 'removeFormat';

export type ToolbarConfig = (ToolbarItem | ToolbarItem[])[];

export type PaddingSide = "top" | "right" | "bottom" | "left";

export interface Paddings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
