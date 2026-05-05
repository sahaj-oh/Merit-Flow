import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { getUserByEmail } from "./lib/visibility";

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "openhouse.in,openhouse.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      const domain = email.split("@")[1];
      if (!domain || !allowedDomains.includes(domain)) return false;

      const dbUser = await getUserByEmail(email);
      if (!dbUser) {
        console.warn(`Login rejected — ${email} is not in the employees table`);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (!email) return token;

      if (!token.role || !token.uid) {
        const dbUser = await getUserByEmail(email);
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.fullName = dbUser.fullName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role as "admin" | "manager" | "employee";
        session.user.fullName = (token.fullName as string) ?? session.user.name ?? "";
      }
      return session;
    }
  }
});
