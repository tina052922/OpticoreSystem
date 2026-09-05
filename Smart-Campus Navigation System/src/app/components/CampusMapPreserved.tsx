import { useRef, useState, useEffect } from 'react';
import { Location, PathNode } from '../types/campus';
import { ZoomIn, ZoomOut, Maximize2, Navigation as NavIcon } from 'lucide-react';

interface CampusMapPreservedProps {
  selectedLocation: Location | null;
  routePath: PathNode[];
  onLocationClick: (location: Location) => void;
}

export function CampusMapPreserved({ selectedLocation, routePath, onLocationClick }: CampusMapPreservedProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const buildings = svgRef.current.querySelectorAll('[fill="#C5C3C3"]');
    buildings.forEach((building, index) => {
      const rect = building as SVGRectElement;
      rect.setAttribute('data-building-id', `building-${index}`);
      rect.style.cursor = 'pointer';
      rect.style.transition = 'fill 0.2s ease';

      rect.addEventListener('mouseenter', () => {
        setHoveredBuilding(`building-${index}`);
        rect.setAttribute('fill', '#93c5fd');
      });

      rect.addEventListener('mouseleave', () => {
        setHoveredBuilding(null);
        rect.setAttribute('fill', '#C5C3C3');
      });
    });

    const greenSpaces = svgRef.current.querySelectorAll('[fill="#A9E9C1"]');
    greenSpaces.forEach(space => {
      (space as SVGElement).style.transition = 'fill 0.3s ease';
    });
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.15, 0.4));
  const handleReset = () => {
    setScale(0.8);
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

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => Math.max(0.4, Math.min(2.5, prev + delta)));
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-sky-50 to-emerald-50 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-300">
      {/* Zoom Controls */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3 drop-shadow-xl">
        <button
          onClick={handleZoomIn}
          className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 border-2 border-gray-200"
          title="Zoom In"
        >
          <ZoomIn className="w-6 h-6 text-blue-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 border-2 border-gray-200"
          title="Zoom Out"
        >
          <ZoomOut className="w-6 h-6 text-blue-700" />
        </button>
        <button
          onClick={handleReset}
          className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 border-2 border-gray-200"
          title="Reset View"
        >
          <Maximize2 className="w-6 h-6 text-blue-700" />
        </button>
      </div>

      {/* Zoom Level */}
      <div className="absolute top-6 left-6 z-20 px-4 py-3 bg-white rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex items-center gap-2">
          <NavIcon className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Map Container */}
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
            xmlnsXlink="http://www.w3.org/1999/xlink"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
          >
            <g clipPath="url(#clip0_6_5)">
              <rect width="1728" height="1117" fill="#f8fafc" />

              {/* Roads - Dark paths */}
              <rect x="587" y="1024" width="130" height="5" fill="#1e293b" />
              <rect x="622.318" y="393" width="124.828" height="5" transform="rotate(3.64261 622.318 393)" fill="#1e293b" />
              <rect x="623.905" y="393.056" width="637.086" height="5" transform="rotate(93.3216 623.905 393.056)" fill="#1e293b" />
              <rect x="748" y="1024" width="125" height="5" fill="#1e293b" />
              <rect x="949.624" y="872.224" width="98.3764" height="5" transform="rotate(-2.46074 949.624 872.224)" fill="#1e293b" />
              <rect x="862.246" y="633.851" width="189.228" height="5" transform="rotate(-0.257543 862.246 633.851)" fill="#1e293b" />
              <rect x="859.709" y="591.768" width="127.897" height="5" transform="rotate(-0.257543 859.709 591.768)" fill="#1e293b" />
              <rect x="865" y="428.913" width="100.122" height="5" transform="rotate(-8.01764 865 428.913)" fill="#1e293b" />
              <rect x="865.282" y="432.979" width="51.098" height="5" transform="rotate(-97.0461 865.282 432.979)" fill="#1e293b" />
              <rect x="891.409" y="258.337" width="51.098" height="5" transform="rotate(-94.485 891.409 258.337)" fill="#1e293b" />
              <rect x="1042.97" y="337.762" width="70.7622" height="5" transform="rotate(-89.9094 1042.97 337.762)" fill="#1e293b" />
              <rect x="948.663" y="209.334" width="109.542" height="5" transform="rotate(-80.8451 948.663 209.334)" fill="#1e293b" />
              <rect x="859" y="382.523" width="51.098" height="5" transform="rotate(-62.985 859 382.523)" fill="#1e293b" />
              <rect x="742" y="403.057" width="51.098" height="5" transform="rotate(-87.6901 742 403.057)" fill="#1e293b" />
              <rect x="882.105" y="337.037" width="163.369" height="5" transform="rotate(-1.52636 882.105 337.037)" fill="#1e293b" />
              <rect x="892.57" y="254.386" width="156.456" height="5" transform="rotate(4.24245 892.57 254.386)" fill="#1e293b" />
              <rect x="779.37" y="87" width="53.5638" height="5" transform="rotate(4.24245 779.37 87)" fill="#1e293b" />
              <rect x="866.37" y="93" width="105.163" height="5" transform="rotate(4.24245 866.37 93)" fill="#1e293b" />
              <rect x="887.37" y="204" width="66.4508" height="5" transform="rotate(4.24245 887.37 204)" fill="#1e293b" />
              <rect x="864" y="592" width="46.985" height="5" transform="rotate(89.9693 864 592)" fill="#1e293b" />
              <rect x="901" y="1024" width="51" height="5" fill="#1e293b" />
              <rect x="954.627" y="872.868" width="156.133" height="5" transform="rotate(89.8005 954.627 872.868)" fill="#1e293b" />
              <rect x="1051.85" y="633.029" width="240.12" height="5" transform="rotate(90.4258 1051.85 633.029)" fill="#1e293b" />
              <rect x="784.768" y="87.6725" width="268.809" height="5" transform="rotate(97.7301 784.768 87.6725)" fill="#1e293b" />
              <rect x="964.777" y="419.645" width="174.808" height="5" transform="rotate(82.4391 964.777 419.645)" fill="#1e293b" />

              {/* Gates */}
              <line x1="716" y1="1026.5" x2="749" y2="1026.5" stroke="#475569" strokeWidth="2" />
              <rect x="715" y="1023" width="3" height="7" fill="#94a3b8" />
              <rect x="747" y="1023" width="3" height="7" fill="#94a3b8" />
              <line x1="832.204" y1="93.5527" x2="865.147" y2="95.4895" stroke="#475569" strokeWidth="2" />
              <rect x="831.411" y="90" width="3" height="7" transform="rotate(3.36472 831.411 90)" fill="#94a3b8" />
              <rect x="863.356" y="91.8781" width="3" height="7" transform="rotate(3.36472 863.356 91.8781)" fill="#94a3b8" />
              <line x1="871" y1="1026.5" x2="904" y2="1026.5" stroke="#475569" strokeWidth="2" />
              <rect x="870" y="1023" width="3" height="7" fill="#94a3b8" />
              <rect x="901" y="1023" width="3" height="7" fill="#94a3b8" />

              {/* Buildings - Major structures with enhanced styling */}
              <rect x="690" y="992" width="26" height="24" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <rect x="696" y="987" width="20" height="7" fill="#cbd5e1" />
              <rect x="668" y="992" width="20" height="24" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <rect x="646" y="992" width="20" height="24" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <rect x="596" y="994" width="41" height="22" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />

              {/* Office rooms */}
              <rect x="597.25" y="906.25" width="39.5" height="15.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="597.25" y="922.25" width="39.5" height="15.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="597.25" y="938.25" width="39.5" height="15.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="597.25" y="954.25" width="39.5" height="15.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="597.25" y="970.25" width="39.5" height="15.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Tourism rooms */}
              <rect x="631.25" y="862.25" width="13.5" height="32.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="645.25" y="862.25" width="13.5" height="32.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="659.25" y="862.25" width="21.5" height="32.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="652.25" y="845.25" width="28.5" height="16.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="652.25" y="829.25" width="28.5" height="15.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="652.25" y="813.25" width="28.5" height="15.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="652.25" y="793.25" width="28.5" height="19.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="668.25" y="763.25" width="12.5" height="29.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="652.25" y="763.25" width="15.5" height="29.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="641.25" y="844.25" width="10.5" height="17.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="631.25" y="844.25" width="10.5" height="17.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Comfort Rooms */}
              <rect x="598.25" y="887.25" width="14.5" height="11.5" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="0.5" />
              <rect x="605.25" y="822.25" width="13.5" height="19.5" fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.5" />
              <rect x="616.25" y="822.25" width="16.5" height="12.5" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="0.5" />

              {/* Storage */}
              <rect x="604" y="842" width="19" height="7" fill="#e2e8f0" />
              <rect x="604" y="848" width="14.7778" height="5" fill="#e2e8f0" />

              {/* Offices */}
              <rect x="604.25" y="853.25" width="15.5" height="9.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="604.25" y="863.25" width="15.5" height="9.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="604.25" y="873.25" width="15.5" height="9.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* HM Rooms */}
              <rect x="604.25" y="805.25" width="28.5" height="16.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="604.25" y="788.25" width="28.5" height="16.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="604.25" y="771.25" width="28.5" height="16.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="604.25" y="754.25" width="28.5" height="16.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Admin Building */}
              <rect x="612.933" y="662.263" width="31.2899" height="87.5" transform="rotate(3.05928 612.933 662.263)" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />
              <rect x="617.593" y="644.455" width="39.9343" height="18.0121" transform="rotate(3.38323 617.593 644.455)" fill="#e2e8f0" />

              {/* Science & Technology Building */}
              <rect x="644.02" y="400.269" width="33.4778" height="245.385" transform="rotate(4.65438 644.02 400.269)" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />

              {/* Academic Building */}
              <rect x="680.671" y="403.268" width="112.691" height="31.525" transform="rotate(4.23976 680.671 403.268)" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />

              {/* Library */}
              <rect x="762.273" y="270.909" width="47.7505" height="93.9882" transform="rotate(4.23976 762.273 270.909)" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

              {/* Ongoing Building */}
              <rect x="874.266" y="145.18" width="41.0037" height="83.0508" transform="rotate(-86.2134 874.266 145.18)" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

              {/* Agriculture Building */}
              <rect x="786.177" y="92.1166" width="32.6952" height="91.9722" transform="rotate(4.23976 786.177 92.1166)" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />

              {/* Green House */}
              <rect x="783.377" y="196.069" width="29.03" height="38.254" transform="rotate(4.23976 783.377 196.069)" fill="#86efac" stroke="#22c55e" strokeWidth="1" />

              {/* Oval - Green space with enhanced styling */}
              <rect x="707.116" y="465.359" width="103.266" height="211" rx="35" transform="rotate(4.28259 707.116 465.359)" fill="#86efac" stroke="#22c55e" strokeWidth="8" />

              {/* Gym */}
              <rect x="695.577" y="713.985" width="118.054" height="76.7122" transform="rotate(-3.35231 695.577 713.985)" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <rect x="713" y="787.803" width="40" height="31.8093" transform="rotate(-4.01841 713 787.803)" fill="#e2e8f0" />

              {/* Canteen */}
              <rect x="753" y="787.803" width="44.6611" height="33.7639" transform="rotate(-4.01841 753 787.803)" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />

              {/* Basketball Court */}
              <rect x="703" y="848" width="93" height="51" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />

              {/* Ongoing Building (South) */}
              <rect x="723" y="904" width="104" height="32" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

              {/* Weaving Facility */}
              <rect x="903.25" y="928.25" width="42.5" height="89.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Mini Hotel */}
              <rect x="903.25" y="882.25" width="42.5" height="41.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* HM Department */}
              <rect x="936.9" y="840.692" width="103.457" height="29.2825" transform="rotate(-3.39398 936.9 840.692)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="1" />
              <rect x="987" y="809.031" width="51.6188" height="29.2825" transform="rotate(-3.39398 987 809.031)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="1" />

              {/* Chess Center */}
              <rect x="863.25" y="1009.25" width="6.5" height="10.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Chapel */}
              <rect x="880" y="806" width="49" height="29" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="1" />

              {/* Student Lounge */}
              <rect x="800" y="848" width="49" height="29" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="1" />

              {/* COTE Building */}
              <rect x="845.25" y="750.25" width="152.5" height="37.5" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />

              {/* COED Building */}
              <rect x="845.25" y="647.25" width="152.5" height="37.5" fill="#C5C3C3" stroke="#64748b" strokeWidth="1" />

              {/* ROTC Office */}
              <rect x="845.25" y="697.25" width="27.5" height="21.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* ES Room 1 */}
              <rect x="877.25" y="704.25" width="27.5" height="21.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Old Stage */}
              <rect x="843.25" y="561.25" width="22.5" height="27.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* BIT AT Labs */}
              <rect x="935.07" y="558.051" width="40.6126" height="30.3375" transform="rotate(-7.57462 935.07 558.051)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="931.281" y="527.634" width="40.6126" height="30.3375" transform="rotate(-7.57462 931.281 527.634)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="927.492" y="497.218" width="40.6126" height="30.3375" transform="rotate(-7.57462 927.492 497.218)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="923.703" y="466.801" width="40.6126" height="30.3375" transform="rotate(-7.57462 923.703 466.801)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* CTU-DOST-NICER Office */}
              <rect x="929.058" y="427.306" width="30.2485" height="39.3276" transform="rotate(-7.57462 929.058 427.306)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* BENRC Buildings */}
              <rect x="830.213" y="421.116" width="31.3151" height="27.5481" transform="rotate(-7.57462 830.213 421.116)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="834.394" y="447.596" width="35.9352" height="27.5481" transform="rotate(-7.57462 834.394 447.596)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="869.056" y="431.017" width="60.9154" height="29.1291" transform="rotate(-7.57462 869.056 431.017)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* ES Rooms 2 & 3 */}
              <rect x="905.25" y="704.25" width="27.5" height="21.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="933.25" y="704.25" width="27.5" height="21.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* CWTS Office */}
              <rect x="845.25" y="719.25" width="27.5" height="21.5" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* DT Labs */}
              <rect x="1009.91" y="677.321" width="30.0033" height="34.6821" transform="rotate(90.1954 1009.91 677.321)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="1009.91" y="707.324" width="30.0033" height="34.6821" transform="rotate(90.1954 1009.91 707.324)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="1009.91" y="737.328" width="30.0033" height="34.6821" transform="rotate(90.1954 1009.91 737.328)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />
              <rect x="1009.91" y="767.331" width="30.0033" height="34.6821" transform="rotate(90.1954 1009.91 767.331)" fill="#C5C3C3" stroke="#94a3b8" strokeWidth="0.5" />

              {/* Biodiversity */}
              <rect x="872.239" y="480.333" width="41.7345" height="83.6188" transform="rotate(-7.75757 872.239 480.333)" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <rect x="853.403" y="502.813" width="23.7035" height="27.2738" transform="rotate(-8.35903 853.403 502.813)" fill="#e2e8f0" />

              {/* Route Path Overlay */}
              {routePath.length > 1 && (
                <g className="route-overlay">
                  <path
                    d={`M ${routePath.map((p, i) => `${i === 0 ? '' : 'L '}${p.x},${p.y}`).join(' ')}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="12 6"
                    opacity="0.9"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="18" dur="1s" repeatCount="indefinite" />
                  </path>
                  {routePath.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="8"
                      fill={index === 0 ? '#22c55e' : index === routePath.length - 1 ? '#ef4444' : '#3b82f6'}
                      stroke="white"
                      strokeWidth="3"
                    />
                  ))}
                </g>
              )}

              {/* Selected Location Highlight */}
              {selectedLocation && (
                <g className="selected-marker">
                  <circle
                    cx={selectedLocation.x}
                    cy={selectedLocation.y}
                    r="35"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray="8 4"
                    opacity="0.8"
                  >
                    <animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={selectedLocation.x}
                    cy={selectedLocation.y}
                    r="12"
                    fill="#f59e0b"
                    stroke="white"
                    strokeWidth="3"
                  />
                </g>
              )}
            </g>

            <defs>
              <clipPath id="clip0_6_5">
                <rect width="1728" height="1117" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-5 border-2 border-gray-300">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
            <NavIcon className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-bold text-gray-900">Campus Legend</div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-slate-300 border-2 border-slate-500 rounded shadow-sm" />
            <span className="text-gray-700 font-medium">Major Buildings</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-indigo-100 border border-indigo-300 rounded shadow-sm" />
            <span className="text-gray-700 font-medium">Rooms & Offices</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-green-300 border-2 border-green-500 rounded shadow-sm" />
            <span className="text-gray-700 font-medium">Green Spaces</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 bg-pink-100 border-2 border-pink-300 rounded-full shadow-sm" />
            <span className="text-gray-700 font-medium">Comfort Rooms</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-1 bg-gray-800 rounded" />
            <span className="text-gray-700 font-medium">Roads & Paths</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <div className="w-4 h-0.5 bg-blue-500" />
              <div className="w-3 h-3 bg-red-500 rounded-full" />
            </div>
            <span className="text-gray-700 font-medium">Navigation Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}
