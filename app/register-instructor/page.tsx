import { redirect } from "next/navigation";

/** Alias for instructor self-registration (OTP on screen). */
export default function RegisterInstructorAliasPage() {
  redirect("/register/instructor");
}
