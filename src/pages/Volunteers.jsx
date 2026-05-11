import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../context/AppContext';
import logoImg from '../assets/cc-logo-small.png';
import { 
  Plus, Edit2, X, Check, Search, Trash2, Users, Briefcase, 
  FileDown, UserPlus, Phone, Calendar, Mail, Fingerprint,
  MoreVertical, CheckCircle, AlertCircle
} from 'lucide-react';
import DatePicker from '../components/DatePicker';

/* ─── Modal de Novo Voluntário ─────────────────────────────── */
const AddVolunteerModal = ({ onSave, onClose }) => {
  const { departments, templates, churchSettings } = useApp();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [departmentIds, setDepartmentIds] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setContact(v);
  };

  const handleCpfChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 9) v = `${v.substring(0,3)}.${v.substring(3,6)}.${v.substring(6,9)}-${v.substring(9)}`;
    else if (v.length > 6) v = `${v.substring(0,3)}.${v.substring(3,6)}.${v.substring(6)}`;
    else if (v.length > 3) v = `${v.substring(0,3)}.${v.substring(3)}`;
    setCpf(v);
  };

  const toggleDept = (id) => {
    setDepartmentIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || departmentIds.length === 0) {
      alert('Preencha o nome e selecione pelo menos um departamento.');
      return;
    }
    setSaving(true);

    // Salva o voluntário
    await onSave({ name: name.trim(), contact, departmentIds, birthDate, cpf, email });

    // Envia Boas-Vindas se solicitado
    if (sendWelcome && contact) {
      const welcomeTemplate = templates.find(t => t.id === 'welcome');
      if (welcomeTemplate) {
        const number = contact.replace(/\D/g, '');
        const formattedNumber = number.startsWith('55') ? number : `55${number}`;
        const volDepts = departmentIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');

        const message = welcomeTemplate.text
          .replace(/{{nome}}/g, name.trim())
          .replace(/{{departamentos}}/g, volDepts);

        try {
          const instance = churchSettings?.evolution_instance || 'Control_Church';
          const apiKey = churchSettings?.evolution_apikey || import.meta.env.VITE_EVOLUTION_API_KEY;

          await fetch(`${import.meta.env.VITE_EVOLUTION_API_URL}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey
            },
            body: JSON.stringify({
              number: formattedNumber,
              text: message
            })
          });
        } catch (error) {
          console.error('Erro ao enviar boas-vindas:', error);
        }
      }
    }

    setSaving(false);
    onClose();
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999 }}>
      <div className="animate-scale-up" style={{ 
        maxWidth: '500px', width: '95%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-dark)' }}>Novo Voluntário</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSave} className="custom-scrollbar" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nome Completo</label>
            <input 
              type="text" 
              autoFocus
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>WhatsApp</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', fontWeight: '500' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  value={contact} 
                  onChange={handlePhoneChange} 
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nascimento</label>
              <DatePicker value={birthDate} onChange={setBirthDate} placeholder="00/00/0000" />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Dados Auxiliares</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Fingerprint size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="CPF (Opcional)"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                  value={cpf} onChange={handleCpfChange}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  placeholder="E-mail (Opcional)"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Departamentos <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar departamento..." 
                value={deptSearch} 
                onChange={e => setDeptSearch(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', padding: '0.25rem' }}>
              {filtered.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDept(d.id)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s', border: '1.5px solid',
                    background: departmentIds.includes(d.id) ? '#eff6ff' : 'white',
                    borderColor: departmentIds.includes(d.id) ? '#3b82f6' : '#e2e8f0',
                    color: departmentIds.includes(d.id) ? '#2563eb' : '#64748b'
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div 
            onClick={() => setSendWelcome(!sendWelcome)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', 
              background: sendWelcome ? '#f0fdf4' : '#f8fafc', borderRadius: '12px', border: '1px solid',
              borderColor: sendWelcome ? '#bbf7d0' : '#e2e8f0', transition: '0.2s'
            }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: sendWelcome ? '#22c55e' : 'white', border: '2px solid', borderColor: sendWelcome ? '#22c55e' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
              {sendWelcome && <Check size={12} color="white" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: sendWelcome ? '#166534' : '#64748b' }}>Enviar boas-vindas via WhatsApp</span>
          </div>
        </form>

        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || departmentIds.length === 0} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (saving || !name.trim() || departmentIds.length === 0) ? 0.6 : 1 }}>
            {saving ? 'Processando...' : <><UserPlus size={18} /> Cadastrar</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Modal de Edição ──────────────────────────────────────── */
const EditVolunteerModal = ({ volunteer, departments, onSave, onClose }) => {
  const [name, setName] = useState(volunteer.name);
  const [contact, setContact] = useState(volunteer.contact ?? '');
  const [birthDate, setBirthDate] = useState(volunteer.birthDate ?? '');
  const [cpf, setCpf] = useState(volunteer.cpf ?? '');
  const [email, setEmail] = useState(volunteer.email ?? '');
  const [departmentIds, setDepartmentIds] = useState(volunteer.departmentIds ?? []);
  const [deptSearch, setDeptSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setContact(v);
  };

  const handleCpfChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 9) v = `${v.substring(0,3)}.${v.substring(3,6)}.${v.substring(6,9)}-${v.substring(9)}`;
    else if (v.length > 6) v = `${v.substring(0,3)}.${v.substring(3,6)}.${v.substring(6)}`;
    else if (v.length > 3) v = `${v.substring(0,3)}.${v.substring(3)}`;
    setCpf(v);
  };

  const toggleDept = (id) => {
    setDepartmentIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!name.trim() || departmentIds.length === 0) {
      alert('Preencha o nome e selecione pelo menos um departamento.');
      return;
    }
    setSaving(true);
    await onSave(volunteer.id, { name: name.trim(), contact, departmentIds, birthDate, cpf, email });
    setSaving(false);
    onClose();
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return ReactDOM.createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999 }}>
      <div className="animate-scale-up" style={{ 
        maxWidth: '500px', width: '95%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-dark)' }}>Editar Voluntário</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div className="custom-scrollbar" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nome Completo</label>
            <input 
              type="text" 
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500' }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>WhatsApp</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', fontWeight: '500' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  value={contact} 
                  onChange={handlePhoneChange} 
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Nascimento</label>
              <DatePicker value={birthDate} onChange={setBirthDate} placeholder="00/00/0000" />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Fingerprint size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="CPF"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                  value={cpf} onChange={handleCpfChange}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  placeholder="E-mail"
                  style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Departamentos <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar departamento..." 
                value={deptSearch} 
                onChange={e => setDeptSearch(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.75rem 0.7rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', padding: '0.25rem' }}>
              {filtered.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDept(d.id)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s', border: '1.5px solid',
                    background: departmentIds.includes(d.id) ? '#eff6ff' : 'white',
                    borderColor: departmentIds.includes(d.id) ? '#3b82f6' : '#e2e8f0',
                    color: departmentIds.includes(d.id) ? '#2563eb' : '#64748b'
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', background: '#f8fafc' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {saving ? 'Processando...' : <><Check size={18} /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Página Principal ─────────────────────────────────────── */
const Volunteers = () => {
  const { 
    volunteers, addVolunteer, updateVolunteer, deleteVolunteer, 
    departments, volunteerSearch, setVolunteerSearch, activeChurch 
  } = useApp();
  
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] = useState(null);

  const filteredVolunteers = React.useMemo(() => {
    return [...volunteers]
      .filter(v => v.name.toLowerCase().includes(volunteerSearch.toLowerCase()))
      .sort((a, b) => a.name.trim().localeCompare(b.name.trim(), 'pt-BR', { sensitivity: 'base' }));
  }, [volunteers, volunteerSearch]);

  const handleDeleteClick = (vol) => {
    setVolunteerToDelete(vol);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (volunteerToDelete) {
      await deleteVolunteer(volunteerToDelete.id);
      setShowDeleteModal(false);
      setVolunteerToDelete(null);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');
    const churchName = activeChurch?.name || 'Chama Church';
    
    // Logo
    try { doc.addImage(logoImg, 'PNG', 160, 10, 35, 12); } catch (e) {}

    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // blue-500
    doc.text('Relatório de Voluntários', 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(churchName, 14, 30);
    
    doc.setFontSize(10);
    doc.text(`Data: ${now}`, 14, 36);
    doc.line(14, 40, 196, 40);

    // Tabela
    const body = filteredVolunteers.map(v => [
      v.name,
      v.contact || '---',
      v.departmentIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', '),
      new Date(v.createdAt).toLocaleDateString('pt-BR')
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Nome', 'Contato', 'Departamentos', 'Cadastro']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    doc.save(`Voluntarios_${churchName.replace(/\s+/g, '_')}_${now.replace(/\//g, '-')}.pdf`);
  };

  const activeDeptsCount = Array.from(new Set(volunteers.flatMap(v => v.departmentIds))).length;

  return (
    <div className="animate-fade-in dashboard-main-wrapper" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      {/* ── Header ── */}
      <div style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Gestão de Voluntários</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Administre a equipe e departamentos da igreja</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>


          <button
            onClick={() => setIsAddModalOpen(true)}
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
            <Plus size={18} /> Novo Voluntário
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '24px', padding: '1.25rem 1.75rem', color: 'white',
          display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(59,130,246,0.3)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Voluntários</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800 }}>{volunteers.length}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem 1.75rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: '#f0fdf4', color: '#16a34a', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Depts Ativos</p>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#1e293b' }}>{activeDeptsCount}</h2>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '24px', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>
            Listagem de Voluntários <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{filteredVolunteers.length}</span>
          </h3>
          <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Pesquisar por nome..."
              value={volunteerSearch}
              onChange={(e) => setVolunteerSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem',
                borderRadius: '20px', border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem', outline: 'none', fontWeight: 500
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {volunteers.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="custom-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Departamentos</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cadastro</th>
                  <th style={{ background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVolunteers.map((vol) => (
                  <tr key={vol.id} style={{ transition: '0.2s' }}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{vol.name}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} opacity={0.6} /> {vol.contact || '---'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {vol.departmentIds.map(id => {
                          const name = departments.find(d => d.id === id)?.name;
                          return name ? (
                            <span key={id} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                              {name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(vol.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button onClick={() => setEditingVolunteer(vol)} className="btn-icon" title="Editar" style={{ background: '#eff6ff', color: '#3b82f6', border: 'none' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(vol)} className="btn-icon danger" title="Excluir" style={{ background: '#fef2f2', color: '#ef4444', border: 'none' }}>
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
          <div style={{ padding: '4rem', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
            <Users size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#94a3b8', fontWeight: 600 }}>Nenhum voluntário cadastrado no momento.</p>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddVolunteerModal
          onSave={addVolunteer}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {editingVolunteer && (
        <EditVolunteerModal
          volunteer={editingVolunteer}
          departments={departments}
          onSave={updateVolunteer}
          onClose={() => setEditingVolunteer(null)}
        />
      )}

      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99999 }}>
          <div className="card animate-scale-up" style={{ maxWidth: '400px', width: '95%', textAlign: 'center', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Voluntário</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Deseja mesmo remover <b>{volunteerToDelete?.name}</b>? Esta ação é permanente.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
              <button onClick={confirmDelete} style={{ padding: '0.85rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700 }}>Confirmar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Volunteers;

