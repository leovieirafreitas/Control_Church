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
    } else if (file.endsWith('.jsx') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh\\src');
const yellowPatterns = [
  '#fef9c3', '#fef3c7', '#f59e0b', '#92400e', '#fde68a', '#fbbf24', '#d97706', '#b45309', '#92400e', '#78350f',
  'yellow', 'amber', 'orange'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    yellowPatterns.forEach(pattern => {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`${path.relative('c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh', file)}:${i + 1}: ${line.trim()}`);
      }
    });
  });
});
