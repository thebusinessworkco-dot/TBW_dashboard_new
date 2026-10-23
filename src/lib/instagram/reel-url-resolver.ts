/**
 * THE BUSINESS WORK — INSTAGRAM REEL URL RESOLVER & VALIDATOR
 *
 * Implements strict, safe URL normalization, shortcode extraction,
 * and canonical permalink formatting for Instagram Reels.
 */

export interface ParsedReelUrl {
  isValid: boolean;
  shortcode: string | null;
  normalizedUrl: string | null;
  error?: string;
}

/**
 * Standard Instagram Reel & Post Shortcode Regex
 * Matches URLs like:
 * - https://www.instagram.com/reel/C8_ABC123/
 * - https://instagram.com/reel/C8_ABC123?igsh=MXR...
 * - https://www.instagram.com/p/C8_ABC123/
 * - https://www.instagram.com/tv/C8_ABC123/
 * - /reel/C8_ABC123/
 */
const INSTAGRAM_SHORTCODE_REGEX =
  /(?:(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p|tv)\/|^\/reel\/|^\/p\/|^\/tv\/)([a-zA-Z0-9_-]+)/i;

/**
 * Validates and extracts canonical shortcode and normalized URL from a raw input string.
 * Strips tracking parameters (igsh, utm_source, etc.) and fragments.
 */
export function parseAndNormalizeInstagramReelUrl(rawUrl: string): ParsedReelUrl {
  const input = String(rawUrl || '').trim();
  if (!input) {
    return {
      isValid: false,
      shortcode: null,
      normalizedUrl: null,
      error: 'Please enter an Instagram Reel URL.',
    };
  }

  // Handle bare shortcode input (e.g. C8_ABC123)
  if (/^[a-zA-Z0-9_-]{5,30}$/.test(input) && !input.includes('.')) {
    const shortcode = input;
    return {
      isValid: true,
      shortcode,
      normalizedUrl: `https://www.instagram.com/reel/${shortcode}/`,
    };
  }

  const match = input.match(INSTAGRAM_SHORTCODE_REGEX);
  if (!match || !match[1]) {
    return {
      isValid: false,
      shortcode: null,
      normalizedUrl: null,
      error: 'Invalid Instagram URL format. Expected: https://www.instagram.com/reel/SHORTCODE/',
    };
  }

  const shortcode = match[1];
  if (shortcode.length < 3 || shortcode.length > 50) {
    return {
      isValid: false,
      shortcode: null,
      normalizedUrl: null,
      error: 'Extracted shortcode is invalid.',
    };
  }

  return {
    isValid: true,
    shortcode,
    normalizedUrl: `https://www.instagram.com/reel/${shortcode}/`,
  };
}
