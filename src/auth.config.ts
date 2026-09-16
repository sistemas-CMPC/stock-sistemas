import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth;
      const isLogin = pathname.startsWith("/login");
      const isAuthApi = pathname.startsWith("/api/auth");

      if (isAuthApi) return true;
      if (isLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
