import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, X, Check, Search, Trash2, UserCheck, Calendar, Phone, MapPin, Save, Tag } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import Dropdown from '../components/Dropdown';

/* ─── Modal de Edição de Membro ────────────────────────────── */
const EditMemberModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: member.name,
    phone: member.phone ?? '',
    birth_date: member.birth_date ?? '',
    neighborhood: member.neighborhood ?? '',
    registration_type: member.registration_type || 'member'
  });

  const registrationOptions = [
    { value: 'member', label: 'Membro' },
    { value: 'visitor', label: 'Visitante' },
    { value: 'register', label: 'Inscrição' }
  ];
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
    await onSave(member.id, form);
    setSaving(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">Editar Membro</h3>
          <button onClick={onClose} className="btn-close">
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input 
              type="text" 
              className="form-input" 
              value={form.name} 
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone / WhatsApp</label>
            <input 
              type="text" 
              className="form-input" 
              value={form.phone} 
              onChange={handlePhoneChange} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Bairro</label>
            <input 
              type="text" 
              className="form-input" 
              value={form.neighborhood} 
              onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <DatePicker
              value={form.birth_date}
              onChange={val => setForm(p => ({ ...p, birth_date: val }))}
              placeholder="dd/mm/aaaa"
            />
          </div>
          <Dropdown
            label="Tipo de Registro"
            value={form.registration_type}
            valueLabel={registrationOptions.find(o => o.value === form.registration_type)?.label}
            options={registrationOptions}
            onSelect={opt => setForm(p => ({ ...p, registration_type: opt.value }))}
            placeholder="Selecione o tipo..."
            icon={Tag}
          />
        </form>

        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Página Principal ─────────────────────────────────────── */
const Members = () => {
  const { members, updateMember, deleteMember, memberSearch, setMemberSearch, loading } = useApp();
  const [editingMember, setEditingMember] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const filteredMembers = React.useMemo(() => {
    return members
      .filter(m => m.registrationType === 'member')
      .filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, memberSearch]);

  const handleDeleteClick = (m) => {
    setMemberToDelete(m);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (memberToDelete) {
      await deleteMember(memberToDelete.id);
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Carregando membros...</div>;

  return (
    <div className="animate-fade-in flex-container" style={{ padding: '1.5rem 2rem', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Membros</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Gestão de membros da igreja</p>
        </div>
      </div>



      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '24px', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Lista de Membros ({filteredMembers.length})</h3>
          <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Pesquisar membro..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
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

        {filteredMembers.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="custom-scrollbar">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Bairro</th>
                  <th>Nascimento</th>
                  <th style={{ width: '100px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="font-bold">{m.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-muted" />
                        {m.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted" />
                        {m.neighborhood || '—'}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted" />
                        {m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button onClick={() => setEditingMember(m)} className="btn-icon" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(m)} className="btn-icon danger" title="Excluir">
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
            {memberSearch ? 'Nenhum membro encontrado para esta busca.' : 'Nenhum membro cadastrado.'}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onSave={updateMember}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* Modal de Exclusão */}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Excluir Membro</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Deseja realmente excluir <strong style={{color: 'var(--text-dark)'}}>{memberToDelete?.name}</strong>? Esta ação não pode ser desfeita.
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

export default Members;
