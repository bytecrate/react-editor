/**
 * Integration tests for paste sanitization and dangerous URL policy (plan 016).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EmailEditor } from './EmailEditor';

describe('EmailEditor paste + URL sanitization', () => {
  beforeEach(() => {
    document.execCommand = vi.fn().mockImplementation((command: string, _show?: boolean, value?: string) => {
      if (command === 'insertHTML' && value) {
        const content = document.querySelector('.ree-content');
        if (content) {
          content.innerHTML = value;
        }
        return true;
      }
      if (command === 'insertText' && value) {
        const content = document.querySelector('.ree-content');
        if (content) {
          content.textContent = (content.textContent ?? '') + value;
        }
        return true;
      }
      if (command === 'createLink' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const anchor = document.createElement('a');
          anchor.setAttribute('href', value);
          try {
            anchor.appendChild(range.extractContents());
            range.insertNode(anchor);
          } catch {
            const content = document.querySelector('.ree-content');
            if (content) {
              anchor.textContent = 'link';
              content.appendChild(anchor);
            }
          }
        }
        return true;
      }
      return true;
    });
    document.queryCommandState = vi.fn().mockReturnValue(false);
    document.queryCommandValue = vi.fn().mockReturnValue('');
  });

  function pasteHtml(contentEditable: HTMLElement, html: string, plain = '') {
    // jsdom ClipboardEvent is limited; provide clipboardData via fireEvent
    act(() => {
      fireEvent.paste(contentEditable, {
        clipboardData: {
          getData: (type: string) => {
            if (type === 'text/html') return html;
            if (type === 'text/plain') return plain;
            return '';
          },
        },
      });
    });
  }

  it('paste path inserts sanitized HTML (no onclick/script)', () => {
    render(<EmailEditor toolbarConfig={[]} />);
    const contentEditable = document.querySelector('.ree-content') as HTMLElement;

    pasteHtml(
      contentEditable,
      '<p onclick="evil()">Hello</p><script>x</script>'
    );

    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      expect.stringMatching(/Hello/)
    );

    const inserted = (document.execCommand as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'insertHTML'
    )?.[2] as string;

    expect(inserted).not.toMatch(/onclick/i);
    expect(inserted).not.toMatch(/<script/i);

    const content = document.querySelector('.ree-content') as HTMLElement;
    expect(content.innerHTML).not.toMatch(/onclick/i);
    expect(content.innerHTML).not.toMatch(/<script/i);
    expect(content.textContent).toContain('Hello');
  });

  it('calls onPasteHtml when provided instead of built-in sanitizer for paste', () => {
    const onPasteHtml = vi.fn((html: string) => `<div data-host="1">${html}</div>`);
    // Host returns markup with a disallowed attr — we trust host override as documented
    render(<EmailEditor toolbarConfig={[]} onPasteHtml={onPasteHtml} />);
    const contentEditable = document.querySelector('.ree-content') as HTMLElement;

    pasteHtml(contentEditable, '<p>raw</p>');

    expect(onPasteHtml).toHaveBeenCalledWith('<p>raw</p>');
    expect(document.execCommand).toHaveBeenCalledWith(
      'insertHTML',
      false,
      expect.stringContaining('raw')
    );
  });

  it('does not intercept paste when sanitize={false}', () => {
    render(<EmailEditor toolbarConfig={[]} sanitize={false} />);
    const contentEditable = document.querySelector('.ree-content') as HTMLElement;

    pasteHtml(contentEditable, '<p onclick="x">y</p>');

    expect(document.execCommand).not.toHaveBeenCalledWith(
      'insertHTML',
      false,
      expect.anything()
    );
  });

  it('rejects javascript: when applying a new link', () => {
    render(
      <EmailEditor
        initialValue={'<p>click me</p>'}
        toolbarConfig={[['link']]}
      />
    );

    const text = screen.getByText('click me');
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(screen.getByTitle('Link'));
    const input = screen.getByPlaceholderText('https://… or {{unsubscribe}}') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.mouseDown(screen.getByText('Apply'));

    const content = document.querySelector('.ree-content') as HTMLElement;
    const link = content.querySelector('a');
    // Dangerous URL rejected — no javascript: href left on an anchor
    if (link) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/javascript:/i);
    } else {
      expect(content.innerHTML).not.toMatch(/javascript:/i);
    }
  });

  it('rejects javascript: when editing an existing link href', () => {
    render(
      <EmailEditor
        initialValue={'<p><a href="https://old.example">click me</a></p>'}
        toolbarConfig={[['link']]}
      />
    );

    const anchor = screen.getByText('click me') as HTMLAnchorElement;
    const range = document.createRange();
    range.selectNodeContents(anchor);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(document.querySelector('.ree-content') as HTMLElement);

    fireEvent.mouseDown(screen.getByTitle('Edit Link'));
    const input = screen.getByPlaceholderText('https://… or {{unsubscribe}}') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.mouseDown(screen.getByText('Update'));

    const content = document.querySelector('.ree-content') as HTMLElement;
    const link = content.querySelector('a');
    expect(link).not.toBeNull();
    // Original safe href retained (apply rejected)
    expect(link!.getAttribute('href')).toBe('https://old.example');
  });

  it('still allows merge-tag hrefs', () => {
    render(
      <EmailEditor
        initialValue={'<p>click me</p>'}
        toolbarConfig={[['link']]}
        variables={[{ label: 'Unsub', value: '{{unsubscribe}}' }]}
      />
    );

    const text = screen.getByText('click me');
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(screen.getByTitle('Link'));
    fireEvent.mouseDown(screen.getByText('Unsub'));

    const content = document.querySelector('.ree-content') as HTMLElement;
    const link = content.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('{{unsubscribe}}');
  });

  it('sanitizes setHTML / seed HTML (strips script)', () => {
    render(
      <EmailEditor initialValue={'<p>safe</p><script>alert(1)</script>'} toolbarConfig={[]} />
    );
    const content = document.querySelector('.ree-content') as HTMLElement;
    expect(content.innerHTML).not.toMatch(/script/i);
    expect(content.textContent).toContain('safe');
  });
});
