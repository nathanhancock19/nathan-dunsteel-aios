import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined
        const password = credentials?.password as string | undefined
        const expectedUsername = process.env.AIOS_USER_USERNAME
        const expectedHash = process.env.AIOS_USER_PASSWORD_HASH

        if (!expectedUsername || !expectedHash) {
          console.error("AIOS auth env vars not set")
          return null
        }
        if (!username || !password) return null
        if (username !== expectedUsername) return null

        const ok = await bcrypt.compare(password, expectedHash)
        if (!ok) return null

        return {
          id: "nathan",
          name: "Nathan Hancock",
          email: "info@danandnath.com",
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
