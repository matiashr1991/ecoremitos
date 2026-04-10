import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/test-delete|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$|login|api/auth).*)",
  ],
};

// Routes configuration by role
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["*"],
  recaudacion: ["/", "/guias", "/remitos", "/delegaciones", "/titulares", "/entregas"],
  central: ["/", "/guias", "/remitos", "/delegaciones", "/titulares"],
  delegacion: ["/operativa"],
  control: ["/", "/guias", "/remitos", "/carga"],
  auditor: ["/", "/guias", "/remitos", "/admin/audit-log"],
  fiscalizador: ["/", "/guias", "/remitos"],
  carga: ["/", "/carga", "/guias", "/remitos"],
};

const ROLE_HOME: Record<string, string> = {
  admin: "/",
  recaudacion: "/",
  central: "/",
  delegacion: "/operativa",
  control: "/",
  auditor: "/",
  fiscalizador: "/",
  carga: "/",
};

function isRouteAllowed(role: string, pathname: string): boolean {
  const allowedRoutes = ROLE_ROUTES[role];
  if (!allowedRoutes) return false;
  if (allowedRoutes.includes("*")) return true;

  return allowedRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(route + "/");
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Use headers() helper or standard fetch-compatible headers from request
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Step 1: If no session, redirect to login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Step 2: Get verified role and metadata from session
  const role = (session.user as any).role || "control";

  // Step 3: Redirect delegacion users to /operativa if they hit dashboard
  if (role === "delegacion" && !pathname.startsWith("/operativa")) {
    return NextResponse.redirect(new URL("/operativa", request.url));
  }

  // Step 4: Check if account is logically deleted
  if ((session.user as any).deletedAt) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "account_deleted");
    return NextResponse.redirect(loginUrl);
  }

  // Step 5: Check route access for non-admin users
  if (role !== "admin" && !isRouteAllowed(role, pathname)) {
    const home = ROLE_HOME[role] || "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}
