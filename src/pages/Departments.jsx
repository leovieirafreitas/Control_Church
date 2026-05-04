import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Building2 } from 'lucide-react';

/* ─── Modal de Edição de Departamento ───────────────────────── */
const EditDepartmentModal = ({ department, onClose, onSaved }) => {
  const { churches } = useChurch();
  const [name, setName] = useState(department.name);
  const [churchRows, setChurchRows] = useState([]); // { churchId, rowId | null }
  const [saving, setSaving] = useState(false);

  // Carrega todas as unidades que têm um departamento com este nome
  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('departments')
        .select('id, church_id')
        .eq('name', department.name);

      const rows = churches.map(c => ({
        churchId: c.id,
        rowId: data?.find(d => d.church_id === c.id)?.id ?? null,
      }));
      setChurchRows(rows);
    };
    load();
  }, [department.name, churches]);

  const toggleChurch = (churchId) => {
    setChurchRows(prev => prev.map(r =>
      r.churchId === churchId ? { ...r, toggled: !r.toggled } : r
    ));
  };

  // "Ativo" = tem rowId e não foi desmarcado, OU não tem rowId mas foi marcado
  const isActive = (row) => {
    if (row.toggled === undefined) return row.rowId !== null;
    return row.toggled ? row.rowId === null : row.rowId !== null ? false : false;
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const ops = [];
    churchRows.forEach(row => {
      const wasActive = row.rowId !== null;
      const nowActive = row.toggled === undefined ? wasActive : (row.toggled ? !wasActive : wasActive);

      if (wasActive && !nowActive) {
        // Remover unidade: deletar a row
        ops.push(supabase.from('departments').delete().eq('id', row.rowId));
      } else if (!wasActive && nowActive) {
        // Adicionar unidade: inserir nova row
        ops.push(supabase.from('departments').insert({ name: name.trim(), church_id: row.churchId }));
      } else if (wasActive && nowActive && name.trim() !== department.name) {
        // Renomear
        ops.push(supabase.from('departments').update({ name: name.trim() }).eq('id', row.rowId));
      }
    });

    // Renomear em todas as unidades que têm a row mas não foram toggled
    if (name.trim() !== department.name) {
      churchRows.filter(r => r.rowId && r.toggled === undefined).forEach(r => {
        ops.push(supabase.from('departments').update({ name: name.trim() }).eq('id', r.rowId));
      });
    }

    await Promise.all(ops);
    setSaving(false);
    onSaved();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>Editar Departamento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Nome */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome do Departamento</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Unidades */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Unidades com este departamento</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {churchRows.map(row => {
                const church = churches.find(c => c.id === row.churchId);
                const active = isActive(row);
                const shortName = church?.name.replace('Chama Church - ', '') ?? '';
                return (
                  <label
                    key={row.churchId}
                    onClick={() => toggleChurch(row.churchId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: active ? 'var(--primary-light)' : 'white',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                      background: active ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                    }}>
                      <Building2 size={15} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? 'var(--primary-dark)' : 'var(--text-dark)' }}>
                        {shortName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {active ? 'Ativo nesta unidade' : 'Inativo nesta unidade'}
                      </div>
                    </div>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                      border: `2px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: active ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}>
                      {active && <Check size={13} color="white" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: (saving || !name.trim()) ? 0.7 : 1, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer' }}
          >
            <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


const AddDepartmentModal = ({ onClose, onSaved }) => {
  const { churches, activeChurch } = useChurch();
  const [name, setName] = useState('');
  // Por padrão, marca a unidade ativa
  const [selectedChurchIds, setSelectedChurchIds] = useState([activeChurch?.id].filter(Boolean));
  const [saving, setSaving] = useState(false);

  const toggleChurch = (id) => {
    setSelectedChurchIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || selectedChurchIds.length === 0) {
      alert('Preencha o nome e selecione ao menos uma unidade.');
      return;
    }
    setSaving(true);
    // Insere um registro por unidade selecionada
    await Promise.all(
      selectedChurchIds.map(churchId =>
        supabase.from('departments').insert({ name: name.trim(), church_id: churchId })
      )
    );
    setSaving(false);
    onSaved();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>Novo Departamento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Nome */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome do Departamento</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Louvor"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Seletor de Unidades */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Criar em qual(is) unidade(s)?</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {churches.map(church => {
                  const isSelected = selectedChurchIds.includes(church.id);
                  const shortName = church.name.replace('Chama Church - ', '');
                  return (
                    <label
                      key={church.id}
                      onClick={() => toggleChurch(church.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.65rem 0.85rem', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--primary-light)' : 'white',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Ícone */}
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                        background: isSelected ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}>
                        <Building2 size={15} color="white" />
                      </div>

                      {/* Nome da unidade */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>
                          {shortName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{church.city}</div>
                      </div>

                      {/* Checkbox visual */}
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && <Check size={13} color="white" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || selectedChurchIds.length === 0}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: (saving || !name.trim() || selectedChurchIds.length === 0) ? 0.7 : 1, cursor: (saving || !name.trim() || selectedChurchIds.length === 0) ? 'not-allowed' : 'pointer' }}
            >
              <Plus size={16} /> {saving ? 'Salvando...' : 'Cadastrar'}
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
          <button onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
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
  const { departments, refetch } = useApp();
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmDelete = async () => {
    if (departmentToDelete) {
      const { error } = await supabase.from('departments').delete().eq('id', departmentToDelete);
      if (!error) refetch();
      setDepartmentToDelete(null);
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
                    <td className="font-bold">{dep.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setEditingDepartment(dep)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'} title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => setDepartmentToDelete(dep.id)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'} title="Excluir"><Trash2 size={16} /></button>
                      </div>
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
          onClose={() => setIsAddModalOpen(false)}
          onSaved={refetch}
        />
      )}

      {editingDepartment && (
        <EditDepartmentModal
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSaved={refetch}
        />
      )}

      {departmentToDelete && (
        <DeleteDepartmentModal
          onCancel={() => setDepartmentToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default Departments;
