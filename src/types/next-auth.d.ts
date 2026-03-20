import type { DefaultSession } from 'next-auth';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      systemRole?: string;
      plan?: string;
      authProvider?: string;
    };
  }

  interface User {
    id: string;
    systemRole?: string;
    plan?: string;
    image?: string | null;
    authProvider?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    systemRole?: string;
    plan?: string;
    image?: string | null;
    authProvider?: string;
  }
}
