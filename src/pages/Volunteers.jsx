import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, X, Check, Search } from 'lucide-react';

/* ─── Modal de Novo Voluntário ─────────────────────────────── */
const AddVolunteerModal = ({ departments, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [departmentIds, setDepartmentIds] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setContact(v);
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
    await onSave({ name: name.trim(), contact, departmentIds });
    setSaving(false);
    onClose();
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()));

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '16px', width: '100%',
        maxWidth: '540px', border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.18)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>Novo Voluntário</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome Completo</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="João da Silva" autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contato (Telefone/WhatsApp)</label>
            <input type="text" className="form-input" value={contact} onChange={handlePhoneChange} placeholder="(00) 00000-0000" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Departamentos <span style={{ color: 'red' }}>*</span></label>
            {departmentIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {departmentIds.map(id => {
                  const dep = departments.find(d => d.id === id);
                  if (!dep) return null;
                  return (
                    <span key={id} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {dep.name}
                      <button type="button" onClick={() => toggleDept(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-dark)', display: 'flex', padding: 0 }}><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="Buscar departamento..." value={deptSearch} onChange={e => setDeptSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} />
            </div>
            <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum encontrado.</p>
              ) : filtered.map(d => (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input type="checkbox" checked={departmentIds.includes(d.id)} onChange={() => toggleDept(d.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-dark)' }}>{d.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: (saving || !name.trim()) ? 0.7 : 1 }}>
            <Plus size={16} /> {saving ? 'Salvando...' : 'Cadastrar'}
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

  const toggleDept = (id) => {
    setDepartmentIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || departmentIds.length === 0) {
      alert('Preencha o nome e selecione pelo menos um departamento.');
      return;
    }
    setSaving(true);
    await onSave(volunteer.id, { name: name.trim(), contact, departmentIds });
    setSaving(false);
    onClose();
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '16px', width: '100%',
        maxWidth: '540px', border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.18)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            Editar Voluntário
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Nome */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="João da Silva"
            />
          </div>

          {/* Contato */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contato (Telefone/WhatsApp)</label>
            <input
              type="text"
              className="form-input"
              value={contact}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Departamentos */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Departamentos <span style={{ color: 'red' }}>*</span>
            </label>

            {/* Tags selecionadas */}
            {departmentIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {departmentIds.map(id => {
                  const dep = departments.find(d => d.id === id);
                  if (!dep) return null;
                  return (
                    <span key={id} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {dep.name}
                      <button
                        type="button"
                        onClick={() => toggleDept(id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-dark)', display: 'flex', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Busca de departamentos */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar departamento..."
                value={deptSearch}
                onChange={e => setDeptSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>

            {/* Lista de departamentos */}
            <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum encontrado.</p>
              ) : filtered.map(d => (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={departmentIds.includes(d.id)}
                    onChange={() => toggleDept(d.id)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-dark)' }}>{d.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}
          >
            <Check size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
};

/* ─── Página Principal ─────────────────────────────────────── */
const Volunteers = () => {
  const { volunteers, addVolunteer, updateVolunteer, departments, volunteerSearch, setVolunteerSearch } = useApp();
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(volunteerSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mb-6" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-2xl">Voluntários</h2>
          <p className="text-muted">Cadastro e gestão de voluntários</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Novo Voluntário
        </button>
      </div>

      {/* Lista */}
      <div className="card vol-list-card" style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="text-xl">Lista de Voluntários ({filteredVolunteers.length})</h3>
          <input
            type="text"
            className="form-input"
            placeholder="Pesquisar voluntário..."
            value={volunteerSearch}
            onChange={(e) => setVolunteerSearch(e.target.value)}
            style={{ maxWidth: '280px', padding: '0.5rem 1rem' }}
          />
        </div>

        {volunteers.length > 0 ? (
          <div className="vol-table-wrap">
            <table className="table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--bg-color)' }}>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Departamentos</th>
                  <th>Cadastro</th>
                  <th style={{ width: '60px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVolunteers.map((vol) => (
                  <tr key={vol.id}>
                    <td className="font-bold">{vol.name}</td>
                    <td>{vol.contact}</td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {vol.departmentIds.map(id => {
                          const name = departments.find(d => d.id === id)?.name;
                          return name ? <span key={id} className="badge badge-blue">{name}</span> : null;
                        })}
                      </div>
                    </td>
                    <td>{new Date(vol.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button
                        onClick={() => setEditingVolunteer(vol)}
                        style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Nenhum voluntário cadastrado.
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddVolunteerModal
          departments={departments}
          onSave={addVolunteer}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {/* Modal de edição */}
      {editingVolunteer && (
        <EditVolunteerModal
          volunteer={editingVolunteer}
          departments={departments}
          onSave={updateVolunteer}
          onClose={() => setEditingVolunteer(null)}
        />
      )}
    </div>
  );
};

export default Volunteers;
