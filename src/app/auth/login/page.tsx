import { LoginForm } from '@/components/auth/LoginForm';
import { isGoogleAuthEnabled, isTelegramMiniAppAuthEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <LoginForm
      googleAuthEnabled={isGoogleAuthEnabled()}
      telegramMiniAppAuthEnabled={isTelegramMiniAppAuthEnabled()}
    />
  );
}
