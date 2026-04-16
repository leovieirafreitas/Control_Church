import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, User } from 'lucide-react';

const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const VolunteerSearch = ({
  volunteers,
  value,
  onChange,
  placeholder = 'Buscar voluntário...',
  onSelected,   // callback chamado após selecionar → foca próximo campo
  inputRef: externalRef,
}) => {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef(null);
  const internalRef  = useRef(null);
  const inputRef     = externalRef || internalRef;
  const listRef      = useRef(null);

  const selected = volunteers.find(v => v.id === value);

  const filtered = query.trim()
    ? volunteers.filter(v =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        (v.contact && v.contact.includes(query))
      )
    : volunteers;

  // Reseta highlight quando a lista muda
  useEffect(() => { setHighlighted(0); }, [filtered.length, query]);

  // Scroll automático do item em destaque
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted];
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((volunteer) => {
    onChange(volunteer.id);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
    // Após selecionar, notifica o pai para focar próximo campo
    setTimeout(() => onSelected?.(), 0);
  }, [onChange, onSelected]);

  const handleClear = () => {
    onChange('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlighted]) handleSelect(filtered[highlighted]);
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="vs-wrap" ref={containerRef}>
      {selected ? (
        <div className="vs-selected" style={{ 
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', 
          border: '1px solid var(--primary)', borderRadius: '12px', background: 'white',
          boxShadow: '0 4px 12px rgba(59,130,246,0.08)', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="vs-selected-avatar" style={{
            width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.7rem', flexShrink: 0
          }}>
            {selected.initials || getInitials(selected.name)}
          </div>
          <div className="vs-selected-info" style={{ flex: 1 }}>
            <span className="vs-selected-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>{selected.name}</span>
          </div>
          <button 
            className="vs-clear" 
            onClick={handleClear} 
            type="button" 
            style={{
              background: 'var(--bg-color)',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className={`vs-search-wrap ${focused ? 'vs-focused' : ''}`} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem',
          border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--surface)',
          transition: 'var(--transition)'
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            className="vs-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
          />
        </div>
      )}

      {open && !selected && (
        <div className="vs-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: 'white', border: '1px solid var(--border-color)', borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 1000, maxHeight: '280px', overflowY: 'auto',
          padding: '0.5rem', animation: 'fadeIn 0.2s ease-out'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <User size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>Nenhum voluntário encontrado</div>
            </div>
          ) : (
            filtered.map((v, idx) => (
              <button
                key={v.id}
                className="vs-option"
                type="button"
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: idx === highlighted ? 'var(--primary-light)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                  transform: idx === highlighted ? 'translateX(4px)' : 'none',
                  textAlign: 'left'
                }}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={() => handleSelect(v)}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px', 
                  background: idx === highlighted ? 'var(--primary)' : 'var(--bg-color)',
                  color: idx === highlighted ? 'white' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.7rem', transition: 'var(--transition)'
                }}>
                  {v.initials || getInitials(v.name)}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>{v.name}</div>
                  {v.contact && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.contact}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default VolunteerSearch;
