import tailwind from 'bun-plugin-tailwind';

const result = await Bun.build({
  entrypoints: ['./playground/index.html'],
  outdir: './dist/playground',
  minify: true,
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`Built ${result.outputs.length} files to dist/playground`);
