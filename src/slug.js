/**
 * Turn a route ("/", "/about", "/blog/post?id=1") into a filesystem-safe slug.
 * "/" (or empty) becomes "index".
 */
export function slugify(route) {
  const slug = String(route ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+/, '') // tolerate absolute URLs
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'index';
}
