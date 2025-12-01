import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Quote, Undo, Redo, Eraser,
  Type, Palette, Braces, Move, Plus, Minus
} from "lucide-react";

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
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const FONT_SIZES = [
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '24px', value: '24px' },
  { label: '36px', value: '36px' },
];

const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
];

const DEFAULT_VARIABLES = [
  { label: 'First Name', value: '{{firstName}}' },
  { label: 'Last Name', value: '{{lastName}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Company', value: '{{company}}' },
  { label: 'Unsubscribe Link', value: '{{unsubscribe}}' },
];

export const EmailEditor: React.FC<EmailEditorProps> = ({
  initialValue = "",
  onChange,
  style,
  className = "",
  placeholder = "Start writing your email...",
  variables = DEFAULT_VARIABLES,
  defaultPadding = "24px"
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const variablesRef = useRef<HTMLDivElement>(null);
  const paddingPickerRef = useRef<HTMLDivElement>(null);
  
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [currentFont, setCurrentFont] = useState<string>('Arial');
  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  
  // Padding state for individual sides
  const [paddings, setPaddings] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [showPaddingPicker, setShowPaddingPicker] = useState(false);

  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  // Initialize content and default padding
  useEffect(() => {
    if (contentRef.current) {
      if (initialValue && !contentRef.current.innerHTML) {
        contentRef.current.innerHTML = initialValue;
      }
      // Apply default padding directly to DOM
      contentRef.current.style.padding = defaultPadding;
    }
  }, []);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (variablesRef.current && !variablesRef.current.contains(event.target as Node)) {
        setShowVariables(false);
      }
      if (paddingPickerRef.current && !paddingPickerRef.current.contains(event.target as Node)) {
        setShowPaddingPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = () => {
    if (contentRef.current && onChange) {
      const html = contentRef.current.innerHTML;
      onChange(html);
    }
    updateActiveFormats();
  };

  const getSelectedBlock = (): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !contentRef.current) return null;
    
    let node: Node | null = selection.anchorNode;
    
    // If text node, start from parent
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // Traverse up to find a suitable block or stop at root
    while (node && node !== contentRef.current) {
       if (node instanceof HTMLElement) {
          const display = window.getComputedStyle(node).display;
          if (display === 'block' || display === 'list-item' || display === 'flex' || display === 'grid') {
             return node;
          }
       }
       node = node.parentNode;
    }
    
    return contentRef.current;
  };

  const updateActiveFormats = useCallback(() => {
    const formats: string[] = [];
    const commands = [
      'bold', 'italic', 'underline', 'strikeThrough',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'insertUnorderedList', 'insertOrderedList'
    ];
    
    commands.forEach(cmd => {
      if (document.queryCommandState(cmd)) formats.push(cmd);
    });
    
    setActiveFormats(formats);

    // Update active font
    const fontValue = document.queryCommandValue('fontName');
    if (fontValue) {
      setCurrentFont(fontValue.replace(/['"]/g, ''));
    }

    // Update active font size
    const selection = window.getSelection();
    let computedFontSize = '16px';
    
    if (selection && selection.anchorNode) {
      const parent = selection.anchorNode.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection.anchorNode as Element;
      if (parent) {
        computedFontSize = window.getComputedStyle(parent).fontSize;
        setCurrentFontSize(computedFontSize);
      }
    }

    // Update active color
    const colorValue = document.queryCommandValue('foreColor');
    if (colorValue) {
      setActiveColor(colorValue);
    }

    // Update active padding from computed styles of the selected block
    const block = getSelectedBlock();
    if (block) {
        const style = window.getComputedStyle(block);
        setPaddings({
          top: parseInt(style.paddingTop, 10) || 0,
          right: parseInt(style.paddingRight, 10) || 0,
          bottom: parseInt(style.paddingBottom, 10) || 0,
          left: parseInt(style.paddingLeft, 10) || 0
        });
    }
  }, []);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
    updateActiveFormats();
  };

  const execFontSize = (size: string) => {
    document.execCommand('fontSize', false, '7');
    if (contentRef.current) {
        const fontElements = contentRef.current.querySelectorAll('font[size="7"]');
        fontElements.forEach(el => {
            el.removeAttribute('size');
            (el as HTMLElement).style.fontSize = size;
        });
    }
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
    updateActiveFormats();
  };

  const updatePadding = (side: keyof typeof paddings, value: number) => {
    const block = getSelectedBlock();
    if (block) {
        // Construct the CSS property name (e.g., paddingTop)
        const sideName = side as string;
        const prop = `padding${sideName.charAt(0).toUpperCase() + sideName.slice(1)}`;
        // Apply directly to the element's style
        // @ts-ignore - dynamic style property access
        block.style[prop] = `${value}px`;
        
        // Update local state to reflect change immediately
        setPaddings(prev => ({ ...prev, [side]: value }));
        
        handleInput();
    }
  };

  const insertVariable = (value: string) => {
    document.execCommand('insertText', false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
    setShowVariables(false);
  };

  const addLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCommand("createLink", url);
  };

  const addImage = () => {
    const url = prompt("Enter Image URL:");
    if (url) execCommand("insertImage", url);
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    command, 
    value, 
    isActive,
    label 
  }: { 
    icon: React.ElementType, 
    command: string, 
    value?: string, 
    isActive?: boolean,
    label?: string
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (command === "createLink") addLink();
        else if (command === "insertImage") addImage();
        else execCommand(command, value);
      }}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
      }`}
      title={label}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className={`flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm ${className}`} style={style}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 select-none">
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <ToolbarButton icon={Undo} command="undo" label="Undo" />
          <ToolbarButton icon={Redo} command="redo" label="Redo" />
        </div>
        
        {/* Font Family Selector */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <div className="relative flex items-center">
             <select
              className="appearance-none bg-transparent hover:bg-gray-100 text-gray-700 text-sm font-medium py-1 pl-2 pr-6 rounded border border-transparent hover:border-gray-200 focus:outline-none cursor-pointer"
              value={currentFont}
              onChange={(e) => execCommand('fontName', e.target.value)}
              title="Font Family"
              style={{ width: '130px' }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <div className="relative flex items-center">
             <select
              className="appearance-none bg-transparent hover:bg-gray-100 text-gray-700 text-sm font-medium py-1 pl-2 pr-6 rounded border border-transparent hover:border-gray-200 focus:outline-none cursor-pointer"
              value={currentFontSize}
              onChange={(e) => execFontSize(e.target.value)}
              title="Font Size"
              style={{ width: '80px' }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Padding Selector Dropdown */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1 relative" ref={paddingPickerRef}>
           <button
            type="button"
            onClick={() => setShowPaddingPicker(!showPaddingPicker)}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${showPaddingPicker ? 'bg-gray-200' : ''}`}
            title="Padding & Spacing"
          >
            <Move size={18} className="text-gray-600" />
          </button>

          {showPaddingPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 w-48 animate-in fade-in zoom-in duration-100">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Padding (px)</div>
              <div className="space-y-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side} className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs capitalize w-10">{side}</span>
                    <div className="flex items-center gap-0.5 border border-gray-200 rounded bg-gray-50">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                           e.preventDefault(); // Prevent losing focus from editor
                           updatePadding(side, Math.max(0, paddings[side] - 1));
                        }}
                        className="p-1.5 hover:bg-gray-200 text-gray-600 transition-colors rounded-l focus:outline-none"
                        title="Decrease"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-medium w-8 text-center text-gray-700 select-none">
                        {paddings[side]}
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                           e.preventDefault(); // Prevent losing focus from editor
                           updatePadding(side, paddings[side] + 1);
                        }}
                        className="p-1.5 hover:bg-gray-200 text-gray-600 transition-colors rounded-r focus:outline-none"
                        title="Increase"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1 relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${showColorPicker ? 'bg-gray-200' : ''}`}
            title="Text Color"
          >
            <Palette 
              size={18} 
              style={{ 
                color: activeColor && activeColor !== 'rgb(0, 0, 0)' && activeColor !== '#000000' 
                  ? activeColor 
                  : 'inherit' 
              }} 
            />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 w-56 animate-in fade-in zoom-in duration-100">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Presets</div>
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded border border-gray-200 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    style={{ backgroundColor: color }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execCommand('foreColor', color);
                      setShowColorPicker(false);
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2">
                 <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Custom</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-full h-8 p-0 border-0 rounded cursor-pointer"
                    onChange={(e) => {
                      execCommand('foreColor', e.target.value);
                      setShowColorPicker(false);
                    }}
                    title="Choose custom color"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Variables Picker */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1 relative" ref={variablesRef}>
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className={`p-2 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 ${showVariables ? 'bg-gray-200' : ''}`}
            title="Insert Variable"
          >
            <Braces size={18} />
          </button>

          {showVariables && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 w-48 animate-in fade-in zoom-in duration-100">
               <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-100 uppercase tracking-wider">Insert Variable</div>
               <div className="max-h-60 overflow-y-auto">
                 {variables.length > 0 ? (
                   variables.map((variable) => (
                     <button
                       key={variable.value}
                       className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                       onMouseDown={(e) => {
                         e.preventDefault(); // Prevent focus loss
                         insertVariable(variable.value);
                       }}
                     >
                       {variable.label}
                     </button>
                   ))
                 ) : (
                   <div className="px-4 py-2 text-sm text-gray-400 italic">No variables available</div>
                 )}
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <ToolbarButton icon={Heading1} command="formatBlock" value="H1" label="Heading 1" />
          <ToolbarButton icon={Heading2} command="formatBlock" value="H2" label="Heading 2" />
          <ToolbarButton icon={Type} command="formatBlock" value="P" label="Paragraph" />
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <ToolbarButton icon={Bold} command="bold" isActive={activeFormats.includes('bold')} label="Bold" />
          <ToolbarButton icon={Italic} command="italic" isActive={activeFormats.includes('italic')} label="Italic" />
          <ToolbarButton icon={Underline} command="underline" isActive={activeFormats.includes('underline')} label="Underline" />
          <ToolbarButton icon={Strikethrough} command="strikeThrough" isActive={activeFormats.includes('strikeThrough')} label="Strikethrough" />
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <ToolbarButton icon={AlignLeft} command="justifyLeft" isActive={activeFormats.includes('justifyLeft')} label="Align Left" />
          <ToolbarButton icon={AlignCenter} command="justifyCenter" isActive={activeFormats.includes('justifyCenter')} label="Align Center" />
          <ToolbarButton icon={AlignRight} command="justifyRight" isActive={activeFormats.includes('justifyRight')} label="Align Right" />
          <ToolbarButton icon={AlignJustify} command="justifyFull" isActive={activeFormats.includes('justifyFull')} label="Justify" />
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 mr-1">
          <ToolbarButton icon={List} command="insertUnorderedList" isActive={activeFormats.includes('insertUnorderedList')} label="Bullet List" />
          <ToolbarButton icon={ListOrdered} command="insertOrderedList" isActive={activeFormats.includes('insertOrderedList')} label="Ordered List" />
        </div>

        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={LinkIcon} command="createLink" label="Link" />
          <ToolbarButton icon={ImageIcon} command="insertImage" label="Image" />
          <ToolbarButton icon={Quote} command="formatBlock" value="BLOCKQUOTE" label="Quote" />
          <ToolbarButton icon={Eraser} command="removeFormat" label="Clear Formatting" />
        </div>
      </div>

      {/* Editor Surface */}
      <div 
        className="flex-1 relative bg-white"
        onClick={() => contentRef.current?.focus()}
      >
        <div 
          ref={contentRef}
          className="w-full h-full outline-none overflow-y-auto prose max-w-none"
          contentEditable
          onInput={handleInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          style={{
            minHeight: '300px',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
          suppressContentEditableWarning
        />
        {(!contentRef.current?.innerText && !contentRef.current?.innerHTML) && (
           <div className="absolute top-6 left-6 text-gray-400 pointer-events-none" style={{ top: paddings.top || 24, left: paddings.left || 24 }}>{placeholder}</div>
        )}
      </div>

      {/* Injection of styles for the editable content itself to ensure consistency */}
      <style>{`
        [contenteditable] ul { list-style-type: disc; padding-left: 1.5em; margin: 1em 0; }
        [contenteditable] ol { list-style-type: decimal; padding-left: 1.5em; margin: 1em 0; }
        [contenteditable] h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        [contenteditable] h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
        [contenteditable] p { margin: 1em 0; }
        [contenteditable] blockquote { border-left: 4px solid #e5e7eb; margin: 1em 0; padding-left: 1em; color: #4b5563; font-style: italic; }
        [contenteditable] a { color: #2563eb; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; height: auto; border-radius: 4px; }
      `}</style>
    </div>
  );
};
