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
        <div className="vs-selected">
          <div className="vs-selected-avatar">
            {selected.initials || getInitials(selected.name)}
          </div>
          <div className="vs-selected-info">
            <span className="vs-selected-name">{selected.name}</span>
          </div>
          <button className="vs-clear" onClick={handleClear} type="button" title="Remover (Esc)">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className={`vs-search-wrap ${focused ? 'vs-focused' : ''}`}>
          <Search size={16} className="vs-search-icon" />
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
          />
          {query && (
            <button className="vs-clear-search" type="button" onClick={() => setQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown de resultados */}
      {open && !selected && (
        <div className="vs-dropdown" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="vs-empty">
              <User size={20} style={{ opacity: 0.3 }} />
              <span>Nenhum voluntário encontrado</span>
            </div>
          ) : (
            filtered.map((v, idx) => (
              <button
                key={v.id}
                className="vs-option"
                type="button"
                style={{
                  background: idx === highlighted ? 'var(--primary-light)' : undefined,
                }}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={() => handleSelect(v)}
              >
                <div className="vs-option-avatar">
                  {v.initials || getInitials(v.name)}
                </div>
                <div className="vs-option-info">
                  <span className="vs-option-name">{v.name}</span>
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
