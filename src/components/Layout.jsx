import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import avatarImg from '../assets/avatar.png';

const Layout = () => {
  const { loading, volunteerSearch, setVolunteerSearch } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', flexDirection: 'column', gap: '1rem', zIndex: 9999 }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados...</p>
      </div>
    );
  }

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
          </div>

          <div className="flex items-center gap-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '4px' }}>
                <img src={avatarImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="user-info-desktop">
                <div className="text-sm font-bold">Admin</div>
                <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>Chama Church</div>
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
