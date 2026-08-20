"use client";

import { useState, type ReactElement } from "react";
import { BlobProvider } from "@react-pdf/renderer";

type PDFActionBarProps = {
  document: ReactElement;
  filename: string;
};

export function PDFActionBar({ document, filename }: PDFActionBarProps) {
  const [printing, setPrinting] = useState(false);

  return (
    <BlobProvider document={document}>
      {({ blob, loading, error }) => {
        if (error) {
          return (
            <div className="flex items-center gap-2 text-sm text-red-600">
              PDF generation failed: {error.message}
            </div>
          );
        }

        const handleDownload = () => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement("a");
          a.href = url;
          a.download = filename;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        const handlePrint = () => {
          if (!blob || printing) return;
          setPrinting(true);
          const url = URL.createObjectURL(blob);
          const iframe = window.document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          window.document.body.appendChild(iframe);
          iframe.onload = () => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              window.document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
              setPrinting(false);
            }, 1000);
          };
        };

        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !blob}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#15304f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !blob || printing}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printing ? "Sending to printer…" : "Print"}
            </button>
          </div>
        );
      }}
    </BlobProvider>
  );
}
