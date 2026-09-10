import { useEffect, useRef, useState } from 'react';

// Bundled fallback (used when public map is missing).
// Vite will include this file in the build output automatically.
import bundledMapSvgText from '../../imports/Cebu_Technological_University-_Argao_Campus_Map_(2).svg?raw';

interface MapSVGLoaderProps {
  onLoad: (svg: SVGSVGElement) => void;
}

// Prefer a public URL so the map file is easy to find/replace:
// `public/maps/ctu-argao-campus-map.svg` → `/maps/ctu-argao-campus-map.svg`
const PUBLIC_MAP_URL = '/maps/ctu-argao-campus-map.svg';

export function MapSVGLoader({ onLoad }: MapSVGLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSVG = async () => {
      try {
        if (!containerRef.current) return;

        const tryFetch = async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to load SVG (${res.status})`);
          return await res.text();
        };

        let svgText: string;
        try {
          svgText = await tryFetch(PUBLIC_MAP_URL);
        } catch {
          svgText = bundledMapSvgText;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = svgText;
          const svgElement = containerRef.current.querySelector('svg');

          if (svgElement) {
            onLoad(svgElement);
            setLoading(false);
          } else {
            throw new Error('No SVG element found');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadSVG();
  }, [onLoad]);

  return (
    <div className="relative w-full h-full min-w-[1728px] min-h-[1117px]">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Loading campus map...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error loading map</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
