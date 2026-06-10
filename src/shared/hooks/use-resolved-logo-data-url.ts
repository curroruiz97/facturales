import { useEffect, useState } from "react";

/**
 * Resolves a logo URL (remote or data-URI) into a data URL suitable for
 * embedding in PDF generation.  Returns `undefined` while loading or on error.
 *
 * Handles:
 * - `null`/`undefined` source → returns `undefined`
 * - `data:image/…` source → returns as-is (no fetch)
 * - Remote URL → fetches, converts to data URL via FileReader
 * - Cleanup via AbortController to avoid race conditions on fast source changes
 */
export function useResolvedLogoDataUrl(source: string | null | undefined): string | undefined {
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!source) {
      setDataUrl(undefined);
      return;
    }

    if (source.startsWith("data:image/")) {
      setDataUrl(source);
      return;
    }

    const controller = new AbortController();

    const resolve = async () => {
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) return;
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (controller.signal.aborted) return;
          setDataUrl(typeof reader.result === "string" ? reader.result : undefined);
        };
        reader.readAsDataURL(blob);
      } catch {
        if (!controller.signal.aborted) {
          setDataUrl(undefined);
        }
      }
    };

    void resolve();
    return () => controller.abort();
  }, [source]);

  return dataUrl;
}
