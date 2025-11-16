import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Extend the default types
declare module 'next-auth' {
  interface Session {
    djangoToken?: string;
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      is_staff?: boolean;
      is_active?: boolean;
      date_joined?: string;
    };
  }

  interface User {
    djangoToken?: string;
    first_name?: string;
    last_name?: string;
    is_staff?: boolean;
    is_active?: boolean;
    date_joined?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    djangoToken?: string;
    first_name?: string;
    last_name?: string;
    is_staff?: boolean;
    is_active?: boolean;
    date_joined?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        token: { label: 'Token', type: 'text' },
        userId: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'email' },
        firstName: { label: 'First Name', type: 'text' },
        lastName: { label: 'Last Name', type: 'text' },
        isStaff: { label: 'Is Staff', type: 'text' },
        isActive: { label: 'Is Active', type: 'text' },
        dateJoined: { label: 'Date Joined', type: 'text' },
      },
      async authorize(credentials) {
        console.log('[NextAuth] authorize() called with credentials:', {
          hasToken: !!credentials?.token,
          hasUserId: !!credentials?.userId,
          hasEmail: !!credentials?.email,
          email: credentials?.email,
          userId: credentials?.userId,
        });

        // This receives already-authenticated data from client
        // The actual login happens client-side using tenantLogin()
        if (!credentials?.token || !credentials?.userId || !credentials?.email) {
          console.error('[NextAuth] Missing required credentials');
          return null;
        }

        const user = {
          id: credentials.userId as string,
          email: credentials.email as string,
          djangoToken: credentials.token as string,
          first_name: credentials.firstName as string,
          last_name: credentials.lastName as string,
          is_staff: credentials.isStaff === 'true',
          is_active: credentials.isActive === 'true',
          date_joined: credentials.dateJoined as string,
        };

        console.log('[NextAuth] Returning user object:', { ...user, djangoToken: '[REDACTED]' });
        return user;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('[NextAuth] jwt() callback called, has user:', !!user);
      if (user) {
        token.djangoToken = user.djangoToken;
        token.first_name = user.first_name;
        token.last_name = user.last_name;
        token.is_staff = user.is_staff;
        token.is_active = user.is_active;
        token.date_joined = user.date_joined;
        console.log('[NextAuth] JWT token updated with user data');
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth] session() callback called');
      if (token) {
        session.djangoToken = token.djangoToken;
        session.user.id = token.sub || '';
        session.user.first_name = token.first_name;
        session.user.last_name = token.last_name;
        session.user.is_staff = token.is_staff;
        session.user.is_active = token.is_active;
        session.user.date_joined = token.date_joined;
        console.log('[NextAuth] Session updated with token data');
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  trustHost: true,
});
