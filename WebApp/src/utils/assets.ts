/**
 * Bundled static assets.
 *
 * Using `new URL(path, import.meta.url)` tells Vite to
 *  1. copy the file into the build output, and
 *  2. rewrite the path to the fingerprinted location.
 *
 * The result: these assets ship inside the app and are always
 * available offline — no network fetch ever required.
 */

export const LOGO_URL = new URL('../assets/logo.png', import.meta.url).href
