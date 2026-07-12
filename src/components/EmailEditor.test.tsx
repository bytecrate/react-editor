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

  it('hides the placeholder when initialValue has content', () => {
    render(<EmailEditor initialValue="<p>Hello</p>" />);
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.queryByText('Start writing your email...')).toBeNull();
    expect(document.querySelector('.ree-placeholder')).toBeNull();
  });

  it('shows the placeholder when the editor is empty', () => {
    render(<EmailEditor />);
    expect(screen.getByText('Start writing your email...')).toBeDefined();
    expect(document.querySelector('.ree-placeholder')).not.toBeNull();
  });

  it('shows the placeholder after content is cleared', () => {
    render(<EmailEditor initialValue="<p>x</p>" />);
    expect(document.querySelector('.ree-placeholder')).toBeNull();

    const contentEditable = document.querySelector('.ree-content') as HTMLElement;
    expect(contentEditable).not.toBeNull();

    contentEditable.innerHTML = '';
    fireEvent.input(contentEditable);

    expect(screen.getByText('Start writing your email...')).toBeDefined();
    expect(document.querySelector('.ree-placeholder')).not.toBeNull();
  });

  it('shows the placeholder after clear leaves browser empty shells', () => {
    render(<EmailEditor initialValue="<p>x</p>" />);
    const contentEditable = document.querySelector('.ree-content') as HTMLElement;
    expect(contentEditable).not.toBeNull();

    // Typical post-delete markup from contenteditable (including Firefox _moz br)
    contentEditable.innerHTML = '<p><br type="_moz"></p>';
    fireEvent.input(contentEditable);

    expect(document.querySelector('.ree-placeholder')).not.toBeNull();
  });

  it('hides the placeholder when the user types into an empty editor', () => {
    render(<EmailEditor />);
    expect(document.querySelector('.ree-placeholder')).not.toBeNull();

    const contentEditable = document.querySelector('.ree-content') as HTMLElement;
    contentEditable.innerHTML = '<p>typed</p>';
    fireEvent.input(contentEditable);

    expect(document.querySelector('.ree-placeholder')).toBeNull();
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

  it('opens the variables dropdown and inserts the selected variable as a chip', () => {
    // Materialize insertHTML so the chip lands in the contenteditable
    document.execCommand = vi.fn().mockImplementation((command, _show, value) => {
      if (command === 'insertHTML' && typeof value === 'string') {
        const content = document.querySelector('.ree-content') as HTMLElement | null;
        if (content) {
          content.insertAdjacentHTML('beforeend', value);
          return true;
        }
      }
      return false;
    });

    const handleChange = vi.fn();
    render(
      <EmailEditor
        variables={[{ label: 'Username', value: '{{username}}' }]}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByTitle('Insert Variable'));

    const usernameOption = screen.getByText('Username');
    expect(usernameOption).toBeDefined();

    fireEvent.mouseDown(usernameOption);
    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      expect.stringContaining('ree-merge-tag')
    );

    const chip = document.querySelector('.ree-content .ree-merge-tag') as HTMLElement | null;
    expect(chip).not.toBeNull();
    expect(chip?.dataset.mergeTag).toBe('{{username}}');
    expect(chip?.textContent).toBe('Username');
    // onChange emits plain token (policy B), not the chip span
    expect(handleChange).toHaveBeenCalled();
    const emitted = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as string;
    expect(emitted).toContain('{{username}}');
    expect(emitted).not.toContain('ree-merge-tag');
  });

  it('inserts plain text when variablesAsChips is false', () => {
    document.execCommand = vi.fn();
    render(
      <EmailEditor
        variables={[{ label: 'Username', value: '{{username}}' }]}
        variablesAsChips={false}
      />
    );

    fireEvent.click(screen.getByTitle('Insert Variable'));
    fireEvent.mouseDown(screen.getByText('Username'));
    expect(document.execCommand).toHaveBeenCalledWith(
      'insertText',
      false,
      '{{username}}'
    );
  });

  it('hydrates merge tokens in initialValue into chips', () => {
    render(
      <EmailEditor
        initialValue="<p>Hello {{firstName}}</p>"
        variables={[{ label: 'First Name', value: '{{firstName}}' }]}
      />
    );

    const chip = document.querySelector('.ree-content .ree-merge-tag') as HTMLElement | null;
    expect(chip).not.toBeNull();
    expect(chip?.dataset.mergeTag).toBe('{{firstName}}');
    expect(chip?.textContent).toBe('First Name');
    // Visible label in the tree
    expect(screen.getByText('First Name')).toBeDefined();
  });

  it('opens the padding picker and shows side adjustment controls', () => {
    const handleChange = vi.fn();
    render(<EmailEditor initialValue="<p>Padded content</p>" onChange={handleChange} />);

    fireEvent.click(screen.getByTitle('Padding & Spacing'));

    expect(screen.getByText('top')).toBeDefined();
    expect(screen.getByText('right')).toBeDefined();
    expect(screen.getByText('bottom')).toBeDefined();
    expect(screen.getByText('left')).toBeDefined();

    // Place selection inside a block so updatePadding can target it
    const paragraph = screen.getByText('Padded content') as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Increase top padding via the first row's plus button
    const padRows = document.querySelectorAll('.ree-pad-row');
    expect(padRows.length).toBe(4);
    const increaseButtons = padRows[0].querySelectorAll('button[title="Increase"]');
    expect(increaseButtons.length).toBe(1);

    fireEvent.mouseDown(increaseButtons[0]);

    // State update should reflect on the control value and trigger onChange via handleInput
    expect(padRows[0].querySelector('.ree-pad-val')?.textContent?.trim()).toBe('1');
    expect(paragraph.style.paddingTop).toBe('1px');
    expect(handleChange).toHaveBeenCalled();
  });

  it('opens the color picker and applies a preset color via foreColor', () => {
    render(<EmailEditor />);

    fireEvent.click(screen.getByTitle('Text Color'));

    // Preset color grid should render (PRESET_COLORS includes #000000, #EF4444, etc.)
    const swatch = screen.getByTitle('#EF4444');
    expect(swatch).toBeDefined();

    fireEvent.mouseDown(swatch);
    expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, '#EF4444');
  });

  it('dismisses open picker dropdowns when clicking outside', () => {
    render(
      <EmailEditor variables={[{ label: 'Username', value: '{{username}}' }]} />
    );

    fireEvent.click(screen.getByTitle('Insert Variable'));
    expect(screen.getByText('Username')).toBeDefined();

    // Click outside the picker (mousedown, matching the document listener)
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Username')).toBeNull();
  });

  it('exposes toolbar buttons by accessible name', () => {
    render(<EmailEditor />);

    expect(screen.getByRole('button', { name: 'Bold' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined();
  });

  it('labels the editor surface as a multiline textbox', () => {
    render(<EmailEditor placeholder="Write your email" />);

    const textbox = screen.getByRole('textbox', { name: 'Write your email' });
    expect(textbox).toBeDefined();
    expect(textbox.getAttribute('aria-multiline')).toBe('true');
  });

  it('uses ariaLabel when provided for the editor surface', () => {
    render(<EmailEditor ariaLabel="Campaign body" placeholder="ignored for a11y" />);

    expect(screen.getByRole('textbox', { name: 'Campaign body' })).toBeDefined();
  });

  it('exposes a formatting toolbar landmark', () => {
    render(<EmailEditor />);

    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeDefined();
  });

  it('runs bold via Mod+B when the editor surface is focused', () => {
    render(<EmailEditor />);

    const content = document.querySelector('.ree-content') as HTMLElement;
    expect(content).not.toBeNull();
    content.focus();

    fireEvent.keyDown(content, { key: 'b', ctrlKey: true });

    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('closes the variables menu on Escape and returns focus to the trigger', () => {
    render(
      <EmailEditor variables={[{ label: 'Username', value: '{{username}}' }]} />
    );

    const trigger = screen.getByRole('button', { name: 'Insert Variable' });
    fireEvent.click(trigger);
    expect(screen.getByText('Username')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Username')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the link picker on Escape and resets the trigger label', () => {
    render(<EmailEditor initialValue="<p>Hello</p>" />);

    // Select text so openLinkPicker can treat it as a potential link edit context
    const hello = screen.getByText('Hello');
    const range = document.createRange();
    range.selectNodeContents(hello);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Link' }));
    expect(screen.getByPlaceholderText(/https/)).toBeDefined();

    fireEvent.keyDown(screen.getByPlaceholderText(/https/), { key: 'Escape' });

    expect(screen.queryByPlaceholderText(/https/)).toBeNull();
    // onClose must clear isEditingLink so the closed trigger is "Link", not "Edit Link"
    expect(screen.getByRole('button', { name: 'Link' })).toBeDefined();
  });

  it('does not handle shortcuts when enableShortcuts is false', () => {
    const execSpy = vi.mocked(document.execCommand);
    execSpy.mockClear();

    render(<EmailEditor enableShortcuts={false} />);

    const content = document.querySelector('.ree-content') as HTMLElement;
    fireEvent.keyDown(content, { key: 'b', ctrlKey: true });

    expect(execSpy).not.toHaveBeenCalledWith('bold', false, undefined);
  });
});
