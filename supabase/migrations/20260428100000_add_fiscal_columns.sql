-- Mejoras del resumen fiscal:
-- 1. Marcar gastos como deducibles o no fiscalmente
-- 2. Indicar el régimen IRPF del autónomo (estimación directa simplificada / normal / objetiva)
-- 3. Permitir activar/desactivar la deducción del 7% por gastos de difícil justificación
--    (estimación directa simplificada — Ley 28/2022, tope 2000€/año desde 2023)

-- 1) Campo `deducible` en transacciones
-- DEFAULT TRUE para que las transacciones existentes sigan computando como deducibles
-- (que es el comportamiento previo).
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS deducible BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN transacciones.deducible IS
  'Si el gasto es deducible fiscalmente. Solo aplica a tipo=gasto.';

-- 2) Régimen IRPF en business_info
ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS irpf_regime TEXT
    DEFAULT 'estimacion_directa_simplificada';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_info_irpf_regime_check'
  ) THEN
    ALTER TABLE business_info
      ADD CONSTRAINT business_info_irpf_regime_check
      CHECK (irpf_regime IN (
        'estimacion_directa_simplificada',
        'estimacion_directa_normal',
        'estimacion_objetiva'
      ));
  END IF;
END $$;

COMMENT ON COLUMN business_info.irpf_regime IS
  'Régimen fiscal del autónomo. Determina si se aplica el 7% de difícil justificación.';

-- 3) Toggle del 7% de gasto de difícil justificación
ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS apply_difficult_justification BOOLEAN
    NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN business_info.apply_difficult_justification IS
  'Si se aplica la deducción del 7% por gastos de difícil justificación (Modelo 130). Solo válido en estimación directa simplificada. Tope 2000€/año.';
