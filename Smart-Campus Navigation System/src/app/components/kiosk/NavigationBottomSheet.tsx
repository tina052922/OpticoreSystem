import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../ui/utils';

/** Peek, half, expanded — same visual snaps as before, without a Radix/vaul dialog. */
const HEIGHTS = ['72px', '45dvh', '92dvh'] as const;

interface NavigationBottomSheetProps {
  children: ReactNode;
  /** Expand sheet when user selects a destination */
  hasSelection: boolean;
  peekTitle?: string;
  className?: string;
}

export function NavigationBottomSheet({
  children,
  hasSelection,
  peekTitle = 'Search or tap the map',
  className,
}: NavigationBottomSheetProps) {
  const [snapIndex, setSnapIndex] = useState(0);
  const prevSelectionRef = useRef(hasSelection);
  const dragRef = useRef<{ startY: number; startIndex: number } | null>(null);

  useEffect(() => {
    if (hasSelection && !prevSelectionRef.current) {
      setSnapIndex(1);
    } else if (!hasSelection && prevSelectionRef.current) {
      setSnapIndex(0);
    }
    prevSelectionRef.current = hasSelection;
  }, [hasSelection]);

  const onHandlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startIndex: snapIndex };
  };

  const onHandlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const dy = drag.startY - event.clientY;
    if (Math.abs(dy) < 10) {
      setSnapIndex((index) => (index + 1) % HEIGHTS.length);
      return;
    }
    if (dy > 40) {
      setSnapIndex(Math.min(HEIGHTS.length - 1, drag.startIndex + 1));
    } else if (dy < -40) {
      setSnapIndex(Math.max(0, drag.startIndex - 1));
    }
  };

  return (
    <section
      aria-label="Campus navigation"
      className={cn(
        'absolute inset-x-0 bottom-0 z-40 flex flex-col bg-card/98 backdrop-blur-md',
        'rounded-t-2xl border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.12)]',
        'max-h-[96dvh] mx-auto w-full sm:max-w-2xl lg:max-w-3xl',
        className
      )}
      style={{ height: HEIGHTS[snapIndex], transition: 'height 200ms ease' }}
    >
      <h2 className="sr-only">Campus navigation</h2>
      <div
        className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
      >
        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/35 mb-2" />
        {snapIndex === 0 && (
          <p className="text-xs font-medium text-muted-foreground px-4 text-center truncate max-w-full">
            {hasSelection ? peekTitle : 'Search or tap the map to explore campus'}
          </p>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
    </section>
  );
}
