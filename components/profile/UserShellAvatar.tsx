"use client";

import { User } from "lucide-react";

type UserShellAvatarProps = {
  /** Used for alt text when an image is shown */
  name: string;
  imageUrl?: string | null;
};

/**
 * Header account button: photo when set, otherwise generic user icon (matches OptiCore shells).
 */
export function UserShellAvatar({ name, imageUrl }: UserShellAvatarProps) {
  const src = imageUrl?.trim();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
      <img src={src} alt={`${name} profile photo`} className="h-full w-full object-cover" />
    );
  }
  return <User className="w-5 h-5 text-gray-600" strokeWidth={2.2} aria-hidden />;
}
