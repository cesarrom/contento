import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const authentikConfigured = Boolean(
  process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET
);

export const authConfig: NextAuthConfig = {
  providers: authentikConfigured
    ? [
        {
          id: "authentik",
          name: "Authentik",
          type: "oidc",
          issuer: process.env.AUTHENTIK_ISSUER,
          clientId: process.env.AUTHENTIK_CLIENT_ID,
          clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
        },
      ]
    : [],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
