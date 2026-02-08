const fs = require('fs');
const path = require('path');

const LOG_FLAG = '__LOCAL_LOG_ATTACHED__';

function rotateLogFile(logPath) {
  try {
    if (!fs.existsSync(logPath)) return;
    const stats = fs.statSync(logPath);
    if (!stats.size) return;
    const archiveFile = process.env.LOCAL_LOG_ARCHIVE_FILE || 'old.localhost.log';
    const archivePath = path.isAbsolute(archiveFile) ? archiveFile : path.join(process.cwd(), archiveFile);
    const content = fs.readFileSync(logPath);
    const header = `\n[LOCAL LOG ARCHIVE] ${new Date().toISOString()}\n`;
    fs.appendFileSync(archivePath, header);
    fs.appendFileSync(archivePath, content);
    fs.truncateSync(logPath, 0);
  } catch {
    // ignore rotation errors
  }
}

function attachLocalLogFile() {
  if (globalThis[LOG_FLAG]) return;
  const logFile = process.env.LOCAL_LOG_FILE || '.localhost.log';
  const logPath = path.isAbsolute(logFile) ? logFile : path.join(process.cwd(), logFile);
  rotateLogFile(logPath);
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
