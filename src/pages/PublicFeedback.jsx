import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Send, CheckCircle2, Loader2, MessageSquare, Heart, Sparkles, Frown, Meh, Smile } from 'lucide-react';
import logoImg from '../assets/cc-logo.webp';

const PublicFeedback = () => {
  const { churchId } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const visitorId = searchParams.get('visitor_id');

  const [config, setConfig] = useState({
    title: 'Pesquisa CHAMA CHURCH',
    description: 'Olá, seja bem-vindo(a)! Queremos saber a sua opinião sobre sua experiência conosco.',
    questions: [
      { id: 'reception_rating', label: 'Recepção', active: true },
      { id: 'worship_rating', label: 'Louvor e Adoração', active: true },
      { id: 'facilities_rating', label: 'Instalações (Limpeza, Banheiros, etc.)', active: true },
      { id: 'program_rating', label: 'Programação (Duração, Dinâmica, etc.)', active: true },
      { id: 'kids_ministry_rating', label: 'Ministério Infantil (KIDS)', active: true },
      { id: 'preaching_rating', label: 'Mensagem (Pregação)', active: true },
      { id: 'spiritual_atmosphere_rating', label: 'Atmosfera Espiritual', active: true },
    ]
  });
  const [form, setForm] = useState({
    reception_rating: 0,
    worship_rating: 0,
    facilities_rating: 0,
    program_rating: 0,
    kids_ministry_rating: 0,
    preaching_rating: 0,
    spiritual_atmosphere_rating: 0,
    comments: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: '' });
  const [churches, setChurches] = useState([]);
  const [selectedChurchId, setSelectedChurchId] = useState(churchId || '');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: churchesData } = await supabase.from('churches').select('id, name').eq('is_active', true);
      if (churchesData) setChurches(churchesData);

      let resolvedChurchId = selectedChurchId;

      // Se não for um UUID válido (36 caracteres), tenta resolver como slug
      if (selectedChurchId && selectedChurchId.length !== 36) {
        const urlSlug = selectedChurchId.toLowerCase().trim();
        const matched = churchesData?.find(c => {
          const churchSlug = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          return churchSlug === urlSlug;
        });
        
        if (matched) {
          resolvedChurchId = matched.id;
          setSelectedChurchId(matched.id);
        } else {
          // Se não encontrou pelo slug, evita quebrar a query com um valor inválido para UUID
          resolvedChurchId = null;
        }
      }

      let query = supabase.from('feedback_config').select('*');
      if (resolvedChurchId) {
        query = query.eq('church_id', resolvedChurchId);
      } else {
        query = query.is('church_id', null);
      }

      const { data: configData, error: configError } = await query.maybeSingle();

      if (configData) {
        setConfig({
          title: configData.title || 'Pesquisa CHAMA CHURCH',
          description: configData.description || 'Olá, seja bem-vindo(a)!',
          questions: (configData.questions || []).filter(q => q.active !== false)
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedChurchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChurchId) {
      showAlert('Por favor, selecione a unidade.');
      return;
    }

    const hasUnanswered = config.questions.some(q => !form[q.id] || form[q.id] === 0);
    if (hasUnanswered) {
      showAlert('Por favor, avalie todos os itens da pesquisa antes de enviar.');
      return;
    }

    if (!form.comments || form.comments.trim().length < 5) {
      showAlert('Por favor, preencha o campo de sugestões/elogios (mínimo 5 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        ...form,
        church_id: selectedChurchId,
        visitor_id: visitorId || null
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      showAlert('Erro ao enviar feedback: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRating = (id, value) => {
    setForm(prev => ({ ...prev, [id]: value }));
  };

  const showAlert = (message) => {
    setErrorModal({ show: true, message });
  };

  const getMood = (rating) => {
    if (rating === 0) return { icon: null, color: '#e2e8f0', label: '' };
    if (rating <= 2) return { icon: <Frown size={24} />, color: '#ef4444', label: 'Pode melhorar' };
    if (rating === 3) return { icon: <Meh size={24} />, color: '#f59e0b', label: 'Bom' };
    if (rating === 4) return { icon: <Smile size={24} />, color: '#10b981', label: 'Muito bom' };
    return { icon: <Heart size={24} fill="#ec4899" />, color: '#ec4899', label: 'Excelente!' };
  };

  return (
    <div className="feedback-page">
      <style>{`
        :root { --primary: #3b82f6; --primary-dark: #1d4ed8; }
        .feedback-page {
          min-height: 100vh;
          width: 100%;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 4rem 1.5rem;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow-y: auto;
        }

        .orb {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          z-index: 0;
        }
        .orb-1 { top: -100px; left: -100px; background: var(--primary); }
        .orb-2 { bottom: -100px; right: -100px; background: #f59e0b; }

        .feedback-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .feedback-header { text-align: center; margin-bottom: 2.5rem; width: 100%; }
        .feedback-header .logo { height: 50px; margin-bottom: 1rem; }
        .feedback-header h1 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .feedback-header p { color: #64748b; font-size: 0.95rem; line-height: 1.5; }

        .feedback-form {
          background: white;
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
        }

        .form-section { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
        .section-label { font-size: 0.875rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

        .feedback-input {
          width: 100%; padding: 0.875rem 1rem; border-radius: 12px; border: 2px solid #e2e8f0;
          background: #f8fafc; font-size: 1rem; outline: none; transition: 0.2s;
        }
        .feedback-input:focus { border-color: var(--primary); background: white; }

        .rating-item { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; width: 100%; }
        .rating-item:last-child { border-bottom: none; }
        .rating-info { display: flex; align-items: center; justify-content: space-between; min-height: 32px; width: 100%; }
        .rating-label { font-size: 1rem; font-weight: 600; color: #1e293b; }

        .stars { display: flex; gap: 0.5rem; justify-content: center; }
        .star-btn { background: none; border: none; cursor: pointer; color: #e2e8f0; transition: transform 0.2s; }
        .star-btn:hover { transform: scale(1.15); }

        .rating-legend { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; width: 100%; }

        .textarea-wrapper { position: relative; width: 100%; }
        .textarea-icon { position: absolute; left: 1rem; top: 1rem; color: #94a3b8; }
        .feedback-textarea {
          width: 100%; min-height: 120px; padding: 0.875rem 1rem 0.875rem 2.75rem;
          border-radius: 12px; border: 2px solid #e2e8f0; background: #f8fafc;
          font-size: 1rem; outline: none; resize: vertical; font-family: inherit;
        }
        .feedback-textarea:focus { border-color: var(--primary); background: white; }

        .submit-btn {
          width: 100%; padding: 1.125rem; border-radius: 14px; border: none;
          background: var(--primary); color: white; font-size: 1.1rem; font-weight: 700;
          cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(59,130,246,0.3);
        }
        .submit-btn:hover { background: var(--primary-dark); transform: translateY(-2px); }

        .success-card {
          background: white; padding: 4rem 2rem; border-radius: 32px; text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center;
          width: 100%; max-width: 500px;
        }
        .icon-circle { 
          background: #f0fdf4; width: 80px; height: 80px; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;
        }
        .success-card h2 { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; }
        .success-card p { color: #64748b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2.5rem; }

        .animate-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-scale-up { animation: scaleUp 0.4s ease-out; }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999;
        }
        .modal-content { background: white; padding: 2.5rem; border-radius: 28px; width: 100%; max-width: 400px; text-align: center; }
        .btn-modal {
          width: 100%; padding: 1rem; border-radius: 14px; border: none; background: var(--primary);
          color: white; font-weight: 700; cursor: pointer;
        }
        .feedback-footer { text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.875rem; width: 100%; }
      `}</style>

      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {loading ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '70vh', width: '100%', zIndex: 10
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={64} color="var(--primary)" style={{ opacity: 0.2 }} />
            <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ position: 'absolute' }} />
          </div>
          <p style={{ marginTop: '1.5rem', color: '#64748b', fontWeight: 700, fontSize: '1.1rem' }}>
            Carregando pesquisa...
          </p>
        </div>
      ) : success ? (
        <div className="feedback-container animate-scale-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="icon-circle" style={{ marginBottom: '2rem' }}>
            <CheckCircle2 size={64} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', textAlign: 'center' }}>
            Muito obrigado!
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.25rem', textAlign: 'center', maxWidth: '400px', lineHeight: '1.6' }}>
            Sua opinião é muito importante para nós e nos ajuda a melhorar a cada dia. Que Deus te abençoe!
          </p>
        </div>
      ) : (
        <div className="feedback-container">
          <header className="feedback-header animate-fade-in">
            <img src={logoImg} alt="Chama Church" className="logo" />
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </header>

          <form onSubmit={handleSubmit} className="feedback-form animate-slide-up">
            {!churchId && (
              <div className="form-section">
                <label className="section-label">Unidade (Igreja)</label>
                <select value={selectedChurchId} onChange={(e) => setSelectedChurchId(e.target.value)} className="feedback-input" required>
                  <option value="">Selecione sua unidade...</option>
                  {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {config.questions.map((q, idx) => {
              const mood = getMood(form[q.id]);
              return (
                <div key={q.id} className="rating-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="rating-info">
                    <span className="rating-label">{q.label}</span>
                    {mood.icon && (
                      <div className="mood-badge animate-pop" style={{ color: mood.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{mood.label}</span>
                        {mood.icon}
                      </div>
                    )}
                  </div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => handleRating(q.id, star)} className="star-btn" style={{ color: form[q.id] >= star ? mood.color : '#e2e8f0' }}>
                        <Star size={32} fill={form[q.id] >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <div className="rating-legend"><span>Muito insatisfeito</span><span>Muito satisfeito</span></div>
                </div>
              );
            })}

            <div className="form-section">
              <label className="section-label">Sugestões, Críticas ou Elogios</label>
              <div className="textarea-wrapper">
                <MessageSquare className="textarea-icon" size={18} />
                <textarea placeholder="Conte-nos mais sobre sua experiência... (Obrigatório)" value={form.comments} onChange={(e) => setForm(p => ({ ...p, comments: e.target.value }))} className="feedback-textarea" required minLength={5} />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar Feedback</>}
            </button>
          </form>
          <footer className="feedback-footer"><p>© {new Date().getFullYear()} Chama Church • Sua opinião constrói nossa igreja</p></footer>
        </div>
      )}

      {/* Custom Alert Modal */}
      {errorModal.show && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content animate-pop">
            <Sparkles size={40} color="var(--primary)" style={{ marginBottom: '1.5rem', margin: '0 auto 1.5rem' }} />
            <h3>Atenção</h3>
            <p>{errorModal.message}</p>
            <button onClick={() => setErrorModal({ show: false, message: '' })} className="btn-modal">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicFeedback;
