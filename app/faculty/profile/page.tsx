import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { FacultyOwnProfileDetails } from "@/components/profile/FacultyOwnProfileDetails";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { EmailChangeSection } from "@/components/profile/EmailChangeSection";
import { requireRoles } from "@/lib/auth/require-role";

/** Account, personal details the instructor edits, and chairman-kept appointment details. */
export default async function FacultyProfilePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Your OptiCore instructor account." />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-3xl space-y-4">
        <ProfileAvatarUpload initialUrl={profile.profileImageUrl} />

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-black">Account</h2>
          <p className="mt-0.5 text-xs text-black/55">
            Signed in as <strong className="text-black/80">{profile.name}</strong>. Your name, Employee ID and other
            details are edited under My details below.
          </p>
          {/* Same email change as every other role: a code to the new address, then confirm. */}
          <div className="mt-4">
            <EmailChangeSection email={profile.email ?? ""} />
          </div>
          <div className="mt-4">
            <Button variant="outline" className="bg-white" asChild>
              <Link href="/account/change-password?next=%2Ffaculty%2Fprofile">Change Password</Link>
            </Button>
          </div>
        </section>

        <FacultyOwnProfileDetails />
      </div>
    </div>
  );
}
