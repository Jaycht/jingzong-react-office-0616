// 从 moduleConfig.ts 提取所有字段标签，生成 FIELD_LABELS 代码
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const src = readFileSync(resolve(root, 'src/moduleConfig.ts'), 'utf-8');
const re = /f\('([a-zA-Z]+)',\s*'([^']+)'/g;
const map = new Map();
let m;
while ((m = re.exec(src)) !== null) {
  const id = m[1];
  if (!map.has(id)) map.set(id, m[2]);
}

const keys = [...map.keys()].sort();
let output = 'const FIELD_LABELS: Record<string, string> = {\n';
for (const k of keys) {
  const v = map.get(k).replace(/'/g, "\\'");
  output += `  ${k}: '${v}',\n`;
}
output += '};';
writeFileSync(resolve(root, 'src/pages/field-labels-gen.txt'), output, 'utf-8');
console.log('Total entries:', keys.length);
