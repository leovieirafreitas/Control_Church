import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

const Departments = () => {
  const { departments, addDepartment, refetch } = useApp();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      addDepartment(name);
      setName('');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl">Departamentos</h2>
        <p className="text-muted">Gerencie os departamentos da igreja</p>
      </div>

      <div className="grid grid-cols-3">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card h-fit" style={{ margin: 0 }}>
            <h3 className="text-xl mb-4">Novo Departamento</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Departamento</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Louvor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} /> Cadastrar
              </button>
            </form>
          </div>

        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
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
            <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
      </div>

      {/* Modal de Exclusão */}
      {departmentToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'transparent', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', border: '1px solid var(--border-color)', boxShadow: 'none' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-dark)' }}>Confirmar Exclusão</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Tem certeza que deseja excluir este departamento? Vínculos com voluntários serão afetados.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={cancelDelete}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500 }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
