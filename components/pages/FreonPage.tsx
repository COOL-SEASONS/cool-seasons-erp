'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const FREON_TYPES=['R-22','R-32','R-410A','R-404A','R-407C','R-134A','R-507A']
const BRANDS=['Honeywell','SRF','Dupont / Chemours','Mexichem','Daikin','Linde','فريون محلي','أخرى']
const REASONS=['تعبئة وحدة','تسريب غاز','صيانة دورية','تغيير نوع الغاز','مخزون','أخرى']
const ORIGINS=['مكسيكي','أمريكي','صيني','كوري','هندي','أخرى']

const newCode=()=>`FR-${6000+Math.floor(Date.now()/1000)%9000}`
const newForm=()=>({
  record_id:newCode(),entry_date:new Date().toISOString().split('T')[0],
  freon_type:'R-32',brand:'Honeywell',origin:'مكسيكي',
  tech_id:'',client_id:'',project_id:'',
  kg_received:'0',kg_used:'0',reason:'تعبئة وحدة',
  cylinders_count:'0',notes:''
})

export default function FreonPage() {
  const [rows,setRows]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
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
    const [{data:r},{data:t},{data:c},{data:p}]=await Promise.all([
      supabase.from('freon_tracking').select('*,technicians(full_name),clients(company_name),projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(r||[]); setTechs(t||[]); setClients(c||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({
      record_id:r.record_id||'',entry_date:r.entry_date?.split('T')[0]||'',
      freon_type:r.freon_type||'R-32',brand:r.brand||'Honeywell',origin:r.origin||'مكسيكي',
      tech_id:r.tech_id||'',client_id:r.client_id||'',project_id:r.project_id||'',
      kg_received:String(r.kg_received||0),kg_used:String(r.kg_used||0),
      reason:r.reason||'تعبئة وحدة',cylinders_count:String(r.cylinders_count||0),notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.record_id.trim()) return alert('رقم السجل مطلوب')
    setSaving(true)
    const kr=parseFloat(form.kg_received)||0
    const ku=parseFloat(form.kg_used)||0
    const payload={
      record_id:form.record_id.trim(),
      entry_date:form.entry_date||null,
      freon_type:form.freon_type||null,
      brand:form.brand||null,
      origin:form.origin||null,
      tech_id:form.tech_id||null,
      client_id:form.client_id||null,
      project_id:form.project_id||null,
      kg_received:kr,
      kg_used:ku,
      kg_remaining:kr-ku,
      reason:form.reason||null,
      cylinders_count:parseInt(form.cylinders_count)||0,
      notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('freon_tracking').update(payload).eq('id',editId)
      : await supabase.from('freon_tracking').insert(payload)
    if(error){
      // Try without kg_remaining if it's a generated column
      if(error.message?.includes('kg_remaining')||error.message?.includes('non-DEFAULT')){
        const {kg_remaining:_,...safe}=payload as any
        const {error:e2}=editId
          ? await supabase.from('freon_tracking').update(safe).eq('id',editId)
          : await supabase.from('freon_tracking').insert(safe)
        if(e2) alert('خطأ: '+e2.message)
        else{setModal(false);load()}
      } else alert('خطأ: '+error.message)
    } else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('freon_tracking').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(n||0)
  const totalRec=rows.reduce((s,r)=>s+(r.kg_received||0),0)
  const totalUsed=rows.reduce((s,r)=>s+(r.kg_used||0),0)
  const filtered=rows.filter(r=>r.record_id?.includes(search)||r.freon_type?.includes(search)||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">سجل الفريون</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي كغ مستلم',v:fmt(totalRec)+' كغ',c:'var(--cs-blue)'},{l:'إجمالي كغ مستخدم',v:fmt(totalUsed)+' كغ',c:'var(--cs-red)'},{l:'الرصيد المتبقي',v:fmt(totalRec-totalUsed)+' كغ',c:(totalRec-totalUsed)>=0?'var(--cs-green)':'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو النوع أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>التاريخ</th><th>النوع</th><th>الماركة</th><th>الفني</th><th>كغ مستلم</th><th>كغ مستخدم</th><th>الباقي</th><th>السبب</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.record_id}</td>
                  <td style={{fontSize:12}}>{r.entry_date?.split('T')[0]||'—'}</td>
                  <td><span className="badge badge-blue">{r.freon_type}</span></td>
                  <td>{r.brand}</td>
                  <td>{r.technicians?.full_name||'—'}</td>
                  <td style={{color:'var(--cs-blue)',fontWeight:700}}>{fmt(r.kg_received)} كغ</td>
                  <td style={{color:'var(--cs-red)'}}>{fmt(r.kg_used)} كغ</td>
                  <td style={{color:(r.kg_remaining??r.kg_received-r.kg_used)>=0?'var(--cs-green)':'var(--cs-red)',fontWeight:700}}>{fmt(r.kg_remaining??r.kg_received-r.kg_used)} كغ</td>
                  <td style={{fontSize:12}}>{r.reason}</td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="fr-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>سجل فريون — {viewItem.record_id}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'الكود',v:viewItem.record_id},{l:'التاريخ',v:viewItem.entry_date?.split('T')[0]},{l:'نوع الفريون',v:viewItem.freon_type},{l:'الماركة',v:viewItem.brand},{l:'بلد المنشأ',v:viewItem.origin},{l:'الفني',v:viewItem.technicians?.full_name},{l:'العميل',v:viewItem.clients?.company_name},{l:'كغ مستلم',v:fmt(viewItem.kg_received)+' كغ'},{l:'كغ مستخدم',v:fmt(viewItem.kg_used)+' كغ'},{l:'الرصيد',v:fmt((viewItem.kg_remaining??viewItem.kg_received-viewItem.kg_used))+' كغ'},{l:'السبب',v:viewItem.reason},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:130,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#fr-print,#fr-print *{visibility:visible}#fr-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل فريون جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            {/* نوع السجل */}
            <div style={{display:'flex',gap:0,marginBottom:16,borderRadius:8,overflow:'hidden',border:'2px solid var(--cs-border)'}}>
              {['استلام أسطوانة','استخدام لدى عميل'].map((t,i)=>(
                <button key={i} style={{flex:1,padding:10,border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,background:i===0?'var(--cs-blue)':'white',color:i===0?'white':'var(--cs-text-muted)'}}>{i===0?'🔴 ':''}{t}</button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم السجل *</label><input className="form-input" value={form.record_id} onChange={e=>setForm({...form,record_id:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
              <div><label className="form-label">نوع الفريون</label><select className="form-input" value={form.freon_type} onChange={e=>setForm({...form,freon_type:e.target.value})}>{FREON_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الماركة / Brand</label><select className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>{BRANDS.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="form-label">بلد المنشأ</label><select className="form-input" value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}>{ORIGINS.map(o=><option key={o}>{o}</option>)}</select></div>
              <div><label className="form-label">السبب</label><select className="form-input" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>{REASONS.map(r=><option key={r}>{r}</option>)}</select></div>
              <div><label className="form-label">كغ مستلم</label><input type="number" min="0" step="0.1" className="form-input" value={form.kg_received} onChange={e=>setForm({...form,kg_received:e.target.value})}/></div>
              <div><label className="form-label">كغ مستخدم</label><input type="number" min="0" step="0.1" className="form-input" value={form.kg_used} onChange={e=>setForm({...form,kg_used:e.target.value})}/></div>
              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 14px',gridColumn:'1/-1',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>الرصيد المتبقي:</span>
                <span style={{fontWeight:800,color:(parseFloat(form.kg_received)||0)-(parseFloat(form.kg_used)||0)>=0?'var(--cs-green)':'var(--cs-red)',fontSize:16}}>{((parseFloat(form.kg_received)||0)-(parseFloat(form.kg_used)||0)).toFixed(1)} كغ</span>
              </div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">عدد الأسطوانات</label><input type="number" min="0" className="form-input" value={form.cylinders_count} onChange={e=>setForm({...form,cylinders_count:e.target.value})}/></div>
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
