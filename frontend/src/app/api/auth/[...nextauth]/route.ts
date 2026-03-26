import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

interface SessionUser {
  id?: string;
  email?: string;
  name?: string;
  backendToken?: string;
  refreshToken?: string;
}

interface JWT {
  sub?: string;
  email?: string;
  name?: string;
  backendToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Credentials Provider for backend authentication (email + password)
const credentialsProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "user@example.com" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, req) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("Email and password required");
    }

    try {
      // Call backend login endpoint
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Invalid email or password");
      }

      const data = await response.json();
      console.log("[DEBUG AUTHORIZE] User authenticated:", data.email);

      return {
        id: data.user_id,
        email: data.email,
        name: data.name,
        backendToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  },
});

const providers = [credentialsProvider];

const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET || "development-secret-not-for-prod",
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.backendToken = (user as any).backendToken;
        token.refreshToken = (user as any).refreshToken;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).id = token.sub;
        (session.user as SessionUser).backendToken = token.backendToken as string;
        (session.user as SessionUser).refreshToken = token.refreshToken as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
