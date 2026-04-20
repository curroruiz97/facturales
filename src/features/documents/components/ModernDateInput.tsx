import { useEffect, useMemo, useRef, useState } from "react";

interface ModernDateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const year = Number.parseInt(parts[0] ?? "", 10);
  const month = Number.parseInt(parts[1] ?? "", 10);
  const day = Number.parseInt(parts[2] ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildCalendarDays(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const firstWeekDay = (first.getDay() + 6) % 7; // monday-first index
  const gridStart = new Date(year, month, 1 - firstWeekDay);

  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + index);
    return d;
  });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ModernDateInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleccionar fecha",
}: ModernDateInputProps): import("react").JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const years = useMemo(() => {
    const current = viewDate.getFullYear();
    return Array.from({ length: 21 }, (_, i) => current - 10 + i);
  }, [viewDate]);

  const displayValue = selectedDate ? toDisplayDate(selectedDate) : "";
  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();
  const today = new Date();

  return (
    <div className="inv-date-picker" ref={wrapperRef}>
      <button
        type="button"
        className={`inv-date-trigger ${disabled ? "inv-date-trigger--disabled" : ""}`}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        disabled={disabled}
      >
        <span className={`inv-date-trigger__value ${displayValue ? "" : "inv-date-trigger__value--placeholder"}`}>
          {displayValue || placeholder}
        </span>
        <span className="inv-date-trigger__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 2v3M17 2v3M4 9h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="inv-date-popover" role="dialog" aria-label="Selector de fecha">
          <div className="inv-date-popover__header">
            <button
              type="button"
              className="inv-date-nav"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="Mes anterior"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="inv-date-popover__title">
              <select
                className="inv-date-select"
                value={month}
                onChange={(event) => setViewDate(new Date(year, Number.parseInt(event.target.value, 10), 1))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="inv-date-select"
                value={year}
                onChange={(event) => setViewDate(new Date(Number.parseInt(event.target.value, 10), month, 1))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="inv-date-nav"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="Mes siguiente"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="inv-date-weekdays">
            {WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="inv-date-days">
            {calendarDays.map((day) => {
              const inCurrentMonth = day.getMonth() === month;
              const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
              const isToday = sameDay(day, today);
              return (
                <button
                  type="button"
                  key={toIsoDate(day)}
                  className={[
                    "inv-date-day",
                    inCurrentMonth ? "" : "inv-date-day--outside",
                    isSelected ? "inv-date-day--selected" : "",
                    !isSelected && isToday ? "inv-date-day--today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(toIsoDate(day));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
