import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, '.vercel', 'output');
const configPath = path.join(outputDir, 'config.json');
const functionsDir = path.join(outputDir, 'functions');

const fail = (message) => {
  console.error(`\n[vercel-output-check] ${message}`);
  process.exit(1);
};

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

let config;
try {
  const raw = await readFile(configPath, 'utf8');
  config = JSON.parse(raw);
} catch {
  fail('Missing .vercel/output/config.json. Run "vercel build" before "vercel deploy --prebuilt".');
}

if (!config || config.version !== 3) {
  fail('Invalid Build Output API config. Expected version 3 in .vercel/output/config.json.');
}

let functions = [];
try {
  functions = await readdir(functionsDir);
} catch {
  fail('Missing .vercel/output/functions directory. Run "vercel build" first.');
}

for (const entry of functions) {
  const vcConfigPath = path.join(functionsDir, entry, '.vc-config.json');
  const hasVcConfig = await fileExists(vcConfigPath);
  if (!hasVcConfig) continue;

  const raw = await readFile(vcConfigPath, 'utf8');
  const vcConfig = JSON.parse(raw);

  if (!vcConfig.handler) {
    fail(`Function ${entry} has no handler in .vc-config.json.`);
  }

  const handlerPath = path.join(functionsDir, entry, vcConfig.handler);
  const exists = await fileExists(handlerPath);
  if (!exists) {
    fail(
      `Function handler missing: ${path.relative(root, handlerPath)}. This usually happens when you run npm build + --prebuilt instead of vercel build.`
    );
  }
}

console.log('[vercel-output-check] OK: prebuilt output is complete.');
