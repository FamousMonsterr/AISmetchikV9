const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css']);
const BAD_MARKERS = [
  "\uFFFD",
  "\u0420\u040e",
  "\u0420\u045f",
  "\u0420\u0402",
  "\u0420\u201a",
  "\u0420\u2019",
  "\u0420\u201c",
  "\u0420\u201d",
  "\u0420\u2022",
  "\u0420\u2014",
  "\u0420\u045a",
  "\u0421\u0455",
  "\u0421\u201a",
  "\u0421\u045f",
  "\u0421\u2021",
  "\u043f\u0457\u0405",
];

const ignoredSegments = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredSegments.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectMatches(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = BAD_MARKERS.filter((marker) => text.includes(marker));
  return matches;
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const failures = files
  .map((filePath) => {
    const matches = collectMatches(filePath);
    return matches.length
      ? {
          filePath: path.relative(ROOT, filePath),
          matches,
        }
      : null;
  })
  .filter(Boolean);

if (failures.length) {
  console.error('Detected suspicious mojibake markers:');
  for (const failure of failures) {
    console.error(`- ${failure.filePath}: ${failure.matches.join(', ')}`);
  }
  process.exit(1);
}

console.log('No mojibake markers detected.');
