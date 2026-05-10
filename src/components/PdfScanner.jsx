import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Search, Image } from 'lucide-react';
import DatePicker from './DatePicker';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Configura o worker usando o import do Vite para evitar problemas de CDN e polyfills
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/gif': 'image',
  'image/tiff': 'image',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const extractCurrencyValues = (text) => {
  // Pega números como 300,00 ou 1.000,00 ou 20.00 garantindo que tenha , ou . antes dos últimos 2 dígitos
  const matches = [...text.matchAll(/\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/gi)];
  return matches.map(m => {
    // Como a regex garante 2 casas no final, deixamos só os números e dividimos por 100
    const digitsOnly = m[1].replace(/[^\d]/g, '');
    return parseFloat(digitsOnly) / 100;
  }).filter(v => v > 0 && v < 100000);
};

const extractDates = (text) => {
  const matches = [...text.matchAll(/\b(\d{2}\/\d{2}\/(?:\d{4}|\d{2}))\b/g)];
  return matches.map(m => m[1]).filter((v, i, arr) => arr.indexOf(v) === i);
};

const nameMatchScore = (volunteerName, text) => {
  const normText = normalize(text);
  const parts = normalize(volunteerName).split(' ').filter(p => p.length > 2);
  const matched = parts.filter(p => normText.includes(` ${p}`) || normText.includes(`${p} `));

  let sequenceBonus = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    if (normText.includes(`${parts[i]} ${parts[i + 1]}`)) {
      sequenceBonus += 0.5;
    }
  }

  const score = parts.length ? (matched.length + sequenceBonus) / parts.length : 0;
  return { matched, total: parts.length, score };
};

// Normaliza string para comparação (remove acento, pontuação, espaços extras)
const normalize = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Verifica se o nome da igreja aparece no texto
const checkDestination = (text, churchSettings) => {
  if (!churchSettings) return { nameFound: false, cnpjFound: false };
  const normText = normalize(text);
  const normName = normalize(churchSettings.church_name);
  // Checa palavras-chave do nome (mínimo 2 palavras significativas)
  const nameParts = normName.split(' ').filter(p => p.length > 3);
  const nameFound = nameParts.filter(p => normText.includes(p)).length >= Math.ceil(nameParts.length * 0.6);
  // Checa CNPJ (remove pontuação para comparar)
  const cleanCNPJ = (churchSettings.cnpj || '').replace(/[^\d]/g, '');
  const cnpjFound = cleanCNPJ.length >= 14 && normText.replace(/[^\d]/g, '').includes(cleanCNPJ);
  return { nameFound, cnpjFound };
};

// Carrega Tesseract.js dinamicamente pelo CDN
const loadTesseract = () =>
  new Promise((resolve, reject) => {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
    document.head.appendChild(script);
  });

const PdfScanner = ({ volunteers, tithes, churchSettings, onRegister, onClose }) => {
  const [step, setStep] = useState('upload');
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [regAmount, setRegAmount] = useState('');
  const [regDate, setRegDate] = useState('');
  const fileInputRef = useRef(null);


  // ── Extração de texto de PDF ──────────────────────────────────
  const extractFromPdf = async (file) => {
    setScanStatus('Lendo páginas do PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      setScanProgress(Math.round((i / pdf.numPages) * 100));
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  // ── Extração de texto de imagem (OCR) ─────────────────────────
  const extractFromImage = async (file) => {
    setScanStatus('Carregando motor de OCR...');
    const Tesseract = await loadTesseract();
    setScanStatus('Reconhecendo texto na imagem...');

    const worker = await Tesseract.createWorker('por', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setScanProgress(Math.round(m.progress * 100));
        }
      },
    });

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    return text;
  };

  // ── Handler principal de upload ───────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = ACCEPTED_TYPES[file.type];
    if (!type) {
      alert('Formato não suportado. Use PDF, JPG, PNG, WEBP ou BMP.');
      return;
    }

    setFileName(file.name);
    setFileType(type);
    setScanProgress(0);

    if (type === 'image') {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }

    setScanning(true);
    setStep('scan');

    try {
      let text = '';
      if (type === 'pdf') {
        text = await extractFromPdf(file);
      } else {
        text = await extractFromImage(file);
      }
      analyzeResults(text);
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      alert(`Erro ao processar o arquivo: ${err.message}`);
      setStep('upload');
    } finally {
      setScanning(false);
      setScanProgress(0);
      setScanStatus('');
    }
  };

  // ── Análise e batimento ───────────────────────────────────────
  const analyzeResults = (text) => {
    const extractedValues = extractCurrencyValues(text);
    const extractedDates = extractDates(text);
    const destination = checkDestination(text, churchSettings);

    // Identifica o voluntário automaticamente
    let bestMatch = null;
    let bestScoreInfo = { score: 0, matched: [], total: 0 };

    volunteers.forEach(v => {
      const scoreInfo = nameMatchScore(v.name, text);
      if (scoreInfo.score > 0 && scoreInfo.score > bestScoreInfo.score) {
        bestScoreInfo = scoreInfo;
        bestMatch = v;
      }
    });

    setSelectedVolunteer(bestMatch);

    const highestValue = extractedValues.length > 0 ? Math.max(...extractedValues) : '';
    // Define SEMPRE a data atual ("foi do dia mesmo")
    const suggestedDate = new Date().toISOString().split('T')[0];

    setRegAmount(highestValue ? highestValue.toString() : '');
    setRegDate(suggestedDate);

    setResult({
      extractedValues,
      extractedDates,
      nameMatch: bestScoreInfo,
      destination,
      totalExtracted: highestValue,
      rawTextPreview: text.slice(0, 400),
    });
    setStep('result');
  };

  const resetScanner = () => {
    setStep('upload');
    setResult(null);
    setFileName('');
    setFileType('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
      backdropFilter: 'blur(4px)',
      overflowY: 'auto',
      padding: '4rem 1rem'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '16px',
        width: '100%', maxWidth: '740px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        border: '1px solid var(--border-color)',
        overflow: 'visible', margin: 'auto'
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, var(--primary-light) 0%, transparent 100%)',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.1rem' }}>
                Scanner de Documento
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Analisa PDF ou imagem e bate os dados com o voluntário selecionado
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={22} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'visible', padding: '1.5rem' }}>

          {/* STEP: upload / scan */}
          {(step === 'upload' || step === 'scan') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Upload área */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>
                  Carregar Documento
                </label>
                <div
                  onClick={() => !scanning && fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--primary)',
                    borderRadius: '12px', padding: scanning ? '1.5rem 1rem' : '2.5rem 1rem',
                    textAlign: 'center', cursor: selectedVolunteer && !scanning ? 'pointer' : 'default',
                    background: selectedVolunteer ? 'var(--primary-light)' : 'var(--bg-color)',
                    transition: 'all 0.2s', opacity: selectedVolunteer ? 1 : 0.5,
                  }}
                >
                  {scanning ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
                      <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {scanStatus || `Analisando ${fileName}...`}
                      </span>
                      {/* Progress bar */}
                      <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'rgba(59,130,246,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${scanProgress}%`, background: 'var(--primary)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{scanProgress}%</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <FileText size={32} color={selectedVolunteer ? 'var(--primary)' : 'var(--text-muted)'} />
                        <Image size={32} color={selectedVolunteer ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                      <span style={{ fontWeight: 600, color: selectedVolunteer ? 'var(--primary-dark)' : 'var(--text-muted)' }}>
                        {selectedVolunteer ? 'Clique para selecionar o arquivo' : 'Selecione um voluntário primeiro'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Suporte a <strong>PDF</strong>, <strong>JPG</strong>, <strong>PNG</strong>, <strong>WEBP</strong> e <strong>BMP</strong>
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/bmp,image/gif,image/tiff"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              {/* Preview da imagem */}
              {imagePreview && !scanning && (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                  <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          )}

          {/* STEP: result */}
          {step === 'result' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Tipo de arquivo + Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {fileType === 'pdf' ? <FileText size={18} color="var(--primary)" /> : <Image size={18} color="var(--primary)" />}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>{fileName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Análise concluída
                </span>
              </div>

              {/* Cards de Validação */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ padding: '0.875rem', borderRadius: '10px', background: result.nameMatch?.score >= 0.4 ? '#dcfce7' : '#fee2e2', border: `1px solid ${result.nameMatch?.score >= 0.4 ? '#86efac' : '#fca5a5'}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: result.nameMatch?.score >= 0.4 ? '#15803d' : '#dc2626', marginBottom: '0.25rem' }}>NOME DO VOLUNTÁRIO</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {result.nameMatch?.score >= 0.4 ? <CheckCircle size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: result.nameMatch?.score >= 0.4 ? '#15803d' : '#dc2626' }}>
                      {result.nameMatch?.score >= 0.4 && selectedVolunteer ? selectedVolunteer.name : 'Não encontrado'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '0.875rem', borderRadius: '10px', background: (result.destination?.nameFound || result.destination?.cnpjFound) ? '#dcfce7' : '#fee2e2', border: `1px solid ${(result.destination?.nameFound || result.destination?.cnpjFound) ? '#86efac' : '#fca5a5'}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: (result.destination?.nameFound || result.destination?.cnpjFound) ? '#15803d' : '#dc2626', marginBottom: '0.25rem' }}>DESTINO DO PAGAMENTO</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {(result.destination?.nameFound || result.destination?.cnpjFound) ? <CheckCircle size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: (result.destination?.nameFound || result.destination?.cnpjFound) ? '#15803d' : '#dc2626' }}>
                      {(result.destination?.nameFound || result.destination?.cnpjFound) ? 'Destino Correto' : 'Não identificado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulário de Registro */}
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--surface)' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>Confirmar Dados da Contribuição</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Data do Pagamento</label>
                    <DatePicker
                      value={regDate}
                      onChange={setRegDate}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Valor Encontrado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={regAmount}
                      onChange={(e) => setRegAmount(e.target.value)}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* Prévia do texto extraído */}
              {result.rawTextPreview && (
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Texto extraído do documento:</h4>
                  <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontFamily: 'monospace' }}>
                    {result.rawTextPreview}…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-color)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <div>
            {step === 'result' && (
              <button onClick={resetScanner} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                Analisar outro arquivo
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 500 }}>
              Cancelar
            </button>
            {step === 'result' && (
              <button
                disabled={!(result.nameMatch?.score >= 0.4) || !(result.destination?.nameFound || result.destination?.cnpjFound)}
                onClick={async () => {
                  if (!(result.nameMatch?.score >= 0.4) || !(result.destination?.nameFound || result.destination?.cnpjFound)) return;
                  if (!selectedVolunteer) { alert('Voluntário não identificado.'); return; }
                  if (!regAmount || regAmount <= 0) { alert('Informe um valor válido.'); return; }
                  await onRegister(selectedVolunteer.id, regAmount, regDate);
                  onClose();
                }}
                className="btn btn-primary" style={{ fontSize: '0.875rem', background: ((result.nameMatch?.score >= 0.4) && (result.destination?.nameFound || result.destination?.cnpjFound)) ? '#16a34a' : '#9ca3af', border: 'none', cursor: ((result.nameMatch?.score >= 0.4) && (result.destination?.nameFound || result.destination?.cnpjFound)) ? 'pointer' : 'not-allowed' }}
              >
                {((result.nameMatch?.score >= 0.4) && (result.destination?.nameFound || result.destination?.cnpjFound)) ? 'Confirmar' : 'Validação Pendente'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PdfScanner;
