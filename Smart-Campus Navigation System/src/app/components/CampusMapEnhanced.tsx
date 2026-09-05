import { useRef, useState, useEffect } from 'react';
import { Location, PathNode } from '../types/campus';
import { ZoomIn, ZoomOut, Maximize2, Navigation as NavIcon } from 'lucide-react';

interface CampusMapEnhancedProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function CampusMapEnhanced({ selectedLocation, routePath, onLocationClick }: CampusMapEnhancedProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current) return;

    // Add interactivity to buildings
    const buildings = svgRef.current.querySelectorAll('[data-interactive="true"]');
    buildings.forEach(building => {
      building.addEventListener('mouseenter', () => {
        (building as SVGElement).style.opacity = '0.8';
      });
      building.addEventListener('mouseleave', () => {
        (building as SVGElement).style.opacity = '1';
      });
    });
  }, []);

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
    <div className="relative w-full h-full bg-gradient-to-br from-sky-100 via-emerald-50 to-green-100 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-300">
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
            className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 border-2 border-gray-200"
            title={title}
          >
            <Icon className="w-6 h-6 text-blue-700" />
          </button>
        ))}
      </div>

      <div className="absolute top-6 left-6 z-20 px-4 py-3 bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex items-center gap-2">
          <NavIcon className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Map */}
      <div
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
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
            style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))' }}
          >
            <defs>
              {/* Gradients for depth */}
              <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
              <filter id="shadow">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3" />
              </filter>
              <filter id="softShadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="1" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.4" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g clipPath="url(#clip0_6_5)">
              {/* Sky/Background gradient */}
              <rect width="1728" height="1117" fill="url(#pattern0_6_5)" opacity="0.05" />
              <rect width="1728" height="1117" fill="#f0f9ff" />

              {/* Landscaping - Trees and vegetation (based on site plan) */}
              {/* North area trees */}
              {Array.from({ length: 15 }).map((_, i) => (
                <circle
                  key={`tree-north-${i}`}
                  cx={720 + i * 45}
                  cy={120 + (i % 3) * 25}
                  r={8 + (i % 3) * 2}
                  fill="#10b981"
                  opacity={0.6}
                  filter="url(#softShadow)"
                />
              ))}
              {/* West side vegetation */}
              {Array.from({ length: 12 }).map((_, i) => (
                <ellipse
                  key={`tree-west-${i}`}
                  cx={560}
                  cy={450 + i * 50}
                  rx={10}
                  ry={12}
                  fill="#059669"
                  opacity={0.5}
                />
              ))}
              {/* East side trees */}
              {Array.from({ length: 10 }).map((_, i) => (
                <circle
                  key={`tree-east-${i}`}
                  cx={1070 + (i % 3) * 15}
                  cy={500 + i * 45}
                  r={9}
                  fill="#047857"
                  opacity={0.6}
                />
              ))}
              {/* Oval surrounding trees */}
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i * 360) / 20;
                const rad = angle * (Math.PI / 180);
                const cx = 742 + Math.cos(rad) * 120;
                const cy = 570 + Math.sin(rad) * 130;
                return (
                  <circle
                    key={`tree-oval-${i}`}
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill="#10b981"
                    opacity={0.5}
                  />
                );
              })}

              {/* Roads - Enhanced with lane markings */}
              <rect x="587" y="1024" width="130" height="5" fill="#334155" filter="url(#softShadow)" />
              <rect x="622.318" y="393" width="124.828" height="5" transform="rotate(3.64261 622.318 393)" fill="#334155" filter="url(#softShadow)" />
              <rect x="623.905" y="393.056" width="637.086" height="5" transform="rotate(93.3216 623.905 393.056)" fill="#334155" filter="url(#softShadow)" />
              <rect x="748" y="1024" width="125" height="5" fill="#334155" filter="url(#softShadow)" />
              <rect x="949.624" y="872.224" width="98.3764" height="5" transform="rotate(-2.46074 949.624 872.224)" fill="#334155" filter="url(#softShadow)" />
              <rect x="862.246" y="633.851" width="189.228" height="5" transform="rotate(-0.257543 862.246 633.851)" fill="#334155" filter="url(#softShadow)" />
              <rect x="859.709" y="591.768" width="127.897" height="5" transform="rotate(-0.257543 859.709 591.768)" fill="#334155" filter="url(#softShadow)" />
              <rect x="865" y="428.913" width="100.122" height="5" transform="rotate(-8.01764 865 428.913)" fill="#334155" filter="url(#softShadow)" />
              <rect x="865.282" y="432.979" width="51.098" height="5" transform="rotate(-97.0461 865.282 432.979)" fill="#334155" filter="url(#softShadow)" />
              <rect x="891.409" y="258.337" width="51.098" height="5" transform="rotate(-94.485 891.409 258.337)" fill="#334155" filter="url(#softShadow)" />
              <rect x="1042.97" y="337.762" width="70.7622" height="5" transform="rotate(-89.9094 1042.97 337.762)" fill="#334155" filter="url(#softShadow)" />
              <rect x="948.663" y="209.334" width="109.542" height="5" transform="rotate(-80.8451 948.663 209.334)" fill="#334155" filter="url(#softShadow)" />
              <rect x="859" y="382.523" width="51.098" height="5" transform="rotate(-62.985 859 382.523)" fill="#334155" filter="url(#softShadow)" />
              <rect x="742" y="403.057" width="51.098" height="5" transform="rotate(-87.6901 742 403.057)" fill="#334155" filter="url(#softShadow)" />
              <rect x="882.105" y="337.037" width="163.369" height="5" transform="rotate(-1.52636 882.105 337.037)" fill="#334155" filter="url(#softShadow)" />
              <rect x="892.57" y="254.386" width="156.456" height="5" transform="rotate(4.24245 892.57 254.386)" fill="#334155" filter="url(#softShadow)" />
              <rect x="779.37" y="87" width="53.5638" height="5" transform="rotate(4.24245 779.37 87)" fill="#334155" filter="url(#softShadow)" />
              <rect x="866.37" y="93" width="105.163" height="5" transform="rotate(4.24245 866.37 93)" fill="#334155" filter="url(#softShadow)" />
              <rect x="887.37" y="204" width="66.4508" height="5" transform="rotate(4.24245 887.37 204)" fill="#334155" filter="url(#softShadow)" />
              <rect x="864" y="592" width="46.985" height="5" transform="rotate(89.9693 864 592)" fill="#334155" filter="url(#softShadow)" />
              <rect x="901" y="1024" width="51" height="5" fill="#334155" filter="url(#softShadow)" />
              <rect x="954.627" y="872.868" width="156.133" height="5" transform="rotate(89.8005 954.627 872.868)" fill="#334155" filter="url(#softShadow)" />
              <rect x="1051.85" y="633.029" width="240.12" height="5" transform="rotate(90.4258 1051.85 633.029)" fill="#334155" filter="url(#softShadow)" />
              <rect x="784.768" y="87.6725" width="268.809" height="5" transform="rotate(97.7301 784.768 87.6725)" fill="#334155" filter="url(#softShadow)" />
              <rect x="964.777" y="419.645" width="174.808" height="5" transform="rotate(82.4391 964.777 419.645)" fill="#334155" filter="url(#softShadow)" />

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

              {/* Buildings - Enhanced with gradients and shadows */}
              <rect x="690" y="992" width="26" height="24" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="696" y="987" width="20" height="7" fill="#cbd5e1" filter="url(#softShadow)" />
              <rect x="668" y="992" width="20" height="24" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="646" y="992" width="20" height="24" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="596" y="994" width="41" height="22" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />

              {/* Office rooms - uniform styling */}
              {[906, 922, 938, 954, 970].map((y, i) => (
                <rect key={`office-${i}`} x="597.25" y={`${y}.25`} width="39.5" height="15.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              ))}

              {/* Tourism rooms */}
              <rect x="631.25" y="862.25" width="13.5" height="32.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="645.25" y="862.25" width="13.5" height="32.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="659.25" y="862.25" width="21.5" height="32.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              {[845, 829, 813, 793].map((y, i) => (
                <rect key={`tm-${i}`} x="652.25" y={`${y}.25`} width="28.5" height={y === 845 ? 16.5 : y === 793 ? 19.5 : 15.5} fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              ))}
              <rect x="668.25" y="763.25" width="12.5" height="29.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="652.25" y="763.25" width="15.5" height="29.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="641.25" y="844.25" width="10.5" height="17.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="631.25" y="844.25" width="10.5" height="17.5" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />

              {/* CRs - distinct colors */}
              <rect x="598.25" y="887.25" width="14.5" height="11.5" fill="#fce7f3" stroke="#f472b6" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              <rect x="605.25" y="822.25" width="13.5" height="19.5" fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              <rect x="616.25" y="822.25" width="16.5" height="12.5" fill="#fce7f3" stroke="#f472b6" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />

              {/* Storage */}
              <rect x="604" y="842" width="19" height="7" fill="#f3f4f6" filter="url(#softShadow)" />
              <rect x="604" y="848" width="14.7778" height="5" fill="#f3f4f6" filter="url(#softShadow)" />

              {/* Office buildings */}
              {[853, 863, 873].map((y, i) => (
                <rect key={`util-${i}`} x="604.25" y={`${y}.25`} width="15.5" height="9.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              ))}

              {/* HM Rooms */}
              {[805, 788, 771, 754].map((y, i) => (
                <rect key={`hm-${i}`} x="604.25" y={`${y}.25`} width="28.5" height="16.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              ))}

              {/* Major Buildings - Enhanced */}
              <rect x="612.933" y="662.263" width="31.2899" height="87.5" transform="rotate(3.05928 612.933 662.263)" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="617.593" y="644.455" width="39.9343" height="18.0121" transform="rotate(3.38323 617.593 644.455)" fill="#cbd5e1" filter="url(#softShadow)" />

              <rect x="644.02" y="400.269" width="33.4778" height="245.385" transform="rotate(4.65438 644.02 400.269)" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="680.671" y="403.268" width="112.691" height="31.525" transform="rotate(4.23976 680.671 403.268)" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="762.273" y="270.909" width="47.7505" height="93.9882" transform="rotate(4.23976 762.273 270.909)" fill="#d1d5db" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="874.266" y="145.18" width="41.0037" height="83.0508" transform="rotate(-86.2134 874.266 145.18)" fill="#e5e7eb" stroke="#64748b" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="786.177" y="92.1166" width="32.6952" height="91.9722" transform="rotate(4.23976 786.177 92.1166)" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />

              {/* Green House */}
              <rect x="783.377" y="196.069" width="29.03" height="38.254" transform="rotate(4.23976 783.377 196.069)" fill="url(#greenGrad)" stroke="#16a34a" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />

              {/* Oval - Vibrant green */}
              <rect x="707.116" y="465.359" width="103.266" height="211" rx="35" transform="rotate(4.28259 707.116 465.359)" fill="url(#greenGrad)" stroke="#059669" strokeWidth="10" filter="url(#shadow)" />

              {/* Sports facilities */}
              <rect x="695.577" y="713.985" width="118.054" height="76.7122" transform="rotate(-3.35231 695.577 713.985)" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="713" y="787.803" width="40" height="31.8093" transform="rotate(-4.01841 713 787.803)" fill="#e5e7eb" filter="url(#softShadow)" />
              <rect x="753" y="787.803" width="44.6611" height="33.7639" transform="rotate(-4.01841 753 787.803)" fill="#94a3b8" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="703" y="848" width="93" height="51" fill="#94a3b8" stroke="#475569" strokeWidth="2" filter="url(#shadow)" />

              <rect x="723" y="904" width="104" height="32" fill="#e5e7eb" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />

              {/* South buildings */}
              <rect x="903.25" y="928.25" width="42.5" height="89.5" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="903.25" y="882.25" width="42.5" height="41.5" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="936.9" y="840.692" width="103.457" height="29.2825" transform="rotate(-3.39398 936.9 840.692)" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="987" y="809.031" width="51.6188" height="29.2825" transform="rotate(-3.39398 987 809.031)" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />

              <rect x="863.25" y="1009.25" width="6.5" height="10.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="880" y="806" width="49" height="29" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="800" y="848" width="49" height="29" fill="url(#buildingGrad)" stroke="#64748b" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />

              {/* COTE/COED */}
              <rect x="845.25" y="750.25" width="152.5" height="37.5" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="845.25" y="647.25" width="152.5" height="37.5" fill="url(#buildingGrad)" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" data-interactive="true" />
              <rect x="845.25" y="697.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="877.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="843.25" y="561.25" width="22.5" height="27.5" fill="#e5e7eb" stroke="#64748b" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />

              {/* BIT AT Labs */}
              {[558.051, 527.634, 497.218, 466.801].map((y, i) => (
                <rect key={`bit-${i}`} x={935.07 - i * 3.789} y={y} width="40.6126" height="30.3375" transform={`rotate(-7.57462 ${935.07 - i * 3.789} ${y})`} fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              ))}

              <rect x="929.058" y="427.306" width="30.2485" height="39.3276" transform="rotate(-7.57462 929.058 427.306)" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              <rect x="830.213" y="421.116" width="31.3151" height="27.5481" transform="rotate(-7.57462 830.213 421.116)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              <rect x="834.394" y="447.596" width="35.9352" height="27.5481" transform="rotate(-7.57462 834.394 447.596)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              <rect x="869.056" y="431.017" width="60.9154" height="29.1291" transform="rotate(-7.57462 869.056 431.017)" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />

              <rect x="905.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="933.25" y="704.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />
              <rect x="845.25" y="719.25" width="27.5" height="21.5" fill="#e0e7ff" stroke="#818cf8" strokeWidth="0.5" filter="url(#softShadow)" data-interactive="true" />

              {/* DT Labs */}
              {[677.321, 707.324, 737.328, 767.331].map((y, i) => (
                <rect key={`dt-${i}`} x="1009.91" y={y} width="30.0033" height="34.6821" transform={`rotate(90.1954 1009.91 ${y})`} fill="#dbeafe" stroke="#60a5fa" strokeWidth="0.8" filter="url(#softShadow)" data-interactive="true" />
              ))}

              <rect x="872.239" y="480.333" width="41.7345" height="83.6188" transform="rotate(-7.75757 872.239 480.333)" fill="#d1fae5" stroke="#34d399" strokeWidth="1" filter="url(#shadow)" data-interactive="true" />
              <rect x="853.403" y="502.813" width="23.7035" height="27.2738" transform="rotate(-8.35903 853.403 502.813)" fill="#e5e7eb" filter="url(#softShadow)" />

              {/* Route Path */}
              {routePath.length > 1 && (
                <g className="route-visualization">
                  <path
                    d={`M ${routePath.map((p, i) => `${i === 0 ? '' : 'L '}${p.x},${p.y}`).join(' ')}`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="16 8"
                    opacity="0.9"
                    filter="url(#shadow)"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1.2s" repeatCount="indefinite" />
                  </path>
                  {routePath.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="10"
                      fill={index === 0 ? '#10b981' : index === routePath.length - 1 ? '#ef4444' : '#3b82f6'}
                      stroke="white"
                      strokeWidth="4"
                      filter="url(#shadow)"
                    />
                  ))}
                </g>
              )}

              {/* Selected Location */}
              {selectedLocation && (
                <g className="location-marker">
                  <circle cx={selectedLocation.x} cy={selectedLocation.y} r="40" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="10 5" opacity="0.7">
                    <animate attributeName="r" values="35;45;35" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={selectedLocation.x} cy={selectedLocation.y} r="15" fill="#f59e0b" stroke="white" strokeWidth="4" filter="url(#shadow)" />
                </g>
              )}
            </g>

            <defs>
              <clipPath id="clip0_6_5">
                <rect width="1728" height="1117" fill="white" />
              </clipPath>
              <pattern id="pattern0_6_5" patternContentUnits="objectBoundingBox" width="1" height="1">
                <rect width="100%" height="100%" fill="#e0f2fe" />
              </pattern>
            </defs>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
            <NavIcon className="w-5 h-5 text-white" />
          </div>
          <div className="font-bold text-gray-900" style={{ fontSize: '15px' }}>Map Legend</div>
        </div>
        <div className="space-y-2.5 text-xs">
          {[
            { color: 'bg-gradient-to-b from-slate-200 to-slate-300', border: 'border-slate-500', label: 'Academic Buildings' },
            { color: 'bg-indigo-100', border: 'border-indigo-400', label: 'Classrooms & Labs' },
            { color: 'bg-gradient-to-b from-green-300 to-green-400', border: 'border-green-600', label: 'Green Spaces & Parks' },
            { color: 'bg-pink-100', border: 'border-pink-400', label: 'Comfort Rooms', rounded: true },
            { color: 'bg-gray-700', border: 'border-gray-800', label: 'Roads & Walkways', height: 'h-1' },
          ].map(({ color, border, label, rounded, height }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-5 ${height || 'h-5'} ${color} border-2 ${border} ${rounded ? 'rounded-full' : 'rounded'} shadow-sm`} />
              <span className="text-gray-700 font-medium">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm" />
              <div className="w-6 h-1 bg-blue-500 rounded" />
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm" />
            </div>
            <span className="text-gray-700 font-medium">Navigation Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}
