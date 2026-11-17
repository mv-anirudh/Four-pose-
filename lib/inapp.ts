/**
 * Browsers built into social apps (Instagram, Facebook, X, TikTok, Snapchat, LinkedIn and others)
 * ignore normal website downloads, so a "Download" link does nothing there. When we detect one,
 * the app shows the finished image to press and hold instead.
 */
const IN_APP = [
  /Instagram/i,
  /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, // Facebook and Messenger
  /Twitter|TwitterAndroid/i,
  /\bLine\//i,
  /Snapchat/i,
  /musical_ly|BytedanceWebview|TikTok/i,
  /LinkedInApp/i,
  /Pinterest/i,
  /\bGSA\//i, // Google app on iPhone
  /; wv\)/i, // Android WebView, used by most in-app browsers
];

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return IN_APP.some((re) => re.test(ua));
}

/** The app's name for the "open in your browser" hint, when we can tell. */
export function inAppName(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return 'Facebook';
  if (/Twitter/i.test(ua)) return 'X';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  return null;
}
