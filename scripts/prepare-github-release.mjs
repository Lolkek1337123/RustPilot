import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const version = pkg.version || '1.0.0';
const outputDir = path.resolve('release/github-ready');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`\n======================================================`);
console.log(`   Подготовка файлов релиза RustPilot v${version} для GitHub`);
console.log(`======================================================\n`);

// 1. Copy app.asar
const sourceAsar = path.resolve('release/win-unpacked/resources/app.asar');
const targetAsar = path.join(outputDir, 'app.asar');

if (fs.existsSync(sourceAsar)) {
  fs.copyFileSync(sourceAsar, targetAsar);
  const sizeMb = (fs.statSync(targetAsar).size / (1024 * 1024)).toFixed(2);
  console.log(`✓ [1/2] app.asar готов (${sizeMb} МБ) -> ${targetAsar}`);
  console.log(`      (Рекомендуемый файл для авто-обновления без браузера)`);
} else {
  console.error(`✗ Ошибка: ${sourceAsar} не найден. Сначала выполните npm run build:exe`);
  process.exit(1);
}

// 2. Create full zip package
const winUnpackedDir = path.resolve('release/win-unpacked');
const targetZip = path.join(outputDir, `RustPilot-v${version}-win-x64.zip`);

console.log(`\nСоздание полного ZIP-архива приложения для новых установок...`);
const zip = new AdmZip();
zip.addLocalFolder(winUnpackedDir);
zip.writeZip(targetZip);

const zipSizeMb = (fs.statSync(targetZip).size / (1024 * 1024)).toFixed(1);
console.log(`✓ [2/2] Полный архив готов (${zipSizeMb} МБ) -> ${targetZip}`);

// 3. Instructions
const instructions = `# Инструкция по выпуску релиза RustPilot на GitHub

1. Перейдите в ваш репозиторий: https://github.com/Lolkek1337123/RustPilot/releases (или https://github.com/Lolkek1337123/TRPServerPanel/releases)
2. Нажмите **«Draft a new release»**
3. В поле **«Choose a tag»** введите: \`v${version}\` (и нажмите «Create new tag»)
4. В поле **«Release title»** введите: \`RustPilot v${version} Cobalt Release\`
5. В поле **«Describe this release»** опишите изменения (Changelog)
6. В блок **«Attach binaries by dropping them here...»** перетащите файлы из папки:
   \`${outputDir}\`
   
   Обязательно прикрепите:
   - **app.asar** (~2-3 МБ) — пользователи обновятся прямо в приложении за 1 секунду!
   - **RustPilot-v${version}-win-x64.zip** — полный архив для тех, кто скачивает впервые.

7. Нажмите **«Publish release»**!

Готово! Все запущенные копии RustPilot при следующем старте (или через Настройки) обнаружат релиз, скачают app.asar и обновятся без браузера.
`;

fs.writeFileSync(path.join(outputDir, 'HOW_TO_RELEASE.md'), instructions, 'utf-8');

console.log(`\n======================================================`);
console.log(`✓ Все файлы релиза успешно подготовлены в:`);
console.log(`  ${outputDir}`);
console.log(`  Инструкция сохранена в: HOW_TO_RELEASE.md`);
console.log(`======================================================\n`);
