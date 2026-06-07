import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const tlPath = resolve(root, 'src/pages/CaseTimeline.tsx');
const genPath = resolve(root, 'src/pages/field-labels-gen.txt');

let tl = readFileSync(tlPath, 'utf-8');
const genLabels = readFileSync(genPath, 'utf-8');

// Replace the FIELD_LABELS block
tl = tl.replace(
  /const FIELD_LABELS: Record<string, string> = \{[\s\S]*?\};/,
  genLabels
);

writeFileSync(tlPath, tl, 'utf-8');
console.log('✅ FIELD_LABELS replaced');
