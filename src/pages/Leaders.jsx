import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, X, Search, Trash2, Shield, Phone, MapPin, Map, CheckCircle, Check } from 'lucide-react';
import { MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';

// Mapeamento de Zonas de Manaus
const MANAUS_ZONES = [
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
  "Zona Centro-Sul",
  "Zona Centro-Oeste"
];

/* ─── Modal de Líder ────────────────────────────────────── */
const LeaderModal = ({ leader, onSave, onClose }) => {
  const [form, setForm] = useState(leader ? {
    name: leader.name,
    phone: leader.phone ?? '',
    neighborhoods: leader.neighborhoods ? leader.neighborhoods.split(', ') : []
  } : {
    name: '',
    phone: '',
    neighborhoods: []
  });
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
                {leader ? 'Editar Gestão' : 'Nova Gestão de Bairro'}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '3rem' }}>
              Vincule líderes aos bairros para automação de visitantes.
            </p>
          </div>
          <button onClick={onClose} style={{ padding: '0.75rem', borderRadius: '50%', border: 'none', background: '#f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Coluna Esquerda: Dados e Resumo */}
          <div style={{ width: '340px', backgroundColor: '#f8fafc', borderRight: '1px solid var(--border-color)', padding: '2rem', overflowY: 'auto' }} className="custom-scrollbar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Líder ou Casal
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
                    return (
                      <button
                        key={nb}
                        onClick={() => toggleNeighborhood(nb)}
                        style={{
                          padding: '1.25rem', borderRadius: '20px', border: '2px solid', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative',
                          backgroundColor: isSelected ? 'var(--primary-light)' : '#f8fafc',
                          borderColor: isSelected ? 'var(--primary)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: isSelected ? 'var(--primary)' : 'white', color: isSelected ? 'white' : '#94a3b8', display: 'flex' }}>
                            {isSelected ? <Check size={14} /> : <MapPin size={14} />}
                          </div>
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)', marginTop: '0.5rem' }}>{nb}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{activeZone}</span>
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
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'none', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              style={{ padding: '0.75rem 2.5rem', borderRadius: '14px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Processando...' : 'Confirmar Gestão'}
              {!saving && <Shield size={18} />}
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leaderToDelete, setLeaderToDelete] = useState(null);
  const [search, setSearch] = useState('');

  const filteredLeaders = leaders
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = async (id, data) => {
    if (id) await updateLeader(id, data);
    else await addLeader(data);
  };

  const confirmDelete = async () => {
    if (leaderToDelete) {
      await deleteLeader(leaderToDelete.id);
      setShowDeleteModal(false);
      setLeaderToDelete(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Carregando líderes...</div>;

  return (
    <div className="animate-fade-in flex-container">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <Shield size={28} className="text-blue-600" />
            Líderes de Bairro
          </h2>
          <p className="text-muted">Gestão de líderes responsáveis por áreas geográficas</p>
        </div>
        <button onClick={() => { setEditingLeader(null); setModalOpen(true); }} className="btn btn-primary">
          <Plus size={20} /> Novo Líder
        </button>
      </div>

      <div className="card flex-card">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h3 className="text-xl">Líderes Ativos ({filteredLeaders.length})</h3>
          <div className="relative" style={{ maxWidth: '320px', width: '100%', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Pesquisar líder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredLeaders.length > 0 ? (
          <div className="scroll-area">
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
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {l.neighborhoods ? l.neighborhoods.split(', ').map(nb => (
                          <span key={nb} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{nb}</span>
                        )) : 'Nenhum bairro'}
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
                        <button onClick={() => { setEditingLeader(l); setModalOpen(true); }} className="text-muted hover:text-primary transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => { setLeaderToDelete(l); setShowDeleteModal(true); }} className="text-muted hover:text-danger transition-colors">
                          <Trash2 size={18} />
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
            {search ? 'Nenhum líder encontrado.' : 'Nenhum líder cadastrado.'}
          </div>
        )}
      </div>

      {modalOpen && (
        <LeaderModal
          leader={editingLeader}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-100 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Remover Líder</h3>
            <p className="text-muted mb-6">
              Deseja remover <strong className="text-dark">{leaderToDelete?.name}</strong> da gestão da {leaderToDelete?.zone}?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={confirmDelete} className="btn btn-danger">Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Leaders;
