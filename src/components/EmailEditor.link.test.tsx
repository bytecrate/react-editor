/**
 * Regression tests for link bugs:
 * 1) Edit link missing (must prefill / update existing <a> href)
 * 2) Variable as href not supported via UI
 *
 * Command: npx vitest run src/components/link-repro.test.tsx
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmailEditor } from './EmailEditor';

describe('Link edit + variable href', () => {
  beforeEach(() => {
    document.execCommand = vi.fn().mockImplementation((command: string, _show?: boolean, value?: string) => {
      if (command === 'createLink' && value) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const anchor = document.createElement('a');
          anchor.setAttribute('href', value);
          // If selection is collapsed inside text, wrap a bit of content
          if (range.collapsed) {
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE && textNode.parentElement) {
              const parent = textNode.parentElement;
              // Prefer wrapping the whole text node content for tests
              range.selectNodeContents(parent.childNodes.length === 1 ? parent : textNode);
            }
          }
          try {
            anchor.appendChild(range.extractContents());
            range.insertNode(anchor);
          } catch {
            // Fallback: append to content area
            const content = document.querySelector('.ree-content');
            if (content) {
              anchor.textContent = 'link';
              content.appendChild(anchor);
            }
          }
        }
        return true;
      }
      if (command === 'unlink') {
        const selection = window.getSelection();
        let node: Node | null = selection?.anchorNode ?? null;
        if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
        while (node && !(node instanceof HTMLAnchorElement)) {
          node = node.parentNode;
        }
        if (node instanceof HTMLAnchorElement) {
          const parent = node.parentNode;
          while (node.firstChild) parent?.insertBefore(node.firstChild, node);
          parent?.removeChild(node);
        }
        return true;
      }
      return true;
    });
    document.queryCommandState = vi.fn().mockReturnValue(false);
    document.queryCommandValue = vi.fn().mockReturnValue('');
  });

  function placeCaretIn(el: Node) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Drive format detection used by the toolbar
    fireEvent.mouseUp(document.querySelector('.ree-content') as HTMLElement);
  }

  it('SYMPTOM 1: when caret is inside an existing link, Link action prefills current href for editing', () => {
    render(
      <EmailEditor
        initialValue={'<p><a href="https://old.example">click me</a></p>'}
        toolbarConfig={[['link']]}
      />
    );

    const anchor = screen.getByText('click me') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe('https://old.example');
    placeCaretIn(anchor);

    fireEvent.mouseDown(screen.getByTitle('Edit Link'));

    const input = screen.getByPlaceholderText('https://… or {{unsubscribe}}') as HTMLInputElement;
    expect(input.value).toBe('https://old.example');
  });

  it('SYMPTOM 1b: editing an existing link updates its href (does not leave the old URL)', () => {
    const onChange = vi.fn();
    render(
      <EmailEditor
        initialValue={'<p><a href="https://old.example">click me</a></p>'}
        onChange={onChange}
        toolbarConfig={[['link']]}
      />
    );

    const anchor = screen.getByText('click me') as HTMLAnchorElement;
    placeCaretIn(anchor);

    fireEvent.mouseDown(screen.getByTitle('Edit Link'));

    const input = screen.getByPlaceholderText('https://… or {{unsubscribe}}') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '{{unsubscribe}}' } });
    fireEvent.mouseDown(screen.getByText('Update'));

    const content = document.querySelector('.ree-content') as HTMLElement;
    const link = content.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('{{unsubscribe}}');
  });

  it('SYMPTOM 2: link UI allows applying a variable as the href', () => {
    const onChange = vi.fn();
    render(
      <EmailEditor
        initialValue={'<p>click me</p>'}
        onChange={onChange}
        toolbarConfig={[['link']]}
        variables={[{ label: 'Unsubscribe URL', value: '{{unsubscribe}}' }]}
      />
    );

    const text = screen.getByText('click me');
    // Select the whole text so createLink has a range to wrap
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseDown(screen.getByTitle('Link'));

    const varOption = screen.getByText('Unsubscribe URL');
    expect(varOption).not.toBeNull();
    fireEvent.mouseDown(varOption);

    const content = document.querySelector('.ree-content') as HTMLElement;
    const link = content.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('{{unsubscribe}}');
  });

  it('can remove an existing link from the edit popup', () => {
    render(
      <EmailEditor
        initialValue={'<p><a href="https://old.example">click me</a></p>'}
        toolbarConfig={[['link']]}
      />
    );

    placeCaretIn(screen.getByText('click me'));
    fireEvent.mouseDown(screen.getByTitle('Edit Link'));
    fireEvent.mouseDown(screen.getByTitle('Remove link'));

    const content = document.querySelector('.ree-content') as HTMLElement;
    expect(content.querySelector('a')).toBeNull();
    expect(content.textContent).toContain('click me');
  });
});
