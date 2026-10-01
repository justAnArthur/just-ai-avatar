// tsc keeps `./x.ts` specifiers in declarations; point them at the emitted `./x.js` instead.
import { Glob } from 'bun';

for await (const file of new Glob('dist/**/*.d.ts').scan('.')) {
  const src = await Bun.file(file).text();
  await Bun.write(file, src.replace(/(from\s+['"]\.{1,2}\/[^'"]+?)\.tsx?(['"])/g, '$1.js$2'));
}
