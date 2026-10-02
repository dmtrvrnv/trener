// Скачивает русскую модель Vosk для голосовых команд и кладёт её в public/models/vosk-ru.tar.gz.
// Модель весит ~46 МБ, поэтому в git её нет: скрипт запускается перед сборкой (npm run build).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL = 'https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip';
const NAME = 'vosk-model-small-ru-0.22';
const out = join('public', 'models', 'vosk-ru.tar.gz');
if (existsSync(out)) process.exit(0);

const tmp = join('.cache', 'voice');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(join('public', 'models'), { recursive: true });

console.log('Голосовая модель: скачиваю', URL);
const res = await fetch(URL);
if (!res.ok) throw new Error(`Модель не скачалась: HTTP ${res.status}`);
const zip = join(tmp, 'model.zip');
writeFileSync(zip, Buffer.from(await res.arrayBuffer()));

// zip распаковывает bsdtar (Windows 10+, macOS); на Linux — unzip
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
if (process.platform === 'linux') execFileSync('unzip', ['-q', zip, '-d', tmp]);
else execFileSync(tar, ['-xf', zip, '-C', tmp]);

// vosk-browser ждёт архив с папкой model/ внутри. Копируем, а не переименовываем:
// свежую папку на Windows может держать антивирус.
cpSync(join(tmp, NAME), join(tmp, 'model'), { recursive: true });
rmSync(join(tmp, 'model', 'README'), { force: true });
execFileSync(tar, ['-czf', join('..', '..', out), 'model'], { cwd: tmp });
try { rmSync(tmp, { recursive: true, force: true }); } catch { /* временную папку может держать антивирус */ }
console.log('Голосовая модель готова:', out);
