import {
  Building2,
  BookOpen,
  CalendarPlus,
  ClipboardList,
  History,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Network,
  Scale,
  Send,
  Settings,
  UserCircle,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { NavIconKey } from "@/lib/admin-nav";

/**
 * The one icon per nav key, shared by every shell.
 *
 * Nav items carry a string key rather than a component because a Server Component cannot pass a
 * Lucide component into a Client Component — it fails to serialize. The shells resolve the key here,
 * so the student portal and the admin shell cannot drift to different icons for the same page.
 */
export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Inbox,
  UserCircle,
  UserPlus,
  Layers,
  Send,
  MapPin,
  Building2,
  Scale,
  CalendarPlus,
  KeyRound,
  History,
  Megaphone,
  Settings,
  Network,
};
