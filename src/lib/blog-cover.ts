/** Known-good Pexels covers when a post URL is missing. */
const RELIABLE_PEXELS = [
  "https://images.pexels.com/photos/8817671/pexels-photo-8817671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/18425164/pexels-photo-18425164.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/5437587/pexels-photo-5437587.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/7584353/pexels-photo-7584353.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

export function isRemoteBlogCover(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function isPhotoCover(src: string): boolean {
  return isRemoteBlogCover(src) && src.includes("pexels.com");
}

export function resolveBlogCoverUrl(slug: string, url: string | null): string {
  if (url && isRemoteBlogCover(url)) return url;
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) | 0;
  return RELIABLE_PEXELS[Math.abs(h) % RELIABLE_PEXELS.length]!;
}
