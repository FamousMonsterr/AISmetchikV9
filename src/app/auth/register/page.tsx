import { Suspense } from 'react';
import { isGoogleAuthEnabled } from '@/lib/auth';
import { RegisterPageContent } from '@/components/auth/RegisterPageContent';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07111b]" />}>
      <RegisterPageContent googleAuthEnabled={isGoogleAuthEnabled()} />
    </Suspense>
  );
}
