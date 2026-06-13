import React from "react";

export interface Variable {
  label: string;
  value: string;
}

export interface EmailEditorProps {
  initialValue?: string;
  onChange?: (html: string) => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  variables?: Variable[];
  defaultPadding?: string;
  /**
   * Optional callback to handle image uploads.
   * If provided, this function will be called when a user selects an image from their device.
   * It should return a Promise that resolves to the image URL.
   * If not provided, images will be converted to Base64.
   */
  onImageUpload?: (file: File) => Promise<string>;
}
