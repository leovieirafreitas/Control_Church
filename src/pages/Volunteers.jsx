import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';

const Volunteers = () => {
  const { volunteers, addVolunteer, departments } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    departmentIds: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    
    if (v.length > 2) {
      v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    }
    if (v.length > 10) {
      v = `${v.substring(0, 10)}-${v.substring(10)}`;
    }
    
    setFormData({ ...formData, contact: v });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.departmentIds.length > 0) {
      addVolunteer(formData);
      setFormData({ name: '', contact: '', departmentIds: [] });
    } else {
      alert("Por favor, preencha o nome e selecione pelo menos um departamento.");
    }
  };

  const handleDeptToggle = (id) => {
    setFormData(prev => {
      const isOpen = prev.departmentIds.includes(id);
      if (isOpen) {
        return { ...prev, departmentIds: prev.departmentIds.filter(depId => depId !== id) };
      } else {
        return { ...prev, departmentIds: [...prev.departmentIds, id] };
      }
    });
  };

  const getDeptNames = (ids) => {
    return ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl">Voluntários</h2>
        <p className="text-muted">Cadastro e gestão de voluntários</p>
      </div>

      <div className="grid grid-cols-1 mb-8">
        <div className="card">
          <h3 className="text-xl mb-4">Novo Voluntário</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2">
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="João da Silva"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contato (Telefone/WhatsApp)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="(00) 00000-0000"
                value={formData.contact}
                onChange={handlePhoneChange}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }} ref={dropdownRef}>
              <label className="form-label">Departamentos (pode selecionar mais de um) <span style={{ color: 'red' }}>*</span></label>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Pesquisar departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  onClick={() => setIsDropdownOpen(true)}
                />

                {isDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto' }}>
                    {departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <p className="text-sm text-muted" style={{ padding: '0.5rem' }}>Nenhum encontrado.</p>
                    ) : (
                      departments
                        .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(d => (
                          <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(59, 130, 246, 0.05)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                            <input
                              type="checkbox"
                              checked={formData.departmentIds.includes(d.id)}
                              onChange={() => handleDeptToggle(d.id)}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                            />
                            <span className="text-sm" style={{ fontWeight: 500 }}>{d.name}</span>
                          </label>
                        ))
                    )}
                  </div>
                )}
              </div>

              {/* Tags visuais dos selecionados */}
              {formData.departmentIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {formData.departmentIds.map(depId => {
                    const dep = departments.find(d => d.id === depId);
                    if (!dep) return null;
                    return (
                      <span key={depId} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {dep.name}
                        <button type="button" onClick={() => handleDeptToggle(depId)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-dark)', cursor: 'pointer', marginLeft: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary mt-4">
                <Plus size={16} /> Cadastrar Voluntário
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl mb-4">Lista de Voluntários</h3>
        {volunteers.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Departamentos</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((vol) => (
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
    </div>
  );
};

export default Volunteers;
