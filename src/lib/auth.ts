import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

/**
 * Auth Configuration
 * 
 * Supports two modes:
 * 1. OIDC: Connect to any OIDC provider (Authentik, Keycloak, Auth0, Okta, Google, etc.)
 * 2. Dev: Built-in username/password authentication (development only)
 */

// Check for OIDC configuration (supports any OIDC provider)
const oidcIssuer = process.env.AUTHENTIK_ISSUER || process.env.OIDC_ISSUER;
const oidcClientId = process.env.AUTHENTIK_CLIENT_ID || process.env.OIDC_CLIENT_ID;
const oidcClientSecret = process.env.AUTHENTIK_CLIENT_SECRET || process.env.OIDC_CLIENT_SECRET;

const oidcConfigured = Boolean(oidcIssuer && oidcClientId && oidcClientSecret);

// Determine the provider based on environment
// OIDC_ISSUER can be any OIDC provider URL
const providerId = oidcConfigured ? "oidc" : "";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: oidcConfigured
    ? [
        {
          id: providerId,
          name: process.env.OIDC_PROVIDER_NAME || "SSO",
          type: "oidc",
          issuer: oidcIssuer,
          clientId: oidcClientId,
          clientSecret: oidcClientSecret,
          // Well-known endpoints are auto-discovered from issuer URL
          // authorization: { params: { scope: "openid profile email" } },
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

// Helper function to check if OIDC is configured
export function isOidcConfigured(): boolean {
  return oidcConfigured;
}

// Get the provider name for display
export function getProviderName(): string {
  if (!oidcConfigured) return "Dev Auth";
  
  const issuer = oidcIssuer?.toLowerCase() || "";
  if (issuer.includes("authentik")) return "Authentik";
  if (issuer.includes("keycloak")) return "Keycloak";
  if (issuer.includes("auth0")) return "Auth0";
  if (issuer.includes("okta")) return "Okta";
  if (issuer.includes("google")) return "Google";
  
  return process.env.OIDC_PROVIDER_NAME || "SSO";
}
