'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { client_code:'', company_name:'', contact_name:'', phone:'', email:'', city:'', sector:'', status:'Active', notes:'' }

export default function ClientsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search)
  )

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal(true) }
  const openEdit = (r: any) => { setForm(r); setEditId(r.id); setModal(true) }

  const save = async () => {
    if (!form.company_name || !form.client_code) return alert('رقم العميل واسم الشركة مطلوبان')
    setSaving(true)
    if (editId) {
      await supabase.from('clients').update(form).eq('id', editId)
    } else {
      await supabase.from('clients').insert(form)
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('هل تريد حذف هذا العميل؟')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  const statusBadge = (s: string) => {
    const map: any = { Active: 'badge-green', Inactive: 'badge-red', Prospect: 'badge-amber' }
    const labels: any = { Active: 'نشط', Inactive: 'غير نشط', Prospect: 'محتمل' }
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{labels[s] || s}</span>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">العملاء</div>
          <div className="page-subtitle">{rows.length} عميل مسجل</div>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>إضافة عميل</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
          <input className="form-input" style={{ paddingRight: 34 }} placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>الكود</th><th>اسم الشركة</th><th>التواصل</th><th>الهاتف</th>
                <th>المدينة</th><th>القطاع</th><th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cs-text-muted)' }}>لا توجد نتائج</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td><span style={{ fontFamily: 'monospace', background: 'var(--cs-blue-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{r.client_code}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.company_name}</td>
                    <td>{r.contact_name}</td>
                    <td style={{ direction: 'ltr' }}>{r.phone}</td>
                    <td>{r.city}</td>
                    <td>{r.sector}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-blue)' }}><Edit2 size={15}/></button>
                        <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-red)' }}><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 18 }}>{editId ? 'تعديل العميل' : 'إضافة عميل جديد'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'client_code', label: 'رقم العميل *', placeholder: 'CL-001' },
                { key: 'company_name', label: 'اسم الشركة *', placeholder: '' },
                { key: 'contact_name', label: 'اسم التواصل', placeholder: '' },
                { key: 'phone', label: 'الهاتف', placeholder: '05xxxxxxxx' },
                { key: 'email', label: 'البريد الإلكتروني', placeholder: '' },
                { key: 'city', label: 'المدينة', placeholder: '' },
                { key: 'sector', label: 'القطاع', placeholder: 'تجاري / حكومي...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">نشط</option>
                  <option value="Inactive">غير نشط</option>
                  <option value="Prospect">محتمل</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                <Save size={15}/>{saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
