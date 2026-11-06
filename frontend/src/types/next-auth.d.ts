import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username?: string;
    accessToken?: string;
    tokenExpiresAt?: number;
  }

  interface Session {
    accessToken: string;
    refreshToken?: string;
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
    error?: "RefreshTokenError";
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    username: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: number;
    error?: "RefreshTokenError";
  }
}
