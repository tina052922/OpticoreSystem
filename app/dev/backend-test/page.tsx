"use client";

/**
 * Backend connectivity test page.
 *
 * Only intended for local development. The page itself is unauthenticated
 * (anyone hitting `/dev/backend-test` can use the buttons), so DO NOT
 * leave it deployed in production. The gate below blocks it when
 * NODE_ENV is not "development".
 *
 * 🔒 The test handlers never log passwords, tokens, or response bodies
 *    that may contain personal data. They only print success / failure
 *    status + safe HTTP metadata.
 */

import { useState } from "react";
import {
  ApiClientError,
  API_BASE_URL,
  authApi,
  publicApi,
} from "@/lib/api/client";

type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; summary: string }
  | { kind: "error"; status: number; code: string; message: string };

function StatusPill({ status }: { status: Status }) {
  if (status.kind === "idle") return <span className="text-neutral-400">—</span>;
  if (status.kind === "running")
    return <span className="text-blue-600">Running…</span>;
  if (status.kind === "ok")
    return <span className="text-green-700">OK · {status.summary}</span>;
  return (
    <span className="text-red-700">
      {status.status || "?"} {status.code} · {status.message}
    </span>
  );
}

export default function BackendTestPage() {
  const [healthStatus, setHealthStatus] = useState<Status>({ kind: "idle" });
  const [loginStatus, setLoginStatus] = useState<Status>({ kind: "idle" });
  const [meStatus, setMeStatus] = useState<Status>({ kind: "idle" });
  const [logoutStatus, setLogoutStatus] = useState<Status>({ kind: "idle" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="p-10 max-w-xl mx-auto">
        <h1 className="text-xl font-semibold">Not available in production</h1>
        <p className="mt-2 text-neutral-600">
          This page is a development-only helper.
        </p>
      </main>
    );
  }

  async function run(
    setter: (s: Status) => void,
    fn: () => Promise<string>,
  ): Promise<void> {
    setter({ kind: "running" });
    try {
      const summary = await fn();
      setter({ kind: "ok", summary });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setter({
          kind: "error",
          status: err.status,
          code: err.code,
          message: err.message,
        });
      } else {
        setter({
          kind: "error",
          status: 0,
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Backend connectivity test</h1>
        <p className="text-sm text-neutral-600">
          Talks to the Express API at <code>{API_BASE_URL || "(same-origin)"}</code>.
          Local dev only.
        </p>
      </header>

      <section className="rounded-2xl border border-black/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">GET /health</h2>
            <p className="text-sm text-neutral-600">
              Public health probe. Should always succeed if the backend is up.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm"
            onClick={() =>
              run(setHealthStatus, async () => {
                const data = await publicApi.healthCheck();
                return `uptime=${Math.round(data.uptime)}s`;
              })
            }
          >
            Run
          </button>
        </div>
        <div className="text-sm">
          <StatusPill status={healthStatus} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">POST /api/auth/login</h2>
            <p className="text-sm text-neutral-600">
              Cookies are HTTP-only — nothing is rendered or stored client-side.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
            disabled={!email || !password}
            onClick={() =>
              run(setLoginStatus, async () => {
                const { user } = await authApi.login({ email, password });
                return `role=${user.role}`;
              })
            }
          >
            Run
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="email"
            placeholder="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm"
          />
        </div>
        <div className="text-sm">
          <StatusPill status={loginStatus} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">GET /api/auth/me</h2>
            <p className="text-sm text-neutral-600">
              Requires the login cookie set by the call above.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm"
            onClick={() =>
              run(setMeStatus, async () => {
                const { user } = await authApi.me();
                return `role=${user.role}`;
              })
            }
          >
            Run
          </button>
        </div>
        <div className="text-sm">
          <StatusPill status={meStatus} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">POST /api/auth/logout</h2>
            <p className="text-sm text-neutral-600">
              Clears the HTTP-only cookies. Always 200, even with no session.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-black text-white px-4 py-2 text-sm"
            onClick={() =>
              run(setLogoutStatus, async () => {
                await authApi.logout();
                return "cleared";
              })
            }
          >
            Run
          </button>
        </div>
        <div className="text-sm">
          <StatusPill status={logoutStatus} />
        </div>
      </section>
    </main>
  );
}
