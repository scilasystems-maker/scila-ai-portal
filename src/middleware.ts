import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/register", "/forgot-password", "/api/auth/callback", "/api/auth/setup"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If no user and trying to access protected route → redirect to login
  if (!user && !isPublicRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access auth pages → redirect based on role
  if (user && isPublicRoute) {
    // Get portal user to check role
    const { data: portalUser } = await supabase
      .from("portal_usuarios")
      .select("rol_global")
      .eq("auth_user_id", user.id)
      .single();

    const url = request.nextUrl.clone();
    if (portalUser?.rol_global === "super_admin") {
      url.pathname = "/admin/dashboard";
    } else {
      url.pathname = "/portal/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Protect admin routes — only super_admin
  if (user && pathname.startsWith("/admin")) {
    const { data: portalUser } = await supabase
      .from("portal_usuarios")
      .select("rol_global")
      .eq("auth_user_id", user.id)
      .single();

    if (portalUser?.rol_global !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect portal routes — must be a client user
  if (user && pathname.startsWith("/portal")) {
    const { data: portalUser } = await supabase
      .from("portal_usuarios")
      .select("rol_global")
      .eq("auth_user_id", user.id)
      .single();

    if (!portalUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Super admin can also access portal (impersonation)
    // No redirect needed
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo\\.png|.*\\.svg$).*)",
  ],
};
