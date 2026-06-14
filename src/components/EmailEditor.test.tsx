import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmailEditor } from '../../index';

describe('EmailEditor', () => {
  beforeAll(() => {
    document.execCommand = vi.fn();
    document.queryCommandState = vi.fn().mockReturnValue(false);
    document.queryCommandValue = vi.fn().mockReturnValue('');
  });

  it('renders the editor with default props', () => {
    render(<EmailEditor />);
    const editor = screen.getByText('Start writing your email...');
    expect(editor).toBeDefined();
  });

  it('renders the editor with an initialValue', () => {
    render(<EmailEditor initialValue="<p>Hello World</p>" />);
    const contentArea = screen.getByText('Hello World');
    expect(contentArea).toBeDefined();
  });

  it('fires the onChange callback when content is modified', () => {
    const handleChange = vi.fn();
    render(<EmailEditor onChange={handleChange} />);
    
    // Find the content editable area
    const contentEditable = screen.getByText('Start writing your email...').parentElement?.querySelector('.ree-content');
    expect(contentEditable).not.toBeNull();

    if (contentEditable) {
      // Set innerHTML and fire input event
      contentEditable.innerHTML = '<p>New Content</p>';
      fireEvent.input(contentEditable);
      
      expect(handleChange).toHaveBeenCalledWith('<p>New Content</p>');
    }
  });

  it('renders the toolbar and handles formats', () => {
    render(<EmailEditor />);
    
    // Check for some toolbar buttons by title
    const undoBtn = screen.getByTitle('Undo');
    expect(undoBtn).toBeDefined();

    const boldBtn = screen.getByTitle('Bold');
    expect(boldBtn).toBeDefined();

    // Click bold button and verify execCommand was called
    fireEvent.mouseDown(boldBtn);
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('renders only requested toolbar buttons when custom toolbarConfig is provided', () => {
    // Render only Bold and Italic buttons
    render(<EmailEditor toolbarConfig={[['bold', 'italic']]} />);
    
    // Bold and Italic should be visible
    expect(screen.queryByTitle('Bold')).not.toBeNull();
    expect(screen.queryByTitle('Italic')).not.toBeNull();

    // Other buttons (like Undo or Redo) should NOT be rendered
    expect(screen.queryByTitle('Undo')).toBeNull();
    expect(screen.queryByTitle('Redo')).toBeNull();
  });

  it('scopes font size changes to only affect the active selection and not pre-existing font tags', () => {
    // Render the editor with a pre-existing font tag
    const initialValue = '<p>Some text and a <font size="7" style="font-size: 12px;">pre-existing element</font></p>';
    render(<EmailEditor initialValue={initialValue} />);

    const contentEditable = screen.getByText('pre-existing element').closest('.ree-content') as HTMLElement;
    expect(contentEditable).not.toBeNull();

    // Mock document.execCommand to simulate the browser inserting a new <font size="7"> tag
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockImplementation((command) => {
      if (command === 'fontSize') {
        const fontEl = document.createElement('font');
        fontEl.setAttribute('size', '7');
        fontEl.innerHTML = 'new text selection';
        contentEditable.appendChild(fontEl);
        return true;
      }
      return false;
    });

    // Find the Font Size select dropdown
    const fontSizeSelect = screen.getByTitle('Font Size');
    expect(fontSizeSelect).toBeDefined();

    // Trigger font size change to 24px
    fireEvent.change(fontSizeSelect, { target: { value: '24px' } });

    // Verify the pre-existing font tag is NOT modified
    const fontTags = contentEditable.querySelectorAll('font');
    expect(fontTags.length).toBe(2);

    const preExistingTag = fontTags[0];
    const newTag = fontTags[1];

    // The pre-existing one should still have its original size attribute and style
    expect(preExistingTag.getAttribute('size')).toBe('7');
    expect(preExistingTag.style.fontSize).toBe('12px');

    // The new one should have its size attribute removed and style.fontSize set to 24px
    expect(newTag.getAttribute('size')).toBeNull();
    expect(newTag.style.fontSize).toBe('24px');

    // Restore original mock
    document.execCommand = originalExecCommand;
  });
});
