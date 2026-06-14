/**
 * Umami event tracking utility.
 * Safe wrapper — never throws, never breaks user experience.
 * Refer to https://docs.umami.is/docs/track-events for event tracking doc
 * and https://docs.umami.is/docs/tracker-functions for the JS tracker API.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

declare global {
  interface Window {
    umami?: {
      track(eventName: string, data?: Record<string, unknown>): void
    }
  }
}

/** Safely check whether the Umami tracker is loaded. */
function isUmamiReady(): boolean {
  return typeof window !== 'undefined' && typeof window.umami?.track === 'function'
}

/**
 * Track a custom event via Umami.
 *
 * @param eventName - Event name (max 50 chars per Umami limits).
 * @param data       - Optional event data payload.
 */
export function trackEvent(eventName: string, data?: Record<string, unknown>): void {
  if (!isUmamiReady()) return
  try {
    window.umami!.track(eventName, data)
  } catch {
    // Tracking must never break the UI — silently ignore errors.
  }
}
