import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2, MessageSquare, Heart, ShieldCheck } from 'lucide-react';

const VisitorConfirmation = () => {
  const { visitorId } = useParams();
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisitor = async () => {
      try {
        const { data, error } = await supabase
          .from('visitors')
          .select('*, coordenadores(name)')
          .eq('id', visitorId)
          .single();
        
        if (error) throw error;
        setVisitor(data);
        
        // Se já foi respondido, pula para tela de sucesso
        if (data.followup_status && data.followup_status !== 'pending') {
          setSubmitted(true);
        }
      } catch (err) {
        setError('Link inválido ou expirado.');
      } finally {
        setLoading(false);
      }
    };
    fetchVisitor();
  }, [visitorId]);

  const handleResponse = async (response) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('visitors')
        .update({ followup_status: response === 'yes' ? 'confirmed' : 'denied' })
        .eq('id', visitorId);
      
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !submitted) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <XCircle className="text-error" size={60} style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontWeight: 900, marginBottom: '1rem', color: 'var(--text-dark)' }}>Ops!</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
        <div style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <CheckCircle size={48} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '2.25rem', marginBottom: '1.25rem', color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>Obrigado!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '3rem' }}>Sua resposta foi registrada com sucesso. Isso nos ajuda a cuidar melhor de você!</p>
          <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Equipe Chama Church agradece</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
      <div className="card animate-slide-up" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Heart size={32} />
          </div>
        </div>

        <h1 style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.75rem', marginBottom: '1.25rem', lineHeight: 1.2, color: 'var(--text-dark)' }}>
          Olá, {visitor.name}!
        </h1>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          Vimos que você nos visitou recentemente e ficamos muito felizes! <br/><br/>
          O coordenador <strong>{visitor.coordenadores?.name || 'da sua área'}</strong> já entrou em contato com você?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button 
            onClick={() => handleResponse('yes')}
            style={{ 
              padding: '0.85rem', borderRadius: '15px', border: 'none', 
              background: 'var(--primary)', color: 'white', fontWeight: 900, 
              fontSize: '1rem', cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            SIM
          </button>
          
          <button 
            onClick={() => handleResponse('no')}
            style={{ 
              padding: '0.85rem', borderRadius: '15px', border: '2px solid #e2e8f0', 
              background: 'white', color: 'var(--text-main)', fontWeight: 800, 
              fontSize: '1rem', cursor: 'pointer', transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'white'}
          >
            NÃO
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Equipe Chama Church agradece
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorConfirmation;
