import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dirs = [
  join(__dirname, '..', 'public', 'materials'),
  join(__dirname, '..', 'public', 'crates'),
];

const { default: sharp } = await import('sharp');

for (const dir of dirs) {
  const label = dir.endsWith('materials') ? 'materials' : 'crates';
  const files = readdirSync(dir).filter(f => f.endsWith('.jpg'));

  for (const file of files) {
    const inputPath = join(dir, file);
    const outputPath = join(dir, file.replace(/\.jpg$/i, '.webp'));

    const buf = readFileSync(inputPath);
    const webp = await sharp(buf).webp().toBuffer();
    writeFileSync(outputPath, webp);
    console.log(`${label}/${file} -> ${file.replace(/\.jpg$/i, '.webp')}`);
  }
}
