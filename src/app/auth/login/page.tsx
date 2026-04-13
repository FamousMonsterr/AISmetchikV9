import { LoginForm } from '@/components/auth/LoginForm';
import { isVkAuthEnabled } from '@/lib/auth';
import { getTelegramRuntimeConfig } from '@/lib/telegram/runtime';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const telegram = await getTelegramRuntimeConfig();

  return (
    <LoginForm
      vkAuthEnabled={isVkAuthEnabled()}
      telegramMiniAppAuthEnabled={telegram.miniAppAuthEnabled}
      telegramWebAuthEnabled={telegram.webAuthEnabled}
      telegramBotUsername={telegram.botUsername}
    />
  );
}
