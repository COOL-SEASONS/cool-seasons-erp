'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, AlertTriangle } from 'lucide-react'

const FREQUENCIES=['أسبوعي','شهري','كل شهرين','كل 3 أشهر','كل 4 أشهر','نصف سنوي','سنوي']
const FREQ_MONTHS:Record<string,number>={'أسبوعي':0,'شهري':1,'كل شهرين':2,'كل 3 أشهر':3,'كل 4 أشهر':4,'نصف سنوي':6,'سنوي':12}

const newCode=()=>`RJ-${800+Math.floor(Date.now()/1000)%9200}`
const newForm=()=>({
  job_code:newCode(),description:'',client_id:'',tech_id:'',project_id:'',
  frequency:'شهري',last_date:'',next_date:'',status:'Active',cost:'0',notes:''
})

const calcNextDate=(lastDate:string,frequency:string)=>{
  if(!lastDate) return ''
  const d=new Date(lastDate)
  const months=FREQ_MONTHS[frequency]||1
  if(frequency==='أسبوعي') d.setDate(d.getDate()+7)
  else d.setMonth(d.getMonth()+months)
  return d.toISOString().split('T')[0]
}

export default function RecurringJobsPage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:r},{data:c},{data:t},{data:p}]=await Promise.all([
      supabase.from('recurring_jobs').select('*,clients(company_name),technicians(full_name),projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({
      job_code:r.job_code||'',description:r.description||'',
      client_id:r.client_id||'',tech_id:r.tech_id||'',project_id:r.project_id||'',
      frequency:r.frequency||'شهري',last_date:r.last_date?.split('T')[0]||'',
      next_date:r.next_date?.split('T')[0]||'',status:r.status||'Active',
      cost:String(r.cost||0),notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.job_code.trim()) return alert('الكود مطلوب')
    setSaving(true)
    const nextDate=form.next_date||calcNextDate(form.last_date,form.frequency)
    const payload={
      job_code:form.job_code.trim(),
      description:form.description||null,
      client_id:form.client_id||null,
      tech_id:form.tech_id||null,
      project_id:form.project_id||null,
      frequency:form.frequency||null,
      last_date:form.last_date||null,
      next_date:nextDate||null,
      status:form.status||'Active',
      cost:parseFloat(form.cost)||0,
      notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('recurring_jobs').update(payload).eq('id',editId)
      : await supabase.from('recurring_jobs').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('recurring_jobs').delete().eq('id',id);load()}
  const today=new Date().toISOString().split('T')[0]
  const overdue=rows.filter(r=>r.next_date&&r.next_date.split('T')[0]<=today&&r.status==='Active')
  const filtered=rows.filter(r=>r.job_code?.includes(search)||r.description?.toLowerCase().includes(search.toLowerCase())||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الأعمال المتكررة</div><div className="page-subtitle">{rows.length} عمل متكرر</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>عمل متكرر جديد</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:16}}>
        {[{l:'إجمالي',v:rows.length,c:'var(--cs-blue)'},{l:'نشطة',v:rows.filter(r=>r.status==='Active').length,c:'var(--cs-green)'},{l:'متأخرة',v:overdue.length,c:'var(--cs-red)'},{l:'موقوفة',v:rows.filter(r=>r.status==='Paused').length,c:'var(--cs-orange)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      {overdue.length>0&&(
        <div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={15} color="var(--cs-red)"/>
          <span style={{fontSize:13,fontWeight:700,color:'var(--cs-red)'}}>متأخرة ({overdue.length}): {overdue.map(r=>r.clients?.company_name||r.job_code).slice(0,3).join('، ')}{overdue.length>3?` + ${overdue.length-3} أخرى`:''}</span>
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الوصف</th><th>العميل</th><th>الفني</th><th>التكرار</th><th>آخر زيارة</th><th>الزيارة القادمة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أعمال متكررة</td></tr>
              :filtered.map(r=>{
                const isOverdue=r.next_date&&r.next_date.split('T')[0]<=today&&r.status==='Active'
                return (
                  <tr key={r.id} style={{background:isOverdue?'#FFF5F5':'inherit'}}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.job_code}</td>
                    <td style={{fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description||'—'}</td>
                    <td>{r.clients?.company_name||'—'}</td>
                    <td>{r.technicians?.full_name||'—'}</td>
                    <td><span className="badge badge-blue">{r.frequency}</span></td>
                    <td style={{fontSize:12}}>{r.last_date?.split('T')[0]||'—'}</td>
                    <td style={{fontSize:12,color:isOverdue?'var(--cs-red)':'inherit',fontWeight:isOverdue?700:400}}>{r.next_date?.split('T')[0]||'—'}{isOverdue?' ⚠️':''}</td>
                    <td><span className={`badge ${r.status==='Active'?'badge-green':r.status==='Paused'?'badge-amber':'badge-gray'}`}>{r.status==='Active'?'نشط':r.status==='Paused'?'موقوف':'ملغي'}</span></td>
                    <td><div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setViewItem(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                      <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="rj-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>عمل متكرر — {viewItem.job_code}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'الكود',v:viewItem.job_code},{l:'الوصف',v:viewItem.description},{l:'العميل',v:viewItem.clients?.company_name},{l:'الفني',v:viewItem.technicians?.full_name},{l:'التكرار',v:viewItem.frequency},{l:'آخر زيارة',v:viewItem.last_date?.split('T')[0]},{l:'الزيارة القادمة',v:viewItem.next_date?.split('T')[0]},{l:'الحالة',v:viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#rj-print,#rj-print *{visibility:visible}#rj-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'عمل متكرر جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" value={form.job_code} onChange={e=>setForm({...form,job_code:e.target.value})}/></div>
              <div><label className="form-label">التكرار</label><select className="form-input" value={form.frequency} onChange={e=>{const nd=calcNextDate(form.last_date,e.target.value);setForm({...form,frequency:e.target.value,next_date:nd||form.next_date})}}>{FREQUENCIES.map(f=><option key={f}>{f}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف العمل</label><textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">آخر زيارة</label><input type="date" className="form-input" value={form.last_date} onChange={e=>{const nd=calcNextDate(e.target.value,form.frequency);setForm({...form,last_date:e.target.value,next_date:nd||form.next_date})}}/></div>
              <div><label className="form-label">الزيارة القادمة</label><input type="date" className="form-input" value={form.next_date} onChange={e=>setForm({...form,next_date:e.target.value})}/></div>
              {form.last_date&&form.frequency&&(
                <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'8px 14px',display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <span style={{color:'var(--cs-text-muted)'}}>الزيارة القادمة المحسوبة:</span>
                  <span style={{fontWeight:700,color:'var(--cs-blue)'}}>{calcNextDate(form.last_date,form.frequency)||'—'}</span>
                </div>
              )}
              <div><label className="form-label">التكلفة (ر.س)</label><input type="number" min="0" className="form-input" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Active">نشط</option><option value="Paused">موقوف</option><option value="Cancelled">ملغي</option></select></div>
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
