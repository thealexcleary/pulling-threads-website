export const normTitle = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function thumbnailUrl(episode, showImage) {
  return episode.youtubeId
    ? `https://i.ytimg.com/vi/${episode.youtubeId}/hqdefault.jpg`
    : showImage;
}

export function matchUploads(episodes, uploads) {
  const byTitle = new Map(uploads.map(u => [normTitle(u.title), u.videoId]));
  for (const ep of episodes) {
    if (!ep.youtubeId) ep.youtubeId = byTitle.get(normTitle(ep.title)) ?? null;
  }
}
