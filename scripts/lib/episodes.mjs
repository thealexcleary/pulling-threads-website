export function slugify(title) {
  return String(title).toLowerCase().replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function formatDuration(raw) {
  let secs;
  if (/^\d+$/.test(raw)) secs = Number(raw);
  else {
    const parts = String(raw).split(':').map(Number);
    secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

export function excerptFrom(html, max = 220) {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function buildEpisodes(items, totalCount) {
  const seen = new Map();
  return items.map((item, i) => {
    const title = String(item.title ?? '');
    let slug = slugify(title);
    const n = (seen.get(slug) || 0) + 1;
    seen.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    const descriptionHtml = sanitizeHtml(String(item['content:encoded'] ?? item.description ?? ''));
    return {
      number: totalCount - i,
      slug,
      title,
      descriptionHtml,
      excerpt: excerptFrom(descriptionHtml),
      pubDate: new Date(item.pubDate).toISOString(),
      duration: formatDuration(String(item['itunes:duration'] ?? '0')),
      audioUrl: item.enclosure?.['@_url'] ?? null,
      youtubeId: null,
    };
  });
}

// Strip anything executable from feed HTML before it is rendered with set:html.
// The feed is Alex's own, but if it were ever compromised the site must not execute it.
export function sanitizeHtml(html) {
  return String(html)
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
}
