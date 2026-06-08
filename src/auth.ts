import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Github from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || 'mock-google-id',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || 'mock-google-secret',
    }),
    Github({
      clientId: process.env.AUTH_GITHUB_ID || 'mock-github-id',
      clientSecret: process.env.AUTH_GITHUB_SECRET || 'mock-github-secret',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'developer@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        
        // Find existing user in the database
        let user = await prisma.user.findUnique({
          where: { email },
        });

        // Developer friendly feature: If user does not exist, automatically register them
        // under a new Default Tenant to make onboarding smooth.
        if (!user) {
          console.log(`User "${email}" not found. Auto-registering under new tenant.`);
          const newTenant = await prisma.tenant.create({
            data: {
              name: `${email.split('@')[0]}'s Organization`,
            },
          });

          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0],
              role: Role.ADMIN, // First user is Admin
              tenantId: newTenant.id,
              passwordHash: 'mock-pass-hash', // in production we would use bcrypt
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Custom sign in page
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});
