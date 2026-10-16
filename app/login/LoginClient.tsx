// web/app/login/LoginClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthFormHeader } from "@/components/login/AuthFormHeader";
import { LoginContainer } from "@/components/login/LoginContainer";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { authApi, ApiClientError } from "@/lib/api/client";
import {
  getDefaultHomeForRole,
  pathAllowedForRole,
} from "@/lib/auth/role-home";

/** One field style across every signed-out form, so sign-in and register stop diverging. */
const FIELD_CLASS =
  "h-11 rounded-lg border-black/15 bg-white text-sm shadow-sm placeholder:text-black/35 focus-visible:ring-2 focus-visible:ring-[#780301]/25";

export function LoginClient() {
  const params = useSearchParams();
  const nextParam = useMemo(() => params.get("next"), [params]);
  const errorParam = params.get("error");

  const toast = useOpticoreToast();
  const branding = useCampusBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const code = err instanceof ApiClientError ? err.code : "";
      toast.error(
        code === "INSTRUCTOR_PENDING"
          ? "Awaiting chairman approval"
          : code === "INSTRUCTOR_REJECTED"
            ? "Registration not approved"
            : isInvalid
              ? "Invalid credentials"
              : "Login failed",
        isInvalid && !code.startsWith("INSTRUCTOR_")
          ? "Check your email and password and try again."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Carries whatever the user already typed into the reset flow, so they don't
   * retype it. Only prefilled when it looks like an address — passing a partial
   * string would just show a validation error on arrival.
   */
  const forgotPasswordHref = useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? `/forgot-password?email=${encodeURIComponent(trimmed)}`
      : "/forgot-password";
  }, [email]);

  return (
    <LoginContainer>
      <AuthFormHeader
        title="Sign in"
        subtitle={`Continue to ${branding.headerTitle} — Campus Intelligence System.`}
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[#181818]">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={FIELD_CLASS}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium text-[#181818]">
              Password
            </label>
            <Link
              href={forgotPasswordHref}
              className="text-xs font-medium text-[#780301] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={FIELD_CLASS}
            required
          />
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-black/70">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border border-black/25 accent-[#780301]"
          />
          Keep me signed in
        </label>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-[#780301] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a0201] disabled:opacity-70"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/*
        One block, not three stacked paragraphs. The two sign-up routes differ by who you are, so
        they read as a choice rather than as two unrelated links; "Back to home" lives in the panel.
      */}
      <div className="mt-6 border-t border-black/[0.07] pt-5 text-center text-sm">
        <p className="text-black/55">
          New here?{" "}
          <Link href="/register" className="font-semibold text-[#780301] hover:underline">
            Create a student account
          </Link>
        </p>
        <p className="mt-1.5 text-black/55">
          Teaching staff?{" "}
          <Link href="/register/instructor" className="font-semibold text-[#780301] hover:underline">
            Register as an instructor
          </Link>
        </p>
      </div>
    </LoginContainer>
  );
}
