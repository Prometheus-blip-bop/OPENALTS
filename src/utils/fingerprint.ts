/**
 * Anti-Abuse and Fingerprint Security utility functions for referral validation.
 */

/**
 * Generates a stable browser/device fingerprint based on screen dimensions,
 * canvas signature, language, timezone offset, and hardware properties.
 */
export function getDeviceFingerprint(): string {
  try {
    const n = navigator;
    const screenSig = `${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 0}`;
    const userAgent = n.userAgent || "unknown-ua";
    const lang = n.language || "unknown-lang";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown-tz";
    const hardware = `${n.hardwareConcurrency || "x"}-${(n as any).deviceMemory || "y"}`;
    
    // Create canvas hash
    let canvasHash = "no-canvas";
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("OpenAltReferralGuard", 2, 15);
        canvasHash = canvas.toDataURL().slice(-50);
      }
    } catch (_) {}

    const rawId = [screenSig, userAgent, lang, tz, hardware, canvasHash].join("|");
    
    // Quick simple checksum / hash function for cleaner storage
    let hash = 0;
    for (let i = 0; i < rawId.length; i++) {
      const char = rawId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `DEV-${Math.abs(hash).toString(16).toUpperCase()}`;
  } catch (err) {
    console.warn("Fingerprint capture fallback:", err);
    return "DEV-FALLBACK";
  }
}

/**
 * Normalizes emails to strip Google alias variations (dots and standard "+" tags)
 * to prevent users from referring themselves using alternative Gmail handles.
 */
export function normalizeEmail(email: string): string {
  if (!email) return "";
  const cleaned = email.trim().toLowerCase();
  const parts = cleaned.split("@");
  if (parts.length !== 2) return cleaned;
  
  let [local, domain] = parts;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    // Strip all dots
    local = local.replace(/\./g, "");
    // Remove everything after '+'
    local = local.split("+")[0];
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

/**
 * Predictably formats or recovers a user's invite code
 */
export function getReferralCode(username: string): string {
  if (!username) return "";
  return username.trim().toUpperCase();
}
