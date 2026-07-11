import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { slugify, formatDuration, excerptFrom, buildEpisodes } from '../scripts/lib/episodes.mjs';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Renovation That Broke Me')).toBe('the-renovation-that-broke-me');
  });
  it('strips punctuation and collapses dashes', () => {
    expect(slugify('Tim Kacprzak: The Sport Nobody Knows How To Get Paid For'))
      .toBe('tim-kacprzak-the-sport-nobody-knows-how-to-get-paid-for');
  });
});

describe('formatDuration', () => {
  it('formats HH:MM:SS', () => expect(formatDuration('01:38:14')).toBe('1 hr 38 min'));
  it('formats sub-hour', () => expect(formatDuration('00:59:02')).toBe('59 min'));
  it('formats bare seconds', () => expect(formatDuration('3725')).toBe('1 hr 2 min'));
});

describe('excerptFrom', () => {
  it('strips tags and truncates on a word boundary', () => {
    const html = '<p>Alex spent an <b>entire week</b> off work.</p>';
    expect(excerptFrom(html, 30)).toBe('Alex spent an entire week off…');
  });
  it('returns short text untouched', () => {
    expect(excerptFrom('<p>Short.</p>')).toBe('Short.');
  });
});

describe('buildEpisodes', () => {
  const xml = readFileSync('tests/fixtures/feed-sample.xml', 'utf8');
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const items = [].concat(parsed.rss.channel.item);

  it('numbers newest-first from total count', () => {
    const eps = buildEpisodes(items, 83);
    expect(eps[0].number).toBe(83);
    expect(eps[1].number).toBe(82);
  });

  it('produces unique slugs, ISO dates, string titles', () => {
    const eps = buildEpisodes(items, 83);
    expect(new Set(eps.map(e => e.slug)).size).toBe(eps.length);
    expect(eps[0].pubDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof eps[0].title).toBe('string');
    expect(eps[0].title.length).toBeGreaterThan(0);
  });

  it('carries audio url and duration', () => {
    const eps = buildEpisodes(items, 83);
    expect(eps[0].audioUrl).toMatch(/^https?:\/\//);
    expect(eps[0].duration).toMatch(/min$/);
  });

  it('deduplicates colliding slugs', () => {
    const twin = [{ ...items[0] }, { ...items[0] }];
    const eps = buildEpisodes(twin, 2);
    expect(eps[0].slug).not.toBe(eps[1].slug);
  });
});

describe('sanitizeHtml', async () => {
  const { sanitizeHtml } = await import('../scripts/lib/episodes.mjs');
  it('strips script tags and their content', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
  });
  it('strips iframes, objects and embeds', () => {
    expect(sanitizeHtml('<iframe src="x"></iframe><p>ok</p><embed src="y">')).toBe('<p>ok</p>');
  });
  it('strips on* event handlers and javascript: urls', () => {
    expect(sanitizeHtml('<p onclick="evil()">hi</p>')).toBe('<p>hi</p>');
    expect(sanitizeHtml('<a href="javascript:evil()">x</a>')).toBe('<a>x</a>');
  });
  it('keeps normal formatting', () => {
    const clean = '<p>Timestamps:<br>(00:14) Welcome back</p><ul><li>a</li></ul>';
    expect(sanitizeHtml(clean)).toBe(clean);
  });
});

describe('toHtml (description overrides)', async () => {
  const { toHtml } = await import('../scripts/lib/episodes.mjs');
  it('converts hook + bullets + lines', () => {
    const out = toHtml('Hook line one.\nHook line two.\n\nIn this episode:\n- First thing\n- Second thing\n\n(00:14) Start\n(05:30) Middle');
    expect(out).toContain('<p>Hook line one.<br>Hook line two.</p>');
    expect(out).toContain('<ul><li>First thing</li><li>Second thing</li></ul>');
    expect(out).toContain('<p>(00:14) Start<br>(05:30) Middle</p>');
  });
});
