const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing insert to coordenadores...');
  const { data, error } = await supabase
    .from('coordenadores')
    .insert({
      name: 'Teste Local',
      phone: '(92) 99999-9999',
      neighborhoods: 'Centro',
      church_id: 'adb377c5-7d22-400e-b1bc-e8deb3fae0e1'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}
test();
