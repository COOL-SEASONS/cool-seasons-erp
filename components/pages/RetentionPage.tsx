'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const autoCode=async()=>{
  const {data}=await supabase.from('retention_tracking').select('retention_code').order('created_at',{ascending:false}).limit(1)
  if(data&&data[0]?.retention_code){
    const num=parseInt(data[0].retention_code.replace(/\D/g,''))||100
    return String(num+1)
  }
  return '101'
}

const newForm=()=>({retention_code:'',project_id:'',client_id:'',retention_pct:'10',contract_value:'0',release_date:'',status:'Held',notes:''})

export default function RetentionPage() {
  const [rows,setRows]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [form,setForm]=useState<any>(newForm())
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:r},{data:p},{data:c}]=await Promise.all([
      supabase.from('retention_tracking').select('*,projects(project_name),clients(company_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name,client_id,budget'),
      supabase.from('clients').select('id,company_name'),
    ])
    setRows(r||[]); setProjects(p||[]); setClients(c||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openAdd=async()=>{
    const code=await autoCode()
    setForm({...newForm(),retention_code:code})
    setEditId(null); setModal(true)
  }

  const openEdit=(r:any)=>{
    setForm({retention_code:r.retention_code||'',project_id:r.project_id||'',client_id:r.client_id||'',retention_pct:String(r.retention_pct||10),contract_value:String(r.contract_value||0),release_date:r.release_date?.split('T')[0]||'',status:r.status||'Held',notes:r.notes||''})
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.retention_code?.trim()) return alert('الكود مطلوب')
    setSaving(true)
    const cv=parseFloat(form.contract_value)||0
    const pct=parseFloat(form.retention_pct)||10
    const retained=Math.round(cv*pct/100*100)/100
    const payload={
      retention_code:form.retention_code.trim(),
      project_id:form.project_id||null,
      client_id:form.client_id||null,
      retention_pct:pct,
      contract_value:cv,
      retention_amount:retained,
      release_date:form.release_date||null,
      status:form.status||'Held',
      notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('retention_tracking').update(payload).eq('id',editId)
      : await supabase.from('retention_tracking').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('retention_tracking').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.retention_code?.includes(search)||r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()))
  const totalRetained=rows.filter(r=>r.status==='Held').reduce((s,r)=>s+(r.retention_amount||0),0)
  const cv=parseFloat(form.contract_value)||0
  const retained=Math.round(cv*(parseFloat(form.retention_pct)||10)/100*100)/100

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">مبالغ الضمان المحتجزة</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16}/>سجل جديد</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي محتجز',v:fmt(totalRetained)+' ر.س',c:'var(--cs-orange)'},{l:'محتجزة',v:rows.filter(r=>r.status==='Held').length,c:'var(--cs-orange)'},{l:'مُسلّمة',v:rows.filter(r=>r.status==='Released').length,c:'var(--cs-green)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>المشروع</th><th>العميل</th><th>قيمة العقد</th><th>النسبة%</th><th>المبلغ المحتجز</th><th>تاريخ التسليم</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.retention_code}</span></td>
                  <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                  <td>{r.clients?.company_name||'—'}</td>
                  <td>{fmt(r.contract_value)} ر.س</td>
                  <td style={{textAlign:'center'}}>{r.retention_pct}%</td>
                  <td style={{fontWeight:700,color:'var(--cs-orange)'}}>{fmt(r.retention_amount)} ر.س</td>
                  <td style={{fontSize:12}}>{r.release_date?.split('T')[0]||'—'}</td>
                  <td><span className={`badge ${r.status==='Released'?'badge-green':'badge-amber'}`}>{r.status==='Released'?'مُسلّمة':'محتجزة'}</span></td>
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
          <div id="ret-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>ضمان محتجز — {viewItem.retention_code}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'الكود',v:viewItem.retention_code},{l:'المشروع',v:viewItem.projects?.project_name},{l:'العميل',v:viewItem.clients?.company_name},{l:'قيمة العقد',v:fmt(viewItem.contract_value)+' ر.س'},{l:'النسبة',v:viewItem.retention_pct+'%'},{l:'المبلغ المحتجز',v:fmt(viewItem.retention_amount)+' ر.س'},{l:'تاريخ التسليم',v:viewItem.release_date?.split('T')[0]},{l:'الحالة',v:viewItem.status==='Released'?'مُسلّمة':'محتجزة'},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#ret-print,#ret-print *{visibility:visible}#ret-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل ضمان جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" value={form.retention_code} onChange={e=>setForm({...form,retention_code:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Held">محتجزة</option><option value="Released">مُسلّمة</option></select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);setForm({...form,project_id:e.target.value,client_id:p?.client_id||form.client_id,contract_value:String(p?.budget||form.contract_value)})}}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">قيمة العقد (ر.س)</label><input type="number" min="0" className="form-input" value={form.contract_value} onChange={e=>setForm({...form,contract_value:e.target.value})}/></div>
              <div><label className="form-label">نسبة الضمان %</label><input type="number" min="0" max="100" className="form-input" value={form.retention_pct} onChange={e=>setForm({...form,retention_pct:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1',background:'#FEF3E2',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>المبلغ المحتجز:</span>
                <span style={{fontWeight:800,color:'var(--cs-orange)',fontSize:16}}>{fmt(retained)} ر.س</span>
              </div>
              <div><label className="form-label">تاريخ التسليم المتوقع</label><input type="date" className="form-input" value={form.release_date} onChange={e=>setForm({...form,release_date:e.target.value})}/></div>
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
