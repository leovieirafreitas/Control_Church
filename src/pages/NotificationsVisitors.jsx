import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import DatePicker from '../components/DatePicker';
import {
  CheckCircle, AlertCircle, Loader2, X, Users, RefreshCw, UserCheck, Radio,
  Upload, Clock, Sparkles, Settings2, Smartphone, MessageSquare,
  Zap, ShieldCheck, Mail, Send, Bell, Timer, ExternalLink, Calendar, Trash2
} from 'lucide-react';
import Dropdown from '../components/Dropdown';
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../utils/r2Client';

const NotificationsVisitors = () => {
  const { activeChurch } = useChurch();

  // -- View States --
  const [activeTab, setActiveTab] = useState('templates');
  const [massSendSubTab, setMassSendSubTab] = useState('visitors');
  const [selectedTemplateId, setSelectedTemplateId] = useState('welcome_visitor');

  const [sundayVisitors, setSundayVisitors] = useState([]);
  const [followupVisitors, setFollowupVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0, failed: 0, done: false });
  const [selectedIds, setSelectedIds] = useState([]);
  // Data de hoje no fuso de Manaus (UTC-4) — evita mostrar amanhã após as 20h em UTC
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' }) // retorna YYYY-MM-DD
  );

  // -- Settings --
  const [visitorSendInterval, setVisitorSendInterval] = useState(10);
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);
  const [sundaySchedule, setSundaySchedule] = useState('19:30');
  const [autoSendDays, setAutoSendDays] = useState([0]);
  const [sundayVideoUrl, setSundayVideoUrl] = useState('');
  const [sundayMsg, setSundayMsg] = useState(`Olá, {{nome}}! 👋\nQue alegria ter você conosco recentemente! ✨\n\nPreparamos um vídeo especial de boas-vindas para você. Assista aqui:\n{{video}}\n\nSeja muito bem-vindo(a) à nossa família! 🔥🙏`);
  const [sundayCoordMsg, setSundayCoordMsg] = useState(`🚨 *NOVO VISITANTE REGISTRADO* 🚨\n\n👤 *Nome:* {{nome}}\n📱 *Telefone:* {{telefone}}\n📍 *Bairro:* {{bairro}}\n💍 *Estado Civil:* {{estado_civil}}\n🎂 *Idade:* {{idade}}\n\nPor favor, faça o acompanhamento deste visitante o quanto antes! 🏃💨\n{{unidade}}`);
  const [coordCheckMsg, setCoordCheckMsg] = useState(`Olá, {{nome}}! 👋\nTudo bem? Aqui é da Equipe Chama Church. 🔥\n\nGostaríamos de saber: o coordenador {{coordenador}} já entrou em contato com você? 😊\nQueremos garantir que você esteja sendo muito bem acompanhado(a)!\n\nPor favor, confirme clicando no link abaixo:\n👇\n{{confirmar}}\n\nDeus te abençoe! 🙏`);
  const [systemAlertMsg, setSystemAlertMsg] = useState(() => {
    let saved = localStorage.getItem('system_alert_msg') || `*ALERTA DE CONTINGÊNCIA*\n\nNovo visitante em bairro *sem coordenador* mapeado!\n\nNome: *{{nome}}*\nTelefone: {{telefone}}\nBairro: {{bairro}}\nEstado Civil: {{estado_civil}}\nIdade: {{idade}}\nUnidade: {{unidade}}\n\nO contato foi salvo na "fila de espera" do sistema. Por favor, atribua um coordenador manualmente.`;
    if (saved.includes('{{sexo}}')) {
      saved = saved
        .replace(/🚻 \*Sexo:\* {{sexo}}/g, '💍 *Estado Civil:* {{estado_civil}}\n🎂 *Idade:* {{idade}}')
        .replace(/Sexo: {{sexo}}/g, 'Estado Civil: {{estado_civil}}\nIdade: {{idade}}')
        .replace(/{{sexo}}/g, '{{estado_civil}}, {{idade}} anos');
    }
    return saved;
  });

  // -- UI States --
  const [availableVideos, setAvailableVideos] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showConnModal, setShowConnModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [countdown, setCountdown] = useState('');
  const [isVideosOpen, setIsVideosOpen] = useState(false);
  const isRunningAuto = React.useRef(false);
  const lastAutoRun = React.useRef(null);
  const isSavingTemplate = React.useRef(false); // Guard: bloqueia auto-send durante salvamentos


  const fileInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
      const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);

      // 1. Visitantes do Dia selecionado
      let todayQuery = supabase
        .from('visitors')
        .select('*, coordenadores(id, name, phone)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (activeChurch?.id) todayQuery = todayQuery.eq('church_id', activeChurch.id);
      const { data: todayList } = await todayQuery;
      setSundayVisitors(todayList || []);

      // 2. Acompanhamento (Pós-visita)
      let followupQuery = supabase
        .from('visitors')
        .select('*, coordenadores(id, name, phone)')
        .eq('followup_status', 'pending')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (activeChurch?.id) followupQuery = followupQuery.eq('church_id', activeChurch.id);
      const { data: followupList } = await followupQuery;
      setFollowupVisitors(followupList || []);

      // Auto-seleção apenas na carga inicial ou troca de aba (não no intervalo de 1s)
      if (autoScheduleEnabled && massSendSubTab !== 'followup' && !silent) {
        const activeList = todayList || [];
        const pendingIds = activeList
          .filter(v => !v.welcome_sent && v.phone)
          .map(v => v.id);
        setSelectedIds(pendingIds);
      }
    } catch (e) { console.error(e); }
    finally { if (!silent) setLoading(false); }
  };

  const formatPreview = (text) => {
    if (!text) return '';
    let churchId = activeChurch?.id || 'id-da-unidade';
    
    return text
      .replace(/{{nome}}/g, 'João Silva')
      .replace(/{{video}}/g, sundayVideoUrl || 'https://link.com/video')
      .replace(/{{telefone}}/g, '(92) 98888-7777')
      .replace(/{{bairro}}/g, 'Centro')
      .replace(/{{estado_civil}}/g, 'Solteiro(a)')
      .replace(/{{idade}}/g, '25')
      .replace(/{{unidade}}/g, activeChurch?.name || 'Chama Church Sede')
      .replace(/{{coordenador}}/g, 'Pr. Marcos')
      .replace(/{{confirmar}}/g, `https://www.chamachurch.com.br/confirmar/exemplo-id-123`)
      .replace(/{{feedback}}/g, `https://www.chamachurch.com.br/pesquisa/${churchId}?visitor_id=exemplo-id-123`);
  };

  const visitorTemplates = [
    {
      id: 'welcome_visitor',
      name: 'Boas-vindas (Visitante)',
      icon: <Sparkles size={18} />,
      text: sundayMsg,
      setText: setSundayMsg,
      vars: [
        { label: 'Nome do Visitante', var: '{{nome}}' },
        { label: 'Link do Vídeo', var: '{{video}}' },
        { label: 'Link de Feedback', var: '{{feedback}}' }
      ],
      premium: `Olá, {{nome}}! 👋\nQue alegria ter você conosco recentemente! ✨\n\nPreparamos um vídeo especial de boas-vindas para você. Assista aqui:\n{{video}}\n\nSeja muito bem-vindo(a) à nossa família! 🔥🙏`
    },
    {
      id: 'coord_alert',
      name: 'Aviso ao Coordenador',
      icon: <Bell size={18} />,
      text: sundayCoordMsg,
      setText: setSundayCoordMsg,
      vars: [
        { label: 'Nome do Visitante', var: '{{nome}}' },
        { label: 'Telefone', var: '{{telefone}}' },
        { label: 'Bairro', var: '{{bairro}}' },
        { label: 'Estado Civil', var: '{{estado_civil}}' },
        { label: 'Idade', var: '{{idade}}' },
        { label: 'Unidade/Igreja', var: '{{unidade}}' }
      ],
      premium: `🚨 *NOVO VISITANTE REGISTRADO* 🚨\n\n👤 *Nome:* {{nome}}\n📱 *Telefone:* {{telefone}}\n📍 *Bairro:* {{bairro}}\n💍 *Estado Civil:* {{estado_civil}}\n🎂 *Idade:* {{idade}}\n\nPor favor, faça o acompanhamento deste visitante o quanto antes! 🏃💨\n{{unidade}}`
    },
    {
      id: 'manual_followup',
      name: 'Acompanhamento',
      icon: <UserCheck size={18} />,
      text: coordCheckMsg,
      setText: setCoordCheckMsg,
      vars: [
        { label: 'Nome do Visitante', var: '{{nome}}' },
        { label: 'Nome do Coordenador', var: '{{coordenador}}' },
        { label: 'Link de Confirmação', var: '{{confirmar}}' }
      ],
      premium: `Olá, {{nome}}! 👋\nTudo bem? Aqui é da Equipe Chama Church. 🔥\n\nGostaríamos de saber: o coordenador {{coordenador}} já entrou em contato com você? 😊\nQueremos garantir que você esteja sendo muito bem acompanhado(a)!\n\nPor favor, confirme clicando no link abaixo:\n👇\n{{confirmar}}\n\nDeus te abençoe! 🙏`
    },
    {
      id: 'system_alert',
      name: 'Aviso (Fila de Espera)',
      icon: <AlertCircle size={18} />,
      text: systemAlertMsg,
      setText: setSystemAlertMsg,
      vars: [
        { label: 'Nome do Visitante', var: '{{nome}}' },
        { label: 'Telefone', var: '{{telefone}}' },
        { label: 'Bairro', var: '{{bairro}}' },
        { label: 'Estado Civil', var: '{{estado_civil}}' },
        { label: 'Idade', var: '{{idade}}' },
        { label: 'Unidade/Igreja', var: '{{unidade}}' }
      ],
      premium: `*ALERTA DE CONTINGÊNCIA*\n\nNovo visitante em bairro *sem coordenador* mapeado!\n\nNome: *{{nome}}*\nTelefone: {{telefone}}\nBairro: {{bairro}}\nEstado Civil: {{estado_civil}}\nIdade: {{idade}}\nUnidade: {{unidade}}\n\nO contato foi salvo na "fila de espera" do sistema. Por favor, atribua um coordenador manualmente.`
    }
  ];

  const fetchSettings = async () => {
    if (!activeChurch?.id) return;
    try {
      const { data: list } = await supabase.from('church_settings').select('*').eq('church_id', activeChurch.id).limit(1);
      const data = list?.[0];

      let instance = '';
      let apiKey = '';

      if (data) {
        setAutoScheduleEnabled(data.visitor_auto_send_enabled || false);
        setSundaySchedule(data.visitor_auto_send_time || '19:30');
        setAutoSendDays(data.visitor_auto_send_days || [0]);
        setSundayVideoUrl(data.visitor_video_url || '');
        setVisitorSendInterval(data.visitor_send_interval || 10);

        if (data.evolution_instance) {
          instance = data.evolution_instance;
          apiKey = data.evolution_apikey || '';
        } else {
          const slug = activeChurch?.name
            ? activeChurch.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_')
            : activeChurch?.id?.substring(0, 8);
          instance = `Control_Church_${slug}`;
        }

        setSundayMsg((data.visitor_welcome_msg || '').replace(/\\n/g, '\n') || `Olá, {{nome}}! 👋\nQue alegria ter você conosco recentemente! ✨\n\nPreparamos um vídeo especial de boas-vindas para você. Assista aqui:\n{{video}}\n\nSeja muito bem-vindo(a) à nossa família! 🔥🙏`);
        let coordMsg = (data.visitor_coord_msg || '').replace(/\\n/g, '\n');
        if (!coordMsg) {
          coordMsg = `🚨 *NOVO VISITANTE REGISTRADO* 🚨\n\n👤 *Nome:* {{nome}}\n📱 *Telefone:* {{telefone}}\n📍 *Bairro:* {{bairro}}\n💍 *Estado Civil:* {{estado_civil}}\n🎂 *Idade:* {{idade}}\n\nPor favor, faça o acompanhamento deste visitante o quanto antes! 🏃💨\n{{unidade}}`;
        } else if (coordMsg.includes('{{sexo}}')) {
          coordMsg = coordMsg
            .replace(/🚻 \*Sexo:\* {{sexo}}/g, '💍 *Estado Civil:* {{estado_civil}}\n🎂 *Idade:* {{idade}}')
            .replace(/Sexo: {{sexo}}/g, 'Estado Civil: {{estado_civil}}\nIdade: {{idade}}')
            .replace(/{{sexo}}/g, '{{estado_civil}}, {{idade}} anos');
        }
        setSundayCoordMsg(coordMsg);
        setCoordCheckMsg((data.visitor_coord_check_msg || '').replace(/\\n/g, '\n') || `Olá, {{nome}}! 👋\nTudo bem? Aqui é da Equipe Chama Church. 🔥\n\nGostaríamos de saber: o coordenador {{coordenador}} já entrou em contato com você? 😊\nQueremos garantir que você esteja sendo muito bem acompanhado(a)!\n\nPor favor, confirme clicando no link abaixo:\n👇\n{{confirmar}}\n\nDeus te abençoe! 🙏`);
      } else {
        const slug = activeChurch?.name
          ? activeChurch.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_')
          : activeChurch?.id?.substring(0, 8);
        instance = `Control_Church_${slug}`;
      }

      setEvolutionInstance(instance);
      setEvolutionApiKey(apiKey);
    } catch (e) { console.error(e); }
  };

  const fetchVideos = async () => {
    try {
      const command = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME });
      const response = await r2Client.send(command);
      const videos = (response.Contents || []).filter(file => file.Key.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i));
      const videosWithUrls = videos.map(v => ({
        name: v.Key,
        url: `${R2_PUBLIC_URL}/${encodeURIComponent(v.Key)}`
      }));
      setAvailableVideos(videosWithUrls);
    } catch (e) { console.error('Erro ao listar vídeos R2:', e); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const fileName = `video_boas_vindas_${Date.now()}.${file.name.split('.').pop()}`;
      
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        ContentType: file.type,
      });

      const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
      
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload: ${uploadResponse.statusText}`);
      }
      
      fetchVideos();
      showToast('Vídeo enviado com sucesso para o R2!', 'success');
    } catch (err) { 
      showToast(err.message, 'error'); 
    }
    finally { setUploadingVideo(false); }
  };
  const handleDeleteVideo = async (urlToDelete) => {
    if (!window.confirm('Tem certeza que deseja apagar este vídeo permanentemente?')) return;
    
    try {
      const key = urlToDelete.replace(`${R2_PUBLIC_URL}/`, '');
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: decodeURIComponent(key),
      });

      await r2Client.send(command);
      
      if (sundayVideoUrl === urlToDelete) {
        setSundayVideoUrl('');
      }
      
      fetchVideos();
      showToast('Vídeo apagado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao apagar vídeo.', 'error');
    }
  };

  const handleSaveAll = async () => {
    if (!activeChurch?.id) return;
    isSavingTemplate.current = true; // Bloqueia auto-send enquanto salva
    try {
      const { data: list } = await supabase.from('church_settings').select('*').eq('church_id', activeChurch.id).limit(1);
      const existing = list?.[0];
      const { error } = await supabase.from('church_settings').upsert({
        ...existing,
        church_id: activeChurch.id,
        church_name: existing?.church_name || activeChurch.name,
        visitor_auto_send_enabled: autoScheduleEnabled,
        visitor_auto_send_time: sundaySchedule,
        visitor_auto_send_days: autoSendDays,
        visitor_send_interval: visitorSendInterval,
        evolution_instance: evolutionInstance,
        evolution_apikey: evolutionApiKey,
        visitor_video_url: sundayVideoUrl,
        visitor_welcome_msg: sundayMsg,
        visitor_coord_msg: sundayCoordMsg,
        visitor_coord_check_msg: coordCheckMsg,
        updated_at: new Date().toISOString()
      }, { onConflict: 'church_id' });

      if (error) throw error;

      // Salva o template da fila de espera localmente (evita erro de coluna não existente no DB)
      localStorage.setItem('system_alert_msg', systemAlertMsg);

      showToast('Configurações salvas!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally {
      // Libera o guard após 3 segundos para garantir que o ciclo do timer não pegue o estado antigo
      setTimeout(() => { isSavingTemplate.current = false; }, 3000);
    }
  };


  const sendWA = async (number, text, mediaUrl = null) => {
    if (!text || text.trim() === '') {
      console.error('sendWA: O texto da mensagem está vazio!', { number });
      return false;
    }
    try {
      const raw = (number || '').replace(/\D/g, '');
      const formatted = raw.startsWith('55') ? raw : `55${raw}`;

      // Validação básica de URL de mídia
      const hasValidMedia = mediaUrl && mediaUrl.startsWith('http');
      const endpoint = hasValidMedia ? 'sendMedia' : 'sendText';

      const body = hasValidMedia
        ? {
          number: formatted,
          mediatype: 'video',
          mimetype: 'video/mp4',
          caption: text,
          media: mediaUrl
        }
        : { number: formatted, text: text };

      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      const res = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/message/${endpoint}/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': currentApiKey
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(`Erro Evolution API (${endpoint}):`, res.status, errorData);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro ao conectar com Evolution API:', err);
      return false;
    }
  };

  const executeManualSend = async (overrideMode = null) => {
    // Guard: nunca executa se estiver salvando templates
    if (isSavingTemplate.current) return;
    // Para disparo manual, sempre reseta o lock (previne trava de sessão anterior)
    if (!overrideMode) isRunningAuto.current = false;
    if (sending) return;
    if (overrideMode && isRunningAuto.current) return; // Só bloqueia para auto
    if (overrideMode) isRunningAuto.current = true;

    const mode = overrideMode || massSendSubTab;
    const activeList = mode === 'followup' ? followupVisitors : sundayVisitors;

    const targets = activeList.filter(v => {
      const isSent = mode === 'followup' ? v.coord_check_sent : v.welcome_sent;
      if (overrideMode) return !isSent;

      // Se houver seleção manual, usa ela. Se não houver nada selecionado, pega todos os pendentes.
      if (selectedIds.length > 0) {
        return selectedIds.includes(v.id);
      }
      return !isSent; // Fallback: enviar para todos os pendentes
    });

    if (targets.length === 0) {
      const msg = mode === 'followup' ? 'Nenhum acompanhamento pendente.' : 'Nenhum visitante/coordenador pendente.';
      if (!overrideMode) showToast(msg, 'info');
      isRunningAuto.current = false;
      return;
    }

    setSending(true);
    try {
      setProgress({ sent: 0, failed: 0, total: targets.length, done: false });
      let sent = 0, failed = 0;
      for (const v of targets) {
        const cleanPhone = (v.phone || '').replace(/\D/g, '');
        const fieldToLock = mode === 'followup' ? 'coord_check_sent' : 'welcome_sent';

        // ── LOCK ATÔMICO: atualiza apenas se o campo ainda for FALSE no banco ──
        // Isso garante que somente UMA instância consiga processar cada registro, 
        // EXCETO se o usuário selecionou manualmente (forçando reenvio).
        let query = supabase.from('visitors').update({ [fieldToLock]: true }).eq('id', v.id);
        
        if (!selectedIds.includes(v.id)) {
          query = query.eq(fieldToLock, false);
        }

        const { data: locked, error: lockErr } = await query.select('id');

        // Se não retornou nenhuma linha e não foi seleção forçada, pula.
        if (lockErr || !locked || locked.length === 0) {
          console.log(`[SKIP] Registro ${v.id} já foi processado ou bloqueado.`);
          continue;
        }

        // ── MODO VISITANTES (Envia para Visitante + Coordenador) ──
        if (mode === 'visitors' || mode === 'auto') {
          const baseUrl = window.location.origin;
          
          const churchId = activeChurch?.id || '';
          const feedbackUrl = `${baseUrl}/pesquisa/${churchId}?visitor_id=${v.id}`;
          
          const msg = (sundayMsg || '')
            .replace(/{{nome}}/g, v.name || 'Visitante')
            .replace(/{{feedback}}/g, feedbackUrl)
            .replace(/\n/g, '\n');
            
          const okV = await sendWA(v.phone, msg, sundayVideoUrl).catch(() => false);
          if (okV) sent++; else failed++;

          // Aviso ao Coordenador (com delay para não parecer spam)
          await new Promise(r => setTimeout(r, 2000));
          if (v.coordenadores?.phone) {
            const cMsg = (sundayCoordMsg || '')
              .replace(/{{nome}}/g, v.name || '')
              .replace(/{{telefone}}/g, v.phone || '')
              .replace(/{{bairro}}/g, v.neighborhood || '')
              .replace(/{{estado_civil}}/g, v.maritalStatus || v.marital_status || 'Não informado')
              .replace(/{{idade}}/g, v.age ? `${v.age} anos` : 'Não informado')
              .replace(/{{unidade}}/g, activeChurch?.name || '')
              .replace(/\n/g, '\n');
            await sendWA(v.coordenadores.phone, cMsg).catch(() => false);
          } else {
            const { getConnectedNumber } = await import('../utils/whatsapp');
            const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
            const adminNumber = await getConnectedNumber(evolutionInstance || 'Control_Church', currentApiKey);
            if (adminNumber) {
              const sMsg = (systemAlertMsg || '')
                .replace(/{{nome}}/g, v.name || '')
                .replace(/{{telefone}}/g, v.phone || '')
                .replace(/{{bairro}}/g, v.neighborhood || 'Não informado')
                .replace(/{{estado_civil}}/g, v.maritalStatus || v.marital_status || 'Não informado')
                .replace(/{{idade}}/g, v.age ? `${v.age} anos` : 'Não informado')
                .replace(/{{unidade}}/g, activeChurch?.name || '')
                .replace(/\n/g, '\n');
              await sendWA(adminNumber, sMsg).catch(() => false);
            }
          }
        }
        // ── MODO COORDENADORES (Apenas Coordenador) ──────────
        else if (mode === 'coordinators') {
          if (v.coordenadores?.phone) {
            const cMsg = (sundayCoordMsg || '')
              .replace(/{{nome}}/g, v.name || '')
              .replace(/{{telefone}}/g, v.phone || '')
              .replace(/{{bairro}}/g, v.neighborhood || '')
              .replace(/{{estado_civil}}/g, v.maritalStatus || v.marital_status || 'Não informado')
              .replace(/{{idade}}/g, v.age ? `${v.age} anos` : 'Não informado')
              .replace(/{{unidade}}/g, activeChurch?.name || '')
              .replace(/\n/g, '\n');
            const ok = await sendWA(v.coordenadores.phone, cMsg).catch(() => false);
            if (ok) sent++; else failed++;
          } else {
            const { getConnectedNumber } = await import('../utils/whatsapp');
            const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
            const adminNumber = await getConnectedNumber(evolutionInstance || 'Control_Church', currentApiKey);
            if (adminNumber) {
              const sMsg = (systemAlertMsg || '')
                .replace(/{{nome}}/g, v.name || '')
                .replace(/{{telefone}}/g, v.phone || '')
                .replace(/{{bairro}}/g, v.neighborhood || 'Não informado')
                .replace(/{{estado_civil}}/g, v.maritalStatus || v.marital_status || 'Não informado')
                .replace(/{{idade}}/g, v.age ? `${v.age} anos` : 'Não informado')
                .replace(/{{unidade}}/g, activeChurch?.name || '')
                .replace(/\n/g, '\n');
              const ok = await sendWA(adminNumber, sMsg).catch(() => false);
              if (ok) sent++; else failed++;
            } else failed++;
          }
        }
        // ── MODO ACOMPANHAMENTO ──────────────────────────────
        else if (mode === 'followup') {
          const baseUrl = window.location.origin;
          const confirmUrl = `${baseUrl}/confirmar/${v.id}`;
          const msg = (coordCheckMsg || 'Olá {{nome}}, o coordenador {{coordenador}} já falou com você? Confirme: {{confirmar}}')
            .replace(/{{nome}}/g, v.name || 'Visitante')
            .replace(/{{coordenador}}/g, v.coordenadores?.name || 'Coordenador')
            .replace(/{{confirmar}}/g, confirmUrl)
            .replace(/\n/g, '\n');
          const ok = await sendWA(v.phone, msg).catch(() => false);
          if (ok) sent++; else failed++;
        }
        setProgress({ sent, failed, total: targets.length, done: false });
        
        // Aplica o delay apenas se NÃO for o último registro da fila (evita a página ficar 'carregando' no fim)
        if (targets.indexOf(v) < targets.length - 1) {
          await new Promise(r => setTimeout(r, visitorSendInterval * 1000));
        }
      }
      setProgress({ sent, failed, total: targets.length, done: true });
      if (!overrideMode) {
        showToast(`Envio finalizado! ${sent} enviados, ${failed} falhas.`, 'success');
      }
    } catch (err) {
      console.error('Erro no disparo:', err);
      showToast('Erro no disparo: ' + err.message, 'error');
    } finally {
      setSending(false);
      isRunningAuto.current = false;
      if (!overrideMode) setSelectedIds([]); // Limpa seleção após envio manual
      fetchData(true); // silent=true: atualiza dados sem causar re-render/loading visual
    }
  };


  useEffect(() => { fetchData(); fetchSettings(); fetchVideos(); }, [activeChurch, selectedDate]);

  // Timer 1: Countdown + Gatilho automático (1s) — SEM fetchData para não re-renderizar a tabela
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();

      const [h, m] = sundaySchedule.split(':').map(Number);
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      let diff = targetDate - now;

      // Gatilho automático com guard para não disparar durante envio ou salvamento
      const todayKey = `${now.toDateString()}_AUTO`;
      if (diff <= 0 && diff > -60000 && !sending && !isRunningAuto.current && lastAutoRun.current !== todayKey && autoScheduleEnabled && autoSendDays?.includes(now.getDay()) && activeChurch?.id && !isSavingTemplate.current) {
        lastAutoRun.current = todayKey;
        const jitter = Math.floor(Math.random() * 3000);
        setTimeout(async () => {
          console.log('--- INICIANDO FLUXO AUTOMÁTICO COMPLETO ---');
          await executeManualSend('auto');
          showToast('Automação concluída com sucesso!', 'success');
        }, jitter);
      }

      // UI: Atualiza o contador apenas se estiver na aba correta e habilitado
      if (massSendSubTab === 'followup' || !autoScheduleEnabled || !autoSendDays?.includes(now.getDay())) {
        setCountdown('');
      } else {
        if (diff < 0) {
          setCountdown('Executado ou agendado');
        } else {
          const mins = Math.floor(diff / 1000 / 60);
          const secs = Math.floor((diff / 1000) % 60);
          setCountdown(`${mins}m ${secs}s`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sundaySchedule, autoScheduleEnabled, massSendSubTab, autoSendDays, sending]);

  // Timer 2: Atualização silenciosa dos dados (30s) — só roda quando NÃO está enviando
  useEffect(() => {
    const dataTimer = setInterval(() => {
      if (!sending) fetchData(true);
    }, 30000);
    return () => clearInterval(dataTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, activeChurch, selectedDate]);


  const checkConnection = async (showModalIfDisconnected = false) => {
    if (!evolutionInstance) return;
    try {
      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connectionState/${evolutionInstance}`, {
        headers: { 'apikey': currentApiKey }
      });

      if (response.status === 404) {
        setConnectionStatus('disconnected');
        if (showModalIfDisconnected) {
          setShowConnModal(true);
          getQRCode();
        }
        return;
      }

      const data = await response.json();
      const state = data?.instance?.state === 'open' ? 'open' : 'disconnected';
      setConnectionStatus(state);

      if (state === 'disconnected' && showModalIfDisconnected) {
        setShowConnModal(true);
        getQRCode();
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      setConnectionStatus('disconnected');
    }
  };

  const getQRCode = async () => {
    if (!evolutionInstance) return;
    setLoadingConn(true);
    setQrCode(null);
    try {
      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connect/${evolutionInstance}`, {
        headers: { 'apikey': currentApiKey }
      });

      if (response.status === 404) {
        // Criar instância se não existir
        await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': currentApiKey
          },
          body: JSON.stringify({ instanceName: evolutionInstance, qrcode: true })
        });
        setTimeout(() => getQRCode(), 2000);
        return;
      }

      const data = await response.json();
      if (data.base64) {
        setQrCode(data.base64);
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
    } finally {
      setLoadingConn(false);
    }
  };

  useEffect(() => {
    if (evolutionInstance) {
      checkConnection();
      const inv = setInterval(() => checkConnection(), 10000);
      return () => clearInterval(inv);
    }
  }, [evolutionInstance, evolutionApiKey]);

  const getDayNames = (days) => {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (days || []).sort().map(d => names[d]).join(', ');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: '1.25rem' }}>

      {/* HEADER PREMIUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Radio size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Fluxo de Visitantes</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gerencie modelos e acompanhamentos</p>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.4rem', borderRadius: '16px', gap: '0.25rem' }}>
          {[
            { id: 'templates', label: 'Modelos', icon: <MessageSquare size={18} /> },
            { id: 'mass_send', label: 'Envio em Massa', icon: <Users size={18} /> },
            { id: 'settings', label: 'Configurações', icon: <Settings2 size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* CONTEÚDO DINÂMICO POR ABA */}
      <div style={{ flex: 1, overflowY: activeTab === 'templates' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {activeTab === 'templates' && (
          <div className="animate-slide-up" style={{ display: 'flex', flex: 1, border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden', background: 'white' }}>
            {/* SIDEBAR DE MODELOS */}
            <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', background: '#f8fafc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: 'var(--text-dark)' }}>Meus Modelos</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>Selecione para editar</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {visitorTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: 'none', textAlign: 'left', marginBottom: '0.35rem',
                      cursor: 'pointer', transition: '0.2s',
                      background: selectedTemplateId === t.id ? 'var(--primary)' : 'transparent',
                      color: selectedTemplateId === t.id ? 'white' : 'var(--text-dark)',
                      display: 'flex', alignItems: 'center', gap: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectedTemplateId === t.id ? 1 : 0.7 }}>
                      {React.cloneElement(t.icon, { size: 16, color: selectedTemplateId === t.id ? 'white' : 'var(--primary)' })}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>{t.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc' }}>
                <button
                  onClick={handleSaveAll}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '42px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', boxShadow: 'none' }}
                >
                  Salvar Tudo
                </button>
              </div>
            </div>

            {/* AREA DO EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
              {(() => {
                const template = visitorTemplates.find(t => t.id === selectedTemplateId);
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{template.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {template.id}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <button
                          onClick={() => template.setText(template.premium)}
                          style={{
                            fontSize: '0.75rem', border: '1.5px solid var(--primary)',
                            background: 'transparent', color: 'var(--primary)',
                            padding: '0 1rem', borderRadius: '10px', fontWeight: 600,
                            cursor: 'pointer', height: '36px', transition: '0.2s',
                            display: 'flex', alignItems: 'center'
                          }}
                          onMouseEnter={e => { e.target.style.background = 'var(--primary-light)'; }}
                          onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                        >
                          Carregar Modelo Premium
                        </button>

                        <div style={{ width: '180px' }}>
                          <Dropdown
                            options={template.vars}
                            onSelect={(v) => template.setText(prev => prev + ' ' + v.var)}
                            placeholder="Inserir Variável"
                            icon={Zap}
                            size="small"
                          />
                        </div>
                      </div>
                    </div>

                    {template.id === 'welcome_visitor' && (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>Vídeo de Boas-vindas</label>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <Dropdown
                              options={[
                                { id: '', name: 'Apenas Texto' },
                                ...availableVideos.map(v => ({ id: v.url, name: v.name }))
                              ]}
                              value={sundayVideoUrl}
                              valueLabel={!sundayVideoUrl ? 'Apenas Texto' : (availableVideos.find(v => v.url === sundayVideoUrl)?.name || 'Apenas Texto')}
                              onSelect={(v) => setSundayVideoUrl(v.id)}
                              placeholder="Selecione um vídeo"
                            />
                          </div>
                          {(sundayVideoUrl && availableVideos.some(v => v.url === sundayVideoUrl)) && (
                            <div style={{ width: '160px', height: '90px', borderRadius: '12px', overflow: 'hidden', background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', position: 'relative' }}>
                              <video src={`${sundayVideoUrl}#t=0.1`} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                onClick={() => handleDeleteVideo(sundayVideoUrl)}
                                style={{
                                  position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'background 0.2s'
                                }}
                                title="Apagar Vídeo"
                                onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <textarea
                        value={template.text}
                        onChange={e => template.setText(e.target.value)}
                        style={{
                          flex: 1, minHeight: '180px', width: '100%', padding: '1.5rem',
                          borderRadius: '20px', border: '2px solid var(--border-color)',
                          resize: 'none', lineHeight: 1.6, fontSize: '1rem', outline: 'none',
                          transition: '0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                        placeholder="Escreva sua mensagem aqui..."
                      />

                      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', border: '1px dashed #3b82f6' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} />
                          PRÉ-VISUALIZAÇÃO (EXEMPLO)
                        </div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap', fontStyle: 'italic', lineHeight: 1.6 }}>
                          {formatPreview(template.text)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'mass_send' && (
          <div className="animate-slide-up card" style={{ padding: 0, borderRadius: '24px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', background: 'white', padding: '0.3rem', borderRadius: '12px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
                  <button onClick={() => setMassSendSubTab('visitors')} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: massSendSubTab === 'visitors' ? 'var(--primary)' : 'transparent', color: massSendSubTab === 'visitors' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>Visitantes</button>
                  <button onClick={() => setMassSendSubTab('coordinators')} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: massSendSubTab === 'coordinators' ? 'var(--primary)' : 'transparent', color: massSendSubTab === 'coordinators' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>Coordenadores</button>
                  <button onClick={() => setMassSendSubTab('followup')} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: massSendSubTab === 'followup' ? 'var(--primary)' : 'transparent', color: massSendSubTab === 'followup' ? 'white' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>Acompanhamento</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {massSendSubTab === 'followup' ? 'Acompanhamento com link de confirmação.' : 'Cadastros realizados na data selecionada.'}
                  </p>

                  {massSendSubTab !== 'followup' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '100px' }}>
                      <Clock size={14} className="text-primary" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {autoScheduleEnabled ? `Envio automático: ${sundaySchedule} (${getDayNames(autoSendDays)})` : 'Envio automático desativado'}
                      </span>
                      {countdown && (
                        <div style={{ marginLeft: '0.5rem', padding: '0.1rem 0.6rem', background: '#fef3c7', color: '#92400e', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Timer size={12} /> {countdown}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '200px' }}>
                  <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Data dos registros" />
                </div>
                <button
                  onClick={() => fetchData()}
                  className="btn-outline"
                  disabled={loading}
                  style={{
                    borderRadius: '12px',
                    padding: '0.65rem 1.25rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    borderColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    height: '42px'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
                  Atualizar
                </button>
                <button
                  onClick={() => executeManualSend()}
                  disabled={sending}
                  className="btn btn-primary"
                  style={{ height: '42px', padding: '0 2rem', fontWeight: 700, borderRadius: '12px', boxShadow: 'none', fontSize: '0.85rem' }}
                >
                  {sending ? <Loader2 className="animate-spin" /> : 'Disparar Agora'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === (massSendSubTab === 'followup' ? followupVisitors.length : (massSendSubTab === 'coordinators' ? sundayVisitors.filter(v => v.coordenadores).length : sundayVisitors.length))}
                        onChange={() => {
                          const list = massSendSubTab === 'followup' ? followupVisitors : sundayVisitors;
                          if (selectedIds.length > 0) setSelectedIds([]);
                          else setSelectedIds(list.map(v => v.id));
                        }}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer', borderRadius: '4px' }}
                      />
                    </th>
                    <th style={{ textAlign: 'left' }}>{massSendSubTab === 'coordinators' ? 'Coordenador Designado' : 'Nome do Visitante'}</th>
                    <th style={{ textAlign: 'left' }}>{massSendSubTab === 'coordinators' ? 'Visitante Vinculado' : 'Telefone'}</th>
                    <th style={{ textAlign: 'left' }}>{massSendSubTab === 'coordinators' ? 'Telefone Coordenador' : 'Coordenador'}</th>
                    <th style={{ textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(massSendSubTab === 'followup' ? followupVisitors : sundayVisitors).map(v => {
                    if (massSendSubTab === 'coordinators' && !v.coordenadores) return null;
                    const isSent = massSendSubTab === 'followup' ? v.coord_check_sent : v.welcome_sent;
                    return (
                      <tr key={v.id}>
                        <td><input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer', borderRadius: '4px' }} checked={selectedIds.includes(v.id)} onChange={() => setSelectedIds(prev => prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id])} /></td>
                        <td style={{ fontWeight: 600 }}>{massSendSubTab === 'coordinators' ? (v.coordenadores?.name || 'Sem Coordenador') : v.name}</td>
                        <td>{massSendSubTab === 'coordinators' ? v.name : (v.phone || '—')}</td>
                        <td>{massSendSubTab === 'coordinators' ? (v.coordenadores?.phone || '—') : (v.coordenadores?.name || <span className="text-error">Pendente</span>)}</td>
                        <td style={{ verticalAlign: 'middle' }}>
                          {!v.phone ? (
                            <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, width: 'fit-content', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                              Sem contato
                            </span>
                          ) : isSent ? (
                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, width: 'fit-content', borderRadius: '6px' }}>
                              Enviado
                            </span>
                          ) : (
                            <span className="badge badge-gray" style={{ display: 'inline-flex', padding: '0.15rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, width: 'fit-content', borderRadius: '6px' }}>Pendente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {((massSendSubTab === 'followup' ? followupVisitors : sundayVisitors).length === 0) && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2.5rem', borderRadius: '32px', background: 'white', border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '3rem' }}>

                {/* COLUNA ESQUERDA: AUTOMAÇÃO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Clock size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>Agendamento</h3>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontWeight: 700, display: 'block' }}>Envio Automático</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ativar processamento em segundo plano</span>
                    </div>
                    <button onClick={() => setAutoScheduleEnabled(!autoScheduleEnabled)} style={{ width: '56px', height: '28px', borderRadius: '14px', background: autoScheduleEnabled ? '#22c55e' : '#cbd5e1', border: 'none', cursor: 'pointer', position: 'relative', transition: '0.3s' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: autoScheduleEnabled ? '31px' : '3px', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>Horário de Disparo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '90px' }}>
                        <Dropdown
                          options={Array.from({ length: 24 }, (_, i) => ({ id: i.toString().padStart(2, '0'), name: i.toString().padStart(2, '0') }))}
                          value={sundaySchedule.split(':')[0]}
                          valueLabel={sundaySchedule.split(':')[0]}
                          onSelect={(v) => setSundaySchedule(`${v.id}:${sundaySchedule.split(':')[1]}`)}
                          placeholder="HH"
                          size="small"
                        />
                      </div>
                      <span style={{ fontWeight: 900, color: 'var(--text-muted)' }}>:</span>
                      <div style={{ width: '90px' }}>
                        <Dropdown
                          options={Array.from({ length: 12 }, (_, i) => ({ id: (i * 5).toString().padStart(2, '0'), name: (i * 5).toString().padStart(2, '0') }))}
                          value={sundaySchedule.split(':')[1]}
                          valueLabel={sundaySchedule.split(':')[1]}
                          onSelect={(v) => setSundaySchedule(`${sundaySchedule.split(':')[0]}:${v.id}`)}
                          placeholder="MM"
                          size="small"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>Dias de Operação</label>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setAutoSendDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          style={{
                            flex: 1, padding: '0.75rem 0', borderRadius: '12px', border: 'none',
                            background: autoSendDays?.includes(i) ? 'var(--primary)' : '#f1f5f9',
                            color: autoSendDays?.includes(i) ? 'white' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s'
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* DIVIDER */}
                <div style={{ background: 'var(--border-color)', height: '100%' }} />

                {/* COLUNA DIREITA: PERFORMANCE E MEDIA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                      <Zap size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>Performance e Mídia</h3>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>Delay entre Envios</label>
                    <Dropdown
                      options={[2, 5, 10, 15, 20, 30, 45, 60].map(v => ({ id: v, name: `${v} Segundos` }))}
                      value={visitorSendInterval}
                      valueLabel={`${visitorSendInterval} Segundos`}
                      onSelect={(v) => setVisitorSendInterval(v.id)}
                      placeholder="Intervalo"
                      icon={Timer}
                      size="small"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>Instância Evolution (WhatsApp)</label>
                      <div style={{ position: 'relative' }}>
                        <Smartphone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          value={evolutionInstance}
                          onChange={(e) => setEvolutionInstance(e.target.value)}
                          onBlur={async () => {
                            if (!activeChurch?.id) return;
                            await supabase.from('church_settings').upsert({
                              church_id: activeChurch.id,
                              evolution_instance: evolutionInstance,
                              updated_at: new Date().toISOString()
                            }, { onConflict: 'church_id' });
                          }}
                          placeholder="Nome da Instância"
                          style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px',
                            border: '1px solid var(--border-color)', background: '#f8fafc',
                            fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>API Key (Token)</label>
                      <div style={{ position: 'relative' }}>
                        <Zap size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="password"
                          value={evolutionApiKey}
                          onChange={(e) => setEvolutionApiKey(e.target.value)}
                          onBlur={async () => {
                            if (!activeChurch?.id) return;
                            await supabase.from('church_settings').upsert({
                              church_id: activeChurch.id,
                              evolution_apikey: evolutionApiKey,
                              updated_at: new Date().toISOString()
                            }, { onConflict: 'church_id' });
                          }}
                          placeholder="API Key da Instância"
                          style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px',
                            border: '1px solid var(--border-color)', background: '#f8fafc',
                            fontSize: '0.85rem', fontWeight: 600, outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>


                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', letterSpacing: '0.05em' }}>Biblioteca de Vídeo</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        flex: 1, width: '100%', minHeight: '120px', borderRadius: '20px',
                        border: '2px dashed var(--border-color)', background: '#f8fafc',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '0.75rem', cursor: 'pointer', transition: '0.2s', padding: '1.5rem'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#f8fafc'; }}
                    >
                      {uploadingVideo ? (
                        <Loader2 className="animate-spin text-primary" size={32} />
                      ) : (
                        <>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <Upload size={20} className="text-primary" />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, display: 'block', fontSize: '0.9rem' }}>Upload de Vídeo</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Arraste ou clique para carregar</span>
                          </div>
                        </>
                      )}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleVideoUpload} accept="video/*" style={{ display: 'none' }} />
                  </div>
                </div>

              </div>

              <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveAll}
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 4rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem', boxShadow: 'none' }}
                >
                  Salvar Alterações
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {showConnModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card animate-pop-in" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowConnModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <Smartphone size={60} style={{ color: connectionStatus === 'open' ? '#22c55e' : '#ef4444', marginBottom: '1.5rem' }} />
            <h2 style={{ margin: '0 0 1rem' }}>Conexão WhatsApp</h2>
            <div style={{ padding: '1rem', borderRadius: '12px', background: connectionStatus === 'open' ? '#f0fdf4' : '#fef2f2', color: connectionStatus === 'open' ? '#166534' : '#991b1b', fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              {connectionStatus === 'open' ? 'INSTÂNCIA CONECTADA' : 'INSTÂNCIA DESCONECTADA'}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Instância: <b>{evolutionInstance}</b></p>
          </div>
        </div>,
        document.body
      )}

      {sending && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="animate-scale-up" style={{ background: 'white', borderRadius: '24px', padding: '2.5rem', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Send size={32} color="#3b82f6" className="animate-bounce" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#1e293b' }}>Enviando Mensagens...</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Por favor, não feche esta página.</p>
            
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                <span style={{ color: '#64748b' }}>Progresso</span>
                <span style={{ color: '#3b82f6' }}>{progress.sent + progress.failed} / {progress.total}</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3b82f6', width: `${progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <div style={{ flex: 1, padding: '0.75rem', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{progress.sent}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Sucesso</span>
              </div>
              <div style={{ flex: 1, padding: '0.75rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{progress.failed}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Falhas</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast.visible && createPortal(
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: '#1e293b', color: 'white', padding: '1rem 2rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'slide-up 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)' }}>
          <CheckCircle size={20} style={{ color: '#22c55e' }} />
          <span style={{ fontWeight: 800 }}>{toast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationsVisitors;
