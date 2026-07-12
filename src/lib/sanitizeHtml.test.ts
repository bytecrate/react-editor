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

  it('strips dangerous style expressions', () => {
    const out = sanitizeEmailHtml('<p style="color:red; expression(alert(1))">x</p>');
    expect(out).not.toMatch(/expression/i);
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
});
