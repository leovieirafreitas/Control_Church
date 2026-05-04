import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, Building2, ChevronDown, Check } from 'lucide-react';
import logoImg from '../assets/logo.png';

const PublicRegister = () => {
  const [churches, setChurches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isChurchOpen, setIsChurchOpen] = useState(false);
  const deptRef = useRef(null);
  const churchRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    churchId: '',
    departmentIds: [],
  });

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (deptRef.current && !deptRef.current.contains(e.target)) setIsDeptOpen(false);
      if (churchRef.current && !churchRef.current.contains(e.target)) setIsChurchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Carrega igrejas e departamentos
  useEffect(() => {
    const load = async () => {
      const [churchRes, deptRes] = await Promise.all([
        supabase.from('churches').select('*').eq('is_active', true).order('name'),
        supabase.from('departments').select('*').order('name'),
      ]);
      if (churchRes.data) setChurches(churchRes.data);
      if (deptRes.data) setDepartments(deptRes.data);
      setLoading(false);
    };
    load();
  }, []);

  // Quando a igreja muda, limpa departamentos (cada igreja tem os seus)
  const handleChurchSelect = (church) => {
    setFormData(prev => ({ ...prev, churchId: church.id, departmentIds: [] }));
    setIsChurchOpen(false);
  };

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
    setFormData(prev => ({ ...prev, contact: v }));
  };

  const handleDeptToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter(d => d !== id)
        : [...prev.departmentIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.churchId || formData.departmentIds.length === 0) {
      alert('Preencha o nome, selecione sua unidade e pelo menos um departamento.');
      return;
    }

    setSubmitting(true);
    try {
      const nameParts = formData.name.trim().split(' ').filter(Boolean);
      const initials = (
        (nameParts[0]?.[0] ?? '') +
        (nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '')
      ).toUpperCase();

      const { error } = await supabase.from('volunteers').insert([{
        name: formData.name.trim(),
        contact: formData.contact,
        department_ids: formData.departmentIds,
        initials,
        church_id: formData.churchId,
      }]);

      if (error) throw error;
      setSuccess(true);
      setFormData({ name: '', contact: '', churchId: '', departmentIds: [] });
    } catch (err) {
      console.error('Erro ao registrar:', err);
      alert('Ocorreu um erro ao registrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedChurch = churches.find(c => c.id === formData.churchId);
  // Filtra departamentos da igreja selecionada
  const availableDepts = formData.churchId
    ? departments.filter(d => d.church_id === formData.churchId)
    : [];

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
            Obrigado por se inscrever em <strong>{selectedChurch?.name ?? 'Chama Church'}</strong>. Seus dados foram enviados com sucesso!
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
      <div className="login-orb" style={{ top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }} />
      <div className="login-orb" style={{ bottom: '-10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)' }} />

      <div className="login-card" style={{ maxWidth: '500px', width: '100%', position: 'relative', zIndex: 10 }}>
        <div className="flex items-center justify-center mb-6">
          <img src={logoImg} alt="ChamaChurch Logo" style={{ height: '48px', objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>Cadastra-se</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Rede Chama · Faça parte da família!</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: '3rem 0' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* ── Seletor de Unidade ──────────────────────── */}
            <div className="form-group" ref={churchRef} style={{ position: 'relative' }}>
              <label className="form-label">
                Selecione sua Unidade <span style={{ color: 'red' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsChurchOpen(prev => !prev)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '8px',
                  border: `1px solid ${isChurchOpen ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: 'white', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isChurchOpen ? '0 0 0 3px var(--primary-light)' : 'none',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: selectedChurch ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={16} color="white" />
                </div>
                <span style={{ flex: 1, textAlign: 'left', fontSize: '0.9rem', color: selectedChurch ? 'var(--text-dark)' : 'var(--text-muted)', fontWeight: selectedChurch ? 600 : 400 }}>
                  {selectedChurch ? selectedChurch.name : 'Escolha sua unidade...'}
                </span>
                <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isChurchOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>

              {isChurchOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden',
                  animation: 'fadeInDown 0.15s ease',
                }}>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-color)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    Selecionar unidade
                  </div>
                  {churches.map(church => {
                    const isSelected = church.id === formData.churchId;
                    const shortName = church.name.replace('Chama Church - ', '');
                    return (
                      <button
                        key={church.id}
                        type="button"
                        onClick={() => handleChurchSelect(church)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: isSelected ? 'var(--primary-light)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-color)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? 'var(--primary)' : 'var(--border-color)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>
                            {shortName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {church.city} · {church.network_name}
                          </div>
                        </div>
                        {isSelected && <Check size={15} color="var(--primary)" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Nome ──────────────────────────────────── */}
            <div className="form-group">
              <label className="form-label">Nome Completo <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: João da Silva"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* ── Telefone ──────────────────────────────── */}
            <div className="form-group">
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

            {/* ── Departamentos ─────────────────────────── */}
            <div className="form-group mb-8" ref={deptRef}>
              <label className="form-label">Selecione seus Departamentos <span style={{ color: 'red' }}>*</span></label>

              {!formData.churchId ? (
                <div style={{ padding: '0.75rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  Selecione sua unidade primeiro
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pesquisar departamento..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onFocus={() => setIsDeptOpen(true)}
                    onClick={() => setIsDeptOpen(true)}
                  />
                  {isDeptOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto' }}>
                      {availableDepts.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                        <p className="text-sm text-muted" style={{ padding: '0.5rem' }}>Nenhum encontrado.</p>
                      ) : (
                        availableDepts
                          .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(d => (
                            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', transition: 'background 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <input type="checkbox" checked={formData.departmentIds.includes(d.id)} onChange={() => handleDeptToggle(d.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                              <span className="text-sm" style={{ fontWeight: 500 }}>{d.name}</span>
                            </label>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.departmentIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {formData.departmentIds.map(depId => {
                    const dep = departments.find(d => d.id === depId);
                    if (!dep) return null;
                    return (
                      <span key={depId} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {dep.name}
                        <button type="button" onClick={() => handleDeptToggle(depId)} style={{ border: 'none', background: 'transparent', color: 'var(--primary-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', lineHeight: 1 }}>&times;</span>
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
              ) : 'Confirmar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicRegister;
