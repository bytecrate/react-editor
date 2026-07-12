import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EmailEditor } from '../../index';
import type { EmailEditorRef } from '../types';

describe('EmailEditor controlled value and ref API', () => {
  beforeAll(() => {
    document.execCommand = vi.fn();
    document.queryCommandState = vi.fn().mockReturnValue(false);
    document.queryCommandValue = vi.fn().mockReturnValue('');
  });

  it('updates DOM when controlled value changes without remounting', () => {
    const { rerender } = render(<EmailEditor value="<p>A</p>" />);
    expect(screen.getByText('A')).toBeDefined();

    const contentBefore = document.querySelector('.ree-content');
    expect(contentBefore).not.toBeNull();

    rerender(<EmailEditor value="<p>B</p>" />);
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.queryByText('A')).toBeNull();

    // Same contenteditable node (no remount)
    expect(document.querySelector('.ree-content')).toBe(contentBefore);
  });

  it('does not overwrite equal controlled value (stable DOM content)', () => {
    const { rerender } = render(<EmailEditor value="<p>Stable</p>" />);
    const content = document.querySelector('.ree-content') as HTMLElement;
    expect(content.innerHTML).toContain('Stable');

    const htmlBefore = content.innerHTML;
    rerender(<EmailEditor value="<p>Stable</p>" />);
    // Same value string → effect equality guard skips write
    expect(content.innerHTML).toBe(htmlBefore);
  });

  it('clears image resizer selection when setHTML replaces content', () => {
    const ref = createRef<EmailEditorRef>();
    render(<EmailEditor ref={ref} />);

    act(() => {
      ref.current?.setHTML('<p><img src="about:blank" alt="x" width="40" height="40" /></p>');
    });

    const img = document.querySelector('.ree-content img') as HTMLImageElement;
    expect(img).not.toBeNull();
    fireEvent.click(img);

    // Resizer should be active after image click
    expect(document.querySelector('.ree-resizer.active')).not.toBeNull();

    act(() => {
      ref.current?.setHTML('<p>replaced</p>');
    });

    expect(document.querySelector('.ree-resizer.active')).toBeNull();
    expect(screen.getByText('replaced')).toBeDefined();
  });

  it('preserves uncontrolled initialValue and onChange', () => {
    const handleChange = vi.fn();
    render(
      <EmailEditor initialValue="<p>Hello World</p>" onChange={handleChange} />
    );
    expect(screen.getByText('Hello World')).toBeDefined();

    const contentEditable = document.querySelector('.ree-content') as HTMLElement;
    contentEditable.innerHTML = '<p>New Content</p>';
    fireEvent.input(contentEditable);
    expect(handleChange).toHaveBeenCalledWith('<p>New Content</p>');
  });

  it('exposes getHTML and setHTML via ref and notifies onChange on setHTML', () => {
    const ref = createRef<EmailEditorRef>();
    const handleChange = vi.fn();
    render(<EmailEditor ref={ref} onChange={handleChange} />);

    expect(ref.current).not.toBeNull();

    act(() => {
      ref.current?.setHTML('<p>Hi</p>');
    });

    expect(ref.current?.getHTML()).toContain('Hi');
    expect(handleChange).toHaveBeenCalledWith('<p>Hi</p>');
    expect(screen.getByText('Hi')).toBeDefined();
  });

  it('clears content via ref.clear()', () => {
    const ref = createRef<EmailEditorRef>();
    const handleChange = vi.fn();
    render(
      <EmailEditor
        ref={ref}
        initialValue="<p>to clear</p>"
        onChange={handleChange}
      />
    );

    act(() => {
      ref.current?.clear();
    });

    expect(ref.current?.getHTML() ?? '').toBe('');
    expect(handleChange).toHaveBeenCalledWith('');
    expect(document.querySelector('.ree-placeholder')).not.toBeNull();
  });

  it('focuses contenteditable via ref.focus() without throwing', () => {
    const ref = createRef<EmailEditorRef>();
    render(<EmailEditor ref={ref} />);

    expect(() => {
      act(() => {
        ref.current?.focus();
      });
    }).not.toThrow();

    const content = document.querySelector('.ree-content');
    // jsdom may or may not move activeElement; smoke that element exists
    expect(ref.current?.getContentElement()).toBe(content);
  });

  it('prefers value over initialValue when both are provided', () => {
    render(
      <EmailEditor value="<p>Controlled</p>" initialValue="<p>Initial</p>" />
    );
    expect(screen.getByText('Controlled')).toBeDefined();
    expect(screen.queryByText('Initial')).toBeNull();
  });
});
