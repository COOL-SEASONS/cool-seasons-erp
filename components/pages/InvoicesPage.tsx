'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { invoice_code:'', project_id:'', client_id:'', invoice_date: new Date().toISOString().split('T')[0], due_date:'', amount:0, paid_amount:0, status:'Draft', payment_date:'', invoice_type:'', notes:'' }

export default function InvoicesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: inv }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('invoices').select('*, clients(company_name), projects(project_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name'),
      supabase.from('projects').select('id, project_name'),
    ])
    setRows(inv || []); setClients(c || []); setProjects(p || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.invoice_code?.includes(search) || r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.invoice_code) return alert('رقم الفاتورة مطلوب')
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount)||0, paid_amount: parseFloat(form.paid_amount)||0 }
    if (editId) await supabase.from('invoices').update(payload).eq('id', editId)
    else await supabase.from('invoices').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذه الفاتورة؟')) return
    await supabase.from('invoices').delete().eq('id', id)
    load()
  }

  const fmt = (n: number) => n ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) : '0'
  const statusMap: any = { Draft: 'badge-gray', Sent: 'badge-blue', Paid: 'badge-green', Partial: 'badge-amber', Overdue: 'badge-red', Cancelled: 'badge-gray' }
  const statusAr: any = { Draft: 'مسودة', Sent: 'مرسلة', Paid: 'مدفوعة', Partial: 'جزئي', Overdue: 'متأخرة', Cancelled: 'ملغية' }

  const totalInv = rows.reduce((s, r) => s + (r.total_amount || 0), 0)
  const totalPaid = rows.reduce((s, r) => s + (r.paid_amount || 0), 0)
  const totalBal = rows.reduce((s, r) => s + (r.balance || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الفواتير</div><div className="page-subtitle">{rows.length} فاتورة</div></div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setModal(true) }}><Plus size={16}/>فاتورة جديدة</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'إجمالي الفواتير', value: fmt(totalInv) + ' ر.س', color: 'var(--cs-blue)' },
          { label: 'المحصّل', value: fmt(totalPaid) + ' ر.س', color: 'var(--cs-green)' },
          { label: 'المستحق', value: fmt(totalBal) + ' ر.س', color: 'var(--cs-red)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize: 12, color: 'var(--cs-text-muted)', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'Cairo,sans-serif' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
          <input className="form-input" style={{ paddingRight: 34 }} placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th><th>الإجمالي+VAT</th>
                <th>المدفوع</th><th>الرصيد</th><th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cs-text-muted)' }}>لا توجد فواتير</td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'monospace', background: 'var(--cs-blue-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{r.invoice_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.clients?.company_name}</td>
                      <td>{fmt(r.amount)} ر.س</td>
                      <td style={{ fontWeight: 600 }}>{fmt(r.total_amount)} ر.س</td>
                      <td style={{ color: 'var(--cs-green)' }}>{fmt(r.paid_amount)} ر.س</td>
                      <td style={{ color: r.balance > 0 ? 'var(--cs-red)' : 'var(--cs-green)' }}>{fmt(r.balance)} ر.س</td>
                      <td><span className={`badge ${statusMap[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setForm({...r,project_id:r.project_id||'',client_id:r.client_id||''}); setEditId(r.id); setModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-blue)' }}><Edit2 size={15}/></button>
                          <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-red)' }}><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 18 }}>{editId?'تعديل الفاتورة':'فاتورة جديدة'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label className="form-label">رقم الفاتورة *</label><input className="form-input" value={form.invoice_code||''} onChange={e=>setForm({...form,invoice_code:e.target.value})}/></div>
              <div>
                <label className="form-label">العميل</label>
                <select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المشروع</label>
                <select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>
              <div><label className="form-label">تاريخ الفاتورة</label><input type="date" className="form-input" value={form.invoice_date||''} onChange={e=>setForm({...form,invoice_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الاستحقاق</label><input type="date" className="form-input" value={form.due_date||''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
              <div><label className="form-label">المبلغ (ر.س)</label><input type="number" className="form-input" value={form.amount||0} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">VAT 15%</label><input className="form-input" readOnly value={((parseFloat(form.amount)||0)*0.15).toFixed(2)+' ر.س'} style={{background:'var(--cs-gray-light)',color:'var(--cs-text-muted)'}}/></div>
              <div><label className="form-label">المدفوع (ر.س)</label><input type="number" className="form-input" value={form.paid_amount||0} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  {['Draft','Sent','Paid','Partial','Overdue','Cancelled'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
