import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'public', 'materials');

const files = readdirSync(dir).filter(f => f.endsWith('.jpg'));

for (const file of files) {
  const inputPath = join(dir, file);
  const outputPath = join(dir, file.replace(/\.jpg$/i, '.webp'));

  const { default: sharp } = await import('sharp');
  const buf = readFileSync(inputPath);
  const webp = await sharp(buf).webp().toBuffer();
  writeFileSync(outputPath, webp);
  console.log(`${file} -> ${file.replace(/\.jpg$/i, '.webp')}`);
}
