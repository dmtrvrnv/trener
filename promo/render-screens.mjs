import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
for (const name of ['Today', 'Exercises', 'Progress', 'Calories', 'Workout', 'Widget']) {
  execFileSync(process.execPath, [cli, 'still', 'promo/screens.tsx', `Screen${name}`, `promo/screens/${name.toLowerCase()}.png`, '--frame=30'], { stdio: 'inherit' });
}
