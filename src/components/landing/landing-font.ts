import { Schibsted_Grotesk } from 'next/font/google';

/**
 * Marketing typeface from the "Landing – Redesign" design file. The root
 * layout exposes it as `--font-landing`; only the `.lp` shell (globals.css)
 * applies it, so the app keeps Geist and nothing is preloaded on app pages.
 * Georgian glyphs fall back to the system sans.
 */
export const landingFont = Schibsted_Grotesk({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--font-landing',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});
