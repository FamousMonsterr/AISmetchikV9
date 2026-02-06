const fs = require('fs');
const path = require('path');

const LOG_FLAG = '__LOCAL_LOG_ATTACHED__';

function attachLocalLogFile() {
  if (globalThis[LOG_FLAG]) return;
  const logFile = process.env.LOCAL_LOG_FILE || '.localhost.log';
  const logPath = path.isAbsolute(logFile) ? logFile : path.join(process.cwd(), logFile);
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const wrapWrite = (originalWrite, stream) => {
    return (chunk, encoding, cb) => {
      try {
        if (logStream.writable) {
          if (typeof chunk === 'string') {
            logStream.write(chunk, typeof encoding === 'string' ? encoding : undefined);
          } else {
            logStream.write(Buffer.from(chunk));
          }
        }
      } catch {
        // ignore log write errors
      }
      return originalWrite.call(stream, chunk, encoding, cb);
    };
  };

  process.stdout.write = wrapWrite(process.stdout.write, process.stdout);
  process.stderr.write = wrapWrite(process.stderr.write, process.stderr);
  logStream.write(`\n[LOCAL LOG START] ${new Date().toISOString()}\n`);

  process.on('exit', () => {
    try {
      logStream.end(`\n[LOCAL LOG END] ${new Date().toISOString()}\n`);
    } catch {
      // ignore
    }
  });

  globalThis[LOG_FLAG] = true;
}

module.exports = { attachLocalLogFile };
