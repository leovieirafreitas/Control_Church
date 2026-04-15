import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Layout = () => {
  const { loading, volunteerSearch, setVolunteerSearch } = useApp();
  const location = useLocation();
  const isVolunteers = location.pathname === '/volunteers';

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
      <Sidebar />
      <div className="main-content">
        <header className="header justify-between">
          <div style={{ position: 'relative', width: '300px', visibility: 'hidden' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Pesquisar voluntários..."
              value={volunteerSearch}
              onChange={(e) => setVolunteerSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '999px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-color)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}
            />
          </div>
          <div className="flex items-center gap-4">

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                CC
              </div>
              <div>
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
