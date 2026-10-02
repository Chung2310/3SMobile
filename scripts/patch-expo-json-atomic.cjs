// Work around concurrent identical JSON writes sharing a temporary filename.
// No signing settings or key material is read by this script.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const cliRequire = createRequire(require.resolve('expo/package.json'));
const expoCliRequire = createRequire(cliRequire.resolve('@expo/cli/package.json'));
const jsonPackage = expoCliRequire.resolve('@expo/json-file/package.json');
const target = path.join(path.dirname(jsonPackage), 'build', 'writeAtomic.js');
const source = fs.readFileSync(target, 'utf8');
const original = 'return `${filename}.${hash}`;';
const replacement = 'return `${filename}.${hash}.${(0, node_crypto_1.randomUUID)()}`; // 3s-unique-atomic-temp';

if (source.includes('3s-unique-atomic-temp')) {
  console.log('Expo JSON atomic-write workaround is already applied.');
} else if (source.includes(original) && source.includes('node_crypto_1')) {
  fs.writeFileSync(target, source.replace(original, replacement));
  console.log('Applied Expo JSON atomic-write workaround. Restart Expo to load it.');
} else {
  console.warn('Expo JSON writer has changed upstream; workaround was not applied. Review whether it is still needed.');
}
