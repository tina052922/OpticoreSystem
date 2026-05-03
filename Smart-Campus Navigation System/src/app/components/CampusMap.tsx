import { useEffect, useRef, useState } from 'react';
import { Location, PathNode } from '../types/campus';
import { locations } from '../data/campusData';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CampusMapProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function CampusMap({ selectedLocation, routePath, onLocationClick }: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  return (
    <div className="relative w-full h-full bg-gray-50 rounded-xl overflow-hidden shadow-2xl border border-gray-200">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
          title="Reset View"
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-4 z-10 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
        <span className="text-sm font-medium text-gray-700">{Math.round(scale * 100)}%</span>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1728 1117"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* Background */}
          <rect width="1728" height="1117" fill="#f0fdf4" />

          {/* Roads/Paths - Dark lines */}
          <rect x="587" y="1024" width="130" height="5" fill="#404040" />
          <rect x="748" y="1024" width="125" height="5" fill="#404040" />
          <rect x="901" y="1024" width="51" height="5" fill="#404040" />

          {/* Gates */}
          <g className="gates">
            <line x1="716" y1="1026.5" x2="749" y2="1026.5" stroke="#666" strokeWidth="2" />
            <rect x="715" y="1023" width="3" height="7" fill="#888" />
            <rect x="747" y="1023" width="3" height="7" fill="#888" />
          </g>

          {/* Oval - Green space with track */}
          <ellipse
            cx="742"
            cy="570"
            rx="56"
            ry="110"
            fill="#86efac"
            stroke="#22c55e"
            strokeWidth="8"
            transform="rotate(4 742 570)"
            className="transition-colors"
          />

          {/* Basketball Court */}
          <rect x="703" y="848" width="93" height="51" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />

          {/* Buildings - Modern style */}
          {locations.filter(loc => loc.type === 'building').map(loc => (
            <g
              key={loc.id}
              onClick={() => onLocationClick(loc)}
              onMouseEnter={() => setHoveredLocation(loc.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              className="cursor-pointer transition-all"
              style={{ pointerEvents: 'all' }}
            >
              <rect
                x={loc.x - 15}
                y={loc.y - 15}
                width="30"
                height="30"
                fill={selectedLocation?.id === loc.id ? '#3b82f6' : hoveredLocation === loc.id ? '#60a5fa' : '#cbd5e1'}
                stroke={selectedLocation?.id === loc.id ? '#1e40af' : '#94a3b8'}
                strokeWidth="2"
                rx="2"
                className="transition-all"
              />
              {(hoveredLocation === loc.id || selectedLocation?.id === loc.id) && (
                <text
                  x={loc.x}
                  y={loc.y - 20}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-gray-900 pointer-events-none"
                  style={{ fontSize: '12px' }}
                >
                  {loc.name}
                </text>
              )}
            </g>
          ))}

          {/* Rooms and Offices - Smaller markers */}
          {locations.filter(loc => loc.type === 'room' || loc.type === 'office').map(loc => (
            <g
              key={loc.id}
              onClick={() => onLocationClick(loc)}
              onMouseEnter={() => setHoveredLocation(loc.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              className="cursor-pointer"
            >
              <rect
                x={loc.x - 8}
                y={loc.y - 8}
                width="16"
                height="16"
                fill={selectedLocation?.id === loc.id ? '#8b5cf6' : hoveredLocation === loc.id ? '#a78bfa' : '#e0e7ff'}
                stroke={selectedLocation?.id === loc.id ? '#6d28d9' : '#c7d2fe'}
                strokeWidth="1.5"
                rx="1"
              />
              {(hoveredLocation === loc.id || selectedLocation?.id === loc.id) && (
                <text
                  x={loc.x}
                  y={loc.y - 12}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-gray-900 pointer-events-none"
                  style={{ fontSize: '10px' }}
                >
                  {loc.name}
                </text>
              )}
            </g>
          ))}

          {/* CRs - Special marker */}
          {locations.filter(loc => loc.type === 'cr').map(loc => (
            <g
              key={loc.id}
              onClick={() => onLocationClick(loc)}
              onMouseEnter={() => setHoveredLocation(loc.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              className="cursor-pointer"
            >
              <circle
                cx={loc.x}
                cy={loc.y}
                r="8"
                fill={selectedLocation?.id === loc.id ? '#ec4899' : hoveredLocation === loc.id ? '#f472b6' : '#fce7f3'}
                stroke={selectedLocation?.id === loc.id ? '#be185d' : '#fbcfe8'}
                strokeWidth="2"
              />
              {(hoveredLocation === loc.id || selectedLocation?.id === loc.id) && (
                <text
                  x={loc.x}
                  y={loc.y - 12}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-gray-900 pointer-events-none"
                  style={{ fontSize: '10px' }}
                >
                  {loc.name}
                </text>
              )}
            </g>
          ))}

          {/* Facilities - Diamond markers */}
          {locations.filter(loc => loc.type === 'facility').map(loc => (
            <g
              key={loc.id}
              onClick={() => onLocationClick(loc)}
              onMouseEnter={() => setHoveredLocation(loc.id)}
              onMouseLeave={() => setHoveredLocation(null)}
              className="cursor-pointer"
            >
              <rect
                x={loc.x - 10}
                y={loc.y - 10}
                width="20"
                height="20"
                fill={selectedLocation?.id === loc.id ? '#14b8a6' : hoveredLocation === loc.id ? '#2dd4bf' : '#ccfbf1'}
                stroke={selectedLocation?.id === loc.id ? '#0f766e' : '#5eead4'}
                strokeWidth="2"
                rx="2"
                transform={`rotate(45 ${loc.x} ${loc.y})`}
              />
              {(hoveredLocation === loc.id || selectedLocation?.id === loc.id) && (
                <text
                  x={loc.x}
                  y={loc.y - 18}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-gray-900 pointer-events-none"
                  style={{ fontSize: '11px' }}
                >
                  {loc.name}
                </text>
              )}
            </g>
          ))}

          {/* Route Path */}
          {routePath.length > 1 && (
            <g className="route-path">
              <path
                d={`M ${routePath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 4"
                className="animate-pulse"
              />
              {routePath.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={index === 0 ? '#22c55e' : index === routePath.length - 1 ? '#ef4444' : '#3b82f6'}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}

          {/* Selected Location Highlight */}
          {selectedLocation && (
            <g className="selected-highlight">
              <circle
                cx={selectedLocation.x}
                cy={selectedLocation.y}
                r="25"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="5 3"
                className="animate-pulse"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="text-sm font-semibold text-gray-900 mb-2">Legend</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-300 border-2 border-slate-400 rounded-sm" />
            <span className="text-gray-700">Buildings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded-sm" />
            <span className="text-gray-700">Rooms/Offices</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-100 border-2 border-pink-300 rounded-full" />
            <span className="text-gray-700">Comfort Rooms</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-100 border-2 border-teal-300 rounded-sm transform rotate-45" />
            <span className="text-gray-700">Facilities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed #3b82f6' }} />
            <span className="text-gray-700">Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
