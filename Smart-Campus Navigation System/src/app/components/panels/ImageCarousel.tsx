import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeLocationImageSrc, PUBLIC_IMAGE_PLACEHOLDER } from '../../utils/publicAssetUrl';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  /** Resets slide index when search / map / directory selection changes. */
  locationKey: string;
}

export function ImageCarousel({ images, alt, locationKey }: ImageCarouselProps) {
  const resolved = useMemo(() => {
    const list = (images.length ? images : [PUBLIC_IMAGE_PLACEHOLDER]).map((u) => normalizeLocationImageSrc(u));
    return [...new Set(list)];
  }, [images]);

  const safe = resolved.length ? resolved : [normalizeLocationImageSrc(PUBLIC_IMAGE_PLACEHOLDER)];
  const [index, setIndex] = useState(0);

  const signature = `${locationKey}|${safe.join('\u0001')}`;
  useEffect(() => {
    setIndex(0);
  }, [signature]);

  const len = safe.length;
  const clamped = ((index % len) + len) % len;
  const intendedSrc = safe[clamped]!;
  const fallback = normalizeLocationImageSrc(PUBLIC_IMAGE_PLACEHOLDER);

  /** React-controlled src so a 404 does not get overwritten on the next render (DOM-only onError is not enough). */
  const [displaySrc, setDisplaySrc] = useState(intendedSrc);
  useEffect(() => {
    setDisplaySrc(intendedSrc);
  }, [intendedSrc, signature]);

  const next = useCallback(() => setIndex((i) => (i + 1) % len), [len]);
  const prev = useCallback(() => setIndex((i) => (i === 0 ? len - 1 : i - 1)), [len]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border bg-muted/40 shadow-inner"
      role="region"
      aria-roledescription="carousel"
      aria-label={`Photos of ${alt}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (len <= 1) return;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          next();
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prev();
        }
      }}
    >
      <div className="aspect-[16/10] relative flex items-center justify-center bg-gradient-to-br from-muted to-card">
        <AnimatePresence mode="wait">
          <motion.img
            key={`${locationKey}-${clamped}-${intendedSrc}`}
            src={displaySrc}
            alt={len > 1 ? `${alt} (${clamped + 1} of ${len})` : alt}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => {
              setDisplaySrc((cur) => (cur === fallback ? cur : fallback));
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          />
        </AnimatePresence>
      </div>

      {len > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/95 p-2 shadow-md border border-border hover:bg-card z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/95 p-2 shadow-md border border-border hover:bg-card z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            <div className="flex gap-1" role="tablist" aria-label="Image thumbnails">
              {safe.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === clamped}
                  aria-label={`Show image ${i + 1} of ${len}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === clamped ? 'bg-primary scale-110' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {clamped + 1} / {len}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
