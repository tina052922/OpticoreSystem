import { useCallback, useEffect, useRef, useState } from 'react';

interface MapSVGLoaderProps {
  onLoad: (svg: SVGSVGElement) => void;
}

/**
 * The served map (`public/maps/ctu-argao-campus-map.svg`, optimized by
 * `opticore-web/scripts/optimize-campus-map.mjs`). It is preloaded from the HTML, cached by the
 * browser, and kept in memory here, so opening the navigator again does not download it twice.
 */
const PUBLIC_MAP_URL = '/maps/ctu-argao-campus-map.svg';

let mapTextPromise: Promise<string> | null = null;

async function fetchWithRetry(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`Map request failed (${res.status})`);
      const text = await res.text();
      if (!text.includes('<svg')) throw new Error('The map file is not an SVG');
      return text;
    } catch (err) {
      lastError = err;
      // Short backoff for flaky mobile connections.
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load the campus map');
}

function loadMapText(): Promise<string> {
  if (!mapTextPromise) {
    mapTextPromise = fetchWithRetry(PUBLIC_MAP_URL).catch(async () => {
      // Last resort: the copy bundled with the app — a separate chunk, downloaded only when needed.
      const mod = await import('../../imports/Cebu_Technological_University-_Argao_Campus_Map_(2).svg?raw');
      return mod.default as string;
    });
    // A failure must not stick: the next attempt (Retry) starts again.
    mapTextPromise.catch(() => {
      mapTextPromise = null;
    });
  }
  return mapTextPromise;
}

export function MapSVGLoader({ onLoad }: MapSVGLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadMapText()
      .then((svgText) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svgText;
        const svgElement = containerRef.current.querySelector('svg');
        if (!svgElement) throw new Error('No SVG element found');
        onLoad(svgElement);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onLoad, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <div className="relative w-full h-full min-w-[1728px] min-h-[1117px]">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#d9f0d3]">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-[#780301] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">Loading campus map…</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center text-red-700 px-6">
            <p className="font-semibold text-lg">Could not load the campus map</p>
            <p className="text-sm mt-1">Check your connection, then try again.</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-[#780301] px-5 py-2.5 text-sm font-semibold text-white shadow"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
