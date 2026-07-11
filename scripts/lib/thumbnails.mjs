export const normTitle = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function thumbnailUrl(episode, showImage) {
  return episode.youtubeId
    ? `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`
    : showImage;
}

export function matchUploads(episodes, uploads) {
  const byTitle = new Map(uploads.map(u => [normTitle(u.title), u.videoId]));
  for (const ep of episodes) {
    // The live channel feed is the source of truth: an exact title match
    // replaces a stored id (covers deleted/re-uploaded videos).
    const fresh = byTitle.get(normTitle(ep.title));
    if (fresh) ep.youtubeId = fresh;
    else if (!ep.youtubeId) ep.youtubeId = null;
  }
}
