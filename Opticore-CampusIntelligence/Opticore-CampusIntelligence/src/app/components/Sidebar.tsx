import { Home, Mail, Users, BookOpen, ChevronDown } from 'lucide-react';

interface SidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Campus Intelligence', icon: Home },
    { id: 'schedule', label: 'INS Form (Schedule View)', icon: BookOpen },
    { id: 'evaluator', label: 'Central Hub Evaluator', icon: Users },
    { id: 'inbox', label: 'Inbox', icon: Mail },
    { id: 'faculty', label: 'Faculty Profile', icon: Users },
    { id: 'subjects', label: 'Subject Codes', icon: BookOpen },
  ];

  return (
    <aside className="w-[345px] bg-[#EEEEEE] h-full p-4 flex-shrink-0 overflow-y-auto">
      {/* Semester Selector */}
      <div className="mb-6">
        <button className="w-full bg-[#FF990A] text-white rounded-full px-6 py-3 font-medium flex items-center justify-between hover:bg-[#e88909] transition-colors">
          <span>2nd Semester S.Y. 2025-2026</span>
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#FF990A] text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}