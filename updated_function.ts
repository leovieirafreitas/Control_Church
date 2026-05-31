import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const BATCH_SIZE = 10;
const MSG_DELAY_MS = 1500;
const BATCH_DELAY_MS = 2000;

serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const APP_URL = Deno.env.get("APP_URL") || "https://control-church.vercel.app";

  console.log("[visitor-automation] Início do ciclo");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("[ERRO] Secrets do Evolution API não configuradas!");
    return new Response(JSON.stringify({ error: "Missing secrets" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const manausDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Manaus" }));
  const currentTime = manausDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const currentDay = manausDate.getDay();
  const currentMinutes = manausDate.getHours() * 60 + manausDate.getMinutes();

  console.log(`[visitor-automation] Hora: ${currentTime} | Dia: ${currentDay}`);

  const stats = { welcome_sent: 0, welcome_failed: 0, check_sent: 0, check_failed: 0, skipped: 0 };

  try {
    const { data: churches, error: churchError } = await supabase
      .from("church_settings")
      .select("*")
      .or("visitor_auto_send_enabled.eq.true,visitor_coord_check_enabled.eq.true");

    if (churchError) throw churchError;
    if (!churches || churches.length === 0) {
      console.log("[visitor-automation] Nenhuma igreja com automação ativa.");
      return new Response(JSON.stringify({ status: "no_active_automations" }));
    }

    for (const settings of churches) {
      const instance = settings.evolution_instance || "Control_Church";
      const churchApiKey = settings.evolution_apikey || EVOLUTION_API_KEY;

      // Setup window
      const [sh, sm] = (settings.visitor_auto_send_time || "19:30").split(':').map(Number);
      const scheduleMinutes = sh * 60 + sm;
      const isWelcomeWindow = currentMinutes >= scheduleMinutes && currentMinutes <= scheduleMinutes + 60;

      const [csh, csm] = (settings.visitor_coord_check_time || "19:30").split(':').map(Number);
      const checkScheduleMinutes = csh * 60 + csm;
      const isCheckWindow = currentMinutes >= checkScheduleMinutes && currentMinutes <= checkScheduleMinutes + 60;

      // ── BLOCO 1: BOAS-VINDAS ─────────────────────────────────────────────────
      if (
        settings.visitor_auto_send_enabled &&
        settings.visitor_auto_send_days?.includes(currentDay) &&
        isWelcomeWindow
      ) {
        console.log(`[Boas-vindas] Igreja ${settings.church_id}: Janela de execução ativa!`);

        const startOfDay = new Date(manausDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const { data: batch } = await supabase
          .from("visitors")
          .select("*, coordenadores(id, name, phone)")
          .eq("church_id", settings.church_id)
          .eq("welcome_sent", false)
          .gte("created_at", startOfDay.toISOString())
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);

        if (batch && batch.length > 0) {
          console.log(`[Boas-vindas] Processando lote de ${batch.length} visitante(s).`);

          for (const v of batch) {
            const { data: locked, error: lockErr } = await supabase
              .from("visitors")
              .update({ welcome_sent: true })
              .eq("id", v.id)
              .eq("welcome_sent", false)
              .select("id");

            if (lockErr || !locked || locked.length === 0) {
              stats.skipped++;
              continue;
            }

            const feedbackUrl = `${APP_URL}/pesquisa/${settings.church_id}?visitor_id=${v.id}`;

            const visitorMsg = (settings.visitor_welcome_msg || "Olá {{nome}}! Bem-vindo!")
              .replace(/{{nome}}/g, v.name || "Visitante")
              .replace(/{{feedback}}/g, feedbackUrl);
            
            const visitOk = await sendWA(instance, v.phone, visitorMsg, settings.visitor_video_url, EVOLUTION_API_URL, churchApiKey);
            
            await sleep(MSG_DELAY_MS);

            if (visitOk && v.coordenadores?.phone) {
              const coordMsg = (settings.visitor_coord_msg || "")
                .replace(/{{nome}}/g, v.name || "")
                .replace(/{{telefone}}/g, v.phone || "")
                .replace(/{{bairro}}/g, v.neighborhood || "")
                .replace(/{{estado_civil}}/g, v.maritalStatus || v.marital_status || "Não informado")
                .replace(/{{idade}}/g, v.age ? `${v.age} anos` : "Não informado")
                .replace(/{{unidade}}/g, settings.church_name || "");
              await sendWA(instance, v.coordenadores.phone, coordMsg, null, EVOLUTION_API_URL, churchApiKey);
            }

            if (!visitOk) {
              await supabase.from("visitors").update({ welcome_sent: false }).eq("id", v.id);
              stats.welcome_failed++;
            } else {
              stats.welcome_sent++;
            }
            await sleep(BATCH_DELAY_MS);
          }
        }
      }

      // ── BLOCO 2: CHECK COORDENADOR ────────────────────────────────────────────
      if (
        settings.visitor_coord_check_enabled &&
        settings.visitor_coord_check_days?.includes(currentDay) &&
        isCheckWindow
      ) {
        console.log(`[Check Coord] Igreja ${settings.church_id}: Janela ativa!`);

        const sevenDaysAgo = new Date(manausDate);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: batch } = await supabase
          .from("visitors")
          .select("*, coordenadores(id, name, phone)")
          .eq("church_id", settings.church_id)
          .eq("coord_check_sent", false)
          .eq("followup_status", "pending")
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);

        if (batch && batch.length > 0) {
          console.log(`[Check Coord] Processando lote de ${batch.length} visitante(s).`);

          for (const v of batch) {
            const { data: locked, error: lockErr } = await supabase
              .from("visitors")
              .update({ coord_check_sent: true })
              .eq("id", v.id)
              .eq("coord_check_sent", false)
              .select("id");

            if (lockErr || !locked || locked.length === 0) {
              stats.skipped++;
              continue;
            }

            const confirmUrl = `${APP_URL}/confirmar/${v.id}`;
            const msg = (settings.visitor_coord_check_msg || "Olá {{nome}}, confirme: {{confirmar}}")
              .replace(/{{nome}}/g, v.name || "Visitante")
              .replace(/{{coordenador}}/g, v.coordenadores?.name || "coordenador")
              .replace(/{{confirmar}}/g, confirmUrl);

            const ok = await sendWA(instance, v.phone, msg, null, EVOLUTION_API_URL, churchApiKey);

            if (!ok) {
              await supabase.from("visitors").update({ coord_check_sent: false }).eq("id", v.id);
              stats.check_failed++;
            } else {
              stats.check_sent++;
            }

            await sleep(BATCH_DELAY_MS);
          }
        }
      }
    }

    const result = { status: "ok", time: currentTime, day: currentDay, stats };
    console.log("[visitor-automation] Ciclo concluído:", result);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[ERRO FATAL]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function sendWA(
  instance: string,
  phone: string,
  text: string,
  mediaUrl: string | null,
  apiUrl: string,
  apiKey: string
): Promise<boolean> {
  if (!phone) return false;
  const num = phone.replace(/\D/g, "");
  const formatted = num.startsWith("55") ? num : `55${num}`;
  const endpoint = mediaUrl
    ? `message/sendMedia/${instance}`
    : `message/sendText/${instance}`;

  const body = mediaUrl
    ? { number: formatted, mediatype: "video", mimetype: "video/mp4", caption: text, media: mediaUrl }
    : { number: formatted, text };

  try {
    const res = await fetch(`${apiUrl}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[sendWA] Erro ${res.status}: ${err}`);
    }
    return res.ok;
  } catch (e) {
    console.error("[sendWA] Exception:", e);
    return false;
  }
}