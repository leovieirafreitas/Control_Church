const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/FELIPE BARROSO/.gemini/antigravity-ide/brain/0f7a4617-9917-4cb9-b561-2f4cead31c46/.system_generated/steps/253/output.txt', 'utf-8'));
let content = data.files[0].content;

const oldStr = `.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '')`;
const newStr = `.replace('chama church - ', '').replace('chama church ', '').trim().replace(/\\s+/g, '-')`;

content = content.replace(oldStr, newStr);

fs.writeFileSync('updated_function.ts', content);
console.log("File updated_function.ts created successfully.");
