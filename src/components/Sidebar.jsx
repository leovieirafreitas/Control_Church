import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Grid, DollarSign, LogOut, Copy, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

const Sidebar = () => {
  const { signOut, user } = useAuth();
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    const registerUrl = `${window.location.origin}/register`;
    navigator.clipboard.writeText(registerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Voluntários', icon: <Users size={20} />, path: '/volunteers' },
    { name: 'Departamentos', icon: <Grid size={20} />, path: '/departments' },
    { name: 'Contribuições', icon: <DollarSign size={20} />, path: '/tithes', mobileHidden: true },
    { name: 'Notificações', icon: <Bell size={20} />, path: '/notifications', mobileHidden: true },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8" style={{ padding: '0.5rem' }}>
        <img src={logoImg} alt="ChamaChurch Logo" style={{ maxWidth: '100%', height: '28px', objectFit: 'contain', marginLeft: '-0.5rem' }} />
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={item.mobileHidden ? 'hide-mobile' : ''}
            style={({ isActive }) => ({
              display: (item.mobileHidden && window.innerWidth < 768) ? 'none' : 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
              fontWeight: isActive ? '600' : '500',
              transition: 'var(--transition)'
            })}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Link de Cadastro Público */}
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

      {/* Usuário + Logout */}
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
