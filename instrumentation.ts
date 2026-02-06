
// instrumentation.ts (корень проекта, рядом с package.json)
import { attachLocalLogFile } from './scripts/local-log';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    attachLocalLogFile();
    console.log('\n═══════════════════════════════════════');
    console.log('🛡️ REGISTERING GLOBAL ERROR HANDLERS');
    console.log('═══════════════════════════════════════\n');

    // ✅ КРИТИЧНО: Ловим uncaught exceptions
    process.on('uncaughtException', (error: Error, origin: string) => {
      console.error('\n💥💥💥 UNCAUGHT EXCEPTION - SERVER WILL CRASH 💥💥💥');
      console.error('═══════════════════════════════════════');
      console.error('Time:', new Date().toISOString());
      console.error('Origin:', origin);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:');
      console.error(error.stack);
      console.error('═══════════════════════════════════════\n');
      
      // НЕ вызываем process.exit() - даем Next.js время для логирования
    });

    // ✅ КРИТИЧНО: Ловим unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('\n💥💥💥 UNHANDLED PROMISE REJECTION 💥💥💥');
      console.error('═══════════════════════════════════════');
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
      
      console.error('═══════════════════════════════════════\n');
    });

    // ✅ Ловим предупреждения
    process.on('warning', (warning: Error) => {
      console.warn('\n⚠️ NODE WARNING:', warning.name);
      console.warn('Message:', warning.message);
      console.warn('Stack:', warning.stack, '\n');
    });

    console.log('✅ Global error handlers registered successfully\n');
  }
}
