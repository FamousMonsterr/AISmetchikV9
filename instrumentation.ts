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
}
