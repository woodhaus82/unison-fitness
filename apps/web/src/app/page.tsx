import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "admin" || profile.role === "coach") redirect("/admin/schedule");
  redirect("/schedule");
}
