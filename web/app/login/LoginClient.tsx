"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getDefaultHomeForRole, pathAllowedForRole } from "@/lib/auth/role-home";

export function LoginClient() {
  const params = useSearchParams();
  const nextParam = useMemo(() => params.get("next"), [params]);
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === "forbidden" || errorParam === "forbidden_doi" || errorParam === "forbidden_role") {
      setError(
        errorParam === "forbidden_role"
          ? "This account cannot access that area. Use the correct role or open the matching portal from the login page."
          : "This account is not authorized for that area.",
      );
      void (async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase?.auth.signOut();
      })();
    }
    if (errorParam === "supabase_config") {
      setError("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    if (errorParam === "auth_callback") {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      setError(
        `Email link could not complete sign-in. Add ${origin}/auth/callback to Supabase → Authentication → URL Configuration (Redirect URLs), then request a new reset email—or set your password in the Supabase Dashboard (Users).`,
      );
    }
  }, [errorParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Missing Supabase environment variables.");
      }

      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signError) throw signError;

      const { data: rpc, error: rpcErr } = await supabase.rpc("auth_get_my_user_row");
      if (rpcErr) throw rpcErr;
      const role =
        rpc && typeof rpc === "object" && rpc !== null && "role" in rpc
          ? String((rpc as { role: string }).role).trim()
          : "";
      if (!role) {
        await supabase.auth.signOut();
        throw new Error(
          "No OptiCore profile for this account. In Supabase: run seed.sql (or insert into public.\"User\"), set User.id to the same UUID as Authentication → Users for this email, deploy auth_get_my_user_row.sql, and grant execute to authenticated.",
        );
      }
      const home = getDefaultHomeForRole(role);
      const target =
        nextParam && nextParam.length > 0 && pathAllowedForRole(role, nextParam) ? nextParam : home;
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then click Forgot password again.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/auth/callback`,
    });
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setError(null);
    alert("Check your email for a password reset link.");
  }

  return (
    <LoginContainer>
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-full overflow-hidden ring-2 ring-black/[0.06] shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CTU_LOGO_PNG}
              alt="Cebu Technological University"
              width={144}
              height={144}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("ctu-logo.svg")) el.src = "/login/ctu-logo.svg";
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-medium text-[#181818] tracking-tight">
            Cebu Technological University
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-black">Sign in</h2>
          <p className="text-base sm:text-lg text-black/90">
            to continue OptiCore–Campus Intelligence System
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-lg font-medium text-[#181818]">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-lg font-medium text-[#181818]">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-14 rounded-xl border-black/25 shadow-md text-base placeholder:text-[#636364]"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border border-black/25 accent-[#780301] shadow-sm"
              />
              <label htmlFor="remember" className="text-base text-[#181818] cursor-pointer font-medium">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              className="text-base text-[#181818] hover:underline font-medium"
            >
              Forgot password
            </button>
          </div>

          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#780301] hover:bg-[#5a0201] text-white rounded-xl shadow-lg text-lg font-semibold tracking-wide"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-base">
            <span className="text-[#595959]">Student? </span>
            <Link href="/register" className="text-[#5483b3] font-medium hover:underline">
              Create an account
            </Link>
            <span className="text-[#595959]">
              {" "}
              · Faculty/staff: use the credentials your chair or college admin provided.
            </span>
          </p>
        </form>
      </div>
    </LoginContainer>
  );
}
