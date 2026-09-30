"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { embedSignatureSlotImagesForPdf } from "@/lib/pdf/embed-image-urls";
import type { PDFSignatureSlot } from "@/components/pdf/types/insTypes";

function slotSignatureKey(slots: PDFSignatureSlot[] | undefined): string {
  if (!slots?.length) return "";
  return slots.map((s) => `${s.key}:${s.imageUrl ?? ""}:${s.signerName}`).join("|");
}

export type PdfEmbeddedSignatures = {
  slots: PDFSignatureSlot[] | undefined;
  /** False while remote e-signature images are being converted for react-pdf. */
  ready: boolean;
};

/**
 * Converts remote signature image URLs to data URLs so @react-pdf/renderer
 * can paint them in PDF preview / download / print.
 *
 * `ready` stays false until http(s) images are embedded, so callers can delay
 * opening PDFPreviewModal until signatures will actually render.
 */
export function usePdfEmbeddedSignatureSlots(
  slots: PDFSignatureSlot[] | undefined,
): PdfEmbeddedSignatures {
  const [embedded, setEmbedded] = useState<PDFSignatureSlot[] | undefined>(undefined);
  const [ready, setReady] = useState(() => !slots?.some((s) => /^https?:\/\//i.test(s.imageUrl?.trim() || "")));
  const key = slotSignatureKey(slots);
  /**
   * The key the current state belongs to.
   *
   * Embedding is async, so a result can land after the slots have moved on. Writing it anyway sets
   * a fresh array on every stray resolution, and each of those is a re-render — enough, when
   * something upstream is already re-rendering in a loop, for this to be the hook that trips
   * React's update-depth limit and takes the blame for it.
   */
  const settledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slots?.length) {
      if (settledKeyRef.current !== key) {
        settledKeyRef.current = key;
        setEmbedded(undefined);
      }
      setReady(true);
      return;
    }
    const needsEmbed = slots.some((s) => /^https?:\/\//i.test(s.imageUrl?.trim() || ""));
    if (!needsEmbed) {
      // Nothing to fetch: adopt the slots as they are, but only once per key.
      if (settledKeyRef.current !== key) {
        settledKeyRef.current = key;
        setEmbedded(slots);
      }
      setReady(true);
      return;
    }
    setReady(false);
    void embedSignatureSlotImagesForPdf(slots).then((next) => {
      if (cancelled) return;
      if (settledKeyRef.current === key) return;
      settledKeyRef.current = key;
      setEmbedded(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => ({ slots: embedded, ready }), [embedded, ready]);
}
