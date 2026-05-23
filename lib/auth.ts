import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: AuthOptions = {
  providers: hasGoogle
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
    : [],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  session: { strategy: "jwt" },
};
