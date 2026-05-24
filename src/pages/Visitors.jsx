import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/cc-logo-small.png';
import { 
  Edit2, X, Check, Search, Trash2, UserPlus, Calendar, Phone, 
  MapPin, ArrowRight, Shield, Save, Tag, AlertCircle, Clock, 
  CheckCircle, MessageSquare, FileDown 
} from 'lucide-react';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';
import Autocomplete from '../components/Autocomplete';
import { MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';

/* ─── Modal de Novo Visitante ────────────────────────── */
const AddVisitorModal = ({ leaders, neighborhoods, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    neighborhood: '',
    assigned_leader_id: null
  });
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setForm(p => ({ ...p, phone: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await onSave(form);
      if (res.error) {
        alert("Erro ao cadastrar: " + res.error.message);
      } else {
        onClose();
      }
    } catch (err) {
      alert("Erro interno: " + err.message);
    }
    setSaving(false);
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="animate-scale-up" style={{ 
        maxWidth: '450px', width: '95%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-dark)' }}>Novo Visitante</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-scrollbar" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nome Completo</label>
            <input 
              type="text" 
              autoFocus
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              value={form.name} 
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              required 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Telefone / WhatsApp</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="(00) 00000-0000"
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                value={form.phone} 
                onChange={handlePhoneChange} 
              />
            </div>
          </div>
          <Autocomplete
            label="Bairro"
            value={form.neighborhood}
            onChange={val => setForm(p => ({ ...p, neighborhood: val }))}
            options={neighborhoods}
            placeholder="Ex: Cidade Nova..."
            icon={MapPin}
          />

          <div>
            <Dropdown
              label="Atribuir Coordenador"
              value={form.assigned_leader_id}
              valueLabel={leaders.find(l => l.id === form.assigned_leader_id)?.name}
              options={leaders.map(l => ({ value: l.id, label: l.name }))}
              onSelect={opt => setForm(p => ({ ...p, assigned_leader_id: opt.value }))}
              placeholder="Auto-atribuição por bairro..."
              icon={Shield}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Se vazio, o sistema tentará mapear pelo bairro automaticamente.</p>
          </div>
        </form>

        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', fontWeight: '700', color: 'white', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onMouseEnter={e=>e.currentTarget.style.background='var(--primary-dark)'} onMouseLeave={e=>e.currentTarget.style.background='var(--primary)'}>
            {saving ? 'Cadastrando...' : <><CheckCircle size={18} /> Cadastrar Visitante</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Modal de Edição de Visitante ────────────────────────── */
const EditVisitorModal = ({ visitor, leaders, neighborhoods, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: visitor.name,
    phone: visitor.phone ?? '',
    neighborhood: visitor.neighborhood ?? '',
    assigned_leader_id: visitor.assigned_leader_id ?? null
  });
  const [saving, setSaving] = useState(false);

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
    try {
      const res = await onSave(visitor.id, form);
      if (res.error) {
        alert("Erro ao salvar: " + res.error.message);
      } else {
        onClose();
      }
    } catch (err) {
      alert("Erro interno: " + err.message);
    }
    setSaving(false);
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="animate-scale-up" style={{ 
        maxWidth: '450px', width: '95%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-dark)' }}>Editar Visitante</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSave} className="custom-scrollbar" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nome Completo</label>
            <input 
              type="text" 
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              value={form.name} 
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              required 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Telefone / WhatsApp</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                value={form.phone} 
                onChange={handlePhoneChange} 
              />
            </div>
          </div>
          <Autocomplete
            label="Bairro"
            value={form.neighborhood}
            onChange={val => setForm(p => ({ ...p, neighborhood: val }))}
            options={neighborhoods}
            placeholder="Ex: Cidade Nova..."
            icon={MapPin}
          />

          <div>
            <Dropdown
              label="Coordenador Responsável"
              value={form.assigned_leader_id}
              valueLabel={leaders.find(l => l.id === form.assigned_leader_id)?.name}
              options={leaders.map(l => ({ value: l.id, label: l.name }))}
              onSelect={opt => setForm(p => ({ ...p, assigned_leader_id: opt.value }))}
              placeholder="Selecione um coordenador..."
              icon={Shield}
            />
          </div>

          {form.assigned_leader_id && (
            <button
              type="button"
              style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none', background: '#e8f9ef', color: '#128c7e', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem', marginTop: '0.5rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={e => e.currentTarget.style.background = '#e8f9ef'}
              onClick={() => {
                const leader = leaders.find(l => l.id === form.assigned_leader_id);
                if (!leader || !leader.phone) {
                  alert('Coordenador sem telefone cadastrado.');
                  return;
                }
                const msg = encodeURIComponent(`Olá ${leader.name}!\n\nTemos um novo visitante sob sua responsabilidade:\n\nNome: *${form.name}*\nTelefone: ${form.phone}\nBairro: ${form.neighborhood}\n\nPor favor, faça o primeiro contato e dê as boas-vindas!`);
                window.open(`https://wa.me/55${leader.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
              }}
            >
              <MessageSquare size={18} /> Notificar Coordenador via WhatsApp
            </button>
          )}
        </form>

        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', fontWeight: '700', color: 'white', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-dark)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}>
            {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Página Principal ─────────────────────────────────────── */
const Visitors = () => {
  const { 
    visitors, leaders, addVisitor, updateVisitor, deleteVisitor, 
    promoteVisitorToMember, visitorSearch, setVisitorSearch, loading,
    activeChurch 
  } = useApp();
  
  // Computar bairros únicos do sistema + mapeamento oficial
  const systemNeighborhoods = React.useMemo(() => {
    const fromMapping = Object.keys(MANAUS_NEIGHBORHOODS_TO_ZONES);
    const fromVisitors = visitors.map(v => v.neighborhood).filter(Boolean);
    return Array.from(new Set([...fromMapping, ...fromVisitors])).sort();
  }, [visitors]);

  const [editingVisitor, setEditingVisitor] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [visitorToPromote, setVisitorToPromote] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCoordinator, setFilterCoordinator] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const filteredVisitors = React.useMemo(() => {
    return visitors
      .filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(visitorSearch.toLowerCase());
        
        let matchesStatus = true;
        if (filterStatus === 'waiting') matchesStatus = !v.assigned_leader_id;
        else if (filterStatus === 'pending') matchesStatus = v.followup_status === 'pending' || !v.followup_status;
        else if (filterStatus === 'denied') matchesStatus = v.followup_status === 'denied';
        else if (filterStatus === 'confirmed') matchesStatus = v.followup_status === 'confirmed';

        let matchesCoordinator = true;
        if (filterCoordinator !== 'all') {
          matchesCoordinator = v.assigned_leader_id === filterCoordinator;
        }

        let matchesZone = true;
        if (filterZone !== 'all') {
          const zone = MANAUS_NEIGHBORHOODS_TO_ZONES[v.neighborhood] || 'Outros';
          matchesZone = zone === filterZone;
        }

        let matchesDate = true;
        if (filterDate) {
          const dateObj = new Date(v.createdAt);
          const visitorDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          matchesDate = visitorDate === filterDate;
        }

        return matchesSearch && matchesStatus && matchesCoordinator && matchesZone && matchesDate;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Mais recentes primeiro
  }, [visitors, visitorSearch, filterStatus, filterCoordinator, filterZone, filterDate]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    const churchName = activeChurch?.name || 'Chama Church';

    // Rótulo do filtro ativo
    const statusLabel =
      filterStatus === 'all' ? null :
      filterStatus === 'waiting' ? 'Fila de Espera' :
      filterStatus === 'pending' ? 'Pendentes' :
      filterStatus === 'denied' ? 'Sem Contato' :
      'Confirmados';

    // Usa os visitantes já filtrados pela tela
    const dataSet = filteredVisitors;

    // --- LOGO ---
    try {
      doc.addImage(logoImg, 'PNG', 160, 10, 35, 12);
    } catch (e) {
      console.error('Erro ao adicionar logo:', e);
    }

    // --- CABEÇALHO ---
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('Relatório de Visitantes', 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(churchName, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data de emissão: ${now}`, 14, 36);

    if (statusLabel) {
      doc.setTextColor(245, 158, 11);
      doc.text(`Filtro aplicado: ${statusLabel}  (${dataSet.length} registros)`, 14, 42);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(14, statusLabel ? 47 : 42, 196, statusLabel ? 47 : 42);

    const startY = statusLabel ? 55 : 50;

    if (filterStatus === 'pending') {
      // --- MODO PENDENTES: tabela única com total + pendentes ---
      const pendingStats = leaders.map(leader => {
        const total = visitors.filter(v => v.assigned_leader_id === leader.id).length;
        const pending = dataSet.filter(v => v.assigned_leader_id === leader.id).length;
        if (total === 0 && pending === 0) return null;
        return [leader.name, total.toString(), pending.toString()];
      }).filter(Boolean);

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('1. Visitantes Pendentes por Coordenador', 14, startY);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Coordenador Responsável', 'Total de Visitantes', 'Pendentes']],
        body: pendingStats.length > 0 ? pendingStats : [['Nenhum registro encontrado', '0', '0']],
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center', textColor: [245, 158, 11], fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 5 }
      });

    } else {
      // --- MODO PADRÃO: tabela unificada por coordenador ---

      const coordStats = leaders.map(leader => {
        const total = dataSet.filter(v => v.assigned_leader_id === leader.id).length;
        const pending = dataSet.filter(v => v.assigned_leader_id === leader.id && (v.followup_status === 'pending' || !v.followup_status)).length;
        const confirmed = dataSet.filter(v => v.assigned_leader_id === leader.id && v.followup_status === 'confirmed').length;
        if (total === 0) return null;
        return [leader.name, total.toString(), pending.toString(), confirmed.toString()];
      }).filter(Boolean);

      // Fila de espera (sem coordenador)
      const waitingCount = dataSet.filter(v => !v.assigned_leader_id).length;
      if (waitingCount > 0) {
        coordStats.push(['Fila de Espera (Sem Coordenador)', waitingCount.toString(), waitingCount.toString(), '0']);
      }

      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`1. ${statusLabel ? statusLabel + ' ' : 'Visitantes '}por Coordenador`, 14, startY);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Coordenador Responsável', 'Total', 'Pendentes', 'Confirmados']],
        body: coordStats.length > 0 ? coordStats : [['Nenhum registro encontrado', '0', '0', '0']],
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center', textColor: [245, 158, 11], fontStyle: 'bold' },
          3: { halign: 'center', textColor: [16, 185, 129], fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      // Tabela 2: por zona
      const zones = ['Zona Norte', 'Zona Leste', 'Zona Sul', 'Zona Centro-Sul', 'Zona Centro-Oeste', 'Zona Oeste', 'Zona Rural', 'Outros'];
      const zoneStats = zones.map(zone => {
        const count = dataSet.filter(v => {
          const vZone = MANAUS_NEIGHBORHOODS_TO_ZONES[v.neighborhood] || 'Outros';
          return vZone === zone;
        }).length;
        return [zone, count.toString()];
      }).filter(row => parseInt(row[1]) > 0);

      const nextY = doc.lastAutoTable.finalY + 15;
      doc.text('2. Distribuição por Zona (Manaus)', 14, nextY);

      autoTable(doc, {
        startY: nextY + 5,
        head: [['Zona / Região', 'Total de Visitantes']],
        body: zoneStats.length > 0 ? zoneStats : [['Nenhum registro encontrado', '0']],
        theme: 'grid',
        headStyles: { fillColor: [168, 85, 247], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 }
      });
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
    }
    
    doc.save(`Relatorio_Visitantes_${churchName.replace(/\s+/g, '_')}_${now.replace(/\//g, '-')}.pdf`);
  };

  const handleDeleteClick = (v) => {
    setVisitorToDelete(v);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (visitorToDelete) {
      await deleteVisitor(visitorToDelete.id);
      setShowDeleteModal(false);
      setVisitorToDelete(null);
    }
  };

  const handlePromoteClick = (v) => {
    setVisitorToPromote(v);
    setShowPromoteModal(true);
  };

  const confirmPromote = async () => {
    if (visitorToPromote) {
      await promoteVisitorToMember(visitorToPromote);
      setShowPromoteModal(false);
      setVisitorToPromote(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Carregando visitantes...</div>;

  return (
    <div className="animate-fade-in dashboard-main-wrapper" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Visitantes / Inscrições</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Acompanhe novos visitantes e pessoas interessadas</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={exportToPDF}
            style={{
              borderRadius: '20px', height: '44px', padding: '0 1.25rem',
              display: 'flex', gap: '0.5rem', alignItems: 'center',
              background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <FileDown size={18} /> Relatório PDF
          </button>

          <div style={{ width: '200px' }}>
            <DatePicker value={filterDate} onChange={setFilterDate} placeholder="Filtrar por data" />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              borderRadius: '20px', height: '44px', padding: '0 1.5rem',
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#3b82f6', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59,130,246,0.3)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <UserPlus size={18} /> Novo Visitante
          </button>
        </div>
      </div>

      {/* ── Banners de Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem', flexShrink: 0 }}>

        {/* Total — card grande (ocupa 2 colunas como em Voluntários) */}
        <div style={{
          gridColumn: 'span 2',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '24px', padding: '1.25rem 1.75rem', color: 'white',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(59,130,246,0.3)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserPlus size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Visitantes</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>{visitors.length}</h2>
          </div>
        </div>

        {/* Fila de Espera */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fff7ed', color: '#f97316', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fila de Espera</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{visitors.filter(v => !v.assigned_leader_id).length}</h2>
          </div>
        </div>

        {/* Pendentes */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fefce8', color: '#ca8a04', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendentes</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{visitors.filter(v => v.followup_status === 'pending' || !v.followup_status).length}</h2>
          </div>
        </div>

        {/* Sem Contato */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fef2f2', color: '#ef4444', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sem Contato</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{visitors.filter(v => v.followup_status === 'denied').length}</h2>
          </div>
        </div>

        {/* Confirmados */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#f0fdf4', color: '#16a34a', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmados</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{visitors.filter(v => v.followup_status === 'confirmed').length}</h2>
          </div>
        </div>
      </div>

      <div className="card flex-card">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h3 className="text-xl">Novas Inscrições ({filteredVisitors.length})</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Status (Fila de Espera, Pendentes, etc) */}
            <div style={{ minWidth: '180px' }}>
              <Dropdown
                value={filterStatus}
                valueLabel={
                  filterStatus === 'all' ? 'Todos os Status' :
                  filterStatus === 'waiting' ? 'Fila de Espera' :
                  filterStatus === 'pending' ? 'Pendentes' :
                  filterStatus === 'denied' ? 'Sem Contato' :
                  'Confirmados'
                }
                options={[
                  { value: 'all', label: 'Todos os Status' },
                  { value: 'waiting', label: 'Fila de Espera' },
                  { value: 'pending', label: 'Pendentes' },
                  { value: 'denied', label: 'Sem Contato' },
                  { value: 'confirmed', label: 'Confirmados' }
                ]}
                onSelect={opt => setFilterStatus(opt.value)}
                icon={AlertCircle}
              />
            </div>

            {/* Zonas */}
            <div style={{ minWidth: '160px' }}>
              <Dropdown
                value={filterZone}
                valueLabel={filterZone === 'all' ? 'Todas as Zonas' : filterZone}
                options={[
                  { value: 'all', label: 'Todas as Zonas' },
                  { value: 'Zona Norte', label: 'Zona Norte' },
                  { value: 'Zona Leste', label: 'Zona Leste' },
                  { value: 'Zona Sul', label: 'Zona Sul' },
                  { value: 'Zona Centro-Sul', label: 'Zona Centro-Sul' },
                  { value: 'Zona Centro-Oeste', label: 'Zona Centro-Oeste' },
                  { value: 'Zona Oeste', label: 'Zona Oeste' },
                  { value: 'Zona Rural', label: 'Zona Rural' },
                  { value: 'Outros', label: 'Outros' }
                ]}
                onSelect={opt => setFilterZone(opt.value)}
              />
            </div>
            
            {/* Coordenadores */}
            <div style={{ minWidth: '200px' }}>
              <Dropdown
                value={filterCoordinator}
                valueLabel={filterCoordinator === 'all' ? 'Todos Coordenadores' : (leaders.find(l => l.id === filterCoordinator)?.name || 'Desconhecido')}
                options={[
                  { value: 'all', label: 'Todos Coordenadores' },
                  ...leaders.map(l => ({ value: l.id, label: l.name }))
                ]}
                onSelect={opt => setFilterCoordinator(opt.value)}
              />
            </div>

            {/* Pesquisa */}
            <div style={{ position: 'relative', maxWidth: '280px', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Pesquisar visitante..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '12px', border: '2px solid #e2e8f0', padding: '0.6rem 1rem 0.6rem 2.5rem', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {filteredVisitors.length > 0 ? (
          <div className="scroll-area">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Sexo</th>
                  <th>Contato</th>
                  <th>Bairro</th>
                  <th>Coordenador Responsável</th>
                  <th>Data Registro</th>
                  <th style={{ width: '120px' }}>Feedback</th>
                  <th style={{ width: '150px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((v) => (
                  <tr key={v.id}>
                    <td className="font-bold">{v.name}</td>
                    <td>
                      {v.gender === 'M' ? (
                        <span style={{ padding: '0.2rem 0.5rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Masc.</span>
                      ) : v.gender === 'F' ? (
                        <span style={{ padding: '0.2rem 0.5rem', background: '#fce7f3', color: '#be185d', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Fem.</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted" />
                        {v.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted" />
                        {v.neighborhood || '—'}
                      </div>
                    </td>
                    <td>
                      {v.assigned_leader_id ? (
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-blue-500" />
                          <span className="font-medium">
                            {leaders.find(l => l.id === v.assigned_leader_id)?.name || 'Coordenador removido'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          padding: '0.25rem 0.6rem', 
                          background: 'var(--primary-light)', 
                          color: 'var(--primary)', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          border: '1px solid var(--border-color)'
                        }}>
                          <AlertCircle size={12} /> Fila de Espera
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td>
                      {v.followup_status === 'confirmed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #d1fae5', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <CheckCircle size={12} /> Confirmado
                        </div>
                      )}
                      {v.followup_status === 'denied' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #fee2e2', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <AlertCircle size={12} /> Sem Contato
                        </div>
                      )}
                      {(!v.followup_status || v.followup_status === 'pending') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <Clock size={12} /> Pendente
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-3 items-center">
                        <button 
                          onClick={() => handlePromoteClick(v)} 
                          className="btn-action-text" 
                          title="Promover a Membro"
                        >
                          <ArrowRight size={14} /> Membro
                        </button>
                        <button onClick={() => setEditingVisitor(v)} className="btn-icon" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(v)} className="btn-icon danger" title="Excluir">
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
            {visitorSearch ? 'Nenhum visitante encontrado para esta busca.' : 'Nenhum visitante cadastrado no momento.'}
          </div>
        )}
      </div>

      {editingVisitor && (
        <EditVisitorModal 
          visitor={editingVisitor} 
          leaders={leaders}
          onSave={updateVisitor}
          neighborhoods={systemNeighborhoods}
          onClose={() => setEditingVisitor(null)} 
        />
      )}

      {showAddModal && (
        <AddVisitorModal 
          leaders={leaders}
          onSave={addVisitor}
          neighborhoods={systemNeighborhoods}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
          <div className="card animate-scale-up" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Excluir Visitante?</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Tem certeza que deseja excluir *{visitorToDelete?.name}*? Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPromoteModal && ReactDOM.createPortal(
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
          <div className="card animate-scale-up" style={{ maxWidth: '450px', width: '90%', textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 20px rgba(99,102,241,0.3)' }}>
              <CheckCircle size={40} color="white" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.75rem', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Efetivar Novo Membro!</h3>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>Você está prestes a converter o visitante *{visitorToPromote?.name}* em um membro oficial da igreja. Deseja prosseguir?</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowPromoteModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>Ainda não</button>
              <button onClick={confirmPromote} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.25)', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>Sim, Efetivar!</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Visitors;
