-- =====================================================
-- ربط تقارير الصيانة بعقود AMC + جدول قطع الغيار
-- شغّل في Supabase → SQL Editor → Run
-- =====================================================

-- 1. ربط maint_reports بعقود AMC
ALTER TABLE maint_reports ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts_amc(id);

-- 2. جدول قطع الغيار المرتبطة بعقود AMC
CREATE TABLE IF NOT EXISTS amc_parts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_code        TEXT,
  contract_id      UUID REFERENCES contracts_amc(id),
  client_id        UUID REFERENCES clients(id),
  invoice_no       TEXT,
  invoice_date     DATE,
  part_name        TEXT NOT NULL,
  part_number      TEXT,
  qty              INTEGER DEFAULT 1,
  unit_cost        NUMERIC(14,2) DEFAULT 0,   -- تكلفة الشراء
  unit_price       NUMERIC(14,2) DEFAULT 0,   -- سعر البيع للعميل (بدون هامش = نفس التكلفة)
  total_cost       NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  total_price      NUMERIC(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  supplier         TEXT,
  status           TEXT DEFAULT 'Pending',    -- Pending, Invoiced, Paid
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. تعطيل RLS للتطوير
ALTER TABLE amc_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE maint_reports DISABLE ROW LEVEL SECURITY;

SELECT 'SUCCESS ✅' AS result;
