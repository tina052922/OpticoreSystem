import { Suspense } from "react";
import { InstructorRegisterClient } from "@/components/register/InstructorRegisterClient";

export default function InstructorRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-opticore-bg)]" />}>
      <InstructorRegisterClient />
    </Suspense>
  );
}
