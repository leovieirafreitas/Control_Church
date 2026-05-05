import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Grid, DollarSign, LogOut, Copy, Bell, ChevronDown, Check, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChurch } from '../context/ChurchContext';
import logoImg from '../assets/logo.png';

const Sidebar = () => {
  const { signOut, user } = useAuth();
  const { churches, activeChurch, switchChurch } = useChurch();
  const [copied, setCopied] = useState(false);
  const [churchDropdownOpen, setChurchDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    const registerUrl = `${window.location.origin}/register`;
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [openSubmenus, setOpenSubmenus] = useState(['membresia']); // Começa aberto por padrão

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
        { name: 'Líderes', path: '/leaders' },
      ]
    },
    { name: 'Departamentos', icon: <Grid size={20} />, path: '/departments' },
    { name: 'Contribuições', icon: <DollarSign size={20} />, path: '/tithes', mobileHidden: true },
    { name: 'Notificações', icon: <Bell size={20} />, path: '/notifications', mobileHidden: true },
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
            borderRadius: '10px',
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
                    padding: '0.75rem 1rem', borderRadius: '8px', border: 'none',
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
                        style={({ isActive }) => ({
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 1rem', borderRadius: '8px',
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
                borderRadius: '8px', textDecoration: 'none',
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
            width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
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

      {/* ── Usuário + Logout ──────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', padding: '0 0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </div>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
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
    </aside>
  );
};

export default Sidebar;
