import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../ui/utils';

/** Closed (just the header), open, and full height. */
const HEIGHTS = ['64px', '46dvh', '90dvh'] as const;
type Snap = 0 | 1 | 2;

interface NavigationBottomSheetProps {
  children: ReactNode;
  /** Open the sheet when the user picks a destination. */
  hasSelection: boolean;
  /** Changes whenever a place is picked (its id), so picking another place opens the sheet again. */
  selectionKey?: string | null;
  peekTitle?: string;
  className?: string;
}

/**
 * The bottom panel. It toggles: tap the header (or the chevron) to open or close it. Swipe up to
 * make it full height, swipe down to close it. It opens by itself when a destination is chosen.
 */
export function NavigationBottomSheet({
  children,
  hasSelection,
  selectionKey = null,
  peekTitle = 'Search or tap the map',
  className,
}: NavigationBottomSheetProps) {
  const [snap, setSnap] = useState<Snap>(0);
  /** The height to return to when re-opened (open or full). */
  const lastOpenRef = useRef<Snap>(1);
  const prevSelectionRef = useRef(hasSelection);
  const dragRef = useRef<{ startY: number; startSnap: Snap; moved: boolean } | null>(null);
  const bodyId = useId();
  const open = snap > 0;

  const goTo = (next: Snap) => {
    if (next > 0) lastOpenRef.current = next;
    setSnap(next);
  };
  const toggle = () => goTo(open ? 0 : lastOpenRef.current);

  // Every pick opens the details at full height, on phones and laptops alike.
  useEffect(() => {
    if (selectionKey) {
      goTo(2);
    } else if (prevSelectionRef.current) {
      goTo(0);
    }
    prevSelectionRef.current = Boolean(selectionKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return; // the chevron handles its own tap
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startSnap: snap, moved: false };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const dy = drag.startY - event.clientY;
    if (Math.abs(dy) < 10) return toggle(); // a tap
    if (dy > 40) goTo(Math.min(2, drag.startSnap + 1) as Snap); // swipe up
    else if (dy < -40) goTo(dy < -160 ? 0 : (Math.max(0, drag.startSnap - 1) as Snap)); // swipe down
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      goTo(Math.min(2, snap + 1) as Snap);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      goTo(Math.max(0, snap - 1) as Snap);
    }
  };

  const title = hasSelection ? peekTitle : 'Search or tap the map to explore campus';

  return (
    <section
      aria-label="Campus navigation"
      className={cn(
        // Full height: in front of the search bar and chips (z-50). Otherwise below them, so the
        // search results list can still drop down over the half-open panel.
        'absolute inset-x-0 bottom-0 flex flex-col bg-card',
        snap === 2 ? 'z-[60]' : 'z-40',
        'rounded-t-2xl border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.12)]',
        'max-h-[96dvh] mx-auto w-full sm:max-w-2xl lg:max-w-3xl',
        className
      )}
      style={{ height: HEIGHTS[snap], transition: 'height 220ms cubic-bezier(.2,.8,.2,1)', willChange: 'height' }}
    >
      <h2 className="sr-only">Campus navigation</h2>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={open ? 'Close the navigation panel' : 'Open the navigation panel'}
        className="shrink-0 select-none touch-none cursor-pointer px-4 pt-2 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-opticore-orange/50 rounded-t-2xl"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/35" />
        <div className="mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{title}</p>
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? 'Hide panel' : 'Show panel'}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground shadow-sm active:scale-[0.97]"
          >
            {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div
        id={bodyId}
        aria-hidden={!open}
        className={cn('flex-1 min-h-0 overflow-hidden flex-col', open ? 'flex' : 'hidden')}
      >
        {children}
      </div>
    </section>
  );
}
