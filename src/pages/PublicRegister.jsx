import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import logoImg from '../assets/logo.png';

const PublicRegister = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    departmentIds: []
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase.from('departments').select('*').order('name');
        if (!error && data) {
          setDepartments(data);
        }
      } catch (err) {
        console.error("Erro ao buscar departamentos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.departmentIds.length === 0) {
      alert("Por favor, preencha o nome e selecione pelo menos um departamento.");
      return;
    }

    setSubmitting(true);
    try {
      // Create volunteer with department array
      const { error: volError } = await supabase
        .from('volunteers')
        .insert([{ 
          name: formData.name, 
          contact: formData.contact,
          department_ids: formData.departmentIds 
        }]);

      if (volError) throw volError;

      setSuccess(true);
      setFormData({ name: '', contact: '', departmentIds: [] });
    } catch (err) {
      console.error("Erro ao registrar:", err);
      alert("Ocorreu um erro ao registrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle2 size={32} />
            </div>
          </div>
          <h2 className="text-2xl" style={{ color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Cadastro Realizado!</h2>
          <p className="text-muted mb-6">
            Obrigado por se inscrever. Seus dados foram enviados com sucesso para a ChamaChurch.
          </p>
          <button onClick={() => setSuccess(false)} className="btn btn-outline" style={{ width: '100%' }}>
            Realizar novo cadastro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg" style={{ padding: '2rem 1rem' }}>
      <div className="login-orb" style={{ top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }}></div>
      <div className="login-orb" style={{ bottom: '-10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)' }}></div>

      <div className="login-card" style={{ maxWidth: '500px', width: '100%', position: 'relative', zIndex: 10 }}>
        <div className="flex items-center justify-center mb-6">
          <img src={logoImg} alt="ChamaChurch Logo" style={{ height: '48px', objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>Cadastra-se</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: '3rem 0' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nome Completo <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: João da Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Telefone / Contato <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: (00) 00000-0000"
                value={formData.contact}
                onChange={handlePhoneChange}
                required
              />
            </div>

            <div className="form-group mb-8" ref={dropdownRef}>
              <label className="form-label">Selecione seus Departamentos <span style={{ color: 'red' }}>*</span></label>
              
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
              ) : (
                'Confirmar'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicRegister;
