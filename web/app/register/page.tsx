import { Suspense } from "react";
import { RegisterClient } from "@/components/register/RegisterClient";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-opticore-bg)]" />}>
      <RegisterClient />
    </Suspense>
  );
}
