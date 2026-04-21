import { useEffect, useMemo, useRef, useState } from "react";

interface BrandColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = ["#ec8228", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#0891b2", "#000000"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeHex(input: string): string {
  const cleaned = input.trim().replace(/[^0-9a-fA-F#]/g, "").toUpperCase();
  if (!cleaned.startsWith("#")) return `#${cleaned}`.slice(0, 7);
  return cleaned.slice(0, 7);
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = isValidHex(hex) ? hex : "#000000";
  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh >= 0 && hh < 1) [r1, g1, b1] = [c, x, 0];
  else if (hh < 2) [r1, g1, b1] = [x, c, 0];
  else if (hh < 3) [r1, g1, b1] = [0, c, x];
  else if (hh < 4) [r1, g1, b1] = [0, x, c];
  else if (hh < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

export function BrandColorPicker({ value, onChange, presets = DEFAULT_PRESETS }: BrandColorPickerProps): import("react").JSX.Element {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const padRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const draggingPadRef = useRef(false);
  const draggingHueRef = useRef(false);

  const hsv = useMemo(() => {
    const { r, g, b } = hexToRgb(value);
    return rgbToHsv(r, g, b);
  }, [value]);

  useEffect(() => {
    setHexDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const updateFromHsv = (nextH: number, nextS: number, nextV: number): void => {
    const { r, g, b } = hsvToRgb(nextH, nextS, nextV);
    onChange(rgbToHex(r, g, b));
  };

  const handlePadPoint = (clientX: number, clientY: number): void => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    updateFromHsv(hsv.h, s, v);
  };

  const handleHuePoint = (clientX: number): void => {
    const hue = hueRef.current;
    if (!hue) return;
    const rect = hue.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    updateFromHsv(ratio * 360, hsv.s, hsv.v);
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (draggingPadRef.current) handlePadPoint(event.clientX, event.clientY);
      if (draggingHueRef.current) handleHuePoint(event.clientX);
    };
    const onUp = () => {
      draggingPadRef.current = false;
      draggingHueRef.current = false;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv.h, hsv.s, hsv.v]);

  const commitHex = (): void => {
    const sanitized = sanitizeHex(hexDraft);
    if (isValidHex(sanitized)) onChange(sanitized);
    else setHexDraft(value);
  };

  const hueColor = useMemo(() => {
    const { r, g, b } = hsvToRgb(hsv.h, 1, 1);
    return rgbToHex(r, g, b);
  }, [hsv.h]);

  const padCursorStyle = {
    left: `${hsv.s * 100}%`,
    top: `${(1 - hsv.v) * 100}%`,
    background: value,
  };
  const hueCursorStyle = { left: `${(hsv.h / 360) * 100}%` };
  const padBackground = {
    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
  };

  return (
    <div className="brand-color-picker" ref={containerRef}>
      <div className="brand-color-picker__swatches">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`brand-color-picker__swatch${value.toUpperCase() === preset.toUpperCase() ? " brand-color-picker__swatch--active" : ""}`}
            style={{ background: preset }}
            onClick={() => onChange(preset.toUpperCase())}
            aria-label={`Color ${preset}`}
          />
        ))}
      </div>

      <div className="brand-color-picker__row">
        <button
          type="button"
          className="brand-color-picker__preview"
          style={{ background: value }}
          onClick={() => setOpen((previous) => !previous)}
          aria-label="Abrir selector de color"
          aria-expanded={open}
        />
        <input
          className="settings-input brand-color-picker__hex"
          value={hexDraft}
          onChange={(event) => setHexDraft(sanitizeHex(event.target.value))}
          onBlur={commitHex}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitHex();
            }
          }}
          placeholder="#000000"
          aria-label="Color en hexadecimal"
          spellCheck={false}
        />
      </div>

      {open ? (
        <div className="brand-color-picker__popover" role="dialog" aria-label="Selector de color">
          <div
            className="brand-color-picker__pad"
            ref={padRef}
            style={padBackground}
            onMouseDown={(event) => {
              draggingPadRef.current = true;
              handlePadPoint(event.clientX, event.clientY);
            }}
          >
            <span className="brand-color-picker__pad-cursor" style={padCursorStyle} />
          </div>
          <div
            className="brand-color-picker__hue"
            ref={hueRef}
            onMouseDown={(event) => {
              draggingHueRef.current = true;
              handleHuePoint(event.clientX);
            }}
          >
            <span className="brand-color-picker__hue-cursor" style={hueCursorStyle} />
          </div>
          <div className="brand-color-picker__popover-footer">
            <span className="brand-color-picker__preview brand-color-picker__preview--sm" style={{ background: value }} />
            <input
              className="settings-input brand-color-picker__hex"
              value={hexDraft}
              onChange={(event) => setHexDraft(sanitizeHex(event.target.value))}
              onBlur={commitHex}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHex();
                }
              }}
              spellCheck={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
