'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const STATUSES   = ['Pending','Partial','Paid']
const STATUS_AR: Record<string,string> = { Pending:'معلق', Partial:'جزئي', Paid:'مدفوع' }
const STATUS_C:  Record<string,string> = { Pending:'badge-amber', Partial:'badge-blue', Paid:'badge-green' }

const emptyForm = () => ({
  record_id:      '',
  tech_id:        '',
  project_id:     '',
  period_month:   new Date().toISOString().slice(0, 7), // YYYY-MM
  sales_amount:   '0',
  commission_pct: '5',
  paid_amount:    '0',
  status:         'Pending',
  notes:          '',
})

export default function CommissionsPage() {
  const [rows,     setRows]     = useState<any[]>([])
  const [techs,    setTechs]    = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState<string|null>(null)
  const [form,     setForm]     = useState<any>(emptyForm())

  const load = async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase
        .from('commissions')
        .select('*, projects(project_name), technicians(full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status', 'Active'),
    ])
    setRows(c || [])
    setProjects(p || [])
    setTechs(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(emptyForm())
    setEditId(null)
    setModal(true)
  }

  const openEdit = (r: any) => {
    setForm({
      record_id:      r.record_id      || '',
      tech_id:        r.tech_id        || '',
      project_id:     r.project_id     || '',
      period_month:   r.period_month   || '',
      sales_amount:   String(r.sales_amount   || 0),
      commission_pct: String(r.commission_pct || 5),
      paid_amount:    String(r.paid_amount    || 0),
      status:         r.status         || 'Pending',
      notes:          r.notes          || '',
    })
    setEditId(r.id)
    setModal(true)
  }

  const save = async () => {
    if (!form.tech_id) { alert('الفني مطلوب'); return }
    setSaving(true)

    const sales  = parseFloat(form.sales_amount)   || 0
    const pct    = parseFloat(form.commission_pct) || 0
    const paid   = parseFloat(form.paid_amount)    || 0

    // ✅ commission_amt is EXCLUDED — it's a generated/computed column in the DB
    // The DB calculates it automatically as: sales_amount * commission_pct / 100
    const payload = {
      record_id:      form.record_id      || null,
      tech_id:        form.tech_id        || null,
      project_id:     form.project_id     || null,
      period_month:   form.period_month   || null,
      sales_amount:   sales,
      commission_pct: pct,
      paid_amount:    paid,
      status:         form.status         || 'Pending',
      notes:          form.notes          || null,
    }

    const { error } = editId
      ? await supabase.from('commissions').update(payload).eq('id', editId)
      : await supabase.from('commissions').insert(payload)

    setSaving(false)

    if (error) {
      // Fallback: if commission_amt still causes error, it might not be generated
      // Try sending it explicitly
      if (error.message?.includes('commission_amt')) {
        const fallback = { ...payload, commission_amt: Math.round(sales * pct) / 100 }
        const { error: e2 } = editId
          ? await supabase.from('commissions').update(fallback).eq('id', editId)
          : await supabase.from('commissions').insert(fallback)
        if (e2) { alert('خطأ: ' + e2.message); return }
      } else {
        alert('خطأ: ' + error.message)
        return
      }
    }

    setModal(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return
    await supabase.from('commissions').delete().eq('id', id)
    load()
  }

  const fmt   = (n: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n || 0)
  const set   = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  // Computed display value
  const calcCommission = (r: any) => {
    // Use DB value if available, else compute
    if (r.commission_amt != null) return r.commission_amt
    return ((r.sales_amount || 0) * (r.commission_pct || 0)) / 100
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (
      (r.technicians?.full_name || '').toLowerCase().includes(q) ||
      (r.projects?.project_name || '').toLowerCase().includes(q) ||
      (r.record_id || '').toLowerCase().includes(q)
    )
  })

  // Summary cards
  const totalCommission = rows.reduce((s, r) => s + calcCommission(r), 0)
  const totalPaid       = rows.reduce((s, r) => s + (r.paid_amount || 0), 0)
  const totalPending    = totalCommission - totalPaid

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">العمولات</h1>
          <p className="page-subtitle">{rows.length} سجل</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16}/> طباعة
          </button>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16}/> سجل عمولة
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'إجمالي العمولات المحسوبة', value:`${fmt(totalCommission)} ر.س`, color:'var(--cs-blue)' },
          { label:'إجمالي المدفوع',            value:`${fmt(totalPaid)} ر.س`,       color:'#27AE60' },
          { label:'المتبقي',                   value:`${fmt(totalPending)} ر.س`,    color:'var(--cs-red)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize:12, color:'var(--cs-text-muted)', marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'Cairo,sans-serif' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom:20 }}>
        <Search size={16} style={{ color:'var(--cs-text-muted)', flexShrink:0 }}/>
        <input
          className="search-input"
          placeholder="بحث بالوسيط أو المشروع..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>الوسيط</th>
              <th>المشروع</th>
              <th>الفترة</th>
              <th>قيمة المبيعات (ر.س)</th>
              <th>نسبة العمولة %</th>
              <th>العمولة المحسوبة</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:40 }}>
                <div className="loading-spinner"/>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>
                لا توجد سجلات
              </td></tr>
            ) : filtered.map(r => {
              const commission = calcCommission(r)
              const remaining  = commission - (r.paid_amount || 0)
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight:600 }}>{r.technicians?.full_name || '—'}</td>
                  <td style={{ color:'var(--cs-text-muted)', fontSize:13 }}>{r.projects?.project_name || '—'}</td>
                  <td style={{ fontSize:13 }}>{r.period_month || '—'}</td>
                  <td style={{ fontWeight:600 }}>{fmt(r.sales_amount)} ر.س</td>
                  <td style={{ textAlign:'center' }}>{r.commission_pct || 0}%</td>
                  <td style={{ fontWeight:700, color:'var(--cs-blue)' }}>{fmt(commission)} ر.س</td>
                  <td style={{ color:'#27AE60', fontWeight:600 }}>{fmt(r.paid_amount)} ر.س</td>
                  <td style={{ color: remaining > 0 ? 'var(--cs-red)' : '#27AE60', fontWeight:600 }}>
                    {fmt(remaining)} ر.س
                  </td>
                  <td>
                    <span className={`badge ${STATUS_C[r.status] || 'badge-gray'}`}>
                      {STATUS_AR[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="icon-btn" onClick={() => openEdit(r)} title="تعديل">
                        <Edit2 size={15}/>
                      </button>
                      <button className="icon-btn icon-btn-danger" onClick={() => del(r.id)} title="حذف">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'تعديل عمولة' : 'سجل عمولة جديد'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18}/></button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:8 }}>
              <div>
                <label className="form-label">الوسيط / الفني *</label>
                <select className="form-input" value={form.tech_id} onChange={e => set('tech_id', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المشروع</label>
                <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">-- اختر المشروع --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">قيمة المبيعات (ر.س)</label>
                <input
                  type="number" min={0} className="form-input"
                  value={form.sales_amount}
                  onChange={e => set('sales_amount', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">نسبة العمولة %</label>
                <input
                  type="number" min={0} max={100} step={0.5} className="form-input"
                  value={form.commission_pct}
                  onChange={e => set('commission_pct', e.target.value)}
                />
              </div>

              {/* Computed display — read only */}
              <div>
                <label className="form-label">العمولة المحسوبة (تلقائي)</label>
                <input
                  className="form-input" readOnly
                  value={`${(((parseFloat(form.sales_amount)||0) * (parseFloat(form.commission_pct)||0)) / 100).toFixed(2)} ر.س`}
                  style={{ background:'var(--cs-gray-light)', color:'var(--cs-blue)', fontWeight:700 }}
                />
              </div>
              <div>
                <label className="form-label">المدفوع (ر.س)</label>
                <input
                  type="number" min={0} className="form-input"
                  value={form.paid_amount}
                  onChange={e => set('paid_amount', e.target.value)}
                />
              </div>

              {/* Remaining display */}
              <div>
                <label className="form-label">المتبقي (تلقائي)</label>
                <input
                  className="form-input" readOnly
                  value={`${Math.max(0, (((parseFloat(form.sales_amount)||0) * (parseFloat(form.commission_pct)||0)) / 100) - (parseFloat(form.paid_amount)||0)).toFixed(2)} ر.س`}
                  style={{ background:'var(--cs-gray-light)', color:'var(--cs-red)', fontWeight:700 }}
                />
              </div>
              <div>
                <label className="form-label">الفترة</label>
                <input
                  type="month" className="form-input"
                  value={form.period_month}
                  onChange={e => set('period_month', e.target.value)}
                />
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                <Save size={15}/> {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
