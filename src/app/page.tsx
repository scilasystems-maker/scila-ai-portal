import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check role and redirect
  const { data: portalUser } = await supabase
    .from("portal_usuarios")
    .select("rol_global")
    .eq("auth_user_id", user.id)
    .single();

  if (portalUser?.rol_global === "super_admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/portal/dashboard");
  }
}
