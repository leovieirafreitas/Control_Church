import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';
import { useChurch } from '../context/ChurchContext';
import avatarImg from '../assets/avatar.png';

const Layout = () => {
  const { loading } = useApp();
  const { activeChurch, loadingChurches } = useChurch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (loadingChurches || loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', flexDirection: 'column', gap: '1rem', zIndex: 9999 }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados...</p>
      </div>
    );
  }

  const churchShortName = activeChurch?.name?.replace('Chama Church - ', '') ?? 'Chama Church';

  return (
    <div className="layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="sidebar-overlay"
        />
      )}

      <div className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <Sidebar />
      </div>

      <div className="main-content">
        <header className="header justify-between">
          <div className="flex items-center gap-4">
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <div style={{ width: '24px', height: '2px', background: 'var(--text-dark)', marginBottom: '4px' }} />
              <div style={{ width: '24px', height: '2px', background: 'var(--text-dark)', marginBottom: '4px' }} />
              <div style={{ width: '24px', height: '2px', background: 'var(--text-dark)' }} />
            </button>

            {/* Badge da Igreja Ativa (visível no header mobile/desktop) */}
            {activeChurch && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'var(--primary-light)',
                border: '1px solid var(--primary)',
                borderRadius: '20px',
                padding: '0.25rem 0.75rem',
              }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                  {churchShortName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '4px' }}>
                <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="user-info-desktop">
                <div className="text-sm font-bold">Admin</div>
                <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>{activeChurch?.network_name ?? 'Rede Chama'}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="page-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
