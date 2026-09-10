import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ThemedDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disableSunday?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDisplay(value: string): string {
  if (!value) return 'Select a date';
  return parseIsoDate(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export const ThemedDatePicker: React.FC<ThemedDatePickerProps> = ({
  value,
  onChange,
  min,
  disableSunday = true
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseIsoDate(value) : new Date();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (open) {
      setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [open, value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const minDate = min ? parseIsoDate(min) : undefined;
  const days = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: Date; inMonth: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), i - startOffset + 1);
      cells.push({ date, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({
        date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
        inMonth: false
      });
    }
    return cells;
  }, [cursor]);

  const isDisabled = (date: Date) => {
    if (disableSunday && date.getDay() === 0) return true;
    if (minDate) {
      const compare = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const floor = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (compare < floor) return true;
    }
    return false;
  };

  const panel = isDark
    ? 'bg-slate-800 border-slate-600 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const hover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full p-3 border rounded-xl text-sm text-left flex items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <span>{formatDisplay(value)}</span>
        <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`} />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border shadow-xl p-3 ${panel}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className={`p-1.5 rounded-lg ${hover}`}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold">
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className={`p-1.5 rounded-lg ${hover}`}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className={`text-center text-[11px] font-semibold py-1 ${muted}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, inMonth }) => {
              const iso = toIsoDate(date);
              const selectedDay = iso === value;
              const disabled = isDisabled(date);
              const today = iso === toIsoDate(new Date());

              return (
                <button
                  key={iso + String(inMonth)}
                  type="button"
                  disabled={disabled || !inMonth}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    !inMonth
                      ? 'opacity-0 pointer-events-none'
                      : disabled
                        ? `${muted} opacity-40 cursor-not-allowed`
                        : selectedDay
                          ? 'bg-blue-600 text-white'
                          : today
                            ? isDark
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 text-slate-900'
                            : hover
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
