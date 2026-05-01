"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
      const emailNormalized = email.trim().toLowerCase();
      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized);
      if (!looksLikeEmail) {
        throw new Error("Invalid email address.");
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Missing Supabase environment variables.");
      }

      const { error: signError } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password,
      });

      if (signError) {
        const m = signError.message;
        if (/invalid login credentials|invalid email or password/i.test(m)) {
          // Supabase intentionally doesn't disclose which field was wrong.
          // We keep messages user-friendly by checking whether the email exists in our profile table.
          const { data: profileRow } = await supabase
            .from("User")
            .select("id")
            .eq("email", emailNormalized)
            .maybeSingle();
          throw new Error(profileRow?.id ? "Incorrect password." : "Account not found.");
        }
        if (/email not confirmed/i.test(m)) {
          throw new Error("Email not verified.");
        }
        throw signError;
      }

      const { data: rpc, error: rpcErr } = await supabase.rpc("auth_get_my_user_row");
      if (rpcErr) throw rpcErr;
      const role =
        rpc && typeof rpc === "object" && rpc !== null && "role" in rpc
          ? String((rpc as { role: string }).role).trim()
          : "";
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Account not found.");
      }
      const home = getDefaultHomeForRole(role);
      const target =
        nextParam && nextParam.length > 0 && pathAllowedForRole(role, nextParam) ? nextParam : home;
      window.location.assign(target);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg || "Login failed");
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#181818] tracking-tight">
            Cebu Technological University
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-black">Sign in</h2>
          <p className="text-sm sm:text-base text-neutral-600">
            to continue OptiCore–Campus Intelligence System
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[#181818]">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 rounded-lg border-neutral-300 bg-sky-50/60 text-sm shadow-sm placeholder:text-neutral-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-[#181818]">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 rounded-lg border-neutral-300 bg-sky-50/60 pr-11 text-sm shadow-sm placeholder:text-neutral-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#636364] hover:text-[#181818] outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
              </button>
            </div>
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
              <label htmlFor="remember" className="text-sm text-[#181818] cursor-pointer font-medium">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              className="text-sm text-[#181818] hover:underline font-medium"
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
            className="h-12 w-full rounded-xl bg-[#780301] text-base font-semibold tracking-wide text-white shadow-md hover:bg-[#5a0201]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-sm">
            <Link href="/" className="text-[#5483b3] font-medium hover:underline">
              ← Back to home
            </Link>
          </p>

          <p className="text-center text-sm leading-relaxed text-neutral-600">
            <span>Don&apos;t have an account? </span>
            <Link href="/register" className="font-medium text-sky-600 hover:underline">
              Sign up for free
            </Link>
            <span className="mx-1">·</span>
            <Link href="/register/instructor" className="font-medium text-sky-600 hover:underline">
              Instructor self-register
            </Link>
          </p>
        </form>
      </div>
    </LoginContainer>
  );
}
