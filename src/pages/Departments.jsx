import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Check, Building2, Search } from 'lucide-react';

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
          <button onClick={onClose} className="btn-close">
            <X size={20} color="var(--text-muted)" />
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
          <button onClick={onClose} className="btn-close">
            <X size={20} color="var(--text-muted)" />
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
    <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-scale-up" style={{
        maxWidth: '400px', width: '90%', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Trash2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Excluir Departamento</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Tem certeza que deseja excluir este departamento? Vínculos com voluntários serão afetados. Esta ação não pode ser desfeita.
          </p>
        </div>
        <div style={{ padding: '1.25rem 2rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.borderColor='#cbd5e1'} onMouseLeave={e=>e.target.style.borderColor='#e2e8f0'}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: '#ef4444', fontWeight: '700', color: 'white', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.background='#dc2626'} onMouseLeave={e=>e.target.style.background='#ef4444'}>Sim, Excluir</button>
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
    <div className="animate-fade-in flex-container" style={{ padding: '1.5rem 2rem', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Departamentos</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Gerencie os departamentos da igreja</p>
        </div>
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
          <Plus size={18} /> Novo Departamento
        </button>
      </div>



      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: '24px', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap', flexShrink: 0 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: 0 }}>Lista de Departamentos ({filteredDepartments.length})</h3>
          <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Pesquisar departamento..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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

        {filteredDepartments.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="custom-scrollbar">
            <table className="table">
              <thead>
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
                        <button onClick={() => setEditingDepartment(dep)} className="btn-icon" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => setDepartmentToDelete(dep.id)} className="btn-icon danger" title="Excluir"><Trash2 size={16} /></button>
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
