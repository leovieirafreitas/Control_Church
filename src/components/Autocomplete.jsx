import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, MapPin, X, Check } from 'lucide-react';

const Autocomplete = ({ label, value, onChange, options, placeholder, icon: Icon, required = false }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const panel = document.getElementById('autocomplete-portal-panel');
        if (panel && panel.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options.slice(0, 50); // Show first 50 if empty
    const normalizedSearch = inputValue.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return options.filter(opt => {
      const normalizedOpt = opt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalizedOpt.includes(normalizedSearch);
    }).slice(0, 50);
  }, [inputValue, options]);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const panelHeight = Math.min(filteredOptions.length * 42 + 20, 240);
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < panelHeight && rect.top > panelHeight;

      setCoords({
        top: shouldOpenUp 
          ? rect.top + window.scrollY - panelHeight - 6 
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
        openUp: shouldOpenUp,
        panelHeight
      });
    }
  }, [open, filteredOptions]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setOpen(true);
  };

  const handleSelect = (opt) => {
    setInputValue(opt);
    onChange(opt);
    setOpen(false);
  };

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative', marginBottom: '1rem' }}>
      {label && <label className="form-label">{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
          color: open ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s'
        }}>
          {Icon ? <Icon size={18} /> : <MapPin size={18} />}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', borderRadius: '12px',
            border: `2px solid ${open ? 'var(--primary)' : '#e2e8f0'}`,
            fontSize: '0.9rem', outline: 'none', transition: '0.2s', fontWeight: '500',
            boxShadow: open ? '0 0 0 3px var(--primary-light)' : 'none',
            background: 'white'
          }}
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => { setInputValue(''); onChange(''); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && filteredOptions.length > 0 && ReactDOM.createPortal(
        <div 
          id="autocomplete-portal-panel"
          className="custom-scrollbar"
          style={{
            position: 'absolute', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-color)', borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)', zIndex: 10000, 
            maxHeight: '240px', overflowY: 'auto',
            animation: coords.openUp ? 'fadeIn 0.15s ease' : 'fadeInDown 0.15s ease',
            padding: '4px'
          }}
        >
          {filteredOptions.map((opt, i) => {
            const isSelected = opt === value;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(opt)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'var(--primary-light)' : 'transparent',
                  borderRadius: '10px', transition: 'background 0.15s',
                  marginBottom: '2px'
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>
                  {opt}
                </div>
                {isSelected && <Check size={14} color="var(--primary)" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Autocomplete;
