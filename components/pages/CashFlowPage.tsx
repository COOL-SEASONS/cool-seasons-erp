'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save , Printer } from 'lucide-react'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const INCOME_ITEMS = [
  { key:'invoice_collection', label:'💼 تحصيل فواتير المشاريع' },
  { key:'amc_payments',       label:'📋 دفعات عقود AMC' },
  { key:'maintenance_jobs',   label:'🔧 أعمال صيانة طارئة' },
  { key:'advance_payments',   label:'📄 دفعات مقدمة عقود جديدة' },
  { key:'accepted_quotes',    label:'💰 تحصيل عروض أسعار مقبولة' },
]
const EXPENSE_ITEMS = [
  { key:'salaries',           label:'👷 رواتب الفنيين' },
  { key:'materials',          label:'🔩 مواد وقطع غيار' },
  { key:'vehicles',           label:'🚗 مصاريف المركبات' },
  { key:'rent_utilities',     label:'🏢 إيجار ومرافق' },
  { key:'contractors_pay',    label:'🔨 مدفوعات المقاولين' },
  { key:'other_expenses',     label:'📦 مصاريف أخرى' },
]

type FlowData = Record<string, number[]>

export default function CashFlowPage() {
  const [openingBalance, setOpeningBalance] = useState<number>(50000)
  const [income, setIncome] = useState<FlowData>({})
  const [expenses, setExpenses] = useState<FlowData>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Initialize with zeros
  useEffect(() => {
    const initData = (items: typeof INCOME_ITEMS) => {
      const d: FlowData = {}
      items.forEach(item => { d[item.key] = Array(12).fill(0) })
      return d
    }
    // Load from Supabase if saved
    async function load() {
      const { data } = await supabase.from('cash_flow').select('*').limit(1).maybeSingle()
      if (data?.flow_data) {
        setOpeningBalance(data.flow_data.openingBalance || 50000)
        setIncome(data.flow_data.income || initData(INCOME_ITEMS))
        setExpenses(data.flow_data.expenses || initData(EXPENSE_ITEMS))
      } else {
        setIncome(initData(INCOME_ITEMS))
        setExpenses(initData(EXPENSE_ITEMS))
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateVal = (
    setter: React.Dispatch<React.SetStateAction<FlowData>>,
    key: string, month: number, val: string
  ) => {
    setter(prev => {
      const updated = { ...prev, [key]: [...(prev[key] || Array(12).fill(0))] }
      updated[key][month] = parseFloat(val) || 0
      return updated
    })
  }

  const totalIncome = (m: number) => INCOME_ITEMS.reduce((s, i) => s + (income[i.key]?.[m] || 0), 0)
  const totalExpenses = (m: number) => EXPENSE_ITEMS.reduce((s, i) => s + (expenses[i.key]?.[m] || 0), 0)
  const netCashFlow = (m: number) => totalIncome(m) - totalExpenses(m)
  const closingBalance = (m: number) => {
    let bal = openingBalance
    for (let i = 0; i <= m; i++) bal += netCashFlow(i)
    return bal
  }

  const save = async () => {
    setSaving(true)
    const flowData = { openingBalance, income, expenses }
    const { data: existing } = await supabase.from('cash_flow').select('id').limit(1).maybeSingle()
    if (existing) {
      await supabase.from('cash_flow').update({ flow_data: flowData }).eq('id', existing.id)
    } else {
      await supabase.from('cash_flow').insert({ flow_data: flowData, period: 'annual' })
    }
    setSaving(false)
    alert('تم الحفظ ✅')
  }

  const fmt = (n: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n || 0)
  const annualIncome = MONTHS.reduce((s, _, m) => s + totalIncome(m), 0)
  const annualExpenses = MONTHS.reduce((s, _, m) => s + totalExpenses(m), 0)
  const annualNet = annualIncome - annualExpenses

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">التدفق النقدي</div>
          <div className="page-subtitle">Cash Flow — السنة الحالية</div>
        </div>
        <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={16} />{saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'الرصيد الافتتاحي', v: fmt(openingBalance) + ' ر.س', c: 'var(--cs-blue)' },
          { l: 'إجمالي الداخلات', v: fmt(annualIncome) + ' ر.س', c: 'var(--cs-green)' },
          { l: 'إجمالي الخارجات', v: fmt(annualExpenses) + ' ر.س', c: 'var(--cs-red)' },
          { l: 'صافي التدفق', v: fmt(annualNet) + ' ر.س', c: annualNet >= 0 ? 'var(--cs-green)' : 'var(--cs-red)' },
          { l: 'الرصيد الختامي', v: fmt(closingBalance(11)) + ' ر.س', c: 'var(--cs-blue)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize: 11, color: 'var(--cs-text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Opening balance input */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label className="form-label" style={{ marginBottom: 0, minWidth: 150 }}>💰 الرصيد الافتتاحي (ر.س):</label>
        <input type="number" className="form-input" style={{ maxWidth: 200 }} value={openingBalance}
          onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr style={{ background: 'var(--cs-blue)', color: 'white' }}>
                <th style={{ padding: '10px 14px', textAlign: 'right', width: 220, fontSize: 13 }}>البند</th>
                {MONTHS.map((m, i) => (
                  <th key={i} style={{ padding: '10px 8px', textAlign: 'center', minWidth: 90, fontSize: 12 }}>{m}</th>
                ))}
                <th style={{ padding: '10px 8px', textAlign: 'center', minWidth: 100, fontSize: 12, background: '#1670A0' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {/* Income section */}
              <tr style={{ background: '#E8F8EF' }}>
                <td colSpan={14} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, color: 'var(--cs-green)' }}>📥 الداخلات — المقبوضات</td>
              </tr>
              {INCOME_ITEMS.map(item => (
                <tr key={item.key} style={{ borderBottom: '1px solid var(--cs-border)' }}>
                  <td style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>{item.label}</td>
                  {MONTHS.map((_, m) => (
                    <td key={m} style={{ padding: '4px 6px' }}>
                      <input type="number" min="0"
                        style={{ width: '100%', border: '1px solid var(--cs-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, textAlign: 'center', fontFamily: 'Cairo,sans-serif' }}
                        value={income[item.key]?.[m] || 0}
                        onChange={e => updateVal(setIncome, item.key, m, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--cs-green)', background: '#F0FFF4', fontSize: 12 }}>
                    {fmt(MONTHS.reduce((s, _, m) => s + (income[item.key]?.[m] || 0), 0))}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#D4EDDA', fontWeight: 700 }}>
                <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--cs-green)' }}>📊 إجمالي الداخلات</td>
                {MONTHS.map((_, m) => (
                  <td key={m} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12, color: 'var(--cs-green)' }}>{fmt(totalIncome(m))}</td>
                ))}
                <td style={{ padding: '8px', textAlign: 'center', color: 'var(--cs-green)', fontSize: 13 }}>{fmt(annualIncome)}</td>
              </tr>

              {/* Expense section */}
              <tr style={{ background: '#FDECEA' }}>
                <td colSpan={14} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, color: 'var(--cs-red)' }}>📤 الخارجات — المدفوعات</td>
              </tr>
              {EXPENSE_ITEMS.map(item => (
                <tr key={item.key} style={{ borderBottom: '1px solid var(--cs-border)' }}>
                  <td style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>{item.label}</td>
                  {MONTHS.map((_, m) => (
                    <td key={m} style={{ padding: '4px 6px' }}>
                      <input type="number" min="0"
                        style={{ width: '100%', border: '1px solid var(--cs-border)', borderRadius: 6, padding: '4px 6px', fontSize: 12, textAlign: 'center', fontFamily: 'Cairo,sans-serif' }}
                        value={expenses[item.key]?.[m] || 0}
                        onChange={e => updateVal(setExpenses, item.key, m, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--cs-red)', background: '#FFF5F5', fontSize: 12 }}>
                    {fmt(MONTHS.reduce((s, _, m) => s + (expenses[item.key]?.[m] || 0), 0))}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#FDECEA', fontWeight: 700 }}>
                <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--cs-red)' }}>📊 إجمالي الخارجات</td>
                {MONTHS.map((_, m) => (
                  <td key={m} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12, color: 'var(--cs-red)' }}>{fmt(totalExpenses(m))}</td>
                ))}
                <td style={{ padding: '8px', textAlign: 'center', color: 'var(--cs-red)', fontSize: 13 }}>{fmt(annualExpenses)}</td>
              </tr>

              {/* Net flow */}
              <tr style={{ background: '#EBF5FB', fontWeight: 700 }}>
                <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--cs-blue)' }}>💹 صافي التدفق الشهري</td>
                {MONTHS.map((_, m) => {
                  const net = netCashFlow(m)
                  return (
                    <td key={m} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: net >= 0 ? 'var(--cs-green)' : 'var(--cs-red)' }}>
                      {net >= 0 ? '+' : ''}{fmt(net)}
                    </td>
                  )
                })}
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontSize: 13, color: annualNet >= 0 ? 'var(--cs-green)' : 'var(--cs-red)' }}>
                  {annualNet >= 0 ? '+' : ''}{fmt(annualNet)}
                </td>
              </tr>

              {/* Closing balance */}
              <tr style={{ background: 'var(--cs-blue)', color: 'white', fontWeight: 700 }}>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>🏦 الرصيد الختامي</td>
                {MONTHS.map((_, m) => {
                  const bal = closingBalance(m)
                  return (
                    <td key={m} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: bal >= 0 ? '#90EE90' : '#FFB3B3' }}>
                      {fmt(bal)}
                    </td>
                  )
                })}
                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{fmt(closingBalance(11))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
