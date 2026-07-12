import { describe, it, expect } from 'vitest';
import { sanitizeEmailHtml, isSafeUrl, sanitizeUrl } from './sanitizeHtml';

describe('isSafeUrl / sanitizeUrl', () => {
  it('allows https, http, mailto, cid, anchors, relative, data:image, merge tags', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://example.com/path')).toBe(true);
    expect(isSafeUrl('mailto:user@example.com')).toBe(true);
    expect(isSafeUrl('cid:image001')).toBe(true);
    expect(isSafeUrl('#section')).toBe(true);
    expect(isSafeUrl('/relative/path')).toBe(true);
    expect(isSafeUrl('./rel.png')).toBe(true);
    expect(isSafeUrl('../up.png')).toBe(true);
    expect(isSafeUrl('images/photo.png')).toBe(true);
    expect(isSafeUrl('data:image/png;base64,abc')).toBe(true);
    expect(isSafeUrl('{{unsubscribe}}')).toBe(true);
    expect(isSafeUrl('{{ user.unsubscribe_url }}')).toBe(true);
  });

  it('rejects javascript, vbscript, data:text/html, and empty', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
    expect(isSafeUrl('  javascript:alert(1)  ')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('   ')).toBe(false);
  });

  it('rejects javascript with tab/LF/CR injection (WHATWG strips those chars)', () => {
    expect(isSafeUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\nscript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\rscript:alert(1)')).toBe(false);
    expect(isSafeUrl('javascript\t:alert(1)')).toBe(false);
    expect(sanitizeUrl('java\tscript:alert(1)')).toBeNull();
  });

  it('rejects data:image/svg+xml and allows common raster data images', () => {
    expect(isSafeUrl('data:image/svg+xml,<svg></svg>')).toBe(false);
    expect(isSafeUrl('data:image/png;base64,abc')).toBe(true);
    expect(isSafeUrl('data:image/jpeg;base64,abc')).toBe(true);
  });

  it('sanitizeUrl returns trimmed safe urls or null', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    expect(sanitizeUrl('{{unsubscribe}}')).toBe('{{unsubscribe}}');
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('')).toBeNull();
  });
});

describe('sanitizeEmailHtml', () => {
  it('strips event handler attributes', () => {
    const out = sanitizeEmailHtml('<p onclick="alert(1)">x</p>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain('x');
  });

  it('strips onerror from images', () => {
    const out = sanitizeEmailHtml('<img src="https://example.com/x.png" onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
    expect(out).toMatch(/src=["']https:\/\/example\.com\/x\.png["']/i);
  });

  it('removes script tags but keeps surrounding safe content', () => {
    const out = sanitizeEmailHtml('<script>alert(1)</script><p>ok</p>');
    expect(out).not.toMatch(/script/i);
    expect(out).toContain('ok');
  });

  it('removes href from javascript: links (policy: strip href)', () => {
    const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
    // Anchor may remain without href, or without the dangerous attribute
    expect(out).toContain('x');
    const hasJsHref = /href\s*=\s*["']?\s*javascript:/i.test(out);
    expect(hasJsHref).toBe(false);
  });

  it('preserves merge-tag hrefs', () => {
    const out = sanitizeEmailHtml('<a href="{{unsubscribe}}">x</a>');
    expect(out).toMatch(/href=["']\{\{unsubscribe\}\}["']/);
  });

  it('preserves https links', () => {
    const out = sanitizeEmailHtml('<a href="https://example.com">x</a>');
    expect(out).toMatch(/href=["']https:\/\/example\.com["']/);
  });

  it('preserves data:image src', () => {
    const out = sanitizeEmailHtml('<img src="data:image/png;base64,abc" alt="pic">');
    expect(out).toMatch(/src=["']data:image\/png;base64,abc["']/);
    expect(out).toMatch(/alt=["']pic["']/);
  });

  it('preserves safe email style declarations', () => {
    const out = sanitizeEmailHtml('<p style="color:red">x</p>');
    expect(out).toMatch(/style=/);
    expect(out).toMatch(/color:\s*red/i);
  });

  it('strips dangerous style expressions and url() values', () => {
    const out = sanitizeEmailHtml(
      '<p style="color:red; expression(alert(1)); background-color: blue">x</p>'
    );
    expect(out).not.toMatch(/expression/i);
    expect(out).toMatch(/color:\s*red/i);
    expect(out).toMatch(/background-color:\s*blue/i);

    const withUrl = sanitizeEmailHtml(
      '<p style="background-color:red; color: url(javascript:alert(1))">x</p>'
    );
    expect(withUrl).not.toMatch(/url\s*\(/i);
  });

  it('does not allow background shorthand with url()', () => {
    const out = sanitizeEmailHtml(
      '<p style="background: url(data:text/html,x); color:blue">x</p>'
    );
    expect(out).not.toMatch(/background\s*:/i);
    expect(out).not.toMatch(/data:text\/html/i);
    expect(out).toMatch(/color:\s*blue/i);
  });

  it('adds rel=noopener noreferrer for target=_blank links', () => {
    const out = sanitizeEmailHtml(
      '<a href="https://example.com" target="_blank">x</a>'
    );
    expect(out).toMatch(/target=["']_blank["']/i);
    expect(out).toMatch(/rel=["'][^"']*noopener/i);
    expect(out).toMatch(/noreferrer/i);
  });

  it('removes iframe, object, embed, form, and style tags', () => {
    const out = sanitizeEmailHtml(
      '<p>a</p><iframe src="https://evil"></iframe><object></object><embed><form><input></form><style>body{}</style><p>b</p>'
    );
    expect(out).not.toMatch(/iframe|object|embed|form|input|<style/i);
    expect(out).toContain('a');
    expect(out).toContain('b');
  });

  it('strips or neutralizes Word-like o:p junk harmlessly', () => {
    const out = sanitizeEmailHtml('<p>Hello<o:p></o:p></p>');
    expect(out).toContain('Hello');
    // Namespaced o:p is not in allowlist — removed or unwrapped
    expect(out).not.toMatch(/<o:p/i);
  });

  it('keeps font tags with font-size style (editor font-size path)', () => {
    const out = sanitizeEmailHtml(
      '<font size="7" style="font-size: 12px;">sized</font>'
    );
    expect(out).toMatch(/<font/i);
    expect(out).toMatch(/font-size:\s*12px/i);
    expect(out).toContain('sized');
  });

  it('allows table markup for email layouts', () => {
    const out = sanitizeEmailHtml(
      '<table><tbody><tr><td colspan="2">cell</td></tr></tbody></table>'
    );
    expect(out).toMatch(/<table/i);
    expect(out).toMatch(/colspan=["']?2["']?/i);
    expect(out).toContain('cell');
  });

  it('strips srcdoc and other disallowed attributes', () => {
    const out = sanitizeEmailHtml('<div srcdoc="<script>x</script>">y</div>');
    expect(out).not.toMatch(/srcdoc/i);
    expect(out).toContain('y');
  });

  it('preserves merge-tag chip spans and their attributes', () => {
    const chip =
      '<span class="ree-merge-tag" data-merge-tag="{{firstName}}" contenteditable="false" title="{{firstName}}">First Name</span>';
    const out = sanitizeEmailHtml(`<p>Hi ${chip}</p>`);
    expect(out).toMatch(/class=["']ree-merge-tag["']/);
    expect(out).toMatch(/data-merge-tag=["']\{\{firstName\}\}["']/);
    expect(out).toMatch(/contenteditable=["']false["']/i);
    expect(out).toMatch(/title=["']\{\{firstName\}\}["']/);
    expect(out).toContain('First Name');
  });

  it('does not allow contenteditable or chip attrs on non-chip elements', () => {
    const out = sanitizeEmailHtml(
      '<div contenteditable="false" class="locked" title="t">x</div>'
    );
    expect(out).not.toMatch(/contenteditable/i);
    expect(out).not.toMatch(/class=/i);
    expect(out).not.toMatch(/title=/i);
    expect(out).toContain('x');
  });

  it('strips chip-like class without data-merge-tag', () => {
    const out = sanitizeEmailHtml(
      '<span class="ree-merge-tag" contenteditable="false">First Name</span>'
    );
    expect(out).not.toMatch(/contenteditable/i);
    expect(out).not.toMatch(/ree-merge-tag/);
    expect(out).toContain('First Name');
  });
});
