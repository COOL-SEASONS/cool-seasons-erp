'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'

const EMPTY_TECH = { tech_code:'', full_name:'', specialty:'', phone:'', nationality:'', hire_date:'', status:'Active', level:'', hourly_rate:'', id_number:'', document_type:'ID', residence_expiry:'', notes:'' }

export default function TechniciansPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY_TECH)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('technicians').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.tech_code?.includes(search))

  const daysLeft = (d: string) => {
    if (!d) return null
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    return diff
  }

  const save = async () => {
    if (!form.tech_code || !form.full_name) return alert('الكود والاسم مطلوبان')
    setSaving(true)
    if (editId) await supabase.from('technicians').update(form).eq('id', editId)
    else await supabase.from('technicians').insert(form)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا الفني؟')) return
    await supabase.from('technicians').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الفنيون</div><div className="page-subtitle">{rows.length} فني مسجل</div></div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_TECH); setEditId(null); setModal(true) }}><Plus size={16}/>إضافة فني</button>
      </div>
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
          <input className="form-input" style={{ paddingRight: 34 }} placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>الكود</th><th>الاسم</th><th>التخصص</th><th>الهاتف</th>
                <th>الجنسية</th><th>الحالة</th><th>الإقامة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cs-text-muted)' }}>لا توجد فنيون</td></tr>
                  : filtered.map(r => {
                    const days = daysLeft(r.residence_expiry)
                    return (
                      <tr key={r.id}>
                        <td><span style={{ fontFamily: 'monospace', background: 'var(--cs-blue-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{r.tech_code}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                        <td>{r.specialty}</td>
                        <td style={{ direction: 'ltr' }}>{r.phone}</td>
                        <td>{r.nationality}</td>
                        <td><span className={`badge ${r.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{r.status === 'Active' ? 'نشط' : r.status}</span></td>
                        <td>
                          {r.residence_expiry ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {days !== null && days <= 30 && <AlertTriangle size={14} color="var(--cs-orange)" />}
                              <span style={{ fontSize: 12, color: days !== null && days <= 30 ? 'var(--cs-orange)' : 'var(--cs-text)' }}>
                                {days !== null ? (days <= 0 ? 'منتهية' : `${days} يوم`) : '—'}
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setForm(r); setEditId(r.id); setModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-blue)' }}><Edit2 size={15}/></button>
                            <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-red)' }}><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 18 }}>{editId ? 'تعديل الفني' : 'إضافة فني جديد'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'tech_code', label: 'كود الفني *' },
                { key: 'full_name', label: 'الاسم الكامل *' },
                { key: 'specialty', label: 'التخصص' },
                { key: 'phone', label: 'الهاتف' },
                { key: 'nationality', label: 'الجنسية' },
                { key: 'level', label: 'المستوى' },
                { key: 'hourly_rate', label: 'سعر/ساعة' },
                { key: 'id_number', label: 'رقم الهوية/الجواز' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={form[f.key]||''} onChange={e => setForm({...form,[f.key]:e.target.value})}/>
                </div>
              ))}
              <div>
                <label className="form-label">تاريخ التعيين</label>
                <input type="date" className="form-input" value={form.hire_date||''} onChange={e => setForm({...form,hire_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">انتهاء الإقامة</label>
                <input type="date" className="form-input" value={form.residence_expiry||''} onChange={e => setForm({...form,residence_expiry:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  <option value="Active">نشط</option>
                  <option value="Inactive">غير نشط</option>
                  <option value="On Leave">إجازة</option>
                </select>
              </div>
              <div>
                <label className="form-label">نوع الوثيقة</label>
                <select className="form-input" value={form.document_type||'ID'} onChange={e => setForm({...form,document_type:e.target.value})}>
                  <option value="ID">هوية</option>
                  <option value="Passport">جواز</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
