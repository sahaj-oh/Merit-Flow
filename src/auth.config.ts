import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuthRoute = pathname.startsWith("/api/auth") || pathname === "/login";
      if (isAuthRoute) return true;
      return !!auth;
    }
  }
} satisfies NextAuthConfig;
