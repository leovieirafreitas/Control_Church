import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['D','S','T','Q','Q','S','S'];

const DatePicker = ({ value, onChange, placeholder = 'Selecione a data' }) => {
  const today = new Date();
  const parsed = value ? new Date(value + 'T12:00:00') : today;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ month: parsed.getMonth(), year: parsed.getFullYear() });
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value + 'T12:00:00') : null;

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Verifica se o clique foi no painel (que está no portal)
        const panel = document.getElementById('dp-portal-panel');
        if (panel && panel.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const panelHeight = 340; // Altura aproximada do painel
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldOpenUp = spaceBelow < panelHeight && rect.top > panelHeight;

      setCoords({
        top: shouldOpenUp 
          ? rect.top + window.scrollY - panelHeight - 6 
          : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
        openUp: shouldOpenUp
      });
    }
  }, [open]);

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setView(v => {
      if (v.month === 0) return { month: 11, year: v.year - 1 };
      return { month: v.month - 1, year: v.year };
    });
  };

  const nextMonth = () => {
    setView(v => {
      if (v.month === 11) return { month: 0, year: v.year + 1 };
      return { month: v.month + 1, year: v.year };
    });
  };

  const handleSelect = (day) => {
    const month = String(view.month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${view.year}-${month}-${dayStr}`);
    setOpen(false);
  };

  const isToday = (day) => {
    return day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && view.month === selectedDate.getMonth() && view.year === selectedDate.getFullYear();
  };

  const formatDisplay = () => {
    if (!selectedDate) return placeholder;
    return selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const daysCount = getDaysInMonth(view.month, view.year);
  const firstDay = getFirstDayOfMonth(view.month, view.year);
  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysCount }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="dp-wrap" ref={containerRef}>
      <button
        type="button"
        className={`dp-trigger ${open ? 'dp-trigger-open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <CalendarDays size={17} className="dp-trigger-icon" />
        <span className={`dp-trigger-text ${!selectedDate ? 'dp-placeholder' : ''}`}>
          {formatDisplay()}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: open ? 'var(--primary)' : 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease, color 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {open && ReactDOM.createPortal(
        <div 
          id="dp-portal-panel"
          className="dp-panel" 
          style={{ 
            position: 'absolute', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            width: '280px',
            zIndex: 9999,
            animation: coords.openUp ? 'fadeIn 0.15s ease' : 'fadeInDown 0.15s ease'
          }}
        >
          <div className="dp-header">
            <button type="button" className="dp-nav" onClick={prevMonth}>
              <ChevronLeft size={18} />
            </button>
            <span className="dp-month-label">
              {MONTHS[view.month]} {view.year}
            </span>
            <button type="button" className="dp-nav" onClick={nextMonth}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="dp-weekdays">
            {DAYS.map((d, i) => <span key={i} className="dp-weekday">{d}</span>)}
          </div>

          <div className="dp-grid">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                className={`dp-day ${!day ? 'dp-day-empty' : ''} ${isSelected(day) ? 'dp-day-selected' : ''} ${isToday(day) && !isSelected(day) ? 'dp-day-today' : ''}`}
                onClick={() => day && handleSelect(day)}
                disabled={!day}
              >
                {day || ''}
              </button>
            ))}
          </div>

          <div className="dp-footer">
            <button type="button" className="dp-footer-btn" onClick={() => { const t = today; setView({ month: t.getMonth(), year: t.getFullYear() }); handleSelect(t.getDate()); }}>
              Hoje
            </button>
            <button type="button" className="dp-footer-btn dp-footer-clear" onClick={() => { onChange(''); setOpen(false); }}>
              Limpar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DatePicker;
