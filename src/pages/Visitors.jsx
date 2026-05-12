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
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', fontWeight: '700', color: 'white', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-dark)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}>
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
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>Cancelar</button>
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

  const [showWaitingListOnly, setShowWaitingListOnly] = useState(false);
  const [filterCoordinator, setFilterCoordinator] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const availableYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const y = new Set(visitors.map(v => new Date(v.createdAt).getFullYear()));
    for (let i = 2026; i <= currentYear + 10; i++) {
      y.add(i);
    }
    return [
      {value: 'all', label: 'Ano (Todos)'}, 
      ...Array.from(y).sort((a, b) => a - b).map(year => ({value: year.toString(), label: year.toString()}))
    ];
  }, [visitors]);

  const filteredVisitors = React.useMemo(() => {
    return visitors
      .filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(visitorSearch.toLowerCase());
        const isWaiting = !v.assigned_leader_id;
        
        let matchesWaitlist = true;
        if (showWaitingListOnly) matchesWaitlist = isWaiting;

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
        if (filterMonth !== 'all' || filterYear !== 'all') {
          const vDate = new Date(v.createdAt);
          if (filterMonth !== 'all') {
            matchesDate = matchesDate && vDate.getMonth().toString() === filterMonth;
          }
          if (filterYear !== 'all') {
            matchesDate = matchesDate && vDate.getFullYear().toString() === filterYear;
          }
        }

        return matchesSearch && matchesWaitlist && matchesCoordinator && matchesZone && matchesDate;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Mais recentes primeiro
  }, [visitors, visitorSearch, showWaitingListOnly, filterCoordinator, filterZone, filterMonth, filterYear]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    const churchName = activeChurch?.name || 'Chama Church';

    // --- LOGO ---
    try {
      doc.addImage(logoImg, 'PNG', 160, 10, 35, 12);
    } catch (e) {
      console.error('Erro ao adicionar logo:', e);
    }

    // --- CABEÇALHO ---
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text('Relatório de Visitantes', 14, 22);

    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(churchName, 14, 30);

    doc.setFontSize(10);
    doc.text(`Data de emissão: ${now}`, 14, 36);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    // --- TABELA 1: POR COORDENADOR ---
    const coordStats = leaders.map(leader => {
      const count = visitors.filter(v => v.assigned_leader_id === leader.id).length;
      return [leader.name, count.toString()];
    }).filter(row => parseInt(row[1]) > 0);

    // Adiciona fila de espera
    const waitingCount = visitors.filter(v => !v.assigned_leader_id).length;
    if (waitingCount > 0) {
      coordStats.push(['Fila de Espera (Não Atribuídos)', waitingCount.toString()]);
    }

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('1. Visitantes por Coordenador', 14, 50);

    autoTable(doc, {
      startY: 55,
      head: [['Coordenador Responsável', 'Total de Visitantes']],
      body: coordStats,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // --- TABELA 2: POR ZONA ---
    const zones = ['Zona Norte', 'Zona Leste', 'Zona Sul', 'Zona Centro-Sul', 'Zona Centro-Oeste', 'Zona Oeste', 'Zona Rural', 'Outros'];
    const zoneStats = zones.map(zone => {
      const count = visitors.filter(v => {
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
      body: zoneStats,
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247], fontStyle: 'bold' }, // purple-500
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
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

  const waitingCount = filteredVisitors.filter(v => !v.assigned_leader_id).length;
  const assignedCount = filteredVisitors.filter(v => v.assigned_leader_id).length;
  const noContactCount = filteredVisitors.filter(v => v.followup_status === 'denied').length;

  return (
    <div className="animate-fade-in flex-container" style={{ padding: '1.5rem 2rem', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              borderRadius: '20px', height: '44px', padding: '0 1.5rem',
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: '#ffffff', color: '#475569', border: '1.5px solid #e2e8f0',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#ffffff'; }}
          >
            <FileDown size={18} /> Relatório PDF
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ width: '130px' }}>
              <Dropdown
                variant="pill"
                value={filterMonth}
                valueLabel={
                  filterMonth === 'all' ? 'Mês' : 
                  ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][parseInt(filterMonth)]
                }
                options={[
                  { value: 'all', label: 'Todos os Meses' },
                  { value: '0', label: 'Janeiro' },
                  { value: '1', label: 'Fevereiro' },
                  { value: '2', label: 'Março' },
                  { value: '3', label: 'Abril' },
                  { value: '4', label: 'Maio' },
                  { value: '5', label: 'Junho' },
                  { value: '6', label: 'Julho' },
                  { value: '7', label: 'Agosto' },
                  { value: '8', label: 'Setembro' },
                  { value: '9', label: 'Outubro' },
                  { value: '10', label: 'Novembro' },
                  { value: '11', label: 'Dezembro' }
                ]}
                onSelect={opt => setFilterMonth(opt.value)}
              />
            </div>
            <div style={{ width: '110px' }}>
              <Dropdown
                variant="pill"
                value={filterYear}
                valueLabel={filterYear === 'all' ? 'Ano' : filterYear}
                options={availableYears}
                onSelect={opt => setFilterYear(opt.value)}
              />
            </div>
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

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '24px', padding: '1.25rem 1.75rem', color: 'white',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(59,130,246,0.3)',
          transition: 'all 0.4s ease'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserPlus size={28} color="white" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Visitantes</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>{filteredVisitors.length}</h2>
          </div>
        </div>

        {/* Waiting list card */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fff7ed', color: '#ea580c', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fila de Espera</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{waitingCount}</h2>
          </div>
        </div>

        {/* Sem Contato card */}
        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#fef2f2', color: '#dc2626', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sem Contato</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{noContactCount}</h2>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.75rem', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
            Novas Inscrições <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: '20px', padding: '2px 12px', fontSize: '0.85rem', fontWeight: 800, marginLeft: '0.5rem' }}>{filteredVisitors.length}</span>
          </h3>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Fila de Espera toggle */}
            <button
              onClick={() => setShowWaitingListOnly(!showWaitingListOnly)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '20px',
                border: showWaitingListOnly ? '2px solid #ef4444' : '2px solid #e2e8f0',
                background: showWaitingListOnly ? '#fee2e2' : 'white',
                color: showWaitingListOnly ? '#dc2626' : '#64748b',
                fontWeight: 700, fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <AlertCircle size={14} />
              Fila de Espera
              {waitingCount > 0 && (
                <span style={{ background: showWaitingListOnly ? '#dc2626' : '#94a3b8', color: 'white', padding: '2px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>
                  {waitingCount}
                </span>
              )}
            </button>

            {/* Zonas */}
            <div style={{ minWidth: '155px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '20px' }}>
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
            <div style={{ minWidth: '185px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '20px' }}>
              <Dropdown
                value={filterCoordinator}
                valueLabel={filterCoordinator === 'all'
                  ? 'Todos Coordenadores'
                  : (() => {
                    const l = leaders.find(l => l.id === filterCoordinator);
                    if (!l) return 'Desconhecido';
                    const count = visitors.filter(v => v.assigned_leader_id === l.id).length;
                    return `${l.name} (${count})`;
                  })()
                }
                options={[
                  { value: 'all', label: 'Todos Coordenadores' },
                  ...leaders.map(l => {
                    const count = visitors.filter(v => v.assigned_leader_id === l.id).length;
                    return { value: l.id, label: `${l.name} (${count})` };
                  })
                ]}
                onSelect={opt => setFilterCoordinator(opt.value)}
              />
            </div>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '240px', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Pesquisar visitante..."
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '2.4rem', padding: '0.55rem 1rem 0.55rem 2.4rem',
                  borderRadius: '20px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.875rem', outline: 'none', transition: 'all 0.2s',
                  fontWeight: 500, color: '#334155',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>
        </div>

        {filteredVisitors.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="custom-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
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
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.25rem 0.75rem', background: '#fff7ed', color: '#ea580c',
                          borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                          border: '1px solid #fed7aa'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#ecfdf5', color: '#059669', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #d1fae5', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <CheckCircle size={12} /> Confirmado
                        </div>
                      )}
                      {v.followup_status === 'denied' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #fee2e2', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <AlertCircle size={12} /> Sem Contato
                        </div>
                      )}
                      {(!v.followup_status || v.followup_status === 'pending') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: '#f1f5f9', color: '#64748b', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #e2e8f0', whiteSpace: 'nowrap', width: 'fit-content' }}>
                          <Clock size={12} /> Pendente
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-3 items-center">
                        <button onClick={() => handlePromoteClick(v)} className="btn-action-text" title="Promover a Membro">
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
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.15 }} />
            <p style={{ fontWeight: 600 }}>{visitorSearch ? 'Nenhum visitante encontrado para esta busca.' : 'Nenhum visitante cadastrado no momento.'}</p>
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
              <button onClick={() => setShowPromoteModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>Ainda não</button>
              <button onClick={confirmPromote} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.25)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Sim, Efetivar!</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Visitors;
