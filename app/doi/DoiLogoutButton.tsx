"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/client";

export function DoiLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full bg-white"
      type="button"
      onClick={async () => {
        try {
          await authApi.logout();
        } catch {
          // Even if the backend call fails (offline, etc.), clear the UI.
        }
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign out
    </Button>
  );
}
