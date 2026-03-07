import { useState, useEffect } from "react";
import { getSignedStorageUrl } from "@/lib/storage";

/**
 * React hook to fetch a signed URL for a private storage file.
 * Returns the URL string (empty while loading).
 */
export function useSignedUrl(
  bucket: "device-photos" | "service-order-attachments",
  path: string | null | undefined
): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!path) {
      setUrl("");
      return;
    }

    let cancelled = false;
    getSignedStorageUrl(bucket, path).then((signedUrl) => {
      if (!cancelled) setUrl(signedUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [bucket, path]);

  return url;
}
