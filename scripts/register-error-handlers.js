const FLAG = '__GLOBAL_ERROR_HANDLERS_ATTACHED__';

function registerGlobalErrorHandlers() {
  if (globalThis[FLAG]) {
    return;
  }

  console.log('\n[server] registering global error handlers');

  process.on('uncaughtException', (error, origin) => {
    console.error('\n[server] uncaught exception');
    console.error('Time:', new Date().toISOString());
    console.error('Origin:', origin);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Stack trace:');
    console.error(error?.stack);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n[server] unhandled promise rejection');
    console.error('Time:', new Date().toISOString());
    console.error('Promise:', promise);

    if (reason instanceof Error) {
      console.error('Error name:', reason.name);
      console.error('Error message:', reason.message);
      console.error('Stack trace:');
      console.error(reason.stack);
    } else {
      console.error('Rejection reason:', reason);
    }
  });

  process.on('warning', (warning) => {
    console.warn('\n[server] node warning:', warning?.name);
    console.warn('Message:', warning?.message);
    console.warn('Stack:', warning?.stack, '\n');
  });

  globalThis[FLAG] = true;
  console.log('[server] global error handlers registered\n');
}

module.exports = { registerGlobalErrorHandlers };
