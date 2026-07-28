import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Gold/black → blue & white */
const REPLACEMENTS = [
  ['rgba(37,99,235', 'rgba(37,99,235'],
  ['#1d4ed8', '#1d4ed8'],
  ['#60a5fa', '#60a5fa'],
  ['#2563eb', '#2563eb'],
  ['#93c5fd', '#93c5fd'],
  ['#3b82f6', '#3b82f6'],
  ['#dbeafe', '#dbeafe'],
  ['#dbeafe', '#dbeafe'],
  ['#dbeafe', '#dbeafe'],
  ['#e0f2fe', '#e0f2fe'],
  ['#f8fafc', '#f8fafc'],
  ['#f8fafc', '#f8fafc'],
  ['#eff6ff', '#eff6ff'],
  ['#1e40af', '#1e40af'],
  ['#1e40af', '#1e40af'],
];

const EXT = new Set(['.tsx', '.ts', '.css', '.js', '.json', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'agent-transcripts']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

let fileCount = 0;
let replaceCount = 0;

for (const file of walk(root)) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) {
      const parts = text.split(from);
      if (parts.length > 1) {
        replaceCount += parts.length - 1;
        text = parts.join(to);
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(file, text);
    fileCount++;
  }
}

console.log(`Updated ${fileCount} files (${replaceCount} replacements).`);
