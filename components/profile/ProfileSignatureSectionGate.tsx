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
  const officialInSystemConfig = props.role === "doi_admin" || props.role === "college_admin";
  return (
    <div className="mt-6">
      {officialInSystemConfig ? (
        <p className="mb-3 text-xs text-gray-600">
          The official INS electronic signature is uploaded in{" "}
          <span className="font-medium">System Configuration</span>. A profile signature is used only if none is set
          there.
        </p>
      ) : null}
      <ProfileSignatureUpload initialUrl={props.initialSignatureUrl} />
    </div>
  );
}
