import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ensureGoogleUser, getUserByEmail } from "@/lib/db/users";

const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await getUserByEmail(creds.email);
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                scope:
                  "openid email profile https://www.googleapis.com/auth/gmail.readonly",
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Auto-provision a UserRecord for Google logins so we have a stable userId
      if (account?.provider === "google" && user?.email) {
        const u = await ensureGoogleUser({
          email: user.email,
          name: user.name || (profile as any)?.name,
          image: user.image || undefined,
        });
        (user as any).id = u._id;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account?.access_token) {
        (token as any).accessToken = account.access_token;
      }
      if (user) {
        (token as any).userId = (user as any).id || token.sub;
      }
      // If we still don't have a userId but have an email, look it up
      if (!(token as any).userId && token.email) {
        const u = await getUserByEmail(token.email as string);
        if (u) (token as any).userId = u._id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      if (session.user) {
        session.user.id =
          ((token as any).userId as string) || (token.sub as string) || "";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
