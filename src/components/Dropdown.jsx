import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const Dropdown = ({ label, value, valueLabel, options, onSelect, placeholder, icon: Icon, renderOption, required = false, size = 'normal', variant = 'default' }) => {
  const isSmall = size === 'small';
  const isPill = variant === 'pill';
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const panel = document.getElementById('dropdown-portal-panel');
        if (panel && panel.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const panelHeight = Math.min(options.length * 48 + (placeholder ? 40 : 0), 240);
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
  }, [open, options, placeholder]);

  return (
    <div className={label ? "form-group" : ""} ref={ref} style={{ position: 'relative', marginBottom: label ? '1rem' : 0 }}>
      {label && <label className="form-label">{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: isSmall ? '0.5rem' : '0.75rem',
          padding: isSmall ? '0.4rem 0.75rem' : (isPill ? '0 1.25rem' : '0.75rem 1rem'),
          borderRadius: isSmall ? '10px' : (isPill ? '20px' : '12px'),
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border-color)'}`,
          background: 'white', cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: open ? '0 0 0 3px var(--primary-light)' : (isPill ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'),
          minHeight: isSmall ? '36px' : (isPill ? '44px' : '48px')
        }}
      >
        {Icon && (
          <div style={{
            width: isSmall ? '24px' : '32px', height: isSmall ? '24px' : '32px', borderRadius: isSmall ? '6px' : '8px', flexShrink: 0,
            background: value
              ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
              : 'var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <Icon size={isSmall ? 12 : 16} color="white" />
          </div>
        )}
        <span style={{
          flex: 1, textAlign: 'left', fontSize: isSmall ? '0.8rem' : '0.9rem',
          color: value ? 'var(--text-dark)' : 'var(--text-muted)',
          fontWeight: value ? 600 : 400,
          pointerEvents: 'none'
        }}>
          {valueLabel || placeholder}
        </span>
        <ChevronDown size={isSmall ? 14 : 16} color="var(--text-muted)" style={{
          flexShrink: 0, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          pointerEvents: 'none'
        }} />
      </button>

      {open && ReactDOM.createPortal(
        <div
          id="dropdown-portal-panel"
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 9999, overflow: 'hidden',
            animation: coords.openUp ? 'fadeIn 0.15s ease' : 'fadeInDown 0.15s ease',
            maxHeight: '240px', overflowY: 'auto',
          }}
        >
          {placeholder && (
            <div style={{
              padding: '0.4rem 0.75rem', background: 'var(--bg-color)',
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-color)',
            }}>
              {placeholder}
            </div>
          )}
          {options.map((opt, i) => {
            const optValue = opt.id || opt.value || opt;
            const optLabel = opt.name || opt.label || opt;
            const labelContent = renderOption ? renderOption(opt) : optLabel;
            const isSelected = optValue === value;

            return (
              <button
                key={i}
                type="button"
                onClick={() => { onSelect(opt); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? 'var(--primary-light)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-color)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: isSelected ? 'var(--primary)' : 'var(--border-color)',
                }} />
                <div style={{ flex: 1 }}>
                  {typeof labelContent === 'string'
                    ? <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary-dark)' : 'var(--text-dark)' }}>{labelContent}</span>
                    : labelContent
                  }
                </div>
                {isSelected && <Check size={15} color="var(--primary)" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dropdown;
