import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, UserPlus, Send, Calendar, Phone, MapPin, CheckCircle, ArrowLeft, Users, Shield, CheckCircle2, Loader2, ChevronDown, Check, UserCheck, User } from 'lucide-react';
import { getZoneByNeighborhood, MANAUS_NEIGHBORHOODS_TO_ZONES } from '../utils/manausMapping';
import logoImg from '../assets/logo.png';

/* ─── Constantes ─────────────────────────────────────────────── */
const MODES = {
  MEMBER:   'member',
  REGISTER: 'register',
};

/* ─── Helpers ─────────────────────────────────────────────────── */
const formatPhone = (raw) => {
  let v = raw.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 6)  return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  if (v.length > 2)  return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return v;
};

/* ─── Dropdown genérico ───────────────────────────────────────── */
const Dropdown = ({ label, value, valueLabel, options, onSelect, placeholder, icon: Icon, renderOption }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      {label && <label className="form-label">{label} <span style={{ color: '#ef4444' }}>*</span></label>}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem', borderRadius: '10px',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border-color)'}`,
          background: 'white', cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: open ? '0 0 0 3px var(--primary-light)' : 'none',
        }}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
          background: value
            ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
            : 'var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color="white" />
        </div>
        <span style={{
          flex: 1, textAlign: 'left', fontSize: '0.9rem',
          color: value ? 'var(--text-dark)' : 'var(--text-muted)',
          fontWeight: value ? 600 : 400,
        }}>
          {valueLabel || placeholder}
        </span>
        <ChevronDown size={16} color="var(--text-muted)" style={{
          flexShrink: 0, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease',
          maxHeight: '240px', overflowY: 'auto',
        }}>
          <div style={{
            padding: '0.4rem 0.75rem', background: 'var(--bg-color)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-color)',
          }}>
            {placeholder}
          </div>
          {options.map((opt, i) => {
            const label = renderOption ? renderOption(opt) : opt;
            const isSelected = renderOption ? opt.id === value : opt === value;
            return (
              <button
                key={renderOption ? opt.id : i}
                type="button"
                onClick={() => { onSelect(opt); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.7rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'var(--primary-light)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-color)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: isSelected ? 'var(--primary)' : 'var(--border-color)',
                }} />
                <div style={{ flex: 1 }}>
                  {typeof label === 'string'
                    ? <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>{label}</span>
                    : label
                  }
                </div>
                {isSelected && <Check size={15} color="var(--primary)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Componente principal ────────────────────────────────────── */
const PublicRegister = () => {
  const [mode, setMode] = useState(null); // null | 'member' | 'register'
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    birthDate: '',
    churchId: '',
    neighborhood: '',
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nbRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (nbRef.current && !nbRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Carrega igrejas
  useEffect(() => {
    supabase
      .from('churches')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setChurches(data);
        setLoading(false);
      });
  }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.churchId) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {

      // Lógica de Inteligência de Bairro e Líder
      let assignedLeaderId = null;

      if (form.neighborhood) {
        // Busca todos os líderes desta igreja
        const { data: allLeaders } = await supabase
          .from('leaders')
          .select('id, neighborhoods')
          .eq('church_id', form.churchId);
        
        if (allLeaders) {
          // Encontra o líder que cuida deste bairro específico
          const match = allLeaders.find(l => 
            l.neighborhoods && l.neighborhoods.split(', ').includes(form.neighborhood)
          );
          if (match) assignedLeaderId = match.id;
        }
      }

      const payload = {
        name: form.name.trim(),
        phone: form.phone || null,
        church_id: form.churchId,
        birth_date: form.birthDate || null,
        neighborhood: form.neighborhood || null,
        registration_type: mode,
        assigned_leader_id: assignedLeaderId
      };

      const { error } = await supabase.from('visitors').insert([payload]);
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao registrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedChurch = churches.find(c => c.id === form.churchId);

  /* ── Tela de sucesso ─────────────────────────────────── */
  if (success) {
    return (
      <div className="login-bg" style={{ padding: '2rem 1rem' }}>
        <Orbs />
        <div className="login-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', boxShadow: '0 8px 24px rgba(22,163,74,0.2)',
          }}>
            <CheckCircle2 size={36} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
            {mode === MODES.MEMBER ? 'Membros registrado!' : 'Inscrição realizada!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {mode === MODES.MEMBER
              ? `Olá, ${form.name.split(' ')[0]}! Seu cadastro de membro foi enviado com sucesso.`
              : `Olá, ${form.name.split(' ')[0]}! Sua inscrição foi enviada. Em breve entraremos em contato.`}
          </p>
          <button
            onClick={() => { setSuccess(false); setMode(null); setForm({ name: '', phone: '', birthDate: '', churchId: '', neighborhood: '' }); }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem' }}
          >
            Novo cadastro
          </button>
        </div>
      </div>
    );
  }

  /* ── Tela de seleção de modo ─────────────────────────── */
  if (!mode) {
    return (
      <div className="login-bg" style={{ padding: '2rem 1rem' }}>
        <Orbs />
        <div className="login-card" style={{ maxWidth: '480px', width: '100%' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
            <img src={logoImg} alt="Logo" style={{ height: '52px', objectFit: 'contain' }} />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
              Bem-vindo(a)!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Selecione uma opção abaixo para continuar
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Já sou membro */}
            <ModeCard
              icon={<UserCheck size={32} color="var(--primary)" />}
              title="Já sou Membro"
              description="Confirme sua membresia na rede"
              accent="var(--primary)"
              accentLight="var(--primary-light)"
              onClick={() => setMode(MODES.MEMBER)}
            />

            {/* Quero me inscrever */}
            <ModeCard
              icon={<UserPlus size={32} color="#7c3aed" />}
              title="Fazer Inscrição"
              description="Quero fazer parte da família"
              accent="#7c3aed"
              accentLight="#ede9fe"
              onClick={() => setMode(MODES.REGISTER)}
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            Rede Chama · Sistema de Cadastro
          </p>
        </div>
      </div>
    );
  }

  /* ── Formulário ──────────────────────────────────────── */
  const isMember = mode === MODES.MEMBER;
  const accentColor = isMember ? 'var(--primary)' : '#7c3aed';
  const accentLight = isMember ? 'var(--primary-light)' : '#ede9fe';

  return (
    <div className="login-bg" style={{ padding: '2rem 1rem' }}>
      <Orbs mode={mode} />
      <div className="login-card" style={{ maxWidth: '520px', width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <img src={logoImg} alt="Logo" style={{ height: '44px', objectFit: 'contain' }} />
        </div>

        {/* Tabs do topo */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-color)', borderRadius: '12px',
          padding: '4px', marginBottom: '1.75rem', gap: '4px',
        }}>
          <TabBtn
            active={isMember}
            icon={<UserCheck size={15} />}
            label="Já sou Membro"
            activeColor="var(--primary)"
            onClick={() => setMode(MODES.MEMBER)}
          />
          <TabBtn
            active={!isMember}
            icon={<UserPlus size={15} />}
            label="Fazer Inscrição"
            activeColor="#7c3aed"
            onClick={() => setMode(MODES.REGISTER)}
          />
        </div>

        {/* Cabeçalho do formulário */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '1.5rem', paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: accentLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isMember
              ? <UserCheck size={22} color={accentColor} />
              : <UserPlus size={22} color={accentColor} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              {isMember ? 'Cadastro de Membro' : 'Formulário de Inscrição'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isMember
                ? 'Confirme seus dados de membresia na rede'
                : 'Preencha para iniciar sua jornada conosco'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>



            {/* ── Unidade / Igreja ──────────────────── */}
            <Dropdown
              label="Unidade (Local da Igreja)"
              value={form.churchId}
              valueLabel={selectedChurch?.name.replace('Chama Church - ', '')}
              options={churches}
              onSelect={(c) => set('churchId', c.id)}
              placeholder="Escolha sua unidade..."
              icon={Building2}
              renderOption={(c) => (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    {c.name.replace('Chama Church - ', '')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {c.city} · {c.network_name}
                  </div>
                </div>
              )}
            />

            {/* ── Bairro / Região da cidade ──────────── */}
            <div className="form-group" style={{ position: 'relative' }} ref={nbRef}>
              <label className="form-label">
                Bairro / Região onde mora <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} color="var(--text-muted)" style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  id="neighborhood"
                  type="text"
                  className="form-input"
                  autoComplete="off"
                  placeholder="Digite seu bairro em Manaus..."
                  value={form.neighborhood}
                  onChange={e => {
                    const val = e.target.value;
                    set('neighborhood', val);
                    if (val.length >= 2) {
                      const matches = Object.keys(MANAUS_NEIGHBORHOODS_TO_ZONES)
                        .filter(n => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
                        .slice(0, 5);
                      setSuggestions(matches);
                      setShowSuggestions(true);
                    } else {
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (form.neighborhood.length >= 2) setShowSuggestions(true);
                  }}
                  style={{ paddingLeft: '2.4rem' }}
                  required
                />
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'white', border: '1px solid var(--border-color)', borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden',
                  marginTop: '4px', animation: 'fadeInDown 0.15s ease'
                }}>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        set('neighborhood', s);
                        setShowSuggestions(false);
                      }}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', border: 'none', background: 'none',
                        textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)',
                        cursor: 'pointer', borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Nome Completo ──────────────────────── */}
            <div className="form-group">
              <label className="form-label">
                Nome Completo <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  id="fullname"
                  type="text"
                  className="form-input"
                  placeholder="Ex: João da Silva"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  style={{ paddingLeft: '2.4rem' }}
                  required
                />
              </div>
            </div>

            {/* ── Telefone ──────────────────────────── */}
            <div className="form-group">
              <label className="form-label">
                Telefone / WhatsApp
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  id="phone"
                  type="text"
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={e => set('phone', formatPhone(e.target.value))}
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>
            </div>

            {/* ── Data de Nascimento ─────────────────── */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                Data de Nascimento
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color="var(--text-muted)" style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  id="birthdate"
                  type="date"
                  className="form-input"
                  value={form.birthDate}
                  onChange={e => set('birthDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ paddingLeft: '2.4rem', color: form.birthDate ? 'var(--text-dark)' : 'var(--text-muted)' }}
                />
              </div>
            </div>

            {/* ── Botão submit ────────────────────────── */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '0.875rem',
                background: `linear-gradient(135deg, ${accentColor}, ${isMember ? 'var(--primary-dark)' : '#6d28d9'})`,
                border: 'none', borderRadius: '12px', color: 'white',
                fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: isMember
                  ? '0 8px 20px rgba(59,130,246,0.35)'
                  : '0 8px 20px rgba(124,58,237,0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
                opacity: submitting ? 0.75 : 1,
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                : isMember ? 'Confirmar Membresia' : 'Enviar Inscrição'
              }
            </button>

            {/* Voltar */}
            <button
              type="button"
              onClick={() => setMode(null)}
              style={{
                marginTop: '0.75rem', width: '100%', padding: '0.7rem',
                background: 'transparent', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'var(--text-muted)',
                fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-color)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              ← Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* ─── Sub-componentes ─────────────────────────────────────────── */

const Orbs = ({ mode }) => (
  <>
    <div className="login-orb" style={{
      top: '-10%', right: '-5%', width: '400px', height: '400px',
      background: mode === MODES.REGISTER
        ? 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
    }} />
    <div className="login-orb" style={{
      bottom: '-10%', left: '-5%', width: '300px', height: '300px',
      background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
    }} />
  </>
);

const ModeCard = ({ icon, title, description, accent, accentLight, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '1.5rem 1rem', borderRadius: '16px',
      border: `2px solid transparent`,
      background: 'white', cursor: 'pointer', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.border = `2px solid ${accent}`;
      e.currentTarget.style.background = accentLight;
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = `0 8px 24px ${accent}30`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.border = '2px solid transparent';
      e.currentTarget.style.background = 'white';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
    }}
  >
    <div style={{
      width: '56px', height: '56px', borderRadius: '14px',
      background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {description}
      </div>
    </div>
  </button>
);

const TabBtn = ({ active, icon, label, activeColor, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
      padding: '0.6rem 0.5rem', borderRadius: '9px', border: 'none', cursor: 'pointer',
      fontSize: '0.8rem', fontWeight: active ? 700 : 500,
      background: active ? 'white' : 'transparent',
      color: active ? activeColor : 'var(--text-muted)',
      boxShadow: active ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s',
    }}
  >
    {icon} {label}
  </button>
);

export default PublicRegister;
