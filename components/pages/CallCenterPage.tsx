'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const SOURCES = ['Website','Referral','Exhibition','Cold Call','Social Media','Walk-in','أخرى']
const STATUSES = ['New','Contacted','Qualified','Lost','Converted']
const STATUS_AR: any = { New:'جديد', Contacted:'تم التواصل', Qualified:'مؤهل', Lost:'خسرنا', Converted:'تحول لعميل' }
const RATINGS = ['Hot Lead','Warm Lead','Cold Lead']
const EMPTY = { lead_code:'', name:'', phone:'', email:'', city:'', source:'', rating:'Warm Lead', status:'New', followup_date:'', notes:'', action:'' }

export default function CallCenterPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('call_center').select('*').order('created_at', { ascending: false })
    setRows(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const m = r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search) || r.lead_code?.includes(search)
    const s = !filterStatus || r.status === filterStatus
    return m && s
  })

  const save = async () => {
    if (!form.lead_code) return alert('رقم العميل المحتمل مطلوب')
    setSaving(true)
    if (editId) await supabase.from('call_center').update(form).eq('id', editId)
    else await supabase.from('call_center').insert(form)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف؟')) return
    await supabase.from('call_center').delete().eq('id', id)
    load()
  }

  const statusC: any = { New:'badge-blue', Contacted:'badge-amber', Qualified:'badge-green', Lost:'badge-red', Converted:'badge-green' }
  const ratingC: any = { 'Hot Lead':'badge-red', 'Warm Lead':'badge-amber', 'Cold Lead':'badge-gray' }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Call Center</div><div className="page-subtitle">{rows.length} عميل محتمل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>عميل محتمل جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'Hot Leads',v:rows.filter(r=>r.rating==='Hot Lead').length,c:'var(--cs-red)'},{l:'Warm Leads',v:rows.filter(r=>r.rating==='Warm Lead').length,c:'var(--cs-orange)'},{l:'تحولوا لعملاء',v:rows.filter(r=>r.status==='Converted').length,c:'var(--cs-green)'},{l:'متابعة اليوم',v:rows.filter(r=>r.followup_date===new Date().toISOString().split('T')[0]).length,c:'var(--cs-blue)'}].map((s,i)=>
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        )}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-input" style={{width:150}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">كل الحالات</option>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]||s}</option>)}</select>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الاسم</th><th>الهاتف</th><th>المدينة</th><th>المصدر</th><th>التقييم</th><th>الحالة</th><th>المتابعة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontSize:12,fontFamily:'monospace'}}>{r.lead_code}</td>
                  <td style={{fontWeight:600}}>{r.name}</td>
                  <td style={{direction:'ltr',fontSize:12}}>{r.phone}</td>
                  <td>{r.city}</td>
                  <td>{r.source}</td>
                  <td><span className={`badge ${ratingC[r.rating]||'badge-gray'}`}>{r.rating}</span></td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td style={{fontSize:12,color: r.followup_date===new Date().toISOString().split('T')[0]?'var(--cs-red)':'inherit',fontWeight: r.followup_date===new Date().toISOString().split('T')[0]?700:400}}>{r.followup_date}</td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm(r);setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'عميل محتمل جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم العميل *</label><input className="form-input" placeholder="LC-001" value={form.lead_code||''} onChange={e=>setForm({...form,lead_code:e.target.value})}/></div>
              <div><label className="form-label">الاسم</label><input className="form-input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div><label className="form-label">الهاتف</label><input className="form-input" dir="ltr" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="form-label">البريد الإلكتروني</label><input className="form-input" dir="ltr" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><label className="form-label">المدينة</label><input className="form-input" value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/></div>
              <div><label className="form-label">المصدر</label><select className="form-input" value={form.source||''} onChange={e=>setForm({...form,source:e.target.value})}><option value="">اختر...</option>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">التقييم</label><select className="form-input" value={form.rating||'Warm Lead'} onChange={e=>setForm({...form,rating:e.target.value})}>{RATINGS.map(r=><option key={r}>{r}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'New'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]||s}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">تاريخ المتابعة</label><input type="date" className="form-input" value={form.followup_date||''} onChange={e=>setForm({...form,followup_date:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={3} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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
