import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Bell, Send, CheckCircle, AlertCircle, Loader2, Calendar, ChevronDown, Search, X } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const { volunteers, tithes, departments, templates, setTemplates } = useApp();
  const now = new Date();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'mass' | 'templates'
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [status, setStatus] = useState({}); // { [volId]: 'success' | 'error' }

  // WhatsApp Connection States
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'open' | 'disconnected'
  const [qrCode, setQrCode] = useState(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [showConnModal, setShowConnModal] = useState(false);

  // Bulk Send States
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkCancel, setBulkCancel] = useState(false);
  const [selectedVolIds, setSelectedVolIds] = useState([]);
  const [searchMassVolunteer, setSearchMassVolunteer] = useState('');
  const [sendInterval, setSendInterval] = useState(5); // Segundos entre mensagens

  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [searchVolunteer, setSearchVolunteer] = useState('');

  // Custom Notifications States
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    if (type !== 'confirm') {
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    }
  };

  // Garante que o modelo selecionado para notificações manuais seja válido (não pode ser comprovante nem boas-vindas)
  // Mas permite selecionar qualquer um se estiver na aba de "Modelos" (para edição)
  React.useEffect(() => {
    if (activeTab !== 'templates') {
      if (selectedTemplateId === 'tithe_receipt' || selectedTemplateId === 'welcome') {
        setSelectedTemplateId('default');
      }
    }
  }, [selectedTemplateId, activeTab]);

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
    // Filtro por nome
    if (searchVolunteer.trim() !== '' && !v.name.toLowerCase().includes(searchVolunteer.toLowerCase())) {
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
    return !hasTithed;
  });

  const formatMessage = (templateText, volunteer) => {
    const monthName = months.find(m => m.value === filterMonth)?.label;
    const volDepts = volunteer.departmentIds?.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ') || 'Nenhum';

    return templateText
      .replace(/{{nome}}/g, volunteer.name)
      .replace(/{{mes}}/g, monthName)
      .replace(/{{ano}}/g, filterYear)
      .replace(/{{departamentos}}/g, volDepts);
  };

  const sendNotification = async (volunteer) => {
    if (!volunteer.contact) return false;

    setSendingId(volunteer.id);

    const number = volunteer.contact.replace(/\D/g, '');
    const formattedNumber = number.startsWith('55') ? number : `55${number}`;

    const message = formatMessage(currentTemplate.text, volunteer);

    try {
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/message/sendText/Control_Church`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_EVOLUTION_API_KEY
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
      message: `Deseja iniciar o envio em massa para ${toSend.length} voluntários com intervalo de ${sendInterval} segundos?`,
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
    setBulkCancel(false);
    window._bulkCancelRequested = false;

    for (let i = 0; i < toSend.length; i++) {
      if (window._bulkCancelRequested) break;

      setBulkProgress(i + 1);
      await sendNotification(toSend[i]);

      if (i < toSend.length - 1) {
        // Aguarda o intervalo selecionado
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, sendInterval * 1000);
          const checkInterval = setInterval(() => {
            if (window._bulkCancelRequested) {
              clearTimeout(timeoutId);
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      if (window._bulkCancelRequested) break;
    }

    setIsBulkSending(false);
    setSendingId(null);
    setSelectedVolIds([]);
    window._bulkCancelRequested = false;
    showToast('Processo de envio em massa finalizado!', 'success');
  };

  const handleBulkCancel = () => {
    setBulkCancel(true);
    window._bulkCancelRequested = true;
  };

  const checkConnection = async (showModalIfDisconnected = false) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connectionState/Control_Church`, {
        headers: { 'apikey': import.meta.env.VITE_EVOLUTION_API_KEY }
      });
      const data = await response.json();
      const state = data.instance.state === 'open' ? 'open' : 'disconnected';
      setConnectionStatus(state);

      if (state === 'disconnected' && showModalIfDisconnected) {
        setShowConnModal(true);
        getQRCode();
      }
      // Não fechamos mais o modal automaticamente para que o usuário veja a mensagem de "Conectado"
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      setConnectionStatus('disconnected');
    }
  };

  const getQRCode = async () => {
    setLoadingConn(true);
    setQrCode(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/connect/Control_Church`, {
        headers: { 'apikey': import.meta.env.VITE_EVOLUTION_API_KEY }
      });
      const data = await response.json();
      if (data.base64) {
        setQrCode(data.base64);
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
    } finally {
      setLoadingConn(false);
    }
  };

  const reiniciarConexao = async () => {
    setLoadingConn(true);
    try {
      // Força o logout da instância para limpar sessões fantasmas
      await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/logout/Control_Church`, {
        method: 'DELETE',
        headers: { 'apikey': import.meta.env.VITE_EVOLUTION_API_KEY }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getQRCode();
    } catch (error) {
      console.error('Erro ao reiniciar:', error);
      getQRCode();
    }
  };

  const disconnectInstance = async () => {
    setConfirmModal({
      visible: true,
      message: 'Deseja realmente desconectar o WhatsApp?',
      onConfirm: async () => {
        setConfirmModal({ visible: false, message: '', onConfirm: null });
        try {
          await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/instance/logout/Control_Church`, {
            method: 'DELETE',
            headers: { 'apikey': import.meta.env.VITE_EVOLUTION_API_KEY }
          });
          setConnectionStatus('disconnected');
          setQrCode(null);
          showToast('WhatsApp desconectado com sucesso!', 'success');
        } catch (error) {
          console.error('Erro ao desconectar:', error);
          showToast('Erro ao desconectar WhatsApp.', 'error');
        }
      }
    });
  };

  React.useEffect(() => {
    checkConnection(true); // Verifica e abre modal se desconectado ao carregar
    const interval = setInterval(() => {
      checkConnection();
    }, 5000); // Verifica mais frequentemente para fechar o modal assim que conectar
    return () => clearInterval(interval);
  }, []);

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
          {/* WhatsApp Connection Button */}
          <button
            onClick={() => setShowConnModal(true)}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface)' }}
          >
            <Send size={16} className={connectionStatus === 'open' ? 'text-success' : 'text-danger'} />
            <span>WhatsApp</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connectionStatus === 'open' ? '#22c55e' : (connectionStatus === 'checking' ? '#eab308' : '#ef4444'), boxShadow: connectionStatus === 'open' ? '0 0 8px rgba(34,197,94,0.5)' : 'none' }}></div>
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
              {/* Month Select */}
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

              {/* Year Select */}
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
                                <span key={id} style={{ fontSize: '0.65rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
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
              {/* Settings and Stats */}
              <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuração:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Modelo de Mensagem:</label>
                      <button
                        onClick={() => setActiveTab('templates')}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        {currentTemplate.name}
                        <ChevronDown size={14} />
                      </button>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>
                      <span>Progresso</span>
                      <span>{bulkProgress} de {bulkTotal}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-color)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${(bulkProgress / bulkTotal) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s ease' }}></div>
                    </div>
                    <button
                      onClick={handleBulkCancel}
                      className="btn btn-danger"
                      style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}
                    >
                      <X size={16} /> Cancelar Envio
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
                              ...(template.id === 'tithe_receipt' ? [
                                { label: 'Valor do Dízimo', var: '{{valor}}' },
                                { label: 'Data do Dízimo', var: '{{data}}' }
                              ] : [])
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
          <div className="card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center', boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', background: 'white' }}>
            <button
              onClick={() => {
                if (connectionStatus === 'open') {
                  setShowConnModal(false);
                } else {
                  navigate('/dashboard');
                }
              }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(0,0,0,0.05)', border: 'none', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', zIndex: 10 }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            >
              <X size={18} />
            </button>

            <div style={{ background: connectionStatus === 'open' ? '#f0fdf4' : '#f0f9ff', color: connectionStatus === 'open' ? '#16a34a' : '#0369a1', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem' }}>
              {connectionStatus === 'open' ? <CheckCircle size={35} /> : <Send size={35} />}
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1e293b' }}>
              {connectionStatus === 'open' ? 'WhatsApp Conectado!' : 'Conecte seu WhatsApp'}
            </h3>
            <div style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {connectionStatus === 'open'
                ? 'Sua conta está ativa e pronta para enviar notificações automáticas.'
                : 'É necessário conectar o WhatsApp da igreja para carregar as pendências e enviar as notificações automáticas.'}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              {connectionStatus === 'open' ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.5rem' }}>Status: Ativo</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Instância: Control_Church</div>
                </div>
              ) : qrCode ? (
                <>
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <img src={qrCode} alt="QR Code" style={{ width: '220px', height: '220px' }} />
                  </div>
                  <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }}></div>
                    Escaneie com o celular da Igreja
                  </div>
                </>
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                  <Loader2 size={40} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{loadingConn ? 'Gerando QR Code...' : 'Aguardando...'}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {connectionStatus === 'open' ? (
                <button
                  onClick={reiniciarConexao}
                  className="btn btn-danger"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  Desconectar e Limpar Sessão
                </button>
              ) : (
                <>
                  <button
                    onClick={getQRCode}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    Gerar QR Code
                  </button>
                  <button
                    onClick={reiniciarConexao}
                    className="btn btn-outline"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, border: '1px dashed #cbd5e1' }}
                  >
                    Limpar e Reiniciar Sessão
                  </button>
                </>
              )}
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                {connectionStatus === 'open' ? 'Você já pode fechar este aviso para usar as notificações.' : 'Ao fechar este aviso no "X", você será redirecionado para o Dashboard.'}
              </div>
            </div>
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
            <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={16} />
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
