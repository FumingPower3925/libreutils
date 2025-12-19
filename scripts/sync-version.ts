export { };

const pkg = await Bun.file('./package.json').json();
const version = pkg.version;

console.log(`Syncing version: ${version}`);

const manifest = await Bun.file('./public/manifest.json').json();
manifest.version = version;
await Bun.write('./public/manifest.json', JSON.stringify(manifest, null, 4) + '\n');
console.log('  [OK] Updated manifest.json');

let sw = await Bun.file('./public/sw.js').text();
sw = sw.replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`);
await Bun.write('./public/sw.js', sw);
console.log('  [OK] Updated sw.js');

console.log(`\nVersion ${version} synced to all files.`);
