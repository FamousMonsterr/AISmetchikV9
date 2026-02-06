// scripts/generate-code-index.ts
import './bootstrap';
import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind, type SourceFile, type VariableDeclaration } from 'ts-morph';

type FunctionEntry = {
  name: string;
  kind: string;
  line: number;
  column: number;
};

type VariableEntry = {
  name: string;
  kind: string;
  line: number;
  column: number;
};

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'code-index');
const MAX_BYTES = 12 * 1024 * 1024;

const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.git', 'docs', '.npm-cache']);
const EXCLUDED_PATH_PREFIXES = [path.join('public', 'fonts')];

function shouldSkipDir(relativePath: string) {
  if (!relativePath) return false;
  const parts = relativePath.split(path.sep);
  if (EXCLUDED_DIRS.has(parts[0])) return true;
  return EXCLUDED_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function walk(dir: string, files: string[], baseDir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (shouldSkipDir(relativePath)) continue;
      walk(fullPath, files, baseDir);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) continue;
    if (fullPath.endsWith('.d.ts')) continue;
    if (shouldSkipDir(relativePath)) continue;
    files.push(fullPath);
  }
}

function getLineColumn(sourceFile: SourceFile, nodeStart: number) {
  const { line, column } = sourceFile.getLineAndColumnAtPos(nodeStart);
  return { line, column };
}

function collectFunctions(sourceFile: SourceFile): FunctionEntry[] {
  const entries: FunctionEntry[] = [];

  const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
  for (const func of functionDeclarations) {
    const name = func.getName() || (func.isDefaultExport() ? '<default export>' : '<anonymous>');
    const { line, column } = getLineColumn(sourceFile, func.getNameNode()?.getStart() ?? func.getStart());
    entries.push({ name, kind: 'function-declaration', line, column });
  }

  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const decl of variableDeclarations) {
    const initializer = decl.getInitializer();
    if (!initializer) continue;
    if (initializer.getKind() !== SyntaxKind.ArrowFunction && initializer.getKind() !== SyntaxKind.FunctionExpression) continue;

    const name = decl.getName();
    const kind = initializer.getKind() === SyntaxKind.ArrowFunction ? 'arrow-function' : 'function-expression';
    const { line, column } = getLineColumn(sourceFile, decl.getNameNode().getStart());
    entries.push({ name, kind, line, column });
  }

  return entries.sort((a, b) => (a.line - b.line) || (a.column - b.column));
}

function getVariableKind(decl: VariableDeclaration): string {
  const list = decl.getFirstAncestorByKind(SyntaxKind.VariableDeclarationList) as any;
  if (list?.getDeclarationKind) {
    return list.getDeclarationKind();
  }
  const statement: any = decl.getVariableStatement?.();
  if (statement?.getDeclarationKind) {
    return statement.getDeclarationKind();
  }
  return 'const';
}

function collectVariables(sourceFile: SourceFile): VariableEntry[] {
  const entries: VariableEntry[] = [];
  const variableDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const decl of variableDeclarations) {
    const name = decl.getName();
    const { line, column } = getLineColumn(sourceFile, decl.getNameNode().getStart());
    entries.push({ name, kind: getVariableKind(decl), line, column });
  }
  return entries.sort((a, b) => (a.line - b.line) || (a.column - b.column));
}

function formatFunctionsSection(relativePath: string, functions: FunctionEntry[]) {
  if (!functions.length) {
    return `## ${relativePath}\n\n- None\n\n`;
  }
  const lines = functions.map((fn) => `- \`${fn.name}\` | ${fn.kind} | ${fn.line}:${fn.column}`);
  return `## ${relativePath}\n\n${lines.join('\n')}\n\n`;
}

function formatVariablesSection(relativePath: string, variables: VariableEntry[]) {
  if (!variables.length) {
    return `## ${relativePath}\n\n- None\n\n`;
  }
  const lines = variables.map((variable) => `- \`${variable.name}\` | ${variable.kind} | ${variable.line}:${variable.column}`);
  return `## ${relativePath}\n\n${lines.join('\n')}\n\n`;
}

function writeWithSplit(basePath: string, header: string, sections: { path: string; content: string }[]) {
  const combined = header + sections.map((section) => section.content).join('');
  if (Buffer.byteLength(combined, 'utf8') <= MAX_BYTES) {
    fs.writeFileSync(basePath, combined, 'utf8');
    return;
  }

  const groups = new Map<string, { path: string; content: string }[]>();
  for (const section of sections) {
    const topLevel = section.path.split(path.sep)[0] || 'root';
    if (!groups.has(topLevel)) groups.set(topLevel, []);
    groups.get(topLevel)!.push(section);
  }

  const indexLines = [
    header.trim(),
    '',
    `Split into ${groups.size} parts because the output exceeded ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
    '',
  ];

  for (const [group] of groups) {
    const partName = basePath.replace(/\.md$/, `-${group}.md`);
    const groupContent = header + groups.get(group)!.map((section) => section.content).join('');
    fs.writeFileSync(partName, groupContent, 'utf8');
    indexLines.push(`- ${path.relative(ROOT, partName)}`);
  }

  fs.writeFileSync(basePath, indexLines.join('\n') + '\n', 'utf8');
}

async function run() {
  const files: string[] = [];
  walk(ROOT, files, ROOT);

  const project = new Project({
    tsConfigFilePath: path.join(ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFiles = files.map((file) => project.addSourceFileAtPath(file));

  const functionSections: { path: string; content: string }[] = [];
  const variableSections: { path: string; content: string }[] = [];

  let functionCount = 0;
  let variableCount = 0;

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(ROOT, sourceFile.getFilePath());
    const functions = collectFunctions(sourceFile);
    const variables = collectVariables(sourceFile);
    functionCount += functions.length;
    variableCount += variables.length;
    functionSections.push({ path: relativePath, content: formatFunctionsSection(relativePath, functions) });
    variableSections.push({ path: relativePath, content: formatVariablesSection(relativePath, variables) });
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const now = new Date().toISOString();
  const functionHeader = `# Functions Index\n\nGenerated: ${now}\nFiles: ${sourceFiles.length}\nFunctions: ${functionCount}\n\n`;
  const variableHeader = `# Variables Index\n\nGenerated: ${now}\nFiles: ${sourceFiles.length}\nVariables: ${variableCount}\n\n`;

  writeWithSplit(path.join(OUTPUT_DIR, 'functions.md'), functionHeader, functionSections);
  writeWithSplit(path.join(OUTPUT_DIR, 'variables.md'), variableHeader, variableSections);

  console.log(`Generated functions and variables indexes in ${path.relative(ROOT, OUTPUT_DIR)}.`);
}

run().catch((error) => {
  console.error('Code index generation failed:', error);
  process.exit(1);
});
