import React from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Heading1, Heading2, Quote, Undo, Redo, Eraser,
  Type,
} from "lucide-react";

import type { ToolbarConfig, ToolbarItem, Variable, Paddings, PaddingSide } from "../../types";
import { FONT_FAMILIES, FONT_SIZES } from "../../constants";
import { ToolbarButton } from "../ToolbarButton";
import { VariablesPicker } from "./pickers/VariablesPicker";
import { ColorPicker } from "./pickers/ColorPicker";
import { PaddingPicker } from "./pickers/PaddingPicker";
import { ImagePicker } from "./pickers/ImagePicker";
import { LinkPicker } from "./pickers/LinkPicker";

export const DEFAULT_TOOLBAR: ToolbarConfig = [
  ["undo", "redo"],
  ["fontFamily"],
  ["fontSize"],
  ["padding"],
  ["color"],
  ["variables"],
  ["h1", "h2", "p"],
  ["bold", "italic", "underline", "strikeThrough"],
  ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"],
  ["unorderedList", "orderedList"],
  ["link", "image", "blockquote", "removeFormat"],
];

export interface EditorToolbarProps {
  config: ToolbarConfig;
  // Command callbacks
  execCommand: (command: string, value?: string) => void;
  execFontSize: (size: string) => void;
  // Format state
  activeFormats: string[];
  currentFont: string;
  currentFontSize: string;
  // Padding
  paddings: Paddings;
  updatePadding: (side: PaddingSide, value: number) => void;
  showPaddingPicker: boolean;
  setShowPaddingPicker: (show: boolean) => void;
  paddingPickerRef: React.RefObject<HTMLDivElement | null>;
  // Color
  activeColor: string;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  colorPickerRef: React.RefObject<HTMLDivElement | null>;
  // Variables
  variables: Variable[];
  showVariables: boolean;
  openVariablesPicker: () => void;
  insertVariable: (variable: Variable) => void;
  variablesRef: React.RefObject<HTMLDivElement | null>;
  // Link
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  isEditingLink: boolean;
  setIsEditingLink: (editing: boolean) => void;
  showLinkPicker: boolean;
  setShowLinkPicker: (show: boolean) => void;
  applyLink: (urlOverride?: string) => void;
  removeLink: () => void;
  applyLinkVariable: (value: string) => void;
  openLinkPicker: () => void;
  linkPickerRef: React.RefObject<HTMLDivElement | null>;
  // Image
  showImagePicker: boolean;
  setShowImagePicker: (show: boolean) => void;
  handleImageUploadClick: () => void;
  handleInsertImageUrl: (url: string, alt: string) => void;
  defaultImageAlt?: string;
  imagePickerRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorToolbar(props: EditorToolbarProps): React.JSX.Element {
  const {
    config,
    execCommand,
    execFontSize,
    activeFormats,
    currentFont,
    currentFontSize,
    paddings,
    updatePadding,
    showPaddingPicker,
    setShowPaddingPicker,
    paddingPickerRef,
    activeColor,
    showColorPicker,
    setShowColorPicker,
    colorPickerRef,
    variables,
    showVariables,
    openVariablesPicker,
    insertVariable,
    variablesRef,
    linkUrl,
    setLinkUrl,
    isEditingLink,
    setIsEditingLink,
    showLinkPicker,
    setShowLinkPicker,
    applyLink,
    removeLink,
    applyLinkVariable,
    openLinkPicker,
    linkPickerRef,
    showImagePicker,
    setShowImagePicker,
    handleImageUploadClick,
    handleInsertImageUrl,
    defaultImageAlt,
    imagePickerRef,
  } = props;

  const renderToolbarItem = (item: ToolbarItem) => {
    switch (item) {
      case "undo":
        return <ToolbarButton key="undo" icon={Undo} onMouseDown={() => execCommand("undo")} label="Undo" />;
      case "redo":
        return <ToolbarButton key="redo" icon={Redo} onMouseDown={() => execCommand("redo")} label="Redo" />;
      case "fontFamily":
        return (
          <div key="fontFamily" className="ree-select-wrapper">
            <select
              className="ree-select"
              value={currentFont}
              onChange={(e) => execCommand("fontName", e.target.value)}
              title="Font Family"
              aria-label="Font Family"
              style={{ width: "130px", fontFamily: currentFont }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
            <div className="ree-chevron">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        );
      case "fontSize":
        return (
          <div key="fontSize" className="ree-select-wrapper">
            <select
              className="ree-select"
              value={currentFontSize}
              onChange={(e) => execFontSize(e.target.value)}
              title="Font Size"
              aria-label="Font Size"
              style={{ width: "80px" }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
            <div className="ree-chevron">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        );
      case "padding":
        return (
          <PaddingPicker
            key="padding"
            paddings={paddings}
            updatePadding={updatePadding}
            show={showPaddingPicker}
            onToggle={() => setShowPaddingPicker(!showPaddingPicker)}
            containerRef={paddingPickerRef}
          />
        );
      case "color":
        return (
          <ColorPicker
            key="color"
            activeColor={activeColor}
            show={showColorPicker}
            onToggle={() => setShowColorPicker(!showColorPicker)}
            onPick={(color) => {
              execCommand("foreColor", color);
              setShowColorPicker(false);
            }}
            containerRef={colorPickerRef}
          />
        );
      case "variables":
        return (
          <VariablesPicker
            key="variables"
            variables={variables}
            show={showVariables}
            onToggle={openVariablesPicker}
            onInsert={insertVariable}
            containerRef={variablesRef}
          />
        );
      case "h1":
        return <ToolbarButton key="h1" icon={Heading1} onMouseDown={() => execCommand("formatBlock", "H1")} label="Heading 1" />;
      case "h2":
        return <ToolbarButton key="h2" icon={Heading2} onMouseDown={() => execCommand("formatBlock", "H2")} label="Heading 2" />;
      case "p":
        return <ToolbarButton key="p" icon={Type} onMouseDown={() => execCommand("formatBlock", "P")} label="Paragraph" />;
      case "bold":
        return <ToolbarButton key="bold" icon={Bold} onMouseDown={() => execCommand("bold")} isActive={activeFormats.includes("bold")} label="Bold" />;
      case "italic":
        return <ToolbarButton key="italic" icon={Italic} onMouseDown={() => execCommand("italic")} isActive={activeFormats.includes("italic")} label="Italic" />;
      case "underline":
        return <ToolbarButton key="underline" icon={Underline} onMouseDown={() => execCommand("underline")} isActive={activeFormats.includes("underline")} label="Underline" />;
      case "strikeThrough":
        return <ToolbarButton key="strikeThrough" icon={Strikethrough} onMouseDown={() => execCommand("strikeThrough")} isActive={activeFormats.includes("strikeThrough")} label="Strikethrough" />;
      case "justifyLeft":
        return <ToolbarButton key="justifyLeft" icon={AlignLeft} onMouseDown={() => execCommand("justifyLeft")} isActive={activeFormats.includes("justifyLeft")} label="Align Left" />;
      case "justifyCenter":
        return <ToolbarButton key="justifyCenter" icon={AlignCenter} onMouseDown={() => execCommand("justifyCenter")} isActive={activeFormats.includes("justifyCenter")} label="Align Center" />;
      case "justifyRight":
        return <ToolbarButton key="justifyRight" icon={AlignRight} onMouseDown={() => execCommand("justifyRight")} isActive={activeFormats.includes("justifyRight")} label="Align Right" />;
      case "justifyFull":
        return <ToolbarButton key="justifyFull" icon={AlignJustify} onMouseDown={() => execCommand("justifyFull")} isActive={activeFormats.includes("justifyFull")} label="Justify" />;
      case "unorderedList":
        return <ToolbarButton key="unorderedList" icon={List} onMouseDown={() => execCommand("insertUnorderedList")} isActive={activeFormats.includes("insertUnorderedList")} label="Bullet List" />;
      case "orderedList":
        return <ToolbarButton key="orderedList" icon={ListOrdered} onMouseDown={() => execCommand("insertOrderedList")} isActive={activeFormats.includes("insertOrderedList")} label="Ordered List" />;
      case "link":
        return (
          <LinkPicker
            key="link"
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            isEditingLink={isEditingLink}
            isActive={activeFormats.includes("createLink")}
            show={showLinkPicker}
            variables={variables}
            applyLink={applyLink}
            removeLink={removeLink}
            applyLinkVariable={applyLinkVariable}
            onOpen={openLinkPicker}
            onClose={() => {
              setShowLinkPicker(false);
              setIsEditingLink(false);
            }}
            containerRef={linkPickerRef}
          />
        );
      case "image":
        return (
          <ImagePicker
            key="image"
            show={showImagePicker}
            onToggle={() => setShowImagePicker(!showImagePicker)}
            onUploadClick={handleImageUploadClick}
            onInsertUrl={handleInsertImageUrl}
            defaultAlt={defaultImageAlt}
            containerRef={imagePickerRef}
          />
        );
      case "blockquote":
        return <ToolbarButton key="blockquote" icon={Quote} onMouseDown={() => execCommand("formatBlock", "BLOCKQUOTE")} label="Quote" />;
      case "removeFormat":
        return <ToolbarButton key="removeFormat" icon={Eraser} onMouseDown={() => execCommand("removeFormat")} label="Clear Formatting" />;
      default:
        return null;
    }
  };

  const normalizedConfig = config.map((group) => {
    if (Array.isArray(group)) {
      return group;
    }
    return [group];
  });

  return (
    <div className="ree-toolbar" role="toolbar" aria-label="Formatting">
      {normalizedConfig.map((group, groupIdx) => {
        const renderedItems = group
          .map((item) => renderToolbarItem(item))
          .filter((item) => item !== null);

        if (renderedItems.length === 0) return null;

        return (
          <div key={groupIdx} className="ree-group">
            {renderedItems}
          </div>
        );
      })}
    </div>
  );
}
