import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { NEXTAUTH_SECRET, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID } from "@/lib/env";

const providers = [];

const clientId = AZURE_AD_CLIENT_ID();
const clientSecret = AZURE_AD_CLIENT_SECRET();

if (clientId && clientSecret) {
  providers.push(
    AzureADProvider({
      clientId,
      clientSecret,
      tenantId: AZURE_AD_TENANT_ID(),
    })
  );
}

const handler = NextAuth({
  providers,
  secret: NEXTAUTH_SECRET(),
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };
