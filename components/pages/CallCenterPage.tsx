'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const SOURCES = ['Website','Referral','Exhibition','Cold Call','Social Media','Walk-in','أخرى']
const STATUSES = ['New','Contacted','Qualified','Lost','Converted']
const STATUS_AR:any={New:'جديد',Contacted:'تم التواصل',Qualified:'مؤهل',Lost:'خسرنا',Converted:'تحول لعميل'}
const RATINGS = ['Hot Lead','Warm Lead','Cold Lead']
const newForm=()=>({lead_code:`LD-${900+Math.floor(Date.now()/1000)%9000}` as string,name:'',phone:'',email:'',city:'',source:'Website',rating:'Warm Lead',status:'New',followup_date:'',notes:''})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'LD-900'
    const nums = rows
      .map((r:any) => r.lead_code?.replace('LD-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'LD-900'
    return 'LD-' + (Math.max(...nums) + 1)
  }


export default function CallCenterPage() {
  const [rows,setRows]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [filterStatus,setFilterStatus]=useState('')
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState<any>(newForm())
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const {data}=await supabase.from('call_center').select('*').order('created_at',{ascending:false})
    setRows(data||[]); setLoading(false)
  }
  useEffect(()=>{load()},[])

  const save=async()=>{
    if(!form.lead_code?.trim()) return alert('رقم العميل المحتمل مطلوب')
    if(!form.name?.trim()) return alert('الاسم مطلوب')
    setSaving(true)
    const payload={
      lead_code:form.lead_code.trim(),
      name:form.name.trim(),
      phone:form.phone||null,
      email:form.email||null,
      city:form.city||null,
      source:form.source||null,
      rating:form.rating||'Warm Lead',
      status:form.status||'New',
      followup_date:form.followup_date||null,
      notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('call_center').update(payload).eq('id',editId)
      : await supabase.from('call_center').insert(payload)
    if(error) alert('خطأ في الحفظ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('call_center').delete().eq('id',id);load()}

  const filtered=rows.filter(r=>{
    const m=r.name?.toLowerCase().includes(search.toLowerCase())||r.phone?.includes(search)||r.lead_code?.includes(search)
    const s=!filterStatus||r.status===filterStatus
    return m&&s
  })

  const statusC:any={New:'badge-blue',Contacted:'badge-amber',Qualified:'badge-green',Lost:'badge-red',Converted:'badge-green'}
  const ratingC:any={'Hot Lead':'badge-red','Warm Lead':'badge-amber','Cold Lead':'badge-gray'}

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Call Center</div><div className="page-subtitle">{rows.length} عميل محتمل</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...newForm(), lead_code: generateCode(rows)});setEditId(null);setModal(true)}}><Plus size={16}/>عميل محتمل جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'Hot Leads',v:rows.filter(r=>r.rating==='Hot Lead').length,c:'var(--cs-red)'},
          {l:'Warm Leads',v:rows.filter(r=>r.rating==='Warm Lead').length,c:'var(--cs-orange)'},
          {l:'تحولوا لعملاء',v:rows.filter(r=>r.status==='Converted').length,c:'var(--cs-green)'},
          {l:'متابعة اليوم',v:rows.filter(r=>r.followup_date===new Date().toISOString().split('T')[0]).length,c:'var(--cs-blue)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-input" style={{width:150}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">كل الحالات</option>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select>
        </div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الاسم</th><th>الهاتف</th><th>المدينة</th><th>المصدر</th><th>التقييم</th><th>المتابعة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.lead_code}</td>
                  <td style={{fontWeight:600}}>{r.name}</td>
                  <td><a href={`tel:${r.phone}`} style={{color:'var(--cs-blue)',textDecoration:'none'}}>{r.phone}</a></td>
                  <td>{r.city}</td>
                  <td>{r.source}</td>
                  <td><span className={`badge ${ratingC[r.rating]||'badge-gray'}`}>{r.rating}</span></td>
                  <td style={{fontSize:12,color:r.followup_date===new Date().toISOString().split('T')[0]?'var(--cs-blue)':'inherit'}}>{r.followup_date||'—'}</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} title="عرض" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>{setForm({lead_code:r.lead_code||'',name:r.name||'',phone:r.phone||'',email:r.email||'',city:r.city||'',source:r.source||'Website',rating:r.rating||'Warm Lead',status:r.status||'New',followup_date:r.followup_date||'',notes:r.notes||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="lead-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>بيانات العميل المحتمل</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'الكود',v:viewItem.lead_code},{l:'الاسم',v:viewItem.name},{l:'الهاتف',v:viewItem.phone},{l:'البريد',v:viewItem.email},{l:'المدينة',v:viewItem.city},{l:'المصدر',v:viewItem.source},{l:'التقييم',v:viewItem.rating},{l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status},{l:'تاريخ المتابعة',v:viewItem.followup_date},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:130,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#lead-print,#lead-print *{visibility:visible}#lead-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'عميل محتمل جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" placeholder="LD-001" value={form.lead_code||''} onChange={e=>setForm({...form,lead_code:e.target.value})}/></div>
              <div><label className="form-label">الاسم *</label><input className="form-input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div><label className="form-label">الهاتف</label><input className="form-input" dir="ltr" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="form-label">البريد الإلكتروني</label><input type="email" className="form-input" dir="ltr" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div><label className="form-label">المدينة</label><input className="form-input" value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/></div>
              <div><label className="form-label">المصدر</label><select className="form-input" value={form.source||'Website'} onChange={e=>setForm({...form,source:e.target.value})}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">التقييم</label><select className="form-input" value={form.rating||'Warm Lead'} onChange={e=>setForm({...form,rating:e.target.value})}>{RATINGS.map(r=><option key={r}>{r}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'New'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div><label className="form-label">تاريخ المتابعة</label><input type="date" className="form-input" value={form.followup_date||''} onChange={e=>setForm({...form,followup_date:e.target.value})}/></div>
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
