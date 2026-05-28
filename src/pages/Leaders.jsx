import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, X, Search, Trash2, Shield, Phone, MapPin, Map, CheckCircle, Check, Link2, Copy } from 'lucide-react';
import { MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';
import { useChurch } from '../context/ChurchContext';

// Mapeamento de Zonas de Manaus
const MANAUS_ZONES = [
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
  "Zona Centro-Sul",
  "Zona Centro-Oeste"
];

/* ─── Modal de Coordenador ────────────────────────────────── */
const LeaderModal = ({ leader, onSave, onClose, allLeaders = [] }) => {
  const [form, setForm] = useState(leader ? {
    name: leader.name,
    phone: leader.phone ?? '',
    neighborhoods: leader.neighborhoods ? leader.neighborhoods.split(', ') : []
  } : {
    name: '',
    phone: '',
    neighborhoods: []
  });

  // Mapear quais bairros já estão ocupados e por quem
  const takenNeighborhoods = React.useMemo(() => {
    const map = {};
    allLeaders.forEach(l => {
      // Ignora o próprio líder que está sendo editado
      if (leader && l.id === leader.id) return;
      
      if (l.neighborhoods) {
        l.neighborhoods.split(', ').forEach(nb => {
          map[nb] = l.name;
        });
      }
    });
    return map;
  }, [allLeaders, leader]);
  const [saving, setSaving] = useState(false);
  const [activeZone, setActiveZone] = useState('Zona Centro-Sul');
  const [nbSearch, setNbSearch] = useState('');

  const neighborhoodsByZone = React.useMemo(() => {
    const zones = {};
    Object.entries(MANAUS_NEIGHBORHOODS_TO_ZONES).forEach(([nb, zone]) => {
      if (!zones[zone]) zones[zone] = [];
      zones[zone].push(nb);
    });
    return zones;
  }, []);

  const toggleNeighborhood = (nb) => {
    setForm(p => ({
      ...p,
      neighborhoods: p.neighborhoods.includes(nb)
        ? p.neighborhoods.filter(x => x !== nb)
        : [...p.neighborhoods, nb]
    }));
  };

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setForm(p => ({ ...p, phone: v }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(leader?.id, {
      ...form,
      neighborhoods: form.neighborhoods.join(', ')
    });
    setSaving(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-scale-up" style={{ 
        maxWidth: '1000px', 
        width: '95%', 
        maxHeight: '90vh',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 25px 70px -15px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Header Premium */}
        <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, #fff, #f8fafc)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '12px', display: 'flex' }}>
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
                {leader ? 'Editar Coordenação' : 'Nova Coordenação de Bairro'}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '3rem' }}>
              Vincule coordenadores aos bairros para automação de visitantes.
            </p>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Coluna Esquerda: Dados e Resumo */}
          <div style={{ width: '340px', backgroundColor: '#f8fafc', borderRight: '1px solid var(--border-color)', padding: '2rem', overflowY: 'auto' }} className="custom-scrollbar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Coordenador ou Casal
                </label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '0.95rem', fontWeight: '600', transition: 'var(--transition)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="Ex: Pedro e Ana"
                  value={form.name} 
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  WhatsApp / Contato
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    style={{ width: '100%', padding: '1rem 1rem 1rem 2.75rem', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '0.95rem', fontWeight: '600', transition: 'var(--transition)', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    placeholder="(92) 00000-0000"
                    value={form.phone} 
                    onChange={handlePhoneChange} 
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bairros Ativos</span>
                  <span style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '800' }}>{form.neighborhoods.length}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {form.neighborhoods.length > 0 ? form.neighborhoods.map(nb => (
                    <div key={nb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-dark)' }}>
                      {nb}
                      <button onClick={() => toggleNeighborhood(nb)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '14px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Selecione os bairros no painel ao lado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Seleção de Bairros */}
          <div style={{ flex: 1, backgroundColor: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#f1f5f9', padding: '0.4rem', borderRadius: '14px', overflowX: 'auto' }} className="scrollbar-hide">
                {Object.keys(neighborhoodsByZone).map(zone => (
                  <button
                    key={zone}
                    onClick={() => setActiveZone(zone)}
                    style={{
                      padding: '0.6rem 1rem', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                      backgroundColor: activeZone === zone ? 'white' : 'transparent',
                      color: activeZone === zone ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: activeZone === zone ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {zone.replace('Zona ', '')}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Pesquisar bairro..."
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '12px', border: 'none', backgroundColor: '#f8fafc', fontSize: '0.875rem', fontWeight: '500' }}
                  value={nbSearch}
                  onChange={e => setNbSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {neighborhoodsByZone[activeZone]
                  .filter(nb => nb.toLowerCase().includes(nbSearch.toLowerCase()))
                  .map(nb => {
                    const isSelected = form.neighborhoods.includes(nb);
                    const takenBy = takenNeighborhoods[nb];
                    const isTaken = !!takenBy;

                    return (
                      <button
                        key={nb}
                        onClick={() => !isTaken && toggleNeighborhood(nb)}
                        disabled={isTaken}
                        style={{
                          padding: '1.25rem', borderRadius: '20px', border: '2px solid', textAlign: 'left', cursor: isTaken ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative',
                          backgroundColor: isTaken ? '#f1f5f9' : (isSelected ? 'var(--primary-light)' : '#f8fafc'),
                          borderColor: isSelected ? 'var(--primary)' : 'transparent',
                          opacity: isTaken ? 0.7 : 1,
                          filter: isTaken ? 'grayscale(1)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: isTaken ? '#cbd5e1' : (isSelected ? 'var(--primary)' : 'white'), color: isTaken ? 'white' : (isSelected ? 'white' : '#94a3b8'), display: 'flex' }}>
                            {isSelected ? <Check size={14} /> : (isTaken ? <Shield size={14} /> : <MapPin size={14} />)}
                          </div>
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: isTaken ? '#64748b' : (isSelected ? 'var(--primary-dark)' : 'var(--text-dark)'), marginTop: '0.5rem' }}>{nb}</span>
                        {isTaken ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>Ocupado: {takenBy}</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{activeZone}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem 2.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            {form.neighborhoods.length} bairro(s) selecionado(s)
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn btn-outline">
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="btn btn-primary"
            >
              {saving ? 'Processando...' : <><Shield size={18} /> Confirmar Coordenação</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Página Principal ─────────────────────────────────────── */
const Leaders = () => {
  const { leaders, addLeader, updateLeader, deleteLeader, loading } = useApp();
  const { activeChurch } = useChurch();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [leaderToDelete, setLeaderToDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const copyRegisterLink = () => {
    let slug = '';
    if (activeChurch) {
      slug = activeChurch.name
        .toLowerCase()
        .replace('chama church - ', '')
        .replace('chama church ', '')
        .trim()
        .replace(/\s+/g, '-');
    }
    const churchQuery = slug ? `?church=${slug}` : '';
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/register/coordenador${churchQuery}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLeaders = leaders
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = async (id, data) => {
    if (id) await updateLeader(id, data);
    else await addLeader(data);
  };

  const confirmDelete = async () => {
    if (leaderToDelete) {
      const { error } = await deleteLeader(leaderToDelete.id);
      if (error) {
        alert("Erro ao excluir coordenador: " + error.message);
      }
      setShowDeleteModal(false);
      setLeaderToDelete(null);
    }
  };

  const totalNeighborhoodsCount = leaders.reduce((acc, l) => {
    const nbs = l.neighborhoods ? l.neighborhoods.split(', ') : [];
    return acc + nbs.length;
  }, 0);

  if (loading) return <div className="p-8 text-center text-muted">Carregando coordenadores...</div>;

  return (
    <div className="animate-fade-in flex-container" style={{ padding: '1.5rem 2rem', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Coordenadores de Bairro</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Gestão de coordenadores responsáveis por áreas geográficas</p>
        </div>
         <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={copyRegisterLink} 
            style={{ 
              borderRadius: '20px', height: '44px', padding: '0 1.5rem',
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#ffffff', color: copied ? '#3b82f6' : '#475569', 
              border: copied ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.color='#3b82f6'; e.currentTarget.style.background='#eff6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=copied ? '#3b82f6' : '#e2e8f0'; e.currentTarget.style.color=copied ? '#3b82f6' : '#475569'; e.currentTarget.style.background='#ffffff'; }}
          >
            {copied ? <><Check size={18} /> Link Copiado!</> : <><Link2 size={18} /> Copiar Link Cadastro</>}
          </button>
          <button 
            onClick={() => { setEditingLeader(null); setModalOpen(true); }} 
            style={{
              borderRadius: '20px', height: '44px', padding: '0 1.5rem',
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#3b82f6', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <Plus size={20} /> Novo Coordenador
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', flexShrink: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '24px', padding: '1.25rem 1.75rem', color: 'white',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(59,130,246,0.3)',
          transition: 'all 0.4s ease'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={28} color="white" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Coordenadores</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>{leaders.length}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#eff6ff', color: '#3b82f6', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bairros Atendidos</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{totalNeighborhoodsCount}</h2>
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '24px', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Coordenadores Ativos ({filteredLeaders.length})</h3>
          <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Pesquisar coordenador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem',
                borderRadius: '20px', border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem', outline: 'none', fontWeight: 500,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {filteredLeaders.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="custom-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome / Casal</th>
                  <th>Bairros Sob Responsabilidade</th>
                  <th>Contato</th>
                  <th style={{ width: '100px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaders.map((l) => (
                  <tr key={l.id}>
                    <td className="font-bold">{l.name}</td>
                    <td>
                      <div className="flex flex-wrap gap-2" style={{ maxWidth: '350px' }} title={l.neighborhoods}>
                        {l.neighborhoods ? (
                          (() => {
                            const allNbs = l.neighborhoods.split(',').map(n => n.trim()).filter(Boolean);
                            const visibleNbs = allNbs.slice(0, 3);
                            const hiddenCount = allNbs.length - 3;
                            
                            return (
                              <>
                                {visibleNbs.map(nb => (
                                  <span key={nb} className="badge badge-blue" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', lineHeight: '1', fontWeight: '600' }}>{nb}</span>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '20px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', lineHeight: '1', fontWeight: '800', cursor: 'help' }}>
                                    +{hiddenCount}
                                  </span>
                                )}
                              </>
                            );
                          })()
                        ) : <span className="text-muted text-sm">Nenhum bairro vinculado</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted" />
                        {l.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditingLeader(l); setModalOpen(true); }} className="btn-icon" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { setLeaderToDelete(l); setShowDeleteModal(true); }} className="btn-icon danger" title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted">
            {search ? 'Nenhum coordenador encontrado.' : 'Nenhum coordenador cadastrado.'}
          </div>
        )}
      </div>

      {modalOpen && (
        <LeaderModal
          leader={editingLeader}
          allLeaders={leaders}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-up" style={{
            maxWidth: '400px', width: '90%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <div style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Excluir Coordenador</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Deseja realmente excluir <strong style={{color: 'var(--text-dark)'}}>{leaderToDelete?.name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div style={{ padding: '1.25rem 2rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.borderColor='#cbd5e1'} onMouseLeave={e=>e.target.style.borderColor='#e2e8f0'}>Cancelar</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: '#ef4444', fontWeight: '700', color: 'white', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.background='#dc2626'} onMouseLeave={e=>e.target.style.background='#ef4444'}>Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Leaders;
