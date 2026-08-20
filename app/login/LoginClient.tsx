// web/app/login/LoginClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginContainer } from "@/components/login/LoginContainer";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { authApi } from "@/lib/api/client";
import {
  getDefaultHomeForRole,
  pathAllowedForRole,
} from "@/lib/auth/role-home";

export function LoginClient() {
  const params = useSearchParams();
  const nextParam = useMemo(() => params.get("next"), [params]);
  const errorParam = params.get("error");

  const toast = useOpticoreToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "forbidden" || errorParam === "forbidden_role") {
      toast.error("Access denied", "This account is not authorized for that area.");
      void authApi.logout().catch(() => undefined);
    }
    if (errorParam === "session_expired") {
      toast.error("Session expired", "Please sign in again.");
    }
  }, [errorParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const emailNormalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
        throw new Error("Invalid email address.");
      }

      const response = await authApi.login({
        email: emailNormalized,
        password,
        rememberMe,
      });

      if (!response || !response.user) {
        throw new Error("Invalid response from server.");
      }

      const { user } = response;
      toast.success("Signed in successfully", `Welcome, ${user.name ?? user.email}`);

      // Clear stored redirect path cookie so middleware doesn't override the target
      document.cookie = "last_visited_path=; path=/; max-age=0";

      const home = getDefaultHomeForRole(user.role);
      const target =
        nextParam &&
        nextParam.length > 0 &&
        pathAllowedForRole(user.role, nextParam)
          ? nextParam
          : home;

      window.location.assign(target);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.error ||
        (typeof err === "string" ? err : "Login failed");
      const isInvalid = message.toLowerCase().includes("invalid") || message.toLowerCase().includes("credentials");
      toast.error(
        isInvalid ? "Invalid credentials" : "Login failed",
        isInvalid ? "Check your email and password and try again." : message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("No email entered", "Enter your email first, then click Forgot password.");
      return;
    }
    try {
      await authApi.forgotPassword(trimmed);
    } catch {
      // Swallow error to prevent email enumeration
    }
    toast.success("Reset link sent", "If an account exists for that email, a reset link has been sent.");
  }

  return (
    <LoginContainer>
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-full overflow-hidden ring-2 ring-black/[0.06] shadow-sm bg-white">
            <img
              src={CTU_LOGO_PNG}
              alt="Cebu Technological University"
              width={144}
              height={144}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("ctu-logo.svg"))
                  el.src = "/login/ctu-logo.svg";
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
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#181818]"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#181818]"
            >
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
              >
                {showPassword ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
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
              <label
                htmlFor="remember"
                className="text-sm text-[#181818] cursor-pointer font-medium"
              >
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

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#780301] text-base font-semibold tracking-wide text-white shadow-md hover:bg-[#5a0201]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-sm">
            <Link
              href="/"
              className="text-[#5483b3] font-medium hover:underline"
            >
              ← Back to home
            </Link>
          </p>
        </form>
      </div>
    </LoginContainer>
  );
}
