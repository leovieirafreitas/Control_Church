import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import { Bell, Send, CheckCircle, AlertCircle, Loader2, Calendar, ChevronDown, Search, X, Users, Clock, RefreshCw, UserCheck, Radio, Upload, Smartphone, MessageSquare, Settings, Zap, Save } from 'lucide-react';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-notify`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const Notifications = ({ defaultTab = 'pending' }) => {
  const navigate = useNavigate();
  const { volunteers, tithes, departments, templates, setTemplates, saveTemplateToDb } = useApp();
  const { activeChurch } = useChurch();
  const now = new Date();

  const [activeTab, setActiveTab] = useState(defaultTab); // 'pending' | 'mass' | 'templates'

  // Reseta a tab ativa quando a rota muda
  useEffect(() => {
    setActiveTab(defaultTab === 'sunday' ? 'pending' : defaultTab);
  }, [defaultTab]);
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [status, setStatus] = useState({}); // { [volId]: 'success' | 'error' }

  // WhatsApp Connection States
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'checking' | 'open' | 'disconnected'
  const [qrCode, setQrCode] = useState(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [showConnModal, setShowConnModal] = useState(false);
  const [churchSettings, setChurchSettings] = useState({ cnpj: '', pix_key: '' });

  // Bulk Send States (agora via Edge Function)
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkFailed, setBulkFailed] = useState(0);
  const [selectedVolIds, setSelectedVolIds] = useState([]);
  const [searchMassVolunteer, setSearchMassVolunteer] = useState('');
  const [sendInterval, setSendInterval] = useState(5); // Segundos entre mensagens
  const [currentJobId, setCurrentJobId] = useState(null);
  const pollingRef = useRef(null);
  const stopSignal = useRef(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [searchVolunteer, setSearchVolunteer] = useState('');
  const [targetAudience, setTargetAudience] = useState('pending'); // 'pending' | 'paid'

  // Custom Notifications States
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    if (type !== 'confirm') {
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    }
  };

  const handleSaveConnection = async (instance, apiKey) => {
    if (!activeChurch?.id) return;
    try {
      const { error } = await supabase.from('church_settings').upsert({
        church_id: activeChurch.id,
        evolution_instance: instance,
        evolution_apikey: apiKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'church_id' });

      if (error) throw error;
      showToast('Configurações de conexão salvas!', 'success');
    } catch (e) {
      console.error('Erro ao salvar config de conexão:', e);
      showToast('Erro ao salvar configurações.', 'error');
    }
  };

  const handleSaveConfig = async (field, value) => {
    if (!activeChurch?.id) return;
    try {
      const { error } = await supabase.from('church_settings').upsert({
        church_id: activeChurch.id,
        [field]: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'church_id' });

      if (error) throw error;
      showToast('Configuração salva!', 'success');
    } catch (e) {
      console.error(`Erro ao salvar ${field}:`, e);
      showToast('Erro ao salvar configuração.', 'error');
    }
  };

  const fetchSettings = async () => {
    if (!activeChurch?.id) return;
    try {
      const { data: list } = await supabase.from('church_settings').select('*').eq('church_id', activeChurch.id).limit(1);
      
      let instance = '';
      let apiKey = '';

      if (list?.[0]?.evolution_instance) {
        instance = list[0].evolution_instance;
        apiKey = list[0].evolution_apikey || '';
        setChurchSettings({
          cnpj: list[0].cnpj || '',
          pix_key: list[0].pix_key || ''
        });
      } else {
        const churchSlug = activeChurch?.name
          ? activeChurch.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_')
          : activeChurch?.id?.substring(0,8);
        instance = `Control_Church_${churchSlug}`;
      }

      setEvolutionInstance(instance);
      setEvolutionApiKey(apiKey);
    } catch (e) { console.error('Erro ao buscar configurações:', e); }
  };

  useEffect(() => {
    fetchSettings();
  }, [activeChurch?.id]);


  const updateTemplateText = (id, newText) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => ({ value: y.toString(), label: y.toString() }));

  const isFutureMonth = parseInt(filterYear) > now.getFullYear() ||
    (parseInt(filterYear) === now.getFullYear() && parseInt(filterMonth) > now.getMonth() + 1);

  const pendingVolunteers = isFutureMonth ? [] : volunteers.filter(v => {
    if (activeTab === 'pending' && searchVolunteer.trim() !== '' && !v.name.toLowerCase().includes(searchVolunteer.toLowerCase())) {
      return false;
    }

    const hasTithed = tithes.some(t => {
      const d = new Date(t.date + 'T12:00:00');
      return (
        t.volunteerId === v.id &&
        d.getFullYear().toString() === filterYear &&
        (d.getMonth() + 1).toString() === filterMonth
      );
    });
    
    if (activeTab === 'mass') {
      if (targetAudience === 'all') return true;
      return targetAudience === 'pending' ? !hasTithed : hasTithed;
    }
    
    return !hasTithed;
  });

  const formatMessage = (templateText, volunteer) => {
    const monthName = months.find(m => m.value === filterMonth)?.label;
    const volDepts = volunteer.departmentIds?.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ') || 'Nenhum';

    let message = templateText
      .replace(/{{nome}}/g, volunteer.name)
      .replace(/{{mes}}/g, monthName)
      .replace(/{{ano}}/g, filterYear)
      .replace(/{{departamentos}}/g, volDepts);

    if (message.includes('{{valor}}') || message.includes('{{data}}')) {
      const volTithes = tithes.filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return (
          t.volunteerId === volunteer.id &&
          d.getFullYear().toString() === filterYear &&
          (d.getMonth() + 1).toString() === filterMonth
        );
      });
      const totalAmount = volTithes.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const formattedAmount = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      const sortedTithes = [...volTithes].sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastDate = sortedTithes.length > 0 ? new Date(sortedTithes[0].date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

      message = message.replace(/{{valor}}/g, formattedAmount).replace(/{{data}}/g, lastDate);
    }

    return message;
  };

  const sendNotification = async (volunteer) => {
    if (!volunteer.contact) return false;

    setSendingId(volunteer.id);

    const number = volunteer.contact.replace(/\D/g, '');
    const formattedNumber = number.startsWith('55') ? number : `55${number}`;

    const message = formatMessage(currentTemplate.text, volunteer);

    try {
      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      console.log(`[WhatsApp] Tentando enviar mensagem via ${evolutionInstance}. Key inicia com: ${currentApiKey?.substring(0,4)}...`);
      
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': currentApiKey,
          'Authorization': `Bearer ${currentApiKey}`
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: message
        })
      });

      if (response.ok) {
        setStatus(prev => ({ ...prev, [volunteer.id]: 'success' }));
        return true;
      } else {
        setStatus(prev => ({ ...prev, [volunteer.id]: 'error' }));
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus(prev => ({ ...prev, [volunteer.id]: 'error' }));
      return false;
    } finally {
      if (!isBulkSending) {
        setSendingId(null);
        setTimeout(() => {
          setStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[volunteer.id];
            return newStatus;
          });
        }, 3000);
      }
    }
  };

  const startBulkSend = async () => {
    const toSend = pendingVolunteers.filter(v => v.contact && selectedVolIds.includes(v.id));
    if (toSend.length === 0) {
      showToast('Selecione ao menos um voluntário com contato cadastrado.', 'error');
      return;
    }

    setConfirmModal({
      visible: true,
      message: `Deseja iniciar o envio em massa para ${toSend.length} voluntários?`,
      onConfirm: async () => {
        setConfirmModal({ visible: false, message: '', onConfirm: null });
        await executeBulkSend(toSend);
      }
    });
  };

  const executeBulkSend = async (toSend) => {
    setIsBulkSending(true);
    setBulkTotal(toSend.length);
    setBulkProgress(0);
    setBulkFailed(0);

    try {
      const volunteersPayload = toSend.map(v => {
        const rawNumber = v.contact.replace(/\D/g, '');
        const formattedNumber = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
        return {
          id: v.id,
          name: v.name,
          contact: formattedNumber,
          number: formattedNumber,
          message: formatMessage(currentTemplate.text, v),
        };
      });

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          volunteers: volunteersPayload,
          filterMonth,
          filterYear,
          sendInterval,
          evolution_instance: evolutionInstance,
          evolution_apikey: evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY,
          evolution_base_url: import.meta.env.VITE_EVOLUTION_API_URL,
          instance: evolutionInstance,
          apikey: evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY,
          baseUrl: import.meta.env.VITE_EVOLUTION_API_URL,
          template_text: currentTemplate.text
        })
      });

      const data = await response.json();

      if (!response.ok || !data.jobId) {
        throw new Error(data.error || 'Falha ao iniciar o job de envio');
      }

      setCurrentJobId(data.jobId);
      showToast(`Job iniciado no servidor! ID: ${data.jobId.slice(0, 8)}...`, 'success');
      startPolling(data.jobId);

    } catch (err) {
      console.error('Erro ao iniciar envio em massa:', err);
      showToast(`Erro: ${err.message}`, 'error');
      setIsBulkSending(false);
    }
  };

  const startPolling = (jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${EDGE_FUNCTION_URL}?jobId=${jobId}`, {
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const job = await res.json();

        setBulkProgress(job.sent + job.failed);
        setBulkFailed(job.failed);
        setBulkTotal(job.total);

        if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'error') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsBulkSending(false);
          setCurrentJobId(null);
          setSelectedVolIds([]);

          if (job.status === 'completed') {
            showToast(`Envio concluído! ${job.sent} enviados, ${job.failed} falhas.`, 'success');
          } else if (job.status === 'cancelled') {
            showToast('Envio interrompido.', 'warning');
          } else {
            showToast('Erro no processo de envio.', 'error');
          }
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 3000);
  };

  const handleBulkCancel = async () => {
    if (!currentJobId) return;
    try {
      await fetch(`${EDGE_FUNCTION_URL}?jobId=${currentJobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      showToast('Solicitação de cancelamento enviada...', 'success');
    } catch (err) {
      showToast('Erro ao cancelar.', 'error');
    }
  };

  const checkConnection = async (showModalIfDisconnected = false) => {
    if (!evolutionInstance) return;
    try {
      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connectionState/${evolutionInstance}`, {
        headers: { 
          'apikey': currentApiKey,
          'Authorization': `Bearer ${currentApiKey}`
        }
      });
      
      if (response.status === 401) {
        console.error(`[WhatsApp] Erro 401 em checkConnection (${evolutionInstance}). Verifique se a API Key (${currentApiKey?.substring(0,4)}...) está correta.`);
      }

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
    if (!evolutionInstance) {
      showToast('Informe o nome da instância.', 'warning');
      return;
    }
    setLoadingConn(true);
    setQrCode(null);
    try {
      const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
      console.log(`[WhatsApp] Iniciando conexão para ${evolutionInstance}. Usando chave iniciada em: ${currentApiKey?.substring(0,4)}...`);
      
      // Salva as configurações antes de tentar conectar
      await handleSaveConnection(evolutionInstance, evolutionApiKey);

      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connect/${evolutionInstance}`, {
        headers: { 
          'apikey': currentApiKey,
          'Authorization': `Bearer ${currentApiKey}`
        }
      });
      
      if (response.status === 401) {
        console.error(`[WhatsApp] Erro 401 em connect (${evolutionInstance}). API Key falhou.`);
        showToast('Erro de Autenticação (401). Verifique a API Key.', 'error');
        setLoadingConn(false);
        return;
      }

      if (response.status === 404) {
        // Tenta criar se não existir
        console.log(`[WhatsApp] Instância ${evolutionInstance} não encontrada. Tentando criar...`);
        const createRes = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': currentApiKey,
            'Authorization': `Bearer ${currentApiKey}`
          },
          body: JSON.stringify({ instanceName: evolutionInstance, qrcode: true })
        });

        if (createRes.status === 401) {
          showToast('API Key inválida para criar instâncias.', 'error');
          return;
        }

        setTimeout(() => getQRCode(), 2000);
        return;
      }

      const data = await response.json();
      if (data.base64) {
        setQrCode(data.base64);
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      showToast('Falha na comunicação com a API.', 'error');
    } finally {
      setLoadingConn(false);
    }
  };

  const reiniciarConexao = async () => {
    if (!evolutionInstance) return;
    setConfirmModal({
      visible: true,
      message: 'Isso irá desconectar o WhatsApp e limpar todos os dados da sessão atual. Deseja continuar?',
      onConfirm: async () => {
        setConfirmModal({ visible: false, message: '', onConfirm: null });
        setLoadingConn(true);
        try {
          const currentApiKey = evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY;
          // Tenta fazer logout e deletar a instância para um reset total
          await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/logout/${evolutionInstance}`, {
            method: 'DELETE',
            headers: { 
              'apikey': currentApiKey,
              'Authorization': `Bearer ${currentApiKey}`
            }
          }).catch(() => {});

          await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/delete/${evolutionInstance}`, {
            method: 'DELETE',
            headers: { 
              'apikey': currentApiKey,
              'Authorization': `Bearer ${currentApiKey}`
            }
          }).catch(() => {});

          setConnectionStatus('disconnected');
          setQrCode(null);
          showToast('Sessão reiniciada. Gere um novo QR Code.', 'success');
          setTimeout(() => getQRCode(), 1000);
        } catch (error) {
          console.error('Erro ao reiniciar:', error);
          showToast('Erro ao reiniciar sessão.', 'error');
        } finally {
          setLoadingConn(false);
        }
      }
    });
  };

  React.useEffect(() => {
    if (evolutionInstance) {
      checkConnection(true);
      const interval = setInterval(() => {
        checkConnection();
      }, 10000); // Aumentado para 10s para evitar excesso de requisições
      return () => clearInterval(interval);
    }
  }, [evolutionInstance, evolutionApiKey]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: '1.25rem' }}>
      
      {/* HEADER PREMIUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Bell size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Notificações de Voluntários</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gestão de avisos e lembretes via WhatsApp</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* WhatsApp Status Button */}
          <button
            onClick={() => setShowConnModal(true)}
            style={{ 
              padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, 
              display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc',
              border: '1.5px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <Send size={18} className={connectionStatus === 'open' ? 'text-success' : 'text-danger'} />
            <span>WhatsApp</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus === 'open' ? '#22c55e' : (connectionStatus === 'checking' ? '#3b82f6' : '#ef4444'), boxShadow: connectionStatus === 'open' ? '0 0 8px rgba(34,197,94,0.5)' : 'none' }}></div>
          </button>

          <div style={{ height: '32px', width: '1.5px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.4rem', borderRadius: '16px', gap: '0.25rem' }}>
            {[
              { id: 'pending', label: 'Lista', icon: <Clock size={18} /> },
              { id: 'mass', label: 'Envio em Massa', icon: <Users size={18} /> },
              { id: 'templates', label: 'Modelos', icon: <MessageSquare size={18} /> },
              { id: 'settings', label: 'Configurações', icon: <Settings size={18} /> }
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
      </div>

      {/* CONTEÚDO DINÂMICO POR ABA */}
      <div style={{ flex: 1, overflowY: activeTab === 'templates' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>


      {/* Content */}
        {activeTab === 'pending' && (
          <div className="animate-slide-up card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, borderRadius: '24px' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  Pendentes em {months.find(m => m.value === filterMonth)?.label}
                  <span className="badge badge-blue" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', borderRadius: '10px' }}>{pendingVolunteers.length}</span>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   {/* Filtro de Mês */}
                   <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                        background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '12px',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {months.find(m => m.value === filterMonth)?.label}
                      <ChevronDown size={14} style={{ transform: dropdownOpen === 'month' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>
                    {dropdownOpen === 'month' && (
                      <div style={{ position: 'absolute', top: '110%', left: 0, width: '160px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', padding: '0.4rem' }}>
                        {months.map(m => (
                          <button
                            key={m.value}
                            onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                            style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '8px', background: filterMonth === m.value ? 'var(--primary-light)' : 'transparent', color: filterMonth === m.value ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: filterMonth === m.value ? 700 : 500 }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filtro de Ano */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                        background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '12px',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {filterYear}
                      <ChevronDown size={14} style={{ transform: dropdownOpen === 'year' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>
                    {dropdownOpen === 'year' && (
                      <div style={{ position: 'absolute', top: '110%', left: 0, width: '100px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '0.4rem' }}>
                        {years.map(y => (
                          <button
                            key={y.value}
                            onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                            style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '8px', background: filterYear === y.value ? 'var(--primary-light)' : 'transparent', color: filterYear === y.value ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: filterYear === y.value ? 700 : 500 }}
                          >
                            {y.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1.5px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '14px', background: 'white', width: '280px' }}>
                  <Search size={18} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Pesquisar voluntário..."
                    value={searchVolunteer}
                    onChange={(e) => setSearchVolunteer(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%', fontWeight: 500 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODELO:</span>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'template' ? null : 'template')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 1.25rem',
                      background: 'white',
                      border: `1.5px solid ${dropdownOpen === 'template' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '14px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                      color: 'var(--text-dark)',
                      minWidth: '220px', justifyContent: 'space-between', transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>{currentTemplate.name}</span>
                    <ChevronDown size={16} style={{ transform: dropdownOpen === 'template' ? 'rotate(180deg)' : 'none', transition: '0.25s' }} />
                  </button>
                  {dropdownOpen === 'template' && (
                    <div style={{ position: 'absolute', top: '110%', right: 0, width: '100%', background: 'white', border: '1px solid var(--border-color)', borderRadius: '14px', boxShadow: 'var(--shadow-xl)', zIndex: 100, padding: '0.4rem', animation: 'fadeIn 0.15s ease-out' }}>
                      {templates.filter(t => t.id !== 'welcome' && t.id !== 'tithe_receipt').map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedTemplateId(t.id); setDropdownOpen(null); }}
                          style={{ width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: selectedTemplateId === t.id ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: selectedTemplateId === t.id ? 700 : 500, color: selectedTemplateId === t.id ? 'var(--primary-dark)' : 'var(--text-dark)', transition: '0.15s' }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>


            <div className="table-container" style={{ flex: 1, overflowY: 'auto', border: 'none', borderRadius: 0 }}>
              {isFutureMonth ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Calendar size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>Este mês ainda não chegou</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Não é possível ter pendentes em meses futuros.</p>
                  </div>
                </div>
              ) : pendingVolunteers.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Voluntário</th>
                      <th>Contato</th>
                      <th>Departamentos</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVolunteers.map(vol => (
                      <tr key={vol.id}>
                        <td className="font-bold">{vol.name}</td>
                        <td>{vol.contact || <span className="text-muted">Sem contato</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {vol.departmentIds?.map(id => {
                              const dept = departments?.find(d => d.id === id);
                              return dept ? (
                                <span key={id} className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '0.1rem 0.6rem' }}>
                                  {dept.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={`btn ${status[vol.id] === 'success' ? 'btn-success' : status[vol.id] === 'error' ? 'btn-danger' : 'btn-primary'}`}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minWidth: '140px', gap: '0.5rem' }}
                            onClick={() => sendNotification(vol)}
                            disabled={sendingId === vol.id || !vol.contact || isBulkSending}
                          >
                            {sendingId === vol.id ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                Enviando...
                              </>
                            ) : status[vol.id] === 'success' ? (
                              <>
                                <CheckCircle size={16} />
                                Enviado!
                              </>
                            ) : status[vol.id] === 'error' ? (
                              <>
                                <AlertCircle size={16} />
                                Erro no Envio
                              </>
                            ) : (
                              <>
                                <Send size={16} />
                                Notificar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: '#16a34a', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhuma pendência encontrada!</p>
                  <p>Todos os voluntários deste período já contribuíram.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mass' && (
          <div style={{ padding: 0, height: '100%', display: 'flex', gap: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
              
              {/* Sidebar de Configuração de Envio */}
              <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                
                <div style={{ padding: '2rem 1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'white', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', transform: 'rotate(-5deg)' }}>
                    <Send size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Envio em Massa</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                    Selecione os destinatários para disparar as notificações automáticas via servidor.
                  </p>
                </div>

                <div style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'white', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Público-alvo:</label>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === 'target' ? null : 'target')}
                        style={{
                          width: '100%', padding: '0.75rem 1rem', background: 'white',
                          border: `1.5px solid ${dropdownOpen === 'target' ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                          color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <span>
                          {targetAudience === 'pending' ? 'Voluntários Pendentes' : 
                           targetAudience === 'paid' ? 'Dizimistas (Já Contribuíram)' : 
                           'Todos os Voluntários'}
                        </span>
                        <ChevronDown size={16} style={{ transform: dropdownOpen === 'target' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                      </button>
                      {dropdownOpen === 'target' && (
                        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '0.4rem' }}>
                          {[
                            { value: 'pending', label: 'Voluntários Pendentes' },
                            { value: 'paid', label: 'Dizimistas (Já Contribuíram)' },
                            { value: 'all', label: 'Todos os Voluntários' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setTargetAudience(opt.value); setSelectedVolIds([]); setDropdownOpen(null); }}
                              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '8px', background: targetAudience === opt.value ? 'var(--primary-light)' : 'transparent', color: targetAudience === opt.value ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: targetAudience === opt.value ? 700 : 500 }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo de Mensagem:</label>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === 'mass-template' ? null : 'mass-template')}
                        style={{
                          width: '100%', padding: '0.75rem 1rem', background: 'white',
                          border: `1.5px solid ${dropdownOpen === 'mass-template' ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700,
                          color: 'var(--text-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTemplate.name}</span>
                        <ChevronDown size={16} style={{ transform: dropdownOpen === 'mass-template' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                      </button>
                      {dropdownOpen === 'mass-template' && (
                        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {templates.filter(t => t.id !== 'welcome' && t.id !== 'tithe_receipt').map(t => (
                            <button
                              key={t.id}
                              onClick={() => { setSelectedTemplateId(t.id); setDropdownOpen(null); }}
                              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: '8px', background: selectedTemplateId === t.id ? 'var(--primary-light)' : 'transparent', color: selectedTemplateId === t.id ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: selectedTemplateId === t.id ? 700 : 500 }}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intervalo (segundos):</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input 
                        type="range" min="1" max="60" 
                        value={sendInterval} 
                        onChange={(e) => setSendInterval(parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: '35px', fontSize: '0.9rem' }}>{sendInterval}s</span>
                    </div>
                  </div>

                  {isBulkSending ? (
                    <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1.5px solid var(--primary-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Loader2 size={18} className="animate-spin text-primary" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>Processando envio...</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
                        <span>Progresso</span>
                        <span>{bulkProgress} / {bulkTotal}</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.6s ease' }}></div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <div style={{ flex: 1, padding: '0.75rem', background: '#f0fdf4', borderRadius: '12px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#16a34a' }}>{bulkProgress - bulkFailed}</div>
                          <div style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>Sucesso</div>
                        </div>
                        <div style={{ flex: 1, padding: '0.75rem', background: '#fef2f2', borderRadius: '12px', textAlign: 'center', border: '1px solid #fecaca' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626' }}>{bulkFailed}</div>
                          <div style={{ fontSize: '0.6rem', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>Falhas</div>
                        </div>
                      </div>
                      <button
                        onClick={handleBulkCancel}
                        style={{ marginTop: '1.25rem', width: '100%', padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem', background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <X size={16} /> Parar Envio
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startBulkSend}
                      disabled={selectedVolIds.length === 0}
                      style={{ 
                        padding: '1rem', fontSize: '1rem', fontWeight: 800, gap: '0.75rem', borderRadius: '16px', 
                        background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: selectedVolIds.length === 0 ? 0.6 : 1
                      }}
                      onMouseEnter={e => { if (selectedVolIds.length > 0) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { if (selectedVolIds.length > 0) e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <Send size={20} /> Iniciar para {selectedVolIds.length}
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Destinatários com Checkboxes */}
              <div className="card" style={{ flex: 1, borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        checked={pendingVolunteers.filter(v => v.contact).length > 0 && selectedVolIds.length === pendingVolunteers.filter(v => v.contact).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVolIds(pendingVolunteers.filter(v => v.contact).map(v => v.id));
                          } else {
                            setSelectedVolIds([]);
                          }
                        }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Selecionar Todos</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, background: 'white', padding: '0.3rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      {selectedVolIds.length} / {pendingVolunteers.filter(v => v.contact).length} disponíveis
                    </span>
                  </div>

                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={searchMassVolunteer}
                      onChange={(e) => setSearchMassVolunteer(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.75rem', background: 'white', border: '1.5px solid var(--border-color)', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                  {(() => {
                    const filtered = pendingVolunteers.filter(v =>
                      v.contact &&
                      v.name.toLowerCase().includes(searchMassVolunteer.toLowerCase())
                    );

                    if (filtered.length > 0) {
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                          {filtered.map(vol => (
                            <div
                              key={vol.id}
                              onClick={() => {
                                if (isBulkSending) return;
                                setSelectedVolIds(prev => prev.includes(vol.id) ? prev.filter(id => id !== vol.id) : [...prev, vol.id]);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                                background: selectedVolIds.includes(vol.id) ? 'var(--primary-light)' : 'white',
                                border: `1.5px solid ${selectedVolIds.includes(vol.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                                boxShadow: selectedVolIds.includes(vol.id) ? '0 4px 12px rgba(59,130,246,0.1)' : 'none'
                              }}
                            >
                              <div style={{ 
                                width: '20px', height: '20px', borderRadius: '6px', border: '2px solid var(--border-color)', 
                                background: selectedVolIds.includes(vol.id) ? 'var(--primary)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {selectedVolIds.includes(vol.id) && <CheckCircle size={14} color="white" />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: selectedVolIds.includes(vol.id) ? 'var(--primary-dark)' : 'var(--text-dark)' }}>{vol.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{vol.contact}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                          <p style={{ fontSize: '1rem', fontWeight: 700 }}>Nenhum voluntário encontrado para os filtros atuais.</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'templates' && (
          <div className="animate-slide-up" style={{ display: 'flex', flex: 1, border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden', background: 'white' }}>
            {/* SIDEBAR DE MODELOS */}
            <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', background: '#f8fafc', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, color: 'var(--text-dark)' }}>Meus Modelos</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>Selecione para editar</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', textAlign: 'left', marginBottom: '0.35rem',
                      cursor: 'pointer', transition: '0.2s',
                      background: selectedTemplateId === t.id ? 'var(--primary)' : 'transparent',
                      color: selectedTemplateId === t.id ? 'white' : 'var(--text-dark)',
                      display: 'flex', flexDirection: 'column', gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>{t.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: selectedTemplateId === t.id ? 0.8 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.text}
                    </span>
                  </button>
                ))}
              </div>
              
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'white' }}>
                <button
                  onClick={() => {
                    const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
                    saveTemplateToDb(template.id, template.name, template.text);
                    showToast('Modelo salvo com sucesso!', 'success');
                  }}
                  style={{
                    width: '100%', padding: '0.85rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px',
                    fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Save size={18} />
                  Salvar Alterações
                </button>
              </div>
            </div>

            {/* AREA DO EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', background: 'white', overflowY: 'auto' }}>
              {(() => {
                const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{template.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {template.id}</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === 'vars' ? null : 'vars')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem',
                            background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px',
                            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                          }}
                        >
                          <Zap size={16} />
                          Inserir Variável
                          <ChevronDown size={14} style={{ transform: dropdownOpen === 'vars' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>

                        {dropdownOpen === 'vars' && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, width: '220px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-xl)', zIndex: 100, padding: '0.5rem', animation: 'slideInUp 0.2s ease-out' }}>
                            {[
                              { label: 'Nome do Voluntário', var: '{{nome}}' },
                              { label: 'Mês de Referência', var: '{{mes}}' },
                              { label: 'Ano de Referência', var: '{{ano}}' },
                              { label: 'Departamentos', var: '{{departamentos}}' },
                              { label: 'Valor da Contribuição', var: '{{valor}}' },
                              { label: 'Data da Contribuição', var: '{{data}}' }
                            ].map(v => (
                              <button
                                key={v.var}
                                onClick={() => {
                                  const newText = template.text + ' ' + v.var;
                                  updateTemplateText(template.id, newText);
                                  saveTemplateToDb(template.id, template.name, newText);
                                  setDropdownOpen(null);
                                }}
                                style={{ width: '100%', padding: '0.7rem 0.85rem', border: 'none', background: 'transparent', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                <span>{v.label}</span>
                                <code style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>{v.var}</code>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <textarea
                        value={template.text}
                        onChange={(e) => updateTemplateText(template.id, e.target.value)}
                        placeholder="Escreva sua mensagem aqui..."
                        style={{ 
                          flex: 1, minHeight: '200px', width: '100%', padding: '1.5rem', 
                          borderRadius: '20px', border: '2px solid var(--border-color)', 
                          fontSize: '1rem', fontFamily: 'inherit', resize: 'none', 
                          background: '#f8fafc', outline: 'none', transition: 'all 0.2s', lineHeight: '1.6' 
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)';
                          saveTemplateToDb(template.id, template.name, e.target.value);
                        }}
                      />

                      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', border: '1px dashed #3b82f6' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <CheckCircle size={16} />
                          PRÉ-VISUALIZAÇÃO (EXEMPLO)
                        </div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap', fontStyle: 'italic', lineHeight: '1.6' }}>
                          {formatMessage(template.text, volunteers[0] || { name: 'João Silva', departmentIds: [] })}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-slide-up" style={{ flex: 1, minHeight: '500px' }}>
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={20} color="var(--primary)" />
                    Dados da Igreja
                  </h3>
                  
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Nome da Unidade</label>
                    <input 
                      type="text" 
                      value={activeChurch?.name || ''} 
                      disabled
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#f8fafc', color: 'var(--text-muted)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>CNPJ</label>
                      <input 
                        type="text" 
                        placeholder="00.000.000/0000-00"
                        onChange={(e) => setChurchSettings(prev => ({ ...prev, cnpj: e.target.value }))}
                        onBlur={(e) => handleSaveConfig('cnpj', e.target.value)}
                        value={churchSettings.cnpj}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Chave PIX</label>
                      <input 
                        type="text" 
                        placeholder="Chave para dízimos"
                        onChange={(e) => setChurchSettings(prev => ({ ...prev, pix_key: e.target.value }))}
                        onBlur={(e) => handleSaveConfig('pix_key', e.target.value)}
                        value={churchSettings.pix_key}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smartphone size={20} color="var(--primary)" />
                    Configuração WhatsApp (Evolution API)
                  </h3>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Instância WhatsApp</label>
                      <div style={{ position: 'relative' }}>
                        <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="text" 
                          value={evolutionInstance}
                          onChange={(e) => setEvolutionInstance(e.target.value)}
                          onBlur={() => handleSaveConfig('evolution_instance', evolutionInstance)}
                          placeholder="Nome da Instância"
                          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1.5px solid var(--border-color)', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>API Key (Token)</label>
                      <div style={{ position: 'relative' }}>
                        <Zap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="password" 
                          value={evolutionApiKey}
                          onChange={(e) => setEvolutionApiKey(e.target.value)}
                          onBlur={() => handleSaveConfig('evolution_apikey', evolutionApiKey)}
                          placeholder="API Key da Instância"
                          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1.5px solid var(--border-color)', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px', color: 'var(--primary-dark)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <strong>Dica:</strong> Cada unidade da igreja deve ter sua própria instância no Evolution API para evitar que as sessões do WhatsApp se desconectem ao trocar de unidade.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Modal (Pop-up) via Portal for real full-screen coverage */}
      {showConnModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          color: 'var(--text-dark)'
        }}>
          <div className="card animate-fade-in" style={{ 
            maxWidth: '650px', 
            width: '95%', 
            padding: '1.5rem', 
            textAlign: 'left', 
            boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.5)', 
            borderRadius: '24px', 
            border: '1px solid rgba(0,0,0,0.05)', 
            position: 'relative', 
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <button
              onClick={() => setShowConnModal(false)}
              className="btn-close"
              style={{ 
                position: 'absolute', 
                top: '0.75rem', 
                right: '0.75rem', 
                zIndex: 100, 
                padding: '0.5rem', 
                borderRadius: '50%', 
                background: 'rgba(0,0,0,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={18} color="var(--text-muted)" />
            </button>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              {/* Coluna Esquerda: Info e Inputs */}
              <div style={{ flex: '1.2', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>WhatsApp</h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                    Conecte a instância da igreja para automatizar notificações e carregar pendências.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Nome da Instância:</label>
                    <input 
                      type="text"
                      value={evolutionInstance}
                      onChange={(e) => setEvolutionInstance(e.target.value)}
                      placeholder="Ex: Control_Church"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>API Key (Opcional):</label>
                    <input 
                      type="password"
                      value={evolutionApiKey}
                      onChange={(e) => setEvolutionApiKey(e.target.value)}
                      placeholder="Chave do servidor"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button 
                    onClick={getQRCode}
                    disabled={loadingConn}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    {loadingConn ? 'Gerando...' : 'Gerar QR Code'}
                  </button>
                  <button 
                    onClick={reiniciarConexao}
                    style={{ width: '100%', padding: '0.6rem', background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Limpar e Reiniciar Sessão
                  </button>
                </div>
              </div>

              {/* Coluna Direita: QR Code Centralizado */}
              <div style={{ flex: '1', minWidth: '240px', background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
                {connectionStatus === 'open' ? (
                  <div className="animate-bounce-in" style={{ textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <CheckCircle size={32} color="#16a34a" />
                    </div>
                    <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>Conectado!</p>
                  </div>
                ) : qrCode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div className="animate-fade-in" style={{ background: 'white', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                      <img src={qrCode} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }}></div>
                      Escaneie com o celular da Igreja
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {loadingConn ? (
                      <Loader2 size={36} className="animate-spin" style={{ color: '#3b82f6' }} />
                    ) : (
                      <div className="loading-spinner" style={{ width: '32px', height: '32px' }}></div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{loadingConn ? 'Gerando...' : 'Aguardando...'}</p>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', margin: 0 }}>
              Você pode fechar este aviso para continuar usando o sistema.
            </p>
          </div>
        </div>,
        document.body
      )}
      {/* Custom Toast Notification */}
      {toast.visible && createPortal(
        <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 100000, animation: 'slideInRight 0.3s ease-out' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 1.5rem', borderRadius: '12px', background: 'white',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981'}`
          }}>
            {toast.type === 'error' ? <AlertCircle size={20} style={{ color: '#ef4444' }} /> : <CheckCircle size={20} style={{ color: '#10b981' }} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{toast.message}</span>
            <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="btn-close" style={{ marginLeft: '1rem', padding: '0.4rem' }}>
              <X size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.visible && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100001 }}>
          <div className="card animate-scale-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Confirmar Ação</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>{confirmModal.message}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setConfirmModal({ visible: false, message: '', onConfirm: null })}
                style={{ padding: '0.75rem' }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmModal.onConfirm}
                style={{ padding: '0.75rem' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Notifications;
