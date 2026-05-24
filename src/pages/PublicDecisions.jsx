import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, Loader2, Sparkles, UserCheck, Shield, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useChurch } from '../context/ChurchContext';

const PublicDecisions = () => {
  const [searchParams] = useSearchParams();
  const rawUrlChurchId = searchParams.get('church') || '';
  const { churches } = useChurch();

  const [churchId, setChurchId] = useState(rawUrlChurchId);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [searchName, setSearchName] = useState('');

  // Resolver ID da igreja pelo slug na URL
  useEffect(() => {
    if (rawUrlChurchId && rawUrlChurchId.length < 30 && churches && churches.length > 0) {
      const slugStr = rawUrlChurchId.toLowerCase().replace(/-/g, ' ');
      const matched = churches.find(c => c.name.toLowerCase().includes(slugStr));
      if (matched && churchId !== matched.id) {
        setChurchId(matched.id);
      }
    } else if (rawUrlChurchId && rawUrlChurchId.length >= 30 && churchId !== rawUrlChurchId) {
      setChurchId(rawUrlChurchId);
    }
  }, [rawUrlChurchId, churches]);

  // Buscar visitantes do dia
  useEffect(() => {
    fetchTodayVisitors();
    // Refresh a cada 30 segundos
    const inv = setInterval(fetchTodayVisitors, 30000);
    return () => clearInterval(inv);
  }, [churchId]);

  const fetchTodayVisitors = async () => {
    try {
      // Definir início e fim do dia atual (fuso local)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      let query = supabase
        .from('visitors')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (churchId) {
        query = query.eq('church_id', churchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVisitors(data || []);
    } catch (e) {
      console.error('Erro ao buscar visitantes:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDecision = async (visitorId, currentStatus) => {
    setUpdating(visitorId);
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('visitors')
        .update({ accepted_jesus: newStatus })
        .eq('id', visitorId);

      if (error) throw error;

      // Update local state
      setVisitors(prev => prev.map(v => 
        v.id === visitorId ? { ...v, accepted_jesus: newStatus } : v
      ));
    } catch (e) {
      console.error('Erro ao atualizar decisão:', e);
      alert('Erro ao salvar informação.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading && visitors.length === 0) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted font-medium">Buscando registros de hoje...</p>
      </div>
    );
  }

  const activeChurchData = churches?.find(c => c.id === churchId);
  const filteredVisitors = visitors.filter(v => v.name.toLowerCase().includes(searchName.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#f8fafc', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)' }}>
            <Heart size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Decisões de Hoje</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6 }}>
            Confirme os visitantes que aceitaram a Jesus nos cultos de hoje.
          </p>
          {activeChurchData && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, marginTop: '1rem' }}>
              <Shield size={14} /> {activeChurchData.name}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar visitante pelo nome..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', borderRadius: '16px', border: '2px solid var(--border-color)', fontSize: '0.95rem', outline: 'none', transition: '0.2s', background: 'white' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>

        {/* Visitors List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredVisitors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
              <UserCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Nenhum visitante encontrado</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{visitors.length === 0 ? 'Os registros de hoje aparecerão aqui automaticamente.' : 'Tente buscar com outro nome.'}</p>
            </div>
          ) : (
            filteredVisitors.map(v => (
              <div key={v.id} style={{ 
                background: 'white', 
                borderRadius: '20px', 
                padding: '1.25rem 1.5rem', 
                border: '1px solid', 
                borderColor: v.accepted_jesus ? '#fca5a5' : 'var(--border-color)',
                boxShadow: v.accepted_jesus ? '0 10px 25px -5px rgba(239, 68, 68, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                gap: '1rem'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {v.neighborhood && (
                      <>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {v.neighborhood}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleDecision(v.id, v.accepted_jesus)}
                  disabled={updating === v.id}
                  style={{
                    flexShrink: 0,
                    width: v.accepted_jesus ? '140px' : '64px',
                    height: '48px',
                    borderRadius: '16px',
                    border: 'none',
                    background: v.accepted_jesus ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : '#f1f5f9',
                    color: v.accepted_jesus ? 'white' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: updating === v.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: v.accepted_jesus ? '0 4px 12px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                >
                  {updating === v.id ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : v.accepted_jesus ? (
                    <>
                      <Sparkles size={16} /> Aceitou!
                    </>
                  ) : (
                    <Heart size={22} />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicDecisions;
