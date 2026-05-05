import "next-auth";
import "next-auth/jwt";

type Role = "admin" | "manager" | "employee";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: Role;
      fullName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    fullName?: string;
  }
}
