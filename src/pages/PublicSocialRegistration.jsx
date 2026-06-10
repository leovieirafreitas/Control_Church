import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import logoImg from '../assets/cc-logo-preto.png';

const maskCPF = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const PublicSocialRegistration = () => {
  const { campaignId } = useParams();
  
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFull, setIsFull] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    document_id: '',
    rg: '',
    phone: '',
    age: '',
    family_size: ''
  });

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails();
    } else {
      setError('Link inválido.');
      setLoading(false);
    }
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      // 1. Buscar detalhes da campanha
      const { data: campData, error: campError } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campError) throw campError;
      if (!campData) throw new Error('Campanha não encontrada.');
      
      setCampaign(campData);

      // 2. Verificar quantidade de cadastros já feitos
      const { count, error: countError } = await supabase
        .from('social_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (countError) throw countError;

      if (count >= campData.max_capacity) {
        setIsFull(true);
      }
    } catch (err) {
      console.error('Erro:', err);
      setError('Não foi possível carregar as informações desta campanha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // 1. Checar se CPF/RG já existe nesta campanha (Sem Penetra)
      const { data: existingReg, error: checkError } = await supabase
        .from('social_registrations')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('document_id', formData.document_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReg) {
        alert('Este RG ou CPF já está cadastrado nesta campanha! Só é permitida uma cesta por pessoa/documento.');
        setSubmitting(false);
        return;
      }

      // 2. Dupla checagem de limite antes de inserir
      const { count, error: countError } = await supabase
        .from('social_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);
        
      if (countError) throw countError;

      if (count >= campaign.max_capacity) {
        setIsFull(true);
        setSubmitting(false);
        return;
      }

      // Inserir cadastro
      const { error: insertError } = await supabase
        .from('social_registrations')
        .insert([
          {
            campaign_id: campaignId,
            full_name: formData.full_name,
            document_id: formData.document_id,
            rg: formData.rg,
            phone: formData.phone,
            age: parseInt(formData.age),
            family_size: parseInt(formData.family_size)
          }
        ]);

      if (insertError) throw insertError;
      
      setSuccess(true);
    } catch (err) {
      console.error('Erro ao salvar cadastro:', err);
      alert('Erro ao enviar os dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin text-primary" size={40} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando campanha...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
        <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '400px', width: '100%' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Ops!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem' }}>
        <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', maxWidth: '400px', width: '100%', animation: 'slideUp 0.4s ease-out' }}>
          <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 1.5rem', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Cadastro Realizado!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.5 }}>
            Seus dados foram recebidos com sucesso. Entraremos em contato em breve usando o telefone informado.
          </p>
        </div>
        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header Fixo */}
      <header style={{ background: 'white', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src={logoImg} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '500px', width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)' }}>
              <Heart size={32} color="white" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {campaign.title}
            </h1>
            {campaign.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {campaign.description}
              </p>
            )}
          </div>

          {isFull ? (
            <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '2px solid #fee2e2' }}>
              <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>⚠️</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Vagas Esgotadas!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Infelizmente o limite de {campaign.max_capacity} cadastros para esta campanha já foi atingido.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                Preencha os dados abaixo para reservar sua cesta básica.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>Nome Completo *</label>
                <input
                  type="text" required
                  placeholder="Seu nome completo"
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>CPF *</label>
                <input
                  type="text" required
                  placeholder="000.000.000-00"
                  value={formData.document_id}
                  onChange={e => setFormData({...formData, document_id: maskCPF(e.target.value)})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>RG (Opcional)</label>
                <input
                  type="text"
                  placeholder="Apenas números do RG"
                  value={formData.rg}
                  onChange={e => setFormData({...formData, rg: e.target.value})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>Telefone (WhatsApp) *</label>
                <input
                  type="tel" required
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>Idade *</label>
                  <input
                    type="number" required min="18"
                    placeholder="Sua idade"
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>Qtd. na Família *</label>
                  <input
                    type="number" required min="1"
                    placeholder="Incluindo você"
                    value={formData.family_size}
                    onChange={e => setFormData({...formData, family_size: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', outline: 'none', transition: '0.2s', fontSize: '0.95rem' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '1rem',
                  width: '100%', padding: '1rem', borderRadius: '16px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: 'white', fontWeight: 800, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(239,68,68,0.3)', transition: 'all 0.2s'
                }}
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Cadastro'}
              </button>
            </form>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default PublicSocialRegistration;
