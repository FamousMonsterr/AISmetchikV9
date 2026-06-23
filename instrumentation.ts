export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const [{ attachLocalLogFile }, { registerGlobalErrorHandlers }] = await Promise.all([
    import('./scripts/local-log'),
    import('./scripts/register-error-handlers'),
  ]);

  attachLocalLogFile();
  registerGlobalErrorHandlers();

  // Start Telegram bot (polling or webhook) in the background.
  // Non-blocking — errors are logged but don't prevent app startup.
  import('./src/lib/telegram/startup')
    .then(({ initTelegramBotOnStartup }) => initTelegramBotOnStartup())
    .catch((err) => console.error('[instrumentation] Telegram bot init failed:', err?.message));
}
