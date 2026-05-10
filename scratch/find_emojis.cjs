const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh\\src\\pages\\Notifications.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (/[^\x00-\x7F]/.test(line)) {
    // Check if it's just accented characters (Portuguese)
    const clean = line.replace(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
    if (/[^\x00-\x7F]/.test(clean)) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
    }
  }
});
