import { LoginForm } from '@/components/auth/LoginForm';
import { isAppleAuthEnabled, isGoogleAuthEnabled, isTelegramMiniAppAuthEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <LoginForm
      appleAuthEnabled={isAppleAuthEnabled()}
      googleAuthEnabled={isGoogleAuthEnabled()}
      telegramMiniAppAuthEnabled={isTelegramMiniAppAuthEnabled()}
    />
  );
}
