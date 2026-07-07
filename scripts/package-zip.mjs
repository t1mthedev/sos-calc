import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version = pkg.version;

const dist = join(__dirname, '..', 'dist');
const html = join(dist, 'calculator.html');
const zip = join(dist, `sos-calc-v${version}.zip`);

execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${html}' -DestinationPath '${zip}' -Force"`,
  { stdio: 'inherit', shell: true }
);

console.log(`Created ${zip}`);
