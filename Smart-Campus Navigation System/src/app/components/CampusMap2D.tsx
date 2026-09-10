import { useEffect, useRef, useState } from 'react';
import { Location, PathNode } from '../types/campus';
import { validPathways } from '../services/pathwayExtractor';

interface CampusMap2DProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function CampusMap2D({ selectedLocation, routePath, onLocationClick }: CampusMap2DProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [svgLoaded, setSvgLoaded] = useState(false);

  useEffect(() => {
    // Load the actual SVG file
    fetch('/src/imports/Cebu_Technological_University-_Argao_Campus_Map_(2).svg')
      .then(res => res.text())
      .then(content => {
        setSvgContent(content);
        setSvgLoaded(true);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, []);

  useEffect(() => {
    if (!svgLoaded || !svgRef.current) return;

    const container = svgRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Style gates differently - make them less prominent
    const gates = svg.querySelectorAll('[fill="#6E6D6D"]');
    gates.forEach(gate => {
      gate.setAttribute('opacity', '0.3');
      gate.setAttribute('stroke', '#999');
      gate.setAttribute('stroke-width', '0.5');
    });

    // Highlight walkable pathways
    const greyRoads = svg.querySelectorAll('[stroke="#B4BEC7"]');
    greyRoads.forEach(road => {
      road.setAttribute('stroke-width', '10');
      road.setAttribute('opacity', '0.8');
    });

    const bluePathways = svg.querySelectorAll('[stroke="#3BB4FF"]');
    bluePathways.forEach(pathway => {
      pathway.setAttribute('stroke-width', '6');
      pathway.setAttribute('opacity', '0.9');
    });

    // Make buildings interactive
    const buildings = svg.querySelectorAll('rect[fill]:not([fill="#6E6D6D"]):not([fill="#E3FFEE"])');
    buildings.forEach(building => {
      building.setAttribute('cursor', 'pointer');
      building.classList.add('building-element');

      // Add hover effect
      building.addEventListener('mouseenter', () => {
        const currentFill = building.getAttribute('fill') || '';
        building.setAttribute('data-original-fill', currentFill);
        building.setAttribute('fill', '#FFD700');
        building.setAttribute('opacity', '0.8');
      });

      building.addEventListener('mouseleave', () => {
        const originalFill = building.getAttribute('data-original-fill') || '';
        building.setAttribute('fill', originalFill);
        building.setAttribute('opacity', '1');
      });
    });

  }, [svgLoaded, svgContent]);

  useEffect(() => {
    if (!svgLoaded || !svgRef.current || !routePath.length) return;

    const container = svgRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remove existing route overlay
    const existingRoute = svg.querySelector('#route-overlay');
    if (existingRoute) {
      existingRoute.remove();
    }

    // Create route path
    if (routePath.length > 1) {
      const pathData = routePath
        .map((node, index) => `${index === 0 ? 'M' : 'L'} ${node.x} ${node.y}`)
        .join(' ');

      const routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      routeGroup.setAttribute('id', 'route-overlay');

      // Route line
      const routeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      routeLine.setAttribute('d', pathData);
      routeLine.setAttribute('stroke', '#FF4444');
      routeLine.setAttribute('stroke-width', '8');
      routeLine.setAttribute('fill', 'none');
      routeLine.setAttribute('opacity', '0.8');
      routeLine.setAttribute('stroke-linecap', 'round');
      routeLine.setAttribute('stroke-linejoin', 'round');

      // Animated dashed overlay
      const animatedLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      animatedLine.setAttribute('d', pathData);
      animatedLine.setAttribute('stroke', '#FFF');
      animatedLine.setAttribute('stroke-width', '3');
      animatedLine.setAttribute('fill', 'none');
      animatedLine.setAttribute('stroke-dasharray', '10 10');
      animatedLine.setAttribute('stroke-linecap', 'round');

      // Animation
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      animate.setAttribute('from', '0');
      animate.setAttribute('to', '20');
      animate.setAttribute('dur', '1s');
      animate.setAttribute('repeatCount', 'indefinite');
      animatedLine.appendChild(animate);

      // Start and end markers
      const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startMarker.setAttribute('cx', String(routePath[0].x));
      startMarker.setAttribute('cy', String(routePath[0].y));
      startMarker.setAttribute('r', '8');
      startMarker.setAttribute('fill', '#22C55E');
      startMarker.setAttribute('stroke', '#FFF');
      startMarker.setAttribute('stroke-width', '3');

      const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endMarker.setAttribute('cx', String(routePath[routePath.length - 1].x));
      endMarker.setAttribute('cy', String(routePath[routePath.length - 1].y));
      endMarker.setAttribute('r', '8');
      endMarker.setAttribute('fill', '#EF4444');
      endMarker.setAttribute('stroke', '#FFF');
      endMarker.setAttribute('stroke-width', '3');

      routeGroup.appendChild(routeLine);
      routeGroup.appendChild(animatedLine);
      routeGroup.appendChild(startMarker);
      routeGroup.appendChild(endMarker);

      svg.appendChild(routeGroup);
    }
  }, [svgLoaded, routePath]);

  useEffect(() => {
    if (!svgLoaded || !svgRef.current || !selectedLocation) return;

    const container = svgRef.current;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remove existing selection marker
    const existingMarker = svg.querySelector('#selection-marker');
    if (existingMarker) {
      existingMarker.remove();
    }

    // Add selection marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    marker.setAttribute('id', 'selection-marker');

    const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulseCircle.setAttribute('cx', String(selectedLocation.x));
    pulseCircle.setAttribute('cy', String(selectedLocation.y));
    pulseCircle.setAttribute('r', '20');
    pulseCircle.setAttribute('fill', '#3B82F6');
    pulseCircle.setAttribute('opacity', '0.3');

    const pulseAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    pulseAnimate.setAttribute('attributeName', 'r');
    pulseAnimate.setAttribute('from', '15');
    pulseAnimate.setAttribute('to', '30');
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

    const centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerPin.setAttribute('cx', String(selectedLocation.x));
    centerPin.setAttribute('cy', String(selectedLocation.y));
    centerPin.setAttribute('r', '8');
    centerPin.setAttribute('fill', '#3B82F6');
    centerPin.setAttribute('stroke', '#FFF');
    centerPin.setAttribute('stroke-width', '3');

    marker.appendChild(pulseCircle);
    marker.appendChild(centerPin);
    svg.appendChild(marker);
  }, [svgLoaded, selectedLocation]);

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="w-full h-full overflow-auto">
        {!svgLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading campus map...</p>
            </div>
          </div>
        )}
        <div
          ref={svgRef}
          className="w-full h-full min-w-[1728px] min-h-[1117px]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* Pathway Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="text-xs font-semibold text-gray-700 mb-2">Map Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-[#B4BEC7] rounded"></div>
            <span className="text-gray-600">Main Roads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-[#3BB4FF] rounded"></div>
            <span className="text-gray-600">Walkways</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-[#6E6D6D] opacity-30 rounded"></div>
            <span className="text-gray-600">Gates (Boundaries)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-[#FF4444] rounded"></div>
            <span className="text-gray-600">Your Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
