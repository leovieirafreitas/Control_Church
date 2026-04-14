import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';

const VolunteerSearch = ({ volunteers, value, onChange, placeholder = 'Buscar voluntário...' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);

  const selected = volunteers.find(v => v.id === value);

  const filtered = query.trim()
    ? volunteers.filter(v =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        (v.contact && v.contact.includes(query))
      )
    : volunteers;

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

  const handleSelect = (volunteer) => {
    onChange(volunteer.id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div className="vs-wrap" ref={containerRef}>
      {selected ? (
        // Mostra voluntário selecionado
        <div className="vs-selected">
          <div className="vs-selected-avatar">
            {selected.name.charAt(0).toUpperCase()}
          </div>
          <div className="vs-selected-info">
            <span className="vs-selected-name">{selected.name}</span>
          </div>
          <button className="vs-clear" onClick={handleClear} type="button" title="Remover">
            <X size={15} />
          </button>
        </div>
      ) : (
        // Campo de busca
        <div className={`vs-search-wrap ${focused ? 'vs-focused' : ''}`}>
          <Search size={16} className="vs-search-icon" />
          <input
            className="vs-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            onBlur={() => setFocused(false)}
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
        <div className="vs-dropdown">
          {filtered.length === 0 ? (
            <div className="vs-empty">
              <User size={20} style={{ opacity: 0.3 }} />
              <span>Nenhum voluntário encontrado</span>
            </div>
          ) : (
            filtered.map(v => (
              <button
                key={v.id}
                className="vs-option"
                type="button"
                onMouseDown={() => handleSelect(v)}
              >
                <div className="vs-option-avatar">
                  {v.name.charAt(0).toUpperCase()}
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
