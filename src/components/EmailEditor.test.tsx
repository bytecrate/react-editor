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
});
