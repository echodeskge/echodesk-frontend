'use client';

import { TenantConfig } from '@/types/tenant';
import { AuthUser } from '@/types/auth';
import { SignIn } from '@/components/auth/sign-in';

interface LoginFormProps {
  tenant: TenantConfig;
  onLogin: (token: string, user: AuthUser) => void;
}

export default function LoginForm({ tenant, onLogin }: LoginFormProps) {
  return <SignIn tenant={tenant} onLogin={onLogin} />;
}