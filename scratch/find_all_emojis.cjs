const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh\\src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (/[^\x00-\x7F]/.test(line)) {
      const clean = line.replace(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛ—]/g, '');
      if (/[^\x00-\x7F]/.test(clean)) {
        console.log(`${path.relative('c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh', file)}:${i + 1}: ${line.trim()}`);
      }
    }
  });
});
