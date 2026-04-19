'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'

const FREQUENCIES = ['يومي','أسبوعي','نصف شهري','شهري','كل شهرين','ربعي','نصف سنوي','سنوي']
const EMPTY = { job_code:'', client_id:'', tech_id:'', description:'', frequency:'شهري', duration_hours:'', visit_cost:0, last_visit:'', status:'Active', notes:'' }

export default function RecurringJobsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('recurring_jobs').select('*, clients(company_name), technicians(full_name)').order('next_due',{ascending:true}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const daysLeft = (d:string) => { if(!d)return null; return Math.ceil((new Date(d).getTime()-Date.now())/86400000) }

  const save = async () => {
    if (!form.job_code) return alert('كود العمل مطلوب')
    setSaving(true)
    const payload = { ...form, expected_revenue: parseFloat(form.visit_cost)||0, client_id: form.client_id||null, tech_id: form.tech_id||null }
    if (editId) await supabase.from('recurring_jobs').update(payload).eq('id', editId)
    else await supabase.from('recurring_jobs').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('recurring_jobs').delete().eq('id',id); load() }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const overdue = rows.filter(r=>{ const d=daysLeft(r.next_due); return d!==null&&d<=0 })
  const thisWeek = rows.filter(r=>{ const d=daysLeft(r.next_due); return d!==null&&d>0&&d<=7 })
  const monthlyRevenue = rows.filter(r=>r.status==='Active').reduce((s,r)=>s+(r.expected_revenue||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الأعمال المتكررة</div><div className="page-subtitle">{rows.length} عمل متكرر</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>عمل جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:overdue.length>0?16:20}}>
        {[
          {l:'متأخرة',v:overdue.length,c:'var(--cs-red)'},
          {l:'هذا الأسبوع',v:thisWeek.length,c:'var(--cs-orange)'},
          {l:'نشطة',v:rows.filter(r=>r.status==='Active').length,c:'var(--cs-green)'},
          {l:'إيراد شهري متوقع',v:fmt(monthlyRevenue)+' ر.س',c:'var(--cs-blue)'},
        ].map((s,i)=><div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:17,fontWeight:800,color:s.c}}>{s.v}</div></div>)}
      </div>

      {overdue.length>0 && (
        <div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={16} color="#C0392B"/>
          <span style={{fontSize:13,fontWeight:700,color:'#C0392B'}}>{overdue.length} أعمال متأخرة: {overdue.map(r=>r.clients?.company_name||r.job_code).slice(0,3).join('، ')}{overdue.length>3?'..':''}</span>
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالعميل أو الوصف..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>العميل</th><th>الوصف</th><th>الفني</th><th>التكرار</th><th>آخر زيارة</th><th>الزيارة القادمة</th><th>التكلفة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.filter(r=>r.description?.toLowerCase().includes(search.toLowerCase())||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())).length===0
                ? <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أعمال</td></tr>
                : rows.filter(r=>r.description?.toLowerCase().includes(search.toLowerCase())||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())).map(r=>{
                  const days = daysLeft(r.next_due)
                  const isOverdue = days!==null&&days<=0
                  const isSoon = days!==null&&days>0&&days<=7
                  return (
                    <tr key={r.id} style={{background:isOverdue?'#FFF5F5':isSoon?'#FFFBF0':'inherit'}}>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{r.job_code}</td>
                      <td style={{fontWeight:600}}>{r.clients?.company_name}</td>
                      <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td><span className="badge badge-blue">{r.frequency}</span></td>
                      <td style={{fontSize:12}}>{r.last_visit||'—'}</td>
                      <td style={{fontSize:12,color:isOverdue?'var(--cs-red)':isSoon?'var(--cs-orange)':'inherit',fontWeight:isOverdue||isSoon?700:400}}>
                        {r.next_due||'—'}
                        {days!==null && <span style={{fontSize:10,marginRight:4}}>({days<=0?'متأخرة':days+' يوم'})</span>}
                      </td>
                      <td>{r.expected_revenue ? fmt(r.expected_revenue)+' ر.س' : '—'}</td>
                      <td><span className={`badge ${r.status==='Active'?'badge-green':'badge-gray'}`}>{r.status==='Active'?'نشط':'متوقف'}</span></td>
                      <td><div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setForm({...r,client_id:r.client_id||'',tech_id:r.tech_id||'',visit_cost:r.expected_revenue||0});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                        <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                      </div></td>
                    </tr>
                  )
                })}
            </tbody>
          </table></div>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'عمل متكرر جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" placeholder="RJ-001" value={form.job_code||''} onChange={e=>setForm({...form,job_code:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف العمل</label><input className="form-input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">التكرار</label><select className="form-input" value={form.frequency||'شهري'} onChange={e=>setForm({...form,frequency:e.target.value})}>{FREQUENCIES.map(f=><option key={f}>{f}</option>)}</select></div>
              <div><label className="form-label">تكلفة الزيارة (ر.س)</label><input type="number" className="form-input" value={form.visit_cost||0} onChange={e=>setForm({...form,visit_cost:e.target.value})}/></div>
              <div><label className="form-label">آخر زيارة</label><input type="date" className="form-input" value={form.last_visit||''} onChange={e=>setForm({...form,last_visit:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})}><option value="Active">نشط</option><option value="Inactive">متوقف</option></select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
