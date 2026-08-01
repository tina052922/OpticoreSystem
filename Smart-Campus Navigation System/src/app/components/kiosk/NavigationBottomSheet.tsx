import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '../ui/utils';

const SNAP_POINTS = ['72px', 0.45, 0.92] as const;
type SnapValue = (typeof SNAP_POINTS)[number];

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
  const [snap, setSnap] = useState<SnapValue | null>(SNAP_POINTS[0]);
  const prevSelectionRef = useRef(hasSelection);

  useEffect(() => {
    if (hasSelection && !prevSelectionRef.current) {
      setSnap(SNAP_POINTS[1]);
    }
    prevSelectionRef.current = hasSelection;
  }, [hasSelection]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '[data-vaul-overlay]{pointer-events:none!important;}';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Ensure vaul/overlay does not make outside elements inert or aria-hidden,
  // which can block interaction with floating search inputs. Observe and
  // proactively remove `inert` and blocking `aria-hidden` attributes from
  // elements outside the bottom sheet so the search remains interactive.
  useEffect(() => {
    const cleanupAttrs = () => {
      try {
        document.querySelectorAll('[inert]').forEach((el) => el.removeAttribute('inert'));
        document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
          // leave aria-hidden on the drawer content itself if present
          if (!(el as HTMLElement).closest('[data-vaul-portal]') && !(el as HTMLElement).closest('[data-vaul-root]')) {
            el.removeAttribute('aria-hidden');
          }
        });
      } catch (e) {
        // ignore errors during DOM mutation handling
      }
    };

    // Run once to clear any existing attributes
    cleanupAttrs();

    // Observe for attribute changes and clear them immediately
    const obs = new MutationObserver((mutations) => {
      let found = false;
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'inert' || m.attributeName === 'aria-hidden')) {
          found = true;
          break;
        }
      }
      if (found) cleanupAttrs();
    });

    obs.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['inert', 'aria-hidden'] });

    return () => obs.disconnect();
  }, []);

  return (
    <DrawerPrimitive.Root
      open
      modal={false}
      noBodyStyles={true}
      autoFocus={false}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={(point) => setSnap(point as SnapValue | null)}
      dismissible={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 flex flex-col bg-card/98 backdrop-blur-md',
            'rounded-t-2xl border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.12)]',
            'outline-none max-h-[96dvh] mx-auto w-full sm:max-w-2xl lg:max-w-3xl',
            className
          )}
        >
          <div className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
            <DrawerPrimitive.Handle className="h-1.5 w-12 rounded-full bg-muted-foreground/35 mb-2" />
            {snap === SNAP_POINTS[0] && (
              <p className="text-xs font-medium text-muted-foreground px-4 text-center truncate max-w-full">
                {hasSelection ? peekTitle : 'Search or tap the map to explore campus'}
              </p>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
