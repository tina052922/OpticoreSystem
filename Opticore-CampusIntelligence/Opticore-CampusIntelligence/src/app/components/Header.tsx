import { Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="h-[99px] flex items-center px-6 relative flex-shrink-0" style={{
      background: 'linear-gradient(90deg, #780301 0%, #DE0602 100%)'
    }}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-transparent flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-transparent overflow-hidden flex items-center justify-center text-white font-bold text-xl">
            <img
              src="/ctu-logo.png"
              alt="CTU logo"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
        <div>
          <h1 className="text-white font-bold text-2xl">OptiCore</h1>
          <p className="text-white text-sm opacity-90">Campus Intelligence System – CTU Argao</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button className="relative">
          <Bell className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF990A] rounded-full"></span>
        </button>

        <div className="w-10 h-10 rounded-full bg-white overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop"
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}