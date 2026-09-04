import { redirect } from "next/navigation";

/** Request Access is retired for GEC Chairman — vacant GEC plotting uses college/department scope only. */
export default function GecRequestAccessPage() {
  redirect("/admin/gec/evaluator");
}
