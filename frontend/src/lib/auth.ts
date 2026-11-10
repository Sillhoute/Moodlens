import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios, { AxiosError } from "axios";

class CustomAuthError extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

interface LoginBackendResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    username: string;
  };
  message?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    "fer-ensemble-secret-key-super-aman-32-char-min!",
  session: {
    strategy: "jwt",
    maxAge: 18000,
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new CustomAuthError("Username dan password wajib diisi");
        }

        try {
          // Kode ini berjalan di server Next.js, bukan di browser. Di Docker, "localhost" berarti
          // container frontend itu sendiri, jadi backend dipanggil lewat INTERNAL_API_URL
          // (contoh: http://backend:9000/api). Tanpa Docker, cukup memakai NEXT_PUBLIC_API_URL.
          const apiUrl =
            process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
          const { data } = await axios.post<LoginBackendResponse>(
            `${apiUrl}/auth/login`,
            {
              username: credentials.username,
              password: credentials.password,
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 10000,
            },
          );

          if (!data.access_token || !data.user) {
            throw new CustomAuthError("Data autentikasi tidak valid");
          }

          return {
            id: String(data.user.id), // String untuk kontrak standar User NextAuth
            username: data.user.username,
            accessToken: data.access_token,
            tokenExpiresAt: Date.now() + (data.expires_in || 28800) * 1000,
          };
        } catch (error: unknown) {
          if (error instanceof CustomAuthError) {
            throw error;
          }

          if (error instanceof AxiosError) {
            const serverMessage = error.response?.data?.message;
            throw new CustomAuthError(
              serverMessage || "Username atau password salah",
            );
          }

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat menghubungkan ke server auth";
          throw new CustomAuthError(errorMessage);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username ?? "";
        token.accessToken = user.accessToken ?? "";
        token.tokenExpiresAt = user.tokenExpiresAt;
        return token;
      }

      if (trigger === "update" && session && typeof session === "object") {
        const updateData = (session as { user?: { username?: string } }).user;
        if (updateData?.username !== undefined) {
          token.username = updateData.username;
        }
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.error = token.error;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
});
