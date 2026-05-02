'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const STATUS_C:any={Open:'badge-blue',Scheduled:'badge-amber',Completed:'badge-green',Overdue:'badge-red',Cancelled:'badge-gray'}
const STATUS_AR:any={Open:'مفتوح',Scheduled:'مجدول',Completed:'مكتمل',Overdue:'متأخر',Cancelled:'ملغي'}
const newForm=()=>({job_code:`M-${1001+Math.floor(Date.now()/1000)%9000}` as string,description:'',client_id:'',tech_id:'',project_id:'',last_service:'',next_due:'',frequency:'Monthly',status:'Open',cost:'',notes:''})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'M-1001'
    const nums = rows
      .map((r:any) => r.job_code?.replace('M-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'M-1001'
    return 'M-' + (Math.max(...nums) + 1)
  }


export default function MaintenancePage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState<any>(newForm())
  const [editId,setEditId]=useState<string|null>(null)
  const [saving,setSaving]=useState(false)
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:r},{data:c},{data:t},{data:p}]=await Promise.all([
      supabase.from('maintenance').select('*,clients(company_name),technicians(full_name),projects(project_name)').order('next_due',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({job_code:r.job_code||'',description:r.description||'',client_id:r.client_id||'',tech_id:r.tech_id||'',project_id:r.project_id||'',last_service:r.last_service?.split('T')[0]||'',next_due:r.next_due?.split('T')[0]||'',frequency:r.frequency||'Monthly',status:r.status||'Open',cost:r.cost||'',notes:r.notes||''})
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.job_code?.trim()) return alert('كود الخدمة مطلوب')
    setSaving(true)
    const payload={job_code:form.job_code.trim(),description:form.description||null,client_id:form.client_id||null,tech_id:form.tech_id||null,project_id:form.project_id||null,last_service:form.last_service||null,next_due:form.next_due||null,frequency:form.frequency||null,status:form.status||'Open',cost:parseFloat(form.cost)||null,notes:form.notes||null}
    const {error}=editId
      ? await supabase.from('maintenance').update(payload).eq('id',editId)
      : await supabase.from('maintenance').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('maintenance').delete().eq('id',id);load()}
  const filtered=rows.filter(r=>r.description?.toLowerCase().includes(search.toLowerCase())||r.job_code?.includes(search)||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))
  const today=new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">جدول الصيانة</div><div className="page-subtitle">{rows.length} طلب</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm({...newForm(),job_code:'MS-'+(rows.length+10280)});setEditId(null);setModal(true)}}><Plus size={16}/>طلب صيانة جديد</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'مفتوحة',v:rows.filter(r=>r.status==='Open').length,c:'var(--cs-blue)'},{l:'مجدولة',v:rows.filter(r=>r.status==='Scheduled').length,c:'var(--cs-orange)'},{l:'مكتملة',v:rows.filter(r=>r.status==='Completed').length,c:'var(--cs-green)'},{l:'متأخرة',v:rows.filter(r=>r.status==='Overdue').length,c:'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الوصف أو العميل..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الوصف</th><th>العميل</th><th>الفني</th><th>آخر خدمة</th><th>الموعد القادم</th><th>التكرار</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد طلبات صيانة</td></tr>
              :filtered.map(r=>(
                <tr key={r.id} style={{background:r.status==='Overdue'?'#FFF5F5':r.next_due?.split('T')[0]===today?'#F0FAFF':'inherit'}}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.job_code}</span></td>
                  <td style={{fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                  <td>{r.clients?.company_name||'—'}</td>
                  <td>{r.technicians?.full_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.last_service?.split('T')[0]||'—'}</td>
                  <td style={{fontSize:12,color:r.status==='Overdue'?'var(--cs-red)':'inherit',fontWeight:r.status==='Overdue'?700:400}}>{r.next_due?.split('T')[0]||'—'}</td>
                  <td style={{fontSize:12}}>{r.frequency}</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* View Modal */}
      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="maint-print" className="card" style={{width:'100%',maxWidth:520,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>تفاصيل أمر الصيانة</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'كود الخدمة',v:viewItem.job_code},{l:'الوصف',v:viewItem.description},{l:'العميل',v:viewItem.clients?.company_name},{l:'الفني',v:viewItem.technicians?.full_name},{l:'آخر خدمة',v:viewItem.last_service?.split('T')[0]},{l:'الموعد القادم',v:viewItem.next_due?.split('T')[0]},{l:'التكرار',v:viewItem.frequency},{l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status},{l:'التكلفة',v:viewItem.cost?viewItem.cost+' ر.س':null},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#maint-print,#maint-print *{visibility:visible}#maint-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {/* Edit Modal */}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'طلب صيانة جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الخدمة *</label><input className="form-input" placeholder="M-001" value={form.job_code} onChange={e=>setForm({...form,job_code:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_AR).map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف العمل</label><textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">التكرار</label><select className="form-input" value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}>{['Monthly','Quarterly','Semi-Annual','Annual','Weekly'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">آخر خدمة</label><input type="date" className="form-input" value={form.last_service} onChange={e=>setForm({...form,last_service:e.target.value})}/></div>
              <div><label className="form-label">الموعد القادم</label><input type="date" className="form-input" value={form.next_due} onChange={e=>setForm({...form,next_due:e.target.value})}/></div>
              <div><label className="form-label">التكلفة (ر.س)</label><input type="number" min="0" className="form-input" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
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
