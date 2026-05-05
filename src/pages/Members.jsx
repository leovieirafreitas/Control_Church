import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, X, Check, Search, Trash2, UserCheck, Calendar, Phone, MapPin } from 'lucide-react';

/* ─── Modal de Edição de Membro ────────────────────────────── */
const EditMemberModal = ({ member, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: member.name,
    phone: member.phone ?? '',
    birth_date: member.birthDate ?? '',
    neighborhood: member.neighborhood ?? '',
    registration_type: member.registrationType
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
    await onSave(member.id, form);
    setSaving(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">Editar Membro</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
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
            <input 
              type="date" 
              className="form-input" 
              value={form.birth_date} 
              onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Registro</label>
            <select 
              className="form-input"
              value={form.registration_type}
              onChange={e => setForm(p => ({ ...p, registration_type: e.target.value }))}
            >
              <option value="member">Membro</option>
              <option value="register">Visitante / Inscrição</option>
            </select>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
          <button onClick={onClose} className="btn btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
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
    <div className="animate-fade-in flex-container">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <UserCheck size={28} className="text-primary" />
            Membros
          </h2>
          <p className="text-muted">Gestão de membros da igreja</p>
        </div>
      </div>

      <div className="card flex-card">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h3 className="text-xl">Lista de Membros ({filteredMembers.length})</h3>
          <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar membro..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {filteredMembers.length > 0 ? (
          <div className="scroll-area">
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
                        <button onClick={() => setEditingMember(m)} className="text-muted hover:text-primary transition-colors" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteClick(m)} className="text-muted hover:text-danger transition-colors" title="Excluir">
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
        <div className="modal-overlay">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-100 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Excluir Membro</h3>
            <p className="text-muted mb-6">
              Deseja realmente excluir <strong className="text-dark">{memberToDelete?.name}</strong>?
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

export default Members;
