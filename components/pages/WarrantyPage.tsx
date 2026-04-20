'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle } from 'lucide-react'

const WARRANTY_TYPES = ['ضمان شامل','ضمان عمالة','ضمان قطع غيار','ضمان فريون','ضمان معدات','ضمان تركيب','أخرى']
const DURATIONS = [3,6,12,18,24,36,48,60]

const newForm = () => ({
  warranty_code:'', project_id:'', client_id:'',
  description:'', warranty_type:'ضمان شامل',
  start_date: new Date().toISOString().split('T')[0],
  duration_months:'12', notes:''
})

export default function WarrantyPage() {
  const [rows,setRows] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const [{data:w},{data:c},{data:p}] = await Promise.all([
      supabase.from('warranty_tracking').select('*,clients(company_name),projects(project_name)').order('start_date',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(w||[]); setClients(c||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const daysLeft = (start:string, months:number) => {
    if(!start||!months) return null
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + months)
    return Math.ceil((expiry.getTime() - Date.now()) / 86400000)
  }

  const getExpiry = (start:string, months:number) => {
    if(!start||!months) return ''
    const d = new Date(start)
    d.setMonth(d.getMonth() + months)
    return d.toISOString().split('T')[0]
  }

  const statusBadge = (days:number|null) => {
    if(days===null) return <span className="badge badge-gray">غير محدد</span>
    if(days<=0) return <span className="badge badge-red">منتهي ❌</span>
    if(days<=30) return <span className="badge badge-amber">ينتهي قريباً ⚠️</span>
    if(days<=90) return <span className="badge badge-blue">ينتهي خلال {days} يوم</span>
    return <span className="badge badge-green">ساري ✅</span>
  }

  const save = async () => {
    if(!form.warranty_code.trim()){alert('رقم الضمان مطلوب');return}
    setSaving(true)
    const payload = {
      warranty_code: form.warranty_code.trim(),
      project_id: form.project_id||null,
      client_id: form.client_id||null,
      description: form.description||null,
      warranty_type: form.warranty_type,
      start_date: form.start_date||null,
      duration_months: parseInt(form.duration_months)||12,
      notes: form.notes||null,
    }
    const {error} = editId
      ? await supabase.from('warranty_tracking').update(payload).eq('id',editId)
      : await supabase.from('warranty_tracking').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('warranty_tracking').delete().eq('id',id); load() }

  const active = rows.filter(r=>{ const d=daysLeft(r.start_date,r.duration_months); return d!==null&&d>0 })
  const expiringSoon = rows.filter(r=>{ const d=daysLeft(r.start_date,r.duration_months); return d!==null&&d>0&&d<=30 })
  const expired = rows.filter(r=>{ const d=daysLeft(r.start_date,r.duration_months); return d!==null&&d<=0 })

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">سجل الضمانات</div><div className="page-subtitle">{rows.length} ضمان</div></div>
        <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>ضمان جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي',v:rows.length,c:'var(--cs-blue)'},{l:'سارية',v:active.length,c:'var(--cs-green)'},{l:'تنتهي قريباً',v:expiringSoon.length,c:'var(--cs-orange)'},{l:'منتهية',v:expired.length,c:'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم الضمان</th><th>المشروع</th><th>العميل</th><th>الوصف</th><th>النوع</th><th>تاريخ البدء</th><th>المدة</th><th>تاريخ الانتهاء</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد ضمانات</td></tr>
              :rows.map(r=>{
                const days = daysLeft(r.start_date, r.duration_months)
                const expiry = getExpiry(r.start_date, r.duration_months)
                return (
                  <tr key={r.id} style={{background:days!==null&&days<=0?'#FFF5F5':days!==null&&days<=30?'#FFFBF0':'inherit'}}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.warranty_code}</span></td>
                    <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                    <td>{r.clients?.company_name||'—'}</td>
                    <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                    <td><span className="badge badge-blue">{r.warranty_type}</span></td>
                    <td style={{fontSize:12}}>{r.start_date}</td>
                    <td style={{textAlign:'center'}}>{r.duration_months} شهر</td>
                    <td style={{fontSize:12,color:days!==null&&days<=30?'var(--cs-red)':'inherit',fontWeight:days!==null&&days<=30?700:400}}>{expiry}</td>
                    <td>{statusBadge(days)}</td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setForm({...r,project_id:r.project_id||'',client_id:r.client_id||'',duration_months:String(r.duration_months||12)});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الضمان':'ضمان جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الضمان *</label><input className="form-input" placeholder="WR-001" value={form.warranty_code} onChange={e=>setForm({...form,warranty_code:e.target.value})}/></div>
              <div><label className="form-label">نوع الضمان</label><select className="form-input" value={form.warranty_type} onChange={e=>setForm({...form,warranty_type:e.target.value})}>{WARRANTY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف الضمان</label><input className="form-input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">تاريخ البدء</label><input type="date" className="form-input" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
              <div><label className="form-label">مدة الضمان (شهر)</label><select className="form-input" value={form.duration_months} onChange={e=>setForm({...form,duration_months:e.target.value})}>{DURATIONS.map(d=><option key={d} value={d}>{d} شهر</option>)}</select></div>
              {form.start_date&&form.duration_months&&(
                <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>تاريخ انتهاء الضمان:</span>
                  <span style={{fontWeight:700,color:'var(--cs-blue)',fontSize:15}}>{getExpiry(form.start_date,parseInt(form.duration_months))}</span>
                </div>
              )}
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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
