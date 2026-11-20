"use client";

import { DeleteWithImpactDialog } from "@/components/admin/DeleteWithImpactDialog";
import { campusAccountsApi } from "@/lib/api/client";

/**
 * Delete a College Admin, Program Chairperson or Service Chair account.
 *
 * Shows what goes with it (their post, profile, notifications, inbox, requests) and what stays but
 * is unlinked (classes they teach, reviews they made, audit log), warns that it cannot be undone, and
 * asks for the name to be typed. DOI may delete any of them; a College Admin only their own
 * chairpersons — the server enforces both.
 */
export function DeleteCampusAccountDialog({
  account,
  roleLabel,
  onClose,
  onDeleted,
}: {
  account: { id: string; name: string; email: string };
  /** e.g. "College Admin", "Program Chairperson", "Service Chair". */
  roleLabel: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const id = account.id;
  return (
    <DeleteWithImpactDialog
      entity="campusAccount"
      id={id}
      name={account.name.trim() || account.email}
      title={`Delete ${roleLabel} account`}
      open
      requireTyping
      warning={
        <>
          <strong>This cannot be undone.</strong> {account.email} will no longer be able to sign in, and the records
          listed under “Will also be deleted” are removed permanently.
        </>
      }
      loadImpact={() => campusAccountsApi.deletionImpact(id)}
      performDelete={() => campusAccountsApi.remove(id)}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  );
}
