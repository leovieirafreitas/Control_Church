import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import { Bell, Send, CheckCircle, AlertCircle, Loader2, Calendar, ChevronDown, Search, X, Users, Clock, RefreshCw, UserCheck, Radio, Upload, Smartphone } from 'lucide-react';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-notify`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const Notifications = ({ defaultTab = 'pending' }) => {
  const navigate = useNavigate();
  const { volunteers, tithes, departments, templates, setTemplates } = useApp();
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

  const fetchSettings = async () => {
    if (!activeChurch?.id) return;
    try {
      const { data: list } = await supabase.from('church_settings').select('*').eq('church_id', activeChurch.id).limit(1);
      
      let instance = '';
      let apiKey = '';

      if (list?.[0]?.evolution_instance) {
        instance = list[0].evolution_instance;
        apiKey = list[0].evolution_apikey || '';
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
      message: `Deseja iniciar o envio em massa para ${toSend.length} voluntários via servidor? O envio continuará mesmo se você fechar o navegador.`,
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
      const volunteersPayload = toSend.map(v => ({
        id: v.id,
        name: v.name,
        contact: v.contact,
        message: formatMessage(currentTemplate.text, v),
      }));

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
          evolution_apikey: evolutionApiKey || import.meta.env.VITE_EVOLUTION_API_KEY
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
            showToast(`Envio concluido! ${job.sent} enviados, ${job.failed} falhas.`, 'success');
          } else if (job.status === 'cancelled') {
            showToast('Envio cancelado pelo usuário.', 'error');
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <div>
          <h2 className="text-2xl" style={{ marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={24} className="text-primary" />
            Notificações
          </h2>
          <p className="text-muted" style={{ fontSize: '0.82rem' }}>Gestão de avisos e lembretes via WhatsApp</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowConnModal(true)}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface)' }}
          >
            <Send size={16} className={connectionStatus === 'open' ? 'text-success' : 'text-danger'} />
            <span>WhatsApp</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus === 'open' ? '#22c55e' : (connectionStatus === 'checking' ? '#3b82f6' : '#ef4444'), boxShadow: connectionStatus === 'open' ? '0 0 8px rgba(34,197,94,0.5)' : 'none' }}></div>
          </button>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

          <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '0' }}>
            <button
              onClick={() => setActiveTab('pending')}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: activeTab === 'pending' ? 'var(--primary-light)' : 'transparent', color: activeTab === 'pending' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
            >
              Lista
            </button>
            <button
              onClick={() => setActiveTab('mass')}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: activeTab === 'mass' ? 'var(--primary-light)' : 'transparent', color: activeTab === 'mass' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
            >
              Envio em Massa
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: activeTab === 'templates' ? 'var(--primary-light)' : 'transparent', color: activeTab === 'templates' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
            >
              Modelos
            </button>
          </div>

          {(activeTab === 'pending' || activeTab === 'mass') && (
            <>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}
                  className="btn btn-outline"
                  style={{ minWidth: '140px', justifyContent: 'space-between' }}
                >
                  {months.find(m => m.value === filterMonth)?.label}
                  <ChevronDown size={16} style={{ transform: dropdownOpen === 'month' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {dropdownOpen === 'month' && (
                  <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '5px', zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', boxShadow: 'var(--shadow-lg)', width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
                    {months.map(m => (
                      <button
                        key={m.value}
                        onClick={() => { setFilterMonth(m.value); setDropdownOpen(null); }}
                        style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', background: filterMonth === m.value ? 'var(--primary-light)' : 'transparent', color: filterMonth === m.value ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer' }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}
                  className="btn btn-outline"
                  style={{ minWidth: '100px', justifyContent: 'space-between' }}
                >
                  {filterYear}
                  <ChevronDown size={16} style={{ transform: dropdownOpen === 'year' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {dropdownOpen === 'year' && (
                  <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '5px', zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', boxShadow: 'var(--shadow-lg)', width: '100%' }}>
                    {years.map(y => (
                      <button
                        key={y.value}
                        onClick={() => { setFilterYear(y.value); setDropdownOpen(null); }}
                        style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', background: filterYear === y.value ? 'var(--primary-light)' : 'transparent', color: filterYear === y.value ? 'var(--primary-dark)' : 'inherit', border: 'none', cursor: 'pointer' }}
                      >
                        {y.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {activeTab === 'pending' && (
          <>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Pendentes em {months.find(m => m.value === filterMonth)?.label}
                  <span className="badge badge-blue" style={{ marginLeft: '0.75rem' }}>{pendingVolunteers.length}</span>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: '10px', background: 'var(--bg-color)' }}>
                  <Search size={16} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Pesquisar voluntário..."
                    value={searchVolunteer}
                    onChange={(e) => setSearchVolunteer(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '200px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>MODELO:</span>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'template' ? null : 'template')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.45rem 0.9rem',
                      background: dropdownOpen === 'template' ? 'var(--primary-light)' : 'var(--surface)',
                      border: `1.5px solid ${dropdownOpen === 'template' ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      color: dropdownOpen === 'template' ? 'var(--primary-dark)' : 'var(--text-dark)',
                      minWidth: '200px', justifyContent: 'space-between', transition: 'all 0.2s'
                    }}
                  >
                    <span>{currentTemplate.name}</span>
                    <ChevronDown size={14} style={{ transform: dropdownOpen === 'template' ? 'rotate(180deg)' : 'none', transition: '0.25s' }} />
                  </button>
                  {dropdownOpen === 'template' && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '100%', padding: '0.35rem', animation: 'fadeIn 0.15s ease-out' }}>
                      {templates.filter(t => t.id !== 'welcome' && t.id !== 'tithe_receipt').map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedTemplateId(t.id); setDropdownOpen(null); }}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', textAlign: 'left', background: selectedTemplateId === t.id ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: selectedTemplateId === t.id ? 600 : 400, color: selectedTemplateId === t.id ? 'var(--primary-dark)' : 'var(--text-dark)', transition: '0.15s' }}
                          onMouseOver={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'var(--bg-color)'; }}
                          onMouseOut={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'transparent'; }}
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
          </>
        )}

        {activeTab === 'mass' && (
          <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
              <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>

                <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--surface)', textAlign: 'center' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <Send size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Envio em Massa</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Selecione os voluntários na lista ao lado para disparar as mensagens automáticas.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Público-alvo:</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={targetAudience}
                          onChange={(e) => {
                            setTargetAudience(e.target.value);
                            setSelectedVolIds([]); // Limpa a seleção ao mudar o filtro
                          }}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer', color: 'var(--text-dark)' }}
                        >
                          <option value="pending">Voluntários Pendentes</option>
                          <option value="paid">Dizimistas (Já Contribuíram)</option>
                          <option value="all">Todos os Voluntários</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Modelo de Mensagem:</label>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === 'mass-template' ? null : 'mass-template')}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', background: dropdownOpen === 'mass-template' ? 'var(--primary-light)' : 'var(--bg-color)', border: `1.5px solid ${dropdownOpen === 'mass-template' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: dropdownOpen === 'mass-template' ? 'var(--primary-dark)' : 'var(--text-dark)', transition: 'all 0.2s' }}
                        >
                          {currentTemplate.name}
                          <ChevronDown size={14} style={{ transform: dropdownOpen === 'mass-template' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>
                        {dropdownOpen === 'mass-template' && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.35rem', boxShadow: 'var(--shadow-lg)' }}>
                            {templates.map(t => (
                              <button
                                key={t.id}
                                onClick={() => { setSelectedTemplateId(t.id); setDropdownOpen(null); }}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', textAlign: 'left', background: selectedTemplateId === t.id ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: selectedTemplateId === t.id ? 700 : 400, color: selectedTemplateId === t.id ? 'var(--primary-dark)' : 'var(--text-dark)', cursor: 'pointer', transition: '0.15s' }}
                                onMouseOver={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'var(--bg-color)'; }}
                                onMouseOut={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = 'transparent'; }}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Intervalo de Envio:</label>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === 'interval' ? null : 'interval')}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                          {sendInterval} segundos
                          <ChevronDown size={14} style={{ transform: dropdownOpen === 'interval' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>
                        {dropdownOpen === 'interval' && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.35rem', boxShadow: 'var(--shadow-lg)' }}>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                              <button
                                key={val}
                                onClick={() => { setSendInterval(val); setDropdownOpen(null); }}
                                style={{ width: '100%', padding: '0.5rem', textAlign: 'left', background: sendInterval === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: sendInterval === val ? 600 : 400, color: sendInterval === val ? 'var(--primary-dark)' : 'var(--text-dark)', cursor: 'pointer' }}
                              >
                                {val} segundos
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.05)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500, lineHeight: 1.4 }}>
                        Intervalo recomendado para evitar bloqueios automáticos.
                      </p>
                    </div>
                  </div>
                </div>

                {isBulkSending ? (
                  <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                    {/* Badge: rodando no servidor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Rodando no servidor — pode fechar o navegador</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span>Progresso</span>
                      <span>{bulkProgress} / {bulkTotal}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.6s ease' }}></div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(34,197,94,0.06)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>{bulkProgress - bulkFailed}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ENVIADOS</div>
                      </div>
                      <div style={{ flex: 1, padding: '0.5rem', background: 'rgba(239,68,68,0.06)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>{bulkFailed}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>FALHAS</div>
                      </div>
                    </div>
                    <button
                      onClick={handleBulkCancel}
                      className="btn btn-danger"
                      style={{ marginTop: '1.25rem', width: '100%', padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}
                    >
                      <X size={16} /> Solicitar Cancelamento
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startBulkSend}
                    className="btn btn-primary"
                    style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: 700, gap: '0.75rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }}
                    disabled={selectedVolIds.length === 0}
                  >
                    <Send size={18} /> Iniciar para {selectedVolIds.length} selecionados
                  </button>
                )}
              </div>

              {/* Volunteer list with checkboxes */}
              <div style={{ flex: 1, background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        checked={pendingVolunteers.filter(v => v.contact).length > 0 && selectedVolIds.length === pendingVolunteers.filter(v => v.contact).length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVolIds(pendingVolunteers.filter(v => v.contact).map(v => v.id));
                          } else {
                            setSelectedVolIds([]);
                          }
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Selecionar Todos</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {selectedVolIds.length} de {pendingVolunteers.filter(v => v.contact).length} disponíveis
                    </span>
                  </div>

                  {/* Search Input for Mass Sending */}
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Pesquisar voluntário na lista..."
                      value={searchMassVolunteer}
                      onChange={(e) => setSearchMassVolunteer(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                  {(() => {
                    const filtered = pendingVolunteers.filter(v =>
                      v.contact &&
                      v.name.toLowerCase().includes(searchMassVolunteer.toLowerCase())
                    );

                    if (filtered.length > 0) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {filtered.map(vol => (
                            <div
                              key={vol.id}
                              onClick={() => {
                                if (isBulkSending) return;
                                setSelectedVolIds(prev => prev.includes(vol.id) ? prev.filter(id => id !== vol.id) : [...prev, vol.id]);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', borderRadius: '10px', cursor: 'pointer', transition: '0.2s',
                                background: selectedVolIds.includes(vol.id) ? 'rgba(59,130,246,0.04)' : 'transparent',
                                border: `1px solid ${selectedVolIds.includes(vol.id) ? 'rgba(59,130,246,0.1)' : 'transparent'}`
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedVolIds.includes(vol.id)}
                                readOnly
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{vol.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vol.contact}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Search size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nenhum voluntário encontrado.</p>
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
          <div style={{ display: 'flex', height: '100%', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)', margin: '0 0.5rem' }}>
            {/* Sidebar de Modelos */}
            <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Meus Modelos</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Escolha um modelo para editar</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: 'none',
                      textAlign: 'left',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      background: selectedTemplateId === t.id ? 'var(--primary)' : 'transparent',
                      color: selectedTemplateId === t.id ? 'white' : 'var(--text-dark)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: selectedTemplateId === t.id ? 0.8 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Area do Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', minHeight: 0 }}>
              {(() => {
                const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{template.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {template.id}</span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => setDropdownOpen(dropdownOpen === 'vars' ? null : 'vars')}
                          style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}
                        >
                          <Send size={16} style={{ transform: 'rotate(-45deg)' }} />
                          Inserir Variável
                          <ChevronDown size={14} />
                        </button>

                        {dropdownOpen === 'vars' && (
                          <div style={{ position: 'absolute', top: '110%', right: 0, width: '220px', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '0.5rem' }}>
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
                                  updateTemplateText(template.id, template.text + ' ' + v.var);
                                  setDropdownOpen(null);
                                }}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', border: 'none', background: 'transparent', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-dark)', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.target.style.background = 'var(--bg-color)'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                {v.label} <code style={{ fontSize: '0.7rem', color: 'var(--primary)', float: 'right' }}>{v.var}</code>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <textarea
                        value={template.text}
                        onChange={(e) => updateTemplateText(template.id, e.target.value)}
                        placeholder="Escreva sua mensagem aqui..."
                        style={{ flex: 1, width: '100%', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1rem', fontFamily: 'Inter, sans-serif', resize: 'none', background: 'var(--bg-color)', outline: 'none', transition: 'border-color 0.2s', lineHeight: '1.6' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />

                      <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--primary)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle size={14} />
                          PRÉ-VISUALIZAÇÃO (EXEMPLO)
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
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
                    <Settings2 size={20} color="var(--primary)" />
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
                        onBlur={(e) => handleSaveConfig('cnpj', e.target.value)}
                        defaultValue={volunteers?.[0]?.church_settings?.cnpj || ''}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Chave PIX</label>
                      <input 
                        type="text" 
                        placeholder="Chave para dízimos"
                        onBlur={(e) => handleSaveConfig('pix_key', e.target.value)}
                        defaultValue={volunteers?.[0]?.church_settings?.pix_key || ''}
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
