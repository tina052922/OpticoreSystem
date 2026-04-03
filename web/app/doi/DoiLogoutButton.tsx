"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function DoiLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full bg-white"
      type="button"
      onClick={async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut();
        router.refresh();
        router.replace("/login");
      }}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign out
    </Button>
  );
}
