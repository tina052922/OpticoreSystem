"use client";

import Link from "next/link";
import { BarChart3, Calendar, Cloud, LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTU_LOGO_PNG } from "@/lib/branding";

function LaptopMockup() {
  // Lightweight inline SVG (no binary assets) to mimic the Figma laptop preview.
  return (
    <svg viewBox="0 0 640 420" className="w-full h-auto" role="img" aria-label="OptiCore dashboard preview">
      <defs>
        <linearGradient id="screen" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f3f4f6" />
        </linearGradient>
        <linearGradient id="base" x1="0" x2="1">
          <stop offset="0" stopColor="#2b2b2b" />
          <stop offset="1" stopColor="#0f0f0f" />
        </linearGradient>
      </defs>
      {/* screen */}
      <rect x="90" y="40" width="460" height="280" rx="16" fill="#111827" />
      <rect x="105" y="55" width="430" height="250" rx="10" fill="url(#screen)" />
      {/* simple UI */}
      <rect x="120" y="70" width="120" height="220" rx="8" fill="#fff7ed" stroke="#fed7aa" />
      <rect x="255" y="70" width="265" height="90" rx="10" fill="#ffffff" stroke="#e5e7eb" />
      <rect x="255" y="175" width="265" height="115" rx="10" fill="#ffffff" stroke="#e5e7eb" />
      {/* chart bars */}
      {Array.from({ length: 10 }).map((_, i) => {
        const h = 18 + (i % 5) * 12;
        return <rect key={i} x={270 + i * 22} y={275 - h} width="14" height={h} rx="3" fill="#ff990a" />;
      })}
      {/* laptop base */}
      <path
        d="M60 335h520c16 0 28 12 28 28v8H32v-8c0-16 12-28 28-28Z"
        fill="url(#base)"
      />
      <rect x="220" y="350" width="200" height="10" rx="5" fill="#374151" />
      <path d="M70 335h500l-22-35H92l-22 35Z" fill="#1f2937" />
    </svg>
  );
}

/**
 * Public home: unauthenticated landing.
 * Updated to match the Figma Landingpage layout (Home / About / Features + CTA), adapted to Next.js.
 */
export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-black/10 z-50">
        <div className="max-w-6xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-full overflow-hidden bg-white ring-1 ring-black/10 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CTU_LOGO_PNG} alt="" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold text-xl text-[#a30000] truncate">OptiCore</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-8">
            <a href="#home" className="text-[#a30000] font-medium text-sm sm:text-base hover:opacity-80">
              Home
            </a>
            <a href="#about" className="text-[#a30000] text-sm sm:text-base hover:opacity-80">
              About
            </a>
            <a href="#features" className="text-[#a30000] text-sm sm:text-base hover:opacity-80">
              Features
            </a>
            <Button asChild className="bg-[#a30000] hover:bg-[#8b0000] text-white font-semibold rounded-full px-5">
              <Link href="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section
        id="home"
        className="relative w-full pt-[72px] min-h-[calc(100vh-72px)] overflow-hidden"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
          <img src="/login/campus-photo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(120,3,1,0.82)] via-[rgba(120,3,1,0.55)] to-[rgba(120,3,1,0.15)]" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
          <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_6px_4px_rgba(0,0,0,0.65)]">
            OptiCore
          </h1>
          <h2 className="mt-4 text-2xl md:text-4xl font-semibold text-white drop-shadow-md">
            Campus Intelligence System
          </h2>
          <p className="mt-6 text-base md:text-xl text-white/95 max-w-3xl leading-relaxed font-medium">
            Coordinate timetables, faculty load, and campus workflows for CTU Argao — built for chairs, admins, faculty,
            and students.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-[#780301] hover:bg-white/90 font-bold rounded-full">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button asChild size="lg" className="bg-[#ff990a] hover:bg-[#e88909] text-white font-semibold rounded-full">
              <Link href="/campus-navigation">Campus navigation</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            <LaptopMockup />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-[#780301] mb-4">About Us</h2>
            <h3 className="text-xl md:text-2xl text-[#780301] mb-6">Campus Intelligence System</h3>
            <p className="text-base md:text-lg text-[#780301]/85 leading-relaxed">
              OptiCore is CTU Argao&apos;s Campus Intelligence System: schedule plotting, INS-style forms, access workflows,
              and dashboards that keep academic operations transparent and aligned with institutional policy.
            </p>
            <div className="mt-8">
              <Button type="button" disabled className="bg-[#a30000] text-white rounded-full px-6 py-6 text-base">
                Download App (coming soon)
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-20 px-6 bg-gradient-to-br from-orange-50/50 to-red-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold text-[#780301]">Features</h2>
            <p className="mt-3 text-base md:text-lg text-[#780301]/75">
              Everything you need to manage campus operations efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Plot schedules with conflict checking across faculty, rooms, and sections.",
              },
              {
                icon: Users,
                title: "Faculty Management",
                desc: "Track loads, designations, and assignments; generate INS-compliant outputs.",
              },
              {
                icon: Cloud,
                title: "Synchronization",
                desc: "Consistent schedule data across roles (Chairman, GEC, College, DOI, Faculty).",
              },
              {
                icon: BarChart3,
                title: "Dashboards",
                desc: "Campus Intelligence views for conflicts, activity, and term status.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#780301] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold text-[#780301]">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#780301]/80 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="bg-[#a30000] hover:bg-[#8b0000] text-white font-semibold rounded-full px-7">
              <Link href="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to continue
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-6 text-center text-xs text-black/50">
        © {new Date().getFullYear()} Cebu Technological University · OptiCore Campus Intelligence System
      </footer>
    </div>
  );
}
