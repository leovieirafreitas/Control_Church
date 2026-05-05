import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Edit2, X, Check, Search, Trash2, UserPlus, Calendar, Phone, MapPin, ArrowRight, Shield } from 'lucide-react';

/* ─── Modal de Edição de Visitante ────────────────────────── */
const EditVisitorModal = ({ visitor, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: visitor.name,
    phone: visitor.phone ?? '',
    birth_date: visitor.birthDate ?? '',
    neighborhood: visitor.neighborhood ?? '',
    registration_type: visitor.registrationType
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
    await onSave(visitor.id, form);
    setSaving(false);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">Editar Visitante</h3>
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
              <option value="register">Visitante / Inscrição</option>
              <option value="member">Membro</option>
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
const Visitors = () => {
  const { visitors, leaders, updateVisitor, deleteVisitor, promoteVisitorToMember, visitorSearch, setVisitorSearch, loading } = useApp();
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState(null);

  const filteredVisitors = React.useMemo(() => {
    return visitors
      .filter(v => v.name.toLowerCase().includes(visitorSearch.toLowerCase()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Mais recentes primeiro
  }, [visitors, visitorSearch]);

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

  const promoteToMember = async (visitor) => {
    if (confirm(`Deseja promover ${visitor.name} a Membro da igreja?`)) {
      await promoteVisitorToMember(visitor);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Carregando visitantes...</div>;

  return (
    <div className="animate-fade-in flex-container">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            <UserPlus size={28} className="text-purple-600" />
            Visitantes / Inscrições
          </h2>
          <p className="text-muted">Acompanhe novos visitantes e pessoas interessadas</p>
        </div>
      </div>

      <div className="card flex-card">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h3 className="text-xl">Novas Inscrições ({filteredVisitors.length})</h3>
          <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar visitante..."
              value={visitorSearch}
              onChange={(e) => setVisitorSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {filteredVisitors.length > 0 ? (
          <div className="scroll-area">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Bairro</th>
                  <th>Líder Responsável</th>
                  <th>Data Registro</th>
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
                            {leaders.find(l => l.id === v.assigned_leader_id)?.name || 'Líder removido'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Sem líder p/ esta zona</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3 items-center">
                        <button 
                          onClick={() => promoteToMember(v)} 
                          className="flex items-center gap-1 text-primary hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs font-bold" 
                          title="Promover a Membro"
                        >
                          <ArrowRight size={14} /> Membro
                        </button>
                        <button onClick={() => setEditingVisitor(v)} className="text-muted hover:text-primary transition-colors" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteClick(v)} className="text-muted hover:text-danger transition-colors" title="Excluir">
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
            {visitorSearch ? 'Nenhum visitante encontrado para esta busca.' : 'Nenhum visitante cadastrado no momento.'}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingVisitor && (
        <EditVisitorModal
          visitor={editingVisitor}
          onSave={updateVisitor}
          onClose={() => setEditingVisitor(null)}
        />
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-100 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Excluir Visitante</h3>
            <p className="text-muted mb-6">
              Deseja realmente excluir <strong className="text-dark">{visitorToDelete?.name}</strong>?
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

export default Visitors;
