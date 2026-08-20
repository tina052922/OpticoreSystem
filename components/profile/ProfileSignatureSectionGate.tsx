"use client";

import type { UserRole } from "@/types/db";
import { ProfileSignatureUpload } from "@/components/profile/ProfileSignatureUpload";

const SIGNATURE_ROLES: UserRole[] = [
  "doi_admin",
  "college_admin",
  "chairman_admin",
  "gec_chairman",
];

export function ProfileSignatureSectionGate(props: { role: string; initialSignatureUrl?: string | null }) {
  if (!SIGNATURE_ROLES.includes(props.role as UserRole)) return null;
  return (
    <div className="mt-6">
      <ProfileSignatureUpload initialUrl={props.initialSignatureUrl} />
    </div>
  );
}
