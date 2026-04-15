import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['D','S','T','Q','Q','S','S'];

const DatePicker = ({ value, onChange }) => {
  const today = new Date();
  const parsed = value ? new Date(value + 'T12:00:00') : today;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ month: parsed.getMonth(), year: parsed.getFullYear() });
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value + 'T12:00:00') : null;

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    if (!selectedDate) return 'Selecione a data';
    return selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const daysCount = getDaysInMonth(view.month, view.year);
  const firstDay = getFirstDayOfMonth(view.month, view.year);
  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysCount }, (_, i) => i + 1)
  );
  // Pad to complete last row
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

      {open && (
        <div className="dp-panel">
          {/* Header */}
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

          {/* Weekday labels */}
          <div className="dp-weekdays">
            {DAYS.map((d, i) => <span key={i} className="dp-weekday">{d}</span>)}
          </div>

          {/* Days grid */}
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

          {/* Footer */}
          <div className="dp-footer">
            <button type="button" className="dp-footer-btn" onClick={() => { const t = today; setView({ month: t.getMonth(), year: t.getFullYear() }); handleSelect(t.getDate()); }}>
              Hoje
            </button>
            <button type="button" className="dp-footer-btn dp-footer-clear" onClick={() => { onChange(''); setOpen(false); }}>
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
