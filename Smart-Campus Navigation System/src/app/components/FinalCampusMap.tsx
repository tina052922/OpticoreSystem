import { useRef, useState, useEffect } from 'react';
import { Location, PathNode } from '../types/campus';
import { ZoomIn, ZoomOut, Maximize2, Navigation as NavIcon, MapPin } from 'lucide-react';
import { locations } from '../data/campusData';

interface FinalCampusMapProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function FinalCampusMap({ selectedLocation, routePath, onLocationClick }: FinalCampusMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Make buildings interactive
    const buildings = svgRef.current.querySelectorAll('[data-building]');
    buildings.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const id = el.getAttribute('data-building');
        setHoveredId(id);
      });
      el.addEventListener('mouseleave', () => setHoveredId(null));
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-building');
        const loc = locations.find(l => l.id === id);
        if (loc) onLocationClick(loc);
      });
    });
  }, [onLocationClick]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleReset = () => { setScale(0.7); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => Math.max(0.4, Math.min(2.5, prev + delta)));
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-emerald-100 via-sky-50 to-green-50 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-300">
      {/* Controls */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
        {[
          { icon: ZoomIn, action: handleZoomIn, title: 'Zoom In' },
          { icon: ZoomOut, action: handleZoomOut, title: 'Zoom Out' },
          { icon: Maximize2, action: handleReset, title: 'Reset View' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-emerald-50 transition-all duration-200 border-2 border-emerald-200"
            title={title}
          >
            <Icon className="w-6 h-6 text-emerald-700" />
          </button>
        ))}
      </div>

      <div className="absolute top-6 left-6 z-20 px-4 py-3 bg-white rounded-xl shadow-lg border-2 border-emerald-200">
        <div className="flex items-center gap-2">
          <NavIcon className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-800">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Map */}
      <div
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg
            ref={svgRef}
            width="1728"
            height="1117"
            viewBox="0 0 1728 1117"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))' }}
          >
            <defs>
              {/* Enhanced Gradients */}
              <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              {/* Shadow filters */}
              <filter id="buildingShadow">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.25" />
              </filter>
              <filter id="softShadow">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
              </filter>

              {/* Tree pattern - modern styled */}
              <pattern id="treePattern" width="1" height="1" patternContentUnits="objectBoundingBox">
                <circle cx="0.5" cy="0.5" r="0.4" fill="#059669" opacity="0.8" />
                <circle cx="0.5" cy="0.5" r="0.25" fill="#10b981" opacity="0.6" />
              </pattern>

              <clipPath id="clip0_6_5">
                <rect width="1728" height="1117" fill="white" />
              </clipPath>
            </defs>

            <g clipPath="url(#clip0_6_5)">
              {/* Background - enhanced */}
              <rect width="1728" height="1117" fill="#e8f9f1" />

              {/* Pattern overlay for texture */}
              <rect width="1728" height="1117" fill="url(#pattern0_6_5)" opacity="0.03" />

              {/* Roads - Enhanced styling with gradient */}
              <rect x="587" y="1024" width="130" height="5" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="622.318" y="393" width="124.828" height="5" transform="rotate(3.64261 622.318 393)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="623.905" y="393.056" width="637.086" height="5" transform="rotate(93.3216 623.905 393.056)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="748" y="1024" width="125" height="5" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="949.624" y="872.224" width="98.3764" height="5" transform="rotate(-2.46074 949.624 872.224)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="862.246" y="633.851" width="189.228" height="5" transform="rotate(-0.257543 862.246 633.851)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="859.709" y="591.768" width="127.897" height="5" transform="rotate(-0.257543 859.709 591.768)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="865" y="428.913" width="100.122" height="5" transform="rotate(-8.01764 865 428.913)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="865.282" y="432.979" width="51.098" height="5" transform="rotate(-97.0461 865.282 432.979)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="891.409" y="258.337" width="51.098" height="5" transform="rotate(-94.485 891.409 258.337)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="1042.97" y="337.762" width="70.7622" height="5" transform="rotate(-89.9094 1042.97 337.762)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="948.663" y="209.334" width="109.542" height="5" transform="rotate(-80.8451 948.663 209.334)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="859" y="382.523" width="51.098" height="5" transform="rotate(-62.985 859 382.523)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="742" y="403.057" width="51.098" height="5" transform="rotate(-87.6901 742 403.057)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="882.105" y="337.037" width="163.369" height="5" transform="rotate(-1.52636 882.105 337.037)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="892.57" y="254.386" width="156.456" height="5" transform="rotate(4.24245 892.57 254.386)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="779.37" y="87" width="53.5638" height="5" transform="rotate(4.24245 779.37 87)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="866.37" y="93" width="105.163" height="5" transform="rotate(4.24245 866.37 93)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="887.37" y="204" width="66.4508" height="5" transform="rotate(4.24245 887.37 204)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="864" y="592" width="46.985" height="5" transform="rotate(89.9693 864 592)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="901" y="1024" width="51" height="5" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="954.627" y="872.868" width="156.133" height="5" transform="rotate(89.8005 954.627 872.868)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="1051.85" y="633.029" width="240.12" height="5" transform="rotate(90.4258 1051.85 633.029)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="784.768" y="87.6725" width="268.809" height="5" transform="rotate(97.7301 784.768 87.6725)" fill="url(#roadGradient)" filter="url(#softShadow)" />
              <rect x="964.777" y="419.645" width="174.808" height="5" transform="rotate(82.4391 964.777 419.645)" fill="url(#roadGradient)" filter="url(#softShadow)" />

              {/* Gates */}
              <g opacity="0.9">
                <line x1="716" y1="1026.5" x2="749" y2="1026.5" stroke="#64748b" strokeWidth="2" />
                <rect x="715" y="1023" width="3" height="7" fill="#94a3b8" />
                <rect x="747" y="1023" width="3" height="7" fill="#94a3b8" />
                <line x1="832.204" y1="93.5527" x2="865.147" y2="95.4895" stroke="#64748b" strokeWidth="2" />
                <rect x="831.411" y="90" width="3" height="7" transform="rotate(3.36472 831.411 90)" fill="#94a3b8" />
                <rect x="863.356" y="91.8781" width="3" height="7" transform="rotate(3.36472 863.356 91.8781)" fill="#94a3b8" />
                <line x1="871" y1="1026.5" x2="904" y2="1026.5" stroke="#64748b" strokeWidth="2" />
                <rect x="870" y="1023" width="3" height="7" fill="#94a3b8" />
                <rect x="901" y="1023" width="3" height="7" fill="#94a3b8" />
              </g>

              {/* Buildings - Enhanced with gradients */}
              <rect x="690" y="992" width="26" height="24" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="guard-house" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="696" y="987" width="20" height="7" fill="#cbd5e1" filter="url(#softShadow)" />
              <rect x="668" y="992" width="20" height="24" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="balay-alumni" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="646" y="992" width="20" height="24" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="kahimsug-center" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="596" y="994" width="41" height="22" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="coop-office" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* Office rooms */}
              {[906, 922, 938, 954, 970].map((y, i) => (
                <rect key={`office-${i}`} x="597.25" y={`${y}.25`} width="39.5" height="15.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-building={`office-${i}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              {/* Tourism rooms */}
              <rect x="631.25" y="862.25" width="13.5" height="32.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="tm-4" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="645.25" y="862.25" width="13.5" height="32.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="tm-3" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="659.25" y="862.25" width="21.5" height="32.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="tourism-office" className="cursor-pointer transition-opacity hover:opacity-80" />

              {[845, 829, 813, 793].map((y, i) => (
                <rect key={`tm-${i}`} x="652.25" y={`${y}.25`} width="28.5" height={y === 845 ? 16.5 : y === 793 ? 19.5 : 15.5} fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building={`tm-room-${i}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              <rect x="668.25" y="763.25" width="12.5" height="29.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="0.8" filter="url(#softShadow)" data-building="general-services" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="652.25" y="763.25" width="15.5" height="29.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="tm-5" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="641.25" y="844.25" width="10.5" height="17.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="0.8" filter="url(#softShadow)" data-building="drrmo" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="631.25" y="844.25" width="10.5" height="17.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="0.8" filter="url(#softShadow)" data-building="maintenance" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* CRs */}
              <rect x="598.25" y="887.25" width="14.5" height="11.5" fill="#fce7f3" stroke="#f472b6" strokeWidth="1" filter="url(#softShadow)" data-building="cr-sao" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="605.25" y="822.25" width="13.5" height="19.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1" filter="url(#softShadow)" data-building="cr-male" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="616.25" y="822.25" width="16.5" height="12.5" fill="#fce7f3" stroke="#f472b6" strokeWidth="1" filter="url(#softShadow)" data-building="cr-female" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* Storage */}
              <rect x="604" y="842" width="19" height="7" fill="#f3f4f6" filter="url(#softShadow)" />
              <rect x="604" y="848" width="14.7778" height="5" fill="#f3f4f6" filter="url(#softShadow)" />

              {/* Office buildings */}
              {[853, 863, 873].map((y, i) => (
                <rect key={`util-${i}`} x="604.25" y={`${y}.25`} width="15.5" height="9.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building={`util-${i}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              {/* HM Rooms */}
              {[805, 788, 771, 754].map((y, i) => (
                <rect key={`hm-${i+1}`} x="604.25" y={`${y}.25`} width="28.5" height="16.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-building={`hm-${i+1}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              {/* Major Buildings */}
              <rect x="612.933" y="662.263" width="31.2899" height="87.5" transform="rotate(3.05928 612.933 662.263)" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="admin-building" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="617.593" y="644.455" width="39.9343" height="18.0121" transform="rotate(3.38323 617.593 644.455)" fill="#cbd5e1" filter="url(#softShadow)" />

              <rect x="644.02" y="400.269" width="33.4778" height="245.385" transform="rotate(4.65438 644.02 400.269)" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="sci-tech-building" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="680.671" y="403.268" width="112.691" height="31.525" transform="rotate(4.23976 680.671 403.268)" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="acad-building" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="762.273" y="270.909" width="47.7505" height="93.9882" transform="rotate(4.23976 762.273 270.909)" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="library" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="874.266" y="145.18" width="41.0037" height="83.0508" transform="rotate(-86.2134 874.266 145.18)" fill="#e5e7eb" stroke="#64748b" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="ongoing-building-north" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="786.177" y="92.1166" width="32.6952" height="91.9722" transform="rotate(4.23976 786.177 92.1166)" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="agriculture-building" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* Green House */}
              <rect x="783.377" y="196.069" width="29.03" height="38.254" transform="rotate(4.23976 783.377 196.069)" fill="url(#greenGradient)" stroke="#16a34a" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="greenhouse" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* Oval - Vibrant green */}
              <rect x="707.116" y="465.359" width="103.266" height="211" rx="35" transform="rotate(4.28259 707.116 465.359)" fill="url(#greenGradient)" stroke="#059669" strokeWidth="10" filter="url(#buildingShadow)" />

              {/* Gym and Sports */}
              <rect x="695.577" y="713.985" width="118.054" height="76.7122" transform="rotate(-3.35231 695.577 713.985)" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="gym" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="713" y="787.803" width="40" height="31.8093" transform="rotate(-4.01841 713 787.803)" fill="#e5e7eb" filter="url(#softShadow)" />
              <rect x="753" y="787.803" width="44.6611" height="33.7639" transform="rotate(-4.01841 753 787.803)" fill="#94a3b8" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="canteen" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="703" y="848" width="93" height="51" fill="#94a3b8" stroke="#475569" strokeWidth="2" filter="url(#buildingShadow)" data-building="basketball-court" />

              <rect x="723" y="904" width="104" height="32" fill="#e5e7eb" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="ongoing-building-south" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* South buildings */}
              <rect x="903.25" y="928.25" width="42.5" height="89.5" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="handloom-weaving" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="903.25" y="882.25" width="42.5" height="41.5" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="mini-hotel" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="936.9" y="840.692" width="103.457" height="29.2825" transform="rotate(-3.39398 936.9 840.692)" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="hm-department" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="987" y="809.031" width="51.6188" height="29.2825" transform="rotate(-3.39398 987 809.031)" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" className="cursor-pointer transition-opacity hover:opacity-80" />

              <rect x="863.25" y="1009.25" width="6.5" height="10.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="chess-center" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="880" y="806" width="49" height="29" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="chapel" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="800" y="848" width="49" height="29" fill="url(#buildingGradient)" stroke="#64748b" strokeWidth="1" filter="url(#buildingShadow)" data-building="student-lounge" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* COTE/COED */}
              <rect x="845.25" y="750.25" width="152.5" height="37.5" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="cote-building" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="845.25" y="647.25" width="152.5" height="37.5" fill="url(#buildingGradient)" stroke="#475569" strokeWidth="1.5" filter="url(#buildingShadow)" data-building="coed-building" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="845.25" y="697.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="rotc-office" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="877.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="es-room-1" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="843.25" y="561.25" width="22.5" height="27.5" fill="#e5e7eb" stroke="#64748b" strokeWidth="0.8" filter="url(#softShadow)" data-building="old-stage" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* BIT AT Labs */}
              {[
                { x: 935.07, y: 558.051 },
                { x: 931.281, y: 527.634 },
                { x: 927.281, y: 497.634 },
                { x: 923.281, y: 467.634 },
              ].map((pos, i) => (
                <rect key={`bit-${i+1}`} x={pos.x} y={pos.y} width="40.6126" height="30.3375" transform={`rotate(-7.57462 ${pos.x} ${pos.y})`} fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-building={`bit-at-lab-${i+1}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              <rect x="928.465" y="427.279" width="30.2499" height="38.8347" transform="rotate(-7.57 928.465 427.279)" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="ctu-dost-nicer" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="829.281" y="421.266" width="31.3167" height="27.5498" transform="rotate(-7.57 829.281 421.266)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-building="benrc-microtel" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="833.281" y="448.406" width="35.9322" height="27.5498" transform="rotate(-7.57 833.281 448.406)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-building="benrc-training" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="867.698" y="435.092" width="61.2942" height="29.1277" transform="rotate(-7.57 867.698 435.092)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-building="benrc-tissue-lab" className="cursor-pointer transition-opacity hover:opacity-80" />

              <rect x="905.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="es-room-2" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="933.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="es-room-3" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="845.25" y="719.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-building="cwts-office" className="cursor-pointer transition-opacity hover:opacity-80" />

              {/* DT Labs */}
              {[677.369, 707.369, 737.369, 767.369].map((y, i) => (
                <rect key={`dt-${i+1}`} x="1038.03" y={y} width="30" height="34.6785" transform={`rotate(90.1952 1038.03 ${y})`} fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-building={`dt-lab-${i+1}`} className="cursor-pointer transition-opacity hover:opacity-80" />
              ))}

              <rect x="872.241" y="480.097" width="41.7283" height="83.6239" transform="rotate(-7.75834 872.241 480.097)" fill="#d1fae5" stroke="#34d399" strokeWidth="1" filter="url(#buildingShadow)" data-building="biodiversity" className="cursor-pointer transition-opacity hover:opacity-80" />
              <rect x="853.397" y="500.374" width="23.7014" height="27.2707" transform="rotate(-8.35572 853.397 500.374)" fill="#e5e7eb" filter="url(#softShadow)" />

              {/* Trees from SVG - styled as modern icons */}
              <circle cx="864.5" cy="808.5" r="17.5" fill="#059669" opacity="0.7" filter="url(#softShadow)" />
              <circle cx="967.5" cy="813.5" r="17.5" fill="#059669" opacity="0.7" filter="url(#softShadow)" />
              <circle cx="842.5" cy="995.5" r="17.5" fill="#059669" opacity="0.7" filter="url(#softShadow)" />
              <circle cx="772.5" cy="1000.5" r="17.5" fill="#059669" opacity="0.7" filter="url(#softShadow)" />
              <circle cx="841.5" cy="635.5" r="17.5" fill="#059669" opacity="0.7" filter="url(#softShadow)" />
              <ellipse cx="869" cy="534.5" rx="12" ry="12.5" fill="#10b981" opacity="0.6" />
              <ellipse cx="815" cy="307.5" rx="12" ry="12.5" fill="#10b981" opacity="0.6" />
              <ellipse cx="787" cy="254.5" rx="12" ry="12.5" fill="#10b981" opacity="0.6" />
              <ellipse cx="800" cy="435.5" rx="12" ry="12.5" fill="#10b981" opacity="0.6" />
              <ellipse cx="831" cy="126.5" rx="12" ry="12.5" fill="#10b981" opacity="0.6" />

              {/* Smaller trees */}
              {[
                { cx: 875, cy: 562.5, rx: 10, ry: 9.5 },
                { cx: 874, cy: 575.5, rx: 8, ry: 8.5 },
                { cx: 800, cy: 250.5, rx: 8, ry: 8.5 },
                { cx: 807, cy: 423.5, rx: 8, ry: 8.5 },
                { cx: 664, cy: 638.5, rx: 8, ry: 8.5 },
                { cx: 783, cy: 448.5, rx: 8, ry: 8.5 },
                { cx: 754, cy: 444.5, rx: 8, ry: 8.5 },
                { cx: 721, cy: 441.5, rx: 8, ry: 8.5 },
                { cx: 686, cy: 439.5, rx: 8, ry: 8.5 },
                { cx: 678, cy: 474.5, rx: 8, ry: 8.5 },
                { cx: 672, cy: 515.5, rx: 8, ry: 8.5 },
                { cx: 668, cy: 557.5, rx: 8, ry: 8.5 },
                { cx: 665, cy: 597.5, rx: 8, ry: 8.5 },
              ].map((tree, i) => (
                <ellipse key={`tree-${i}`} {...tree} fill="#10b981" opacity="0.5" />
              ))}

              {/* Small tree circles */}
              {[
                { cx: 836.5, cy: 706.5, r: 8.5 },
                { cx: 717.5, cy: 830.5, r: 8.5 },
                { cx: 741.5, cy: 830.5, r: 8.5 },
                { cx: 836.5, cy: 729.5, r: 8.5 },
                { cx: 835.5, cy: 752.5, r: 8.5 },
                { cx: 835.5, cy: 771.5, r: 8.5 },
                { cx: 828.5, cy: 977.5, r: 8.5 },
              ].map((tree, i) => (
                <circle key={`tree-c-${i}`} {...tree} fill="#10b981" opacity="0.5" />
              ))}

              <ellipse cx="757.5" cy="829" rx="12.5" ry="11" fill="#059669" opacity="0.6" />

              {/* Tiny trees */}
              {[
                { cx: 647.5, cy: 752, rx: 6.5, ry: 6 },
                { cx: 642.5, cy: 784, rx: 6.5, ry: 6 },
                { cx: 642.5, cy: 816, rx: 6.5, ry: 6 },
              ].map((tree, i) => (
                <ellipse key={`tree-t-${i}`} {...tree} fill="#10b981" opacity="0.4" />
              ))}

              {/* Route Path */}
              {routePath.length > 1 && (
                <g className="route-path-overlay">
                  <path
                    d={`M ${routePath.map((p, i) => `${i === 0 ? '' : 'L '}${p.x},${p.y}`).join(' ')}`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="18 9"
                    opacity="0.9"
                    filter="url(#buildingShadow)"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="27" dur="1.5s" repeatCount="indefinite" />
                  </path>
                  {routePath.map((point, index) => (
                    <g key={index}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="12"
                        fill={index === 0 ? '#10b981' : index === routePath.length - 1 ? '#ef4444' : '#3b82f6'}
                        stroke="white"
                        strokeWidth="4"
                        filter="url(#buildingShadow)"
                      />
                      {index === 0 && <text x={point.x} y={point.y - 20} textAnchor="middle" fill="#10b981" className="font-semibold text-xs">START</text>}
                      {index === routePath.length - 1 && <text x={point.x} y={point.y - 20} textAnchor="middle" fill="#ef4444" className="font-semibold text-xs">END</text>}
                    </g>
                  ))}
                </g>
              )}

              {/* Selected Location Marker */}
              {selectedLocation && (
                <g className="selected-location-marker">
                  <circle cx={selectedLocation.x} cy={selectedLocation.y} r="45" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="12 6" opacity="0.7">
                    <animate attributeName="r" values="40;50;40" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={selectedLocation.x} cy={selectedLocation.y} r="18" fill="#f59e0b" stroke="white" strokeWidth="4" filter="url(#buildingShadow)" />
                  <text x={selectedLocation.x} y={selectedLocation.y - 55} textAnchor="middle" className="font-bold text-sm fill-orange-600">{selectedLocation.name}</text>
                </g>
              )}
            </g>

            <defs>
              <pattern id="pattern0_6_5" patternContentUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#e8f9f1" opacity="0.5" />
              </pattern>
            </defs>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-2 border-emerald-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="font-bold text-gray-900" style={{ fontSize: '15px' }}>Campus Map Legend</div>
        </div>
        <div className="space-y-2.5 text-xs">
          {[
            { color: 'bg-gradient-to-b from-slate-200 to-slate-300', border: 'border-slate-500', label: 'Buildings & Facilities', shadow: true },
            { color: 'bg-indigo-100', border: 'border-indigo-400', label: 'Classrooms & Labs' },
            { color: 'bg-gradient-to-b from-green-300 to-green-500', border: 'border-green-600', label: 'Green Spaces', shadow: true },
            { color: 'bg-emerald-600', border: 'border-emerald-700', label: 'Trees & Vegetation', rounded: true },
            { color: 'bg-pink-100', border: 'border-pink-400', label: 'Comfort Rooms', rounded: true },
            { color: 'bg-gradient-to-b from-slate-500 to-slate-700', border: 'border-slate-800', label: 'Roads & Pathways', height: 'h-1', shadow: true },
          ].map(({ color, border, label, rounded, height, shadow }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-5 ${height || 'h-5'} ${color} border-2 ${border} ${rounded ? 'rounded-full' : 'rounded'} ${shadow ? 'shadow-md' : ''}`} />
              <span className="text-gray-700 font-medium">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-emerald-200">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm" />
              <div className="w-7 h-1 bg-blue-500 rounded" />
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm" />
            </div>
            <span className="text-gray-700 font-medium">Navigation Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
