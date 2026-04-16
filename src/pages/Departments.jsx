import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

/* ─── Modal de Novo Departamento ────────────────────────────── */
const AddDepartmentModal = ({ onClose, onSubmit, name, setName }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            Novo Departamento
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome do Departamento</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Louvor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: !name.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: !name.trim() ? 0.7 : 1 }}
            >
              <Plus size={16} /> Cadastrar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* ─── Modal de Exclusão ────────────────────────────────────── */
const DeleteDepartmentModal = ({ onCancel, onConfirm }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '2rem', maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-dark)' }}>Confirmar Exclusão</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Tem certeza que deseja excluir este departamento? Vínculos com voluntários serão afetados.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500 }}
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Página Principal ─────────────────────────────────────── */
const Departments = () => {
  const { departments, addDepartment, refetch } = useApp();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredDepartments = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDeleteClick = (id) => {
    setDepartmentToDelete(id);
  };

  const confirmDelete = async () => {
    if (departmentToDelete) {
      const { error } = await supabase.from('departments').delete().eq('id', departmentToDelete);
      if (!error) refetch();
      setDepartmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDepartmentToDelete(null);
  };

  const startEdit = (dep) => {
    setEditingId(dep.id);
    setEditName(dep.name);
  };

  const saveEdit = async (id) => {
    if (editName.trim()) {
      const { error } = await supabase.from('departments').update({ name: editName }).eq('id', id);
      if (!error) {
        refetch();
        setEditingId(null);
      }
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      addDepartment(name);
      setName('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="animate-fade-in flex-container">
      <div className="mb-6" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-2xl">Departamentos</h2>
          <p className="text-muted">Gerencie os departamentos da igreja</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Novo Departamento
        </button>
      </div>

      <div className="card flex-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 }}>
          <h3 className="text-xl">Lista de Departamentos ({filteredDepartments.length})</h3>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Pesquisar departamento..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ maxWidth: '300px', padding: '0.5rem 1rem' }} 
          />
        </div>

        {filteredDepartments.length > 0 ? (
          <div className="table-container scroll-area">
            <table className="table" style={{ position: 'relative' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-color)' }}>
                <tr>
                  <th>Nome</th>
                  <th style={{ width: '100px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dep) => (
                  <tr key={dep.id}>
                    <td className="font-bold">
                      {editingId === dep.id ? (
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.9rem' }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(dep.id)}
                          autoFocus
                        />
                      ) : (
                        dep.name
                      )}
                    </td>
                    <td>
                      {editingId === dep.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => saveEdit(dep.id)} style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Salvar">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Cancelar">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => startEdit(dep)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteClick(dep.id)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='#ef4444'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Nenhum departamento cadastrado.
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddDepartmentModal
          name={name}
          setName={setName}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddSubmit}
        />
      )}

      {departmentToDelete && (
        <DeleteDepartmentModal
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default Departments;
