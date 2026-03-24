import { LoginForm } from '@/components/auth/LoginForm';
import { getTelegramBotUsername, isTelegramMiniAppAuthEnabled, isTelegramWebAuthEnabled, isVkAuthEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <LoginForm
      vkAuthEnabled={isVkAuthEnabled()}
      telegramMiniAppAuthEnabled={isTelegramMiniAppAuthEnabled()}
      telegramWebAuthEnabled={isTelegramWebAuthEnabled()}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
