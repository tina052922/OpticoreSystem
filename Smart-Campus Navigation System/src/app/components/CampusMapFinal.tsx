import { useEffect, useRef, useState } from 'react';
import { Location, PathNode } from '../types/campus';

interface CampusMapFinalProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function CampusMapFinal({ selectedLocation, routePath, onLocationClick }: CampusMapFinalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Load SVG and apply interactive styling
  useEffect(() => {
    if (!containerRef.current) return;

    // Import the SVG file using dynamic import
    import('../../imports/Cebu_Technological_University-_Argao_Campus_Map_(2).svg?raw')
      .then(module => {
        if (containerRef.current) {
          containerRef.current.innerHTML = module.default;
          setSvgLoaded(true);
        }
      })
      .catch(err => {
        console.error('Failed to load SVG:', err);
        // Fallback: try fetch
        fetch('/src/imports/Cebu_Technological_University-_Argao_Campus_Map_(2).svg')
          .then(res => res.text())
          .then(svgContent => {
            if (containerRef.current) {
              containerRef.current.innerHTML = svgContent;
              setSvgLoaded(true);
            }
          })
          .catch(fetchErr => console.error('Fallback fetch also failed:', fetchErr));
      });
  }, []);

  // Apply interactive styling once SVG is loaded
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Style gates to be less prominent (boundaries only)
    const gates = svg.querySelectorAll('[fill="#6E6D6D"]');
    gates.forEach(gate => {
      gate.setAttribute('opacity', '0.25');
      gate.setAttribute('stroke', '#999');
      gate.setAttribute('stroke-width', '0.5');
    });

    // Highlight walkable grey roads
    const greyRoads = svg.querySelectorAll('[stroke="#B4BEC7"]');
    greyRoads.forEach(road => {
      road.setAttribute('stroke-width', '11');
      road.setAttribute('opacity', '0.9');
      road.setAttribute('stroke-linecap', 'round');
      road.setAttribute('stroke-linejoin', 'round');
    });

    // Highlight walkable blue pathways
    const bluePathways = svg.querySelectorAll('[stroke="#3BB4FF"]');
    bluePathways.forEach(pathway => {
      pathway.setAttribute('stroke-width', '7');
      pathway.setAttribute('opacity', '0.95');
      pathway.setAttribute('stroke-linecap', 'round');
      pathway.setAttribute('stroke-linejoin', 'round');
    });

    // Make buildings interactive
    const buildings = svg.querySelectorAll('rect[fill="#C5C3C3"], rect[fill="#D9D9D9"], rect[fill="#A1A1A1"]');
    buildings.forEach(building => {
      const originalFill = building.getAttribute('fill') || '';
      if (originalFill !== '#6E6D6D') {
        building.setAttribute('cursor', 'pointer');
        building.setAttribute('data-original-fill', originalFill);

        building.addEventListener('mouseenter', () => {
          building.setAttribute('fill', '#FFC857');
          building.setAttribute('opacity', '0.9');
        });

        building.addEventListener('mouseleave', () => {
          building.setAttribute('fill', originalFill);
          building.setAttribute('opacity', '1');
        });
      }
    });

  }, [svgLoaded]);

  // Draw route overlay
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Remove existing route
    const existingRoute = svg.querySelector('#route-overlay');
    if (existingRoute) existingRoute.remove();

    if (routePath.length > 1) {
      const pathData = routePath.map((node, i) => `${i === 0 ? 'M' : 'L'} ${node.x} ${node.y}`).join(' ');

      const routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      routeGroup.setAttribute('id', 'route-overlay');

      // Main route line
      const routeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      routeLine.setAttribute('d', pathData);
      routeLine.setAttribute('stroke', '#FF3B3B');
      routeLine.setAttribute('stroke-width', '10');
      routeLine.setAttribute('fill', 'none');
      routeLine.setAttribute('opacity', '0.85');
      routeLine.setAttribute('stroke-linecap', 'round');
      routeLine.setAttribute('stroke-linejoin', 'round');

      // Animated dashes
      const animatedLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      animatedLine.setAttribute('d', pathData);
      animatedLine.setAttribute('stroke', '#FFFFFF');
      animatedLine.setAttribute('stroke-width', '4');
      animatedLine.setAttribute('fill', 'none');
      animatedLine.setAttribute('stroke-dasharray', '12 12');
      animatedLine.setAttribute('stroke-linecap', 'round');

      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      animate.setAttribute('from', '0');
      animate.setAttribute('to', '24');
      animate.setAttribute('dur', '1s');
      animate.setAttribute('repeatCount', 'indefinite');
      animatedLine.appendChild(animate);

      // Start marker
      const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startMarker.setAttribute('cx', String(routePath[0].x));
      startMarker.setAttribute('cy', String(routePath[0].y));
      startMarker.setAttribute('r', '10');
      startMarker.setAttribute('fill', '#10B981');
      startMarker.setAttribute('stroke', '#FFF');
      startMarker.setAttribute('stroke-width', '4');

      // End marker
      const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endMarker.setAttribute('cx', String(routePath[routePath.length - 1].x));
      endMarker.setAttribute('cy', String(routePath[routePath.length - 1].y));
      endMarker.setAttribute('r', '10');
      endMarker.setAttribute('fill', '#EF4444');
      endMarker.setAttribute('stroke', '#FFF');
      endMarker.setAttribute('stroke-width', '4');

      routeGroup.appendChild(routeLine);
      routeGroup.appendChild(animatedLine);
      routeGroup.appendChild(startMarker);
      routeGroup.appendChild(endMarker);

      svg.appendChild(routeGroup);
    }
  }, [svgLoaded, routePath]);

  // Highlight selected location
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;

    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Remove existing selection
    const existingMarker = svg.querySelector('#selection-marker');
    if (existingMarker) existingMarker.remove();

    if (selectedLocation) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      marker.setAttribute('id', 'selection-marker');

      // Pulsing circle
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('cx', String(selectedLocation.x));
      pulseCircle.setAttribute('cy', String(selectedLocation.y));
      pulseCircle.setAttribute('r', '20');
      pulseCircle.setAttribute('fill', '#3B82F6');
      pulseCircle.setAttribute('opacity', '0.4');

      const pulseAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseAnimate.setAttribute('attributeName', 'r');
      pulseAnimate.setAttribute('from', '15');
      pulseAnimate.setAttribute('to', '35');
      pulseAnimate.setAttribute('dur', '1.5s');
      pulseAnimate.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(pulseAnimate);

      const opacityAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      opacityAnimate.setAttribute('attributeName', 'opacity');
      opacityAnimate.setAttribute('from', '0.5');
      opacityAnimate.setAttribute('to', '0');
      opacityAnimate.setAttribute('dur', '1.5s');
      opacityAnimate.setAttribute('repeatCount', 'indefinite');
      pulseCircle.appendChild(opacityAnimate);

      // Center pin
      const centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      centerPin.setAttribute('cx', String(selectedLocation.x));
      centerPin.setAttribute('cy', String(selectedLocation.y));
      centerPin.setAttribute('r', '10');
      centerPin.setAttribute('fill', '#3B82F6');
      centerPin.setAttribute('stroke', '#FFF');
      centerPin.setAttribute('stroke-width', '4');

      marker.appendChild(pulseCircle);
      marker.appendChild(centerPin);
      svg.appendChild(marker);
    }
  }, [svgLoaded, selectedLocation]);

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden relative">
      {!svgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Loading campus map...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      )}
      <div className="w-full h-full overflow-auto" style={{ background: '#F8FFFE' }}>
        <div ref={containerRef} className="w-full h-full min-w-[1728px] min-h-[1117px]"></div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-white/98 backdrop-blur-sm rounded-xl shadow-2xl p-5 border-2 border-gray-200">
        <div className="font-semibold text-gray-800 mb-3 text-sm">Navigation Map Legend</div>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-1.5 bg-[#B4BEC7] rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Main Roads</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1.5 bg-[#3BB4FF] rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Walkways</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1.5 bg-[#6E6D6D] opacity-25 rounded-full"></div>
            <span className="text-gray-500">Gates (Boundaries)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1.5 bg-[#FF3B3B] rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Your Route</span>
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
            <div className="w-4 h-4 rounded-full bg-[#3B82F6] border-2 border-white shadow-sm"></div>
            <span className="text-gray-700 font-medium">Selected Location</span>
          </div>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute top-6 right-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-900 shadow-md">
        <span className="font-semibold">💡 Tip:</span> Scroll to zoom, drag to pan
      </div>
    </div>
  );
}
