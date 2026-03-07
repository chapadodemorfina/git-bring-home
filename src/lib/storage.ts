import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 min (signed URLs last 60 min)

/**
 * Get a signed URL for a private storage file.
 * Results are cached in-memory for 50 minutes.
 */
export async function getSignedStorageUrl(
  bucket: "device-photos" | "service-order-attachments",
  path: string
): Promise<string> {
  const key = `${bucket}:${path}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const { data, error } = await supabase.functions.invoke("signed-url", {
    body: { bucket, path },
  });

  if (error || !data?.signedUrl) {
    console.error("Failed to get signed URL:", error || data);
    // Return empty string so UI can handle gracefully
    return "";
  }

  cache.set(key, {
    url: data.signedUrl,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return data.signedUrl;
}
