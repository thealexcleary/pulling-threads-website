import { describe, it, expect } from 'vitest';
import { thumbnailUrl, matchUploads, normTitle } from '../scripts/lib/thumbnails.mjs';

describe('normTitle', () => {
  it('lowercases and strips punctuation', () => {
    expect(normTitle('The Renovation That Broke Me!')).toBe('the renovation that broke me');
  });
});

describe('thumbnailUrl', () => {
  it('uses youtube id when present', () => {
    expect(thumbnailUrl({ youtubeId: 'abc123' }, 'https://cover.jpg'))
      .toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
  });
  it('falls back to show cover', () => {
    expect(thumbnailUrl({ youtubeId: null }, 'https://cover.jpg')).toBe('https://cover.jpg');
  });
});

describe('matchUploads', () => {
  it('fills youtubeId by normalized title', () => {
    const eps = [{ title: 'The Renovation That Broke Me!', youtubeId: null }];
    const uploads = [{ title: 'the renovation that broke me', videoId: 'zzz' }];
    matchUploads(eps, uploads);
    expect(eps[0].youtubeId).toBe('zzz');
  });
  it('prefers the live feed on exact title match (stale re-upload ids)', () => {
    const eps = [{ title: 'X', youtubeId: 'stale' }];
    matchUploads(eps, [{ title: 'x', videoId: 'fresh' }]);
    expect(eps[0].youtubeId).toBe('fresh');
  });
  it('keeps an existing id when the feed has no match', () => {
    const eps = [{ title: 'Old Episode', youtubeId: 'keep' }];
    matchUploads(eps, [{ title: 'unrelated short', videoId: 'v' }]);
    expect(eps[0].youtubeId).toBe('keep');
  });
  it('leaves unmatched episodes null', () => {
    const eps = [{ title: 'Full Episode Title', youtubeId: null }];
    matchUploads(eps, [{ title: 'some unrelated short', videoId: 'v' }]);
    expect(eps[0].youtubeId).toBeNull();
  });
});
