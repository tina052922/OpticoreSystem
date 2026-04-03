import { Outlet, Link, useLocation } from "react-router";
import { Bell, ChevronDown } from "lucide-react";
import imgCebuTechnologicalUniversityLogo1 from "figma:asset/a236ffe9952e477b22f287bb10c2b30876c0db09.png";
import imgEllipse1 from "figma:asset/8dac482b1fe4b907a690f966f24b5276a34daadc.png";

const menuItems = [
  { label: "Campus Intelligence", path: "/" },
  { label: "Inbox", path: "/inbox" },
  { label: "INS Form (Schedule View)", path: "/ins-form/faculty" },
  { label: "Evaluator", path: "/evaluator" },
  { label: "Subject Codes", path: "/subject-codes" },
  { label: "Faculty Profile", path: "/faculty-profile" },
];

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#e8e6e6] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[345px] bg-[#eeeeee] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex-none flex flex-col">
        {/* Semester Selector */}
        <div className="p-2 pt-[110px]">
          <button className="w-full bg-[#ff990a] text-white rounded-[15px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] h-[41px] flex items-center justify-between px-4 font-['SF_Pro',sans-serif] font-medium text-[16px]">
            <span>2nd Semester S.Y. 2025-2026</span>
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 space-y-[6px]">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`block h-[41px] rounded-[15px] flex items-center px-6 font-['SF_Pro',sans-serif] font-bold text-[16px] transition-colors ${
                  isActive
                    ? "bg-[#ff990a] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                    : "bg-transparent text-black hover:bg-[rgba(255,162,31,0.1)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[99px] bg-gradient-to-r from-[#780301] to-[#de0602] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex-none flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <img
              src={imgCebuTechnologicalUniversityLogo1}
              alt="CTU Logo"
              className="w-[70px] h-[70px] object-contain"
            />
            <div>
              <h1 className="font-['SF_Pro',sans-serif] font-bold text-[22px] text-white">
                OptiCore
              </h1>
              <p className="font-['SF_Pro',sans-serif] font-normal text-[16px] text-white">
                Campus Intelligence System – CTU Argao
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={imgEllipse1}
              alt="User Avatar"
              className="w-[70px] h-[70px] rounded-full object-cover"
            />
            <button className="w-[70px] h-[70px] flex items-center justify-center">
              <Bell className="w-8 h-8 text-white" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
