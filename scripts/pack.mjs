import asar from '@electron/asar';
import fs from 'fs';
import path from 'path';

const tempAppDir = path.resolve('temp-app');
const targetAsar = path.resolve('release/win-unpacked/resources/app.asar');

if (fs.existsSync(tempAppDir)) {
  fs.rmSync(tempAppDir, { recursive: true, force: true });
}
fs.mkdirSync(tempAppDir, { recursive: true });

// Copy package.json
fs.copyFileSync('package.json', path.join(tempAppDir, 'package.json'));

// Recursive copy helper
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy dist, dist-electron and public
copyDir('dist', path.join(tempAppDir, 'dist'));
copyDir('dist-electron', path.join(tempAppDir, 'dist-electron'));
if (fs.existsSync('public')) {
  copyDir('public', path.join(tempAppDir, 'public'));
}

// Copy required runtime node_modules
const modulesToCopy = ['ws', 'adm-zip'];
const tempNm = path.join(tempAppDir, 'node_modules');
fs.mkdirSync(tempNm, { recursive: true });

for (const mod of modulesToCopy) {
  const modSrc = path.join('node_modules', mod);
  if (fs.existsSync(modSrc)) {
    copyDir(modSrc, path.join(tempNm, mod));
  }
}

console.log('Packing app.asar to', targetAsar);
await asar.createPackage(tempAppDir, targetAsar);

fs.rmSync(tempAppDir, { recursive: true, force: true });
console.log('✓ Successfully packed RustPilot app.asar with full Tailwind CSS styles!');
