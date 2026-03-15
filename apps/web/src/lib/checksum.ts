/**
 * Client-side HMAC-SHA256 checksum using Web Crypto API.
 * Must produce identical output to server-side computeChecksum in antiFraud.ts.
 */
export async function computeChecksum(
  sessionId: string,
  score: number,
  wave: number,
  kills: number,
  timestamp: number,
  secret: string,
): Promise<string> {
  const data = `${sessionId}:${score}:${wave}:${kills}:${timestamp}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
