import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Network, DollarSign, LogOut, Copy, Bell, ChevronDown, Check, Building2, MessageSquare, Settings, X, Clock, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChurch } from '../context/ChurchContext';
import logoImg from '../assets/logo.png';

// ── Modal de Configurações ─────────────────────────────────────────────────
const SettingsModal = ({ onClose, user, activeChurch }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (date, tz) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const fmtDate = (date, tz) =>
    date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: tz });

  const localTime   = fmtTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const manausTime  = fmtTime(now, 'America/Manaus');
  const localDate   = fmtDate(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const manausDate  = fmtDate(now, 'America/Manaus');
  const localTzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const unitName    = activeChurch?.name?.replace('Chama Church - ', '') ?? '—';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, 94vw)',
        background: 'var(--card-bg, #fff)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        border: '1px solid var(--border-color)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'slideUp 0.22s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, var(--primary-light) 0%, #f0f4ff 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Settings size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)' }}>Configurações</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Perfil e horários do sistema</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '0.25rem', borderRadius: '8px', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Perfil da Unidade ── */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Perfil
            </div>
            <div style={{
              background: 'var(--bg-color, #f8fafc)',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}>
              {/* Unidade */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unidade ativa</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)' }}>{unitName}</div>
                </div>
              </div>
              {/* E-mail */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                  background: 'rgba(100,116,139,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>E-mail logado</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', wordBreak: 'break-all' }}>{user?.email ?? '—'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Horários ── */}
          <section>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Horários do sistema
            </div>
            <div style={{
              background: 'var(--bg-color, #f8fafc)',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}>
              {/* Horário Manaus */}
              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <MapPin size={15} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Manaus (UTC−4) &nbsp;
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700, background: 'var(--primary-light)',
                          color: 'var(--primary-dark)', padding: '0.1rem 0.4rem', borderRadius: '6px',
                        }}>Sistema</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', textTransform: 'capitalize' }}>{manausDate}</div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 0.4, fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: '1.5rem', marginTop: '0.4rem' }}>
                  Fuso usado para automações de envio de mensagens
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

const Sidebar = () => {
  const { signOut, user } = useAuth();
  const { churches, activeChurch, switchChurch } = useChurch();
  const [copied, setCopied] = useState(false);
  const [churchDropdownOpen, setChurchDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setChurchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCopyLink = () => {
    let slug = '';
    if (activeChurch) {
      slug = activeChurch.name
        .toLowerCase()
        .replace('chama church - ', '')
        .replace('chama church ', '')
        .trim()
        .replace(/\s+/g, '-');
    }
    const churchQuery = slug ? `?church=${slug}` : '';
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://chamachurch.com.br';
    const registerUrl = `${baseUrl}/register${churchQuery}`;
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [openSubmenus, setOpenSubmenus] = useState(() => {
    const initial = [];
    const path = window.location.pathname;
    if (path.startsWith('/notifications')) initial.push('notificacoes');
    if (['/volunteers', '/members', '/visitors', '/coordenadores'].some(p => path.startsWith(p))) initial.push('membresia');
    return initial;
  });

  useEffect(() => {
    if (location.pathname.startsWith('/notifications')) {
      setOpenSubmenus(prev => prev.includes('notificacoes') ? prev : [...prev, 'notificacoes']);
    }
    if (['/volunteers', '/members', '/visitors', '/coordenadores'].some(p => location.pathname.startsWith(p))) {
      setOpenSubmenus(prev => prev.includes('membresia') ? prev : [...prev, 'membresia']);
    }
  }, [location.pathname]);

  const toggleSubmenu = (id) => {
    setOpenSubmenus(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { 
      id: 'membresia',
      name: 'Membresia', 
      icon: <Users size={20} />, 
      children: [
        { name: 'Voluntários', path: '/volunteers' },
        { name: 'Membros', path: '/members' },
        { name: 'Visitantes', path: '/visitors' },
        { name: 'Coordenadores', path: '/coordenadores' },
      ]
    },
    { name: 'Departamentos', icon: <Network size={20} />, path: '/departments' },
    { name: 'Contribuições', icon: <DollarSign size={20} />, path: '/tithes', mobileHidden: true },
    { 
      id: 'notificacoes',
      name: 'Notificações', 
      icon: <Bell size={20} />, 
      mobileHidden: true,
      children: [
        { name: 'Voluntários', path: '/notifications' },
        { name: 'Visitantes', path: '/notifications/visitantes' },
      ]
    },
    { name: 'Feedback', icon: <MessageSquare size={20} />, path: '/feedback', mobileHidden: true },
  ];

  // Abreviação do nome da igreja para exibição compacta
  const shortName = activeChurch?.name?.replace('Chama Church - ', '') ?? '—';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6" style={{ padding: '0.5rem' }}>
        <img src={logoImg} alt="ChamaChurch Logo" style={{ maxWidth: '100%', height: '28px', objectFit: 'contain', marginLeft: '-0.5rem' }} />
      </div>

      {/* ── Church Selector ────────────────────────────── */}
      <div ref={dropdownRef} style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <button
          onClick={() => setChurchDropdownOpen(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 0.75rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: churchDropdownOpen ? 'var(--primary-light)' : 'var(--sidebar-bg, #fff)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={e => { if (!churchDropdownOpen) e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onMouseLeave={e => { if (!churchDropdownOpen) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Building2 size={16} color="white" />
          </div>

          <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shortName}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Igreja ativa
            </div>
          </div>

          <ChevronDown
            size={16}
            color="var(--text-muted)"
            style={{ flexShrink: 0, transition: 'transform 0.2s ease', transform: churchDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {churchDropdownOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
            borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            zIndex: 1000, overflow: 'hidden', animation: 'fadeInDown 0.15s ease',
          }}>
            <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Selecionar unidade
              </div>
            </div>

            {churches.map(church => {
              const isSelected = church.id === activeChurch?.id;
              const name = church.name.replace('Chama Church - ', '');
              return (
                <button
                  key={church.id}
                  onClick={() => { switchChurch(church); setChurchDropdownOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.65rem 0.75rem', border: 'none',
                    background: isSelected ? 'var(--primary-light)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s ease', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-color)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: isSelected ? 'var(--primary)' : 'var(--border-color)',
                  }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {church.city} - {church.network_name}
                    </div>
                  </div>
                  {isSelected && <Check size={15} color="var(--primary)" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        {menuItems.map((item) => {
          if (item.children) {
            const isOpen = openSubmenus.includes(item.id);
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 1rem', borderRadius: '12px', border: 'none',
                    background: 'transparent', color: 'var(--text-muted)',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    fontWeight: '500', cursor: 'pointer',
                    transition: 'var(--transition)', width: '100%', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-color)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.icon}
                  {item.name}
                  <div style={{ flex: 1 }} />
                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
                
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '1.5rem' }}>
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        end
                        style={({ isActive }) => ({
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 1rem', borderRadius: '12px',
                          textDecoration: 'none', fontSize: '0.85rem',
                          color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)',
                          backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                          fontWeight: isActive ? '700' : '500',
                          transition: 'var(--transition)'
                        })}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', opacity: 0.5 }} />
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={item.mobileHidden ? 'hide-mobile' : ''}
              style={({ isActive }) => ({
                display: (item.mobileHidden && window.innerWidth < 768) ? 'none' : 'flex',
                alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                borderRadius: '12px', textDecoration: 'none',
                color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                fontWeight: isActive ? '600' : '500', transition: 'var(--transition)'
              })}
            >
              {item.icon}
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Link de Cadastro Público ───────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <button
          onClick={handleCopyLink}
          title="Copiar link público para cadastro de voluntários"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
            border: '1px dashed var(--primary)', background: copied ? 'var(--primary-light)' : 'transparent',
            color: 'var(--primary-dark)', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500,
            transition: 'var(--transition)'
          }}
        >
          <Copy size={18} />
          {copied ? 'Link Copiado!' : 'Copiar Link Cadastro'}
        </button>
      </div>

      {/* ── Configurações + Logout ────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {/* Botão Configurações */}
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
            border: 'none', background: 'transparent', color: 'var(--text-muted)',
            fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
            transition: 'var(--transition)', textAlign: 'left',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-color)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Settings size={18} />
          Configurações
        </button>

        {/* Botão Sair */}
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
            border: 'none', background: 'transparent', color: '#ef4444',
            fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* ── Modal de Configurações ─────────────────────── */}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          user={user}
          activeChurch={activeChurch}
        />
      )}
    </aside>
  );
};

export default Sidebar;
