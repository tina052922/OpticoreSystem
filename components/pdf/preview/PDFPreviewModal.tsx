"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { PDFActionBar } from "./PDFActionBar";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false },
);

type PDFPreviewModalProps = {
  document: ReactElement;
  filename: string;
  open: boolean;
  onClose: () => void;
};

export function PDFPreviewModal({
  document,
  filename,
  open,
  onClose,
}: PDFPreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /**
   * Freeze the document at the moment the preview opens.
   *
   * `PDFViewer` and `BlobProvider` both re-render on `document` *identity*
   * (`useEffect(..., [children])`). Background pollers rebuild the parent's
   * `pdfData` memo, so without this the open preview would regenerate — and
   * visibly flash — every time a poll landed, even for unchanged data.
   *
   * Re-opening the modal always picks up the latest content, so this trades a
   * live-updating preview (which nobody asked for and which loses scroll
   * position) for a stable one.
   */
  const frozenDocumentRef = useRef<ReactElement | null>(null);
  if (!open) {
    frozenDocumentRef.current = null;
  } else if (frozenDocumentRef.current === null) {
    frozenDocumentRef.current = document;
  }
  const stableDocument = frozenDocumentRef.current;

  if (!open || !mounted || !stableDocument) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900 truncate">
          {filename}
        </h2>
        <div className="flex items-center gap-4">
          <PDFActionBar document={stableDocument} filename={filename} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close preview"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-neutral-100 p-4">
        <PDFViewer
          width="100%"
          height="100%"
          showToolbar={false}
          style={{ border: "none", borderRadius: 8 }}
        >
          {stableDocument}
        </PDFViewer>
      </div>
    </div>
  );
}
