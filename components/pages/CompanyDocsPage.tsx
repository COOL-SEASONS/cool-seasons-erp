'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle, RefreshCw, Printer } from 'lucide-react'

const EMPTY = {
  doc_name: '', doc_type: '', doc_number: '',
  issue_date: '', expiry_date: '',
  is_monthly: false, renewal_months: 1,
  file_url: '', notes: ''
}

const DOC_TYPES = [
  'السجل التجاري','الرخصة البلدية','شهادة الزكاة','شهادة الانتساب للغرفة',
  'شهادة الجودة ISO','شهادة السلامة','رخصة المنشأة',
  'عضوية هيئة المهندسين','اشتراك قوى','اشتراك ابشر اعمال','التأمينات الاجتماعية',
  'أخرى'
]

export default function CompanyDocsPage() {
  const [rows,    setRows]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]= useState<any>(null)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState<any>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [renewing,setRenewing]= useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('company_docs').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    r.doc_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.doc_type?.toLowerCase().includes(search.toLowerCase()) ||
    r.doc_number?.includes(search)
  )

  const daysLeft = (d: string) => {
    if (!d) return null
    return Math.ceil((new Date(d.split('T')[0]).getTime() - Date.now()) / 86400000)
  }

  // ✅ تنبيه 10 أيام للوثائق الشهرية، 30 يوم للبقية
  const alertThreshold = (r: any) => r.is_monthly ? 10 : 30

  const statusBadge = (r: any) => {
    const days     = daysLeft(r.expiry_date)
    const thresh   = alertThreshold(r)
    if (days === null) return <span className="badge badge-gray">غير محدد</span>
    if (days <= 0)     return <span className="badge badge-red">منتهية</span>
    if (days <= thresh) return (
      <span className="badge badge-amber">
        {r.is_monthly && '🔄 '}{days} يوم ⚠️
      </span>
    )
    if (days <= 60) return <span className="badge badge-blue">{days} يوم</span>
    return <span className="badge badge-green">{r.is_monthly ? '🔄 شهري' : 'سارية'}</span>
  }

  // ✅ تجديد الوثيقة — يضيف renewal_months شهراً على تاريخ الانتهاء الحالي
  const renewDoc = async (r: any) => {
    setRenewing(r.id)
    const base = new Date(r.expiry_date?.split('T')[0] || new Date())
    // إذا كانت منتهية نبدأ من اليوم
    const startDate = base < new Date() ? new Date() : base
    startDate.setMonth(startDate.getMonth() + (r.renewal_months || 1))
    const newExpiry = startDate.toISOString().split('T')[0]
    const { error } = await supabase.from('company_docs').update({ expiry_date: newExpiry }).eq('id', r.id)
    if (error) alert('خطأ: ' + error.message)
    else {
      await load()
      alert(`✅ تم تجديد "${r.doc_name}"\nتاريخ الانتهاء الجديد: ${newExpiry}`)
    }
    setRenewing(null)
  }

  const save = async () => {
    if (!form.doc_name) return alert('اسم الوثيقة مطلوب')
    setSaving(true)
    const payload = {
      doc_name:       form.doc_name,
      doc_type:       form.doc_type || null,
      doc_number:     form.doc_number || null,
      issue_date:     form.issue_date || null,
      expiry_date:    form.expiry_date || null,
      is_monthly:     form.is_monthly || false,
      renewal_months: parseInt(form.renewal_months) || 1,
      file_url:       form.file_url || null,
      notes:          form.notes || null,
    }
    if (editId) await supabase.from('company_docs').update(payload).eq('id', editId)
    else        await supabase.from('company_docs').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذه الوثيقة؟')) return
    await supabase.from('company_docs').delete().eq('id', id); load()
  }

  const expiredDocs = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d <= 0 })
  const soonDocs    = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d > 0 && d <= alertThreshold(r) })
  const laterDocs   = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d > alertThreshold(r) && d <= 60 })
  const monthlyDocs = rows.filter(r => r.is_monthly)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">وثائق وتراخيص الشركة</div>
          <div className="page-subtitle">{rows.length} وثيقة · {monthlyDocs.length} شهرية</div>
        </div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setModal(true) }}>
          <Plus size={16}/>إضافة وثيقة
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { l:'منتهية',          v: expiredDocs.length, c:'#C0392B' },
          { l:'تنبيه قريب ⚠️',  v: soonDocs.length,    c:'#E67E22', sub:'10 يوم للشهرية / 30 للبقية' },
          { l:'تنتهي خلال 60 يوم', v: laterDocs.length, c:'#1E9CD7' },
          { l:'سارية',           v: rows.length - expiredDocs.length - soonDocs.length - laterDocs.length, c:'#27AE60' },
          { l:'🔄 تجديد شهري',  v: monthlyDocs.length, c:'#7C3AED' },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{ borderRight:`3px solid ${s.c}`, borderRadius:'0 12px 12px 0' }}>
            <div style={{ fontSize:11, color:s.c, fontWeight:600, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.c }}>{s.v}</div>
            {s.sub && <div style={{ fontSize:9, color:'var(--cs-text-muted)', marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* تنبيه الوثائق الشهرية المقتربة */}
      {soonDocs.filter(r=>r.is_monthly).length > 0 && (
        <div style={{ background:'#F5F3FF', border:'1px solid #C4B5FD', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'flex-start', gap:10 }}>
          <RefreshCw size={15} color="#7C3AED" style={{ marginTop:2, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#6D28D9', marginBottom:4 }}>
              وثائق شهرية تحتاج تجديد قريباً
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {soonDocs.filter(r=>r.is_monthly).map(r => {
                const days = daysLeft(r.expiry_date)
                return (
                  <div key={r.id} style={{ background:'white', border:'1px solid #C4B5FD', borderRadius:6, padding:'4px 10px', display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                    <span style={{ fontWeight:600, color:'#6D28D9' }}>{r.doc_name}</span>
                    <span style={{ color:'#7C3AED' }}>{days !== null && days <= 0 ? 'منتهية' : `${days} يوم`}</span>
                    <button onClick={() => renewDoc(r)} disabled={renewing===r.id}
                      style={{ background:'#7C3AED', color:'white', border:'none', borderRadius:4, padding:'2px 8px', cursor:'pointer', fontSize:10, fontFamily:'Tajawal,sans-serif', fontWeight:700 }}>
                      {renewing===r.id ? '...' : 'تجديد'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
        <div style={{ position:'relative' }}>
          <Search size={16} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--cs-text-muted)' }}/>
          <input className="form-input" style={{ paddingRight:34 }} placeholder="بحث بالاسم أو النوع أو الرقم..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>اسم الوثيقة</th><th>النوع</th><th>رقم الوثيقة</th>
                <th>تاريخ الإصدار</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th>
                <th>التجديد</th><th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد وثائق</td></tr>
                  : filtered.map(r => {
                    const days   = daysLeft(r.expiry_date)
                    const thresh = alertThreshold(r)
                    const rowBg  = days !== null && days <= 0 ? '#FFF5F5'
                      : days !== null && days <= thresh ? '#FFFBF0' : 'inherit'
                    return (
                      <tr key={r.id} style={{ background: rowBg }}>
                        <td style={{ fontWeight:600 }}>
                          {r.doc_name}
                          {r.is_monthly && <span style={{ fontSize:10, background:'#F5F3FF', color:'#7C3AED', padding:'1px 6px', borderRadius:4, fontWeight:700, marginRight:6 }}>🔄 شهري</span>}
                        </td>
                        <td style={{ fontSize:12 }}>{r.doc_type}</td>
                        <td style={{ fontFamily:'monospace', fontSize:12 }}>{r.doc_number||'—'}</td>
                        <td style={{ fontSize:12 }}>{r.issue_date?.split('T')[0]||'—'}</td>
                        <td style={{ fontSize:12, color: days !== null && days <= thresh ? '#C0392B' : 'inherit', fontWeight: days !== null && days <= thresh ? 700 : 400 }}>
                          {r.expiry_date?.split('T')[0]||'—'}
                        </td>
                        <td>
                          {days !== null ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              {days <= 0
                                ? <AlertTriangle size={13} color="#C0392B"/>
                                : days <= thresh
                                  ? <AlertTriangle size={13} color="#E67E22"/>
                                  : <CheckCircle size={13} color="#27AE60"/>}
                              <span style={{ fontSize:12, fontWeight:600, color: days<=0?'#C0392B':days<=thresh?'#E67E22':'#27AE60' }}>
                                {days <= 0 ? 'منتهية' : `${days} يوم`}
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {r.is_monthly ? (
                            <button onClick={() => renewDoc(r)} disabled={renewing===r.id}
                              style={{ display:'flex', alignItems:'center', gap:4, background: days!==null&&days<=thresh?'#7C3AED':'#F5F3FF', color: days!==null&&days<=thresh?'white':'#7C3AED', border:'1px solid #C4B5FD', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontFamily:'Tajawal,sans-serif', fontWeight:700 }}>
                              <RefreshCw size={11}/>
                              {renewing===r.id ? 'جاري...' : `تجديد +${r.renewal_months||1}ش`}
                            </button>
                          ) : <span style={{ fontSize:11, color:'var(--cs-text-muted)' }}>—</span>}
                        </td>
                        <td>{statusBadge(r)}</td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => setViewItem(r)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-green)' }}><Printer size={13}/></button>
                            <button onClick={() => { setForm({ ...r, is_monthly: r.is_monthly||false, renewal_months: r.renewal_months||1 }); setEditId(r.id); setModal(true) }}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-blue)' }}><Edit2 size={13}/></button>
                            <button onClick={() => del(r.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-red)' }}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="card" style={{ width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:18 }}>{editId?'تعديل الوثيقة':'وثيقة جديدة'}</div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">اسم الوثيقة *</label>
                <input className="form-input" value={form.doc_name||''} onChange={e=>setForm({...form,doc_name:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">نوع الوثيقة</label>
                <select className="form-input" value={form.doc_type||''} onChange={e=>setForm({...form,doc_type:e.target.value})}>
                  <option value="">اختر...</option>
                  {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">رقم الوثيقة</label>
                <input className="form-input" value={form.doc_number||''} onChange={e=>setForm({...form,doc_number:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">تاريخ الإصدار</label>
                <input type="date" className="form-input" value={form.issue_date||''} onChange={e=>setForm({...form,issue_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">تاريخ الانتهاء</label>
                <input type="date" className="form-input" value={form.expiry_date||''} onChange={e=>setForm({...form,expiry_date:e.target.value})}/>
              </div>

              {/* ✅ خيار التجديد الشهري */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ background:'#F5F3FF', border:`2px solid ${form.is_monthly?'#7C3AED':'#E5E7EB'}`, borderRadius:10, padding:'12px 14px', transition:'border-color .15s' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
                    <input type="checkbox" checked={form.is_monthly||false}
                      onChange={e => setForm({...form, is_monthly: e.target.checked})}
                      style={{ width:18, height:18, accentColor:'#7C3AED', cursor:'pointer' }}/>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color: form.is_monthly?'#7C3AED':'#374151' }}>
                        🔄 وثيقة ذات تجديد شهري
                      </div>
                      <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginTop:2 }}>
                        ينبه تلقائياً قبل الانتهاء بـ 10 أيام مع زر تجديد سريع
                      </div>
                    </div>
                  </label>

                  {form.is_monthly && (
                    <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
                      <label style={{ fontSize:12, fontWeight:600, color:'#6D28D9', flexShrink:0 }}>مدة التجديد:</label>
                      <select className="form-input" style={{ width:120 }} value={form.renewal_months||1}
                        onChange={e=>setForm({...form,renewal_months:parseInt(e.target.value)})}>
                        <option value={1}>شهر واحد</option>
                        <option value={2}>شهران</option>
                        <option value={3}>3 أشهر</option>
                        <option value={6}>6 أشهر</option>
                        <option value={12}>سنة كاملة</option>
                      </select>
                      <span style={{ fontSize:11, color:'#7C3AED' }}>
                        عند الضغط على "تجديد" يضيف هذه المدة لتاريخ الانتهاء
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View/Print Modal */}
      {viewItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div id="view-print-area" className="card" style={{ width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:16 }}>تفاصيل الوثيقة</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => window.print()} style={{ background:'var(--cs-blue)', color:'white', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontFamily:'Tajawal,sans-serif' }}><Printer size={14}/>طباعة</button>
                <button onClick={() => setViewItem(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cs-text-muted)' }}><X size={20}/></button>
              </div>
            </div>
            {[
              { l:'اسم الوثيقة', v: viewItem.doc_name },
              { l:'النوع',        v: viewItem.doc_type },
              { l:'رقم الوثيقة', v: viewItem.doc_number },
              { l:'تاريخ الإصدار', v: viewItem.issue_date?.split('T')[0] },
              { l:'تاريخ الانتهاء', v: viewItem.expiry_date?.split('T')[0] },
              { l:'نوع التجديد',  v: viewItem.is_monthly ? `🔄 شهري (كل ${viewItem.renewal_months||1} شهر)` : 'عادي' },
              { l:'الأيام المتبقية', v: (() => { const d = daysLeft(viewItem.expiry_date); return d!==null?(d<=0?'منتهية':`${d} يوم`):null })() },
              { l:'ملاحظات',     v: viewItem.notes },
            ].map(({ l,v },i) => v ? (
              <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'1px solid var(--cs-border)' }}>
                <span style={{ width:160, color:'var(--cs-text-muted)', fontSize:12, fontWeight:600, flexShrink:0 }}>{l}:</span>
                <span style={{ fontWeight:600, fontSize:13 }}>{v}</span>
              </div>
            ) : null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#view-print-area,#view-print-area *{visibility:visible}#view-print-area{position:fixed;top:0;left:0;width:100%;max-height:none!important}}`}</style>
        </div>
      )}
    </div>
  )
}
