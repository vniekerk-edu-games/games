/* Contraption Labs — source bundle tools
 *   node tools/bundle.js pack   [out.txt]      all project files → one text file
 *   node tools/bundle.js unpack bundle.txt [dir] one text file → project files
 * The bundle is plain text, so it can be uploaded where zip files can't.
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const HEAD = 'CONTRAPTION-LABS SOURCE BUNDLE v1';
const START = '===== FILE: ', STOP = '===== END FILE =====';
const SKIP = new Set(['node_modules', '.git']);

function list(dir, rel = '') {
  let out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name), r = rel ? rel + '/' + name : name;
    if (fs.statSync(full).isDirectory()) out = out.concat(list(full, r));
    else if (!/\.(png|jpg|zip)$/i.test(name) && !/^contraption-labs-source/.test(name)) out.push(r);
  }
  return out;
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'pack') {
  const files = list(ROOT);
  let txt = HEAD + '\nFiles: ' + files.length + '\n' +
    'To rebuild the project: node tools/bundle.js unpack <this file> <folder>\n\n';
  for (const f of files) {
    const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
    txt += START + f + ' =====\n' + (c === '' || c.endsWith('\n') ? c : c + '\n') + STOP + '\n';
  }
  fs.writeFileSync(a || 'contraption-labs-source.txt', txt);
  console.log('Packed ' + files.length + ' files → ' + (a || 'contraption-labs-source.txt'));
} else if (cmd === 'unpack') {
  const txt = fs.readFileSync(a, 'utf8').replace(/\r\n/g, '\n');
  if (!txt.startsWith(HEAD)) throw new Error('Not a Contraption Labs bundle');
  const dir = b || 'contraption-labs';
  let n = 0;
  const re = /^===== FILE: (.+) =====\n([\s\S]*?)^===== END FILE =====$/gm;
  for (let m; (m = re.exec(txt));) {
    const out = path.join(dir, m[1]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, m[2]);
    n++;
  }
  console.log('Unpacked ' + n + ' files → ' + dir);
} else console.log('Use: node tools/bundle.js pack [out.txt] | unpack bundle.txt [dir]');
