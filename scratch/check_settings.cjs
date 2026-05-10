const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://peaydhzdklbcjhumrrfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXlkaHpka2xiY2podW1ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTQ1MDAsImV4cCI6MjA5MTczMDUwMH0.HtGv-xAbKk3TBrX2lIaQ5sn8ixcb9WK_VAu-OipO8Ec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  const { data, error } = await supabase.from('church_settings').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkSettings();
