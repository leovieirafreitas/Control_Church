const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://peaydhzdklbcjhumrrfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXlkaHpka2xiY2podW1ycmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTQ1MDAsImV4cCI6MjA5MTczMDUwMH0.HtGv-xAbKk3TBrX2lIaQ5sn8ixcb9WK_VAu-OipO8Ec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSettings() {
  const settings = [
    {
      church_id: 'adb377c5-7d22-400e-b1bc-e8deb3fae0e1',
      evolution_instance: 'Control_Church',
      evolution_apikey: 'A91E61F792A5-4605-B559-C704D618DD23',
      updated_at: new Date().toISOString()
    }
  ];

  const { error } = await supabase.from('church_settings').upsert(settings, { onConflict: 'church_id' });
  if (error) console.error('Erro:', error);
  else console.log('Configurações atualizadas para Cidade Nova!');
}

updateSettings();
