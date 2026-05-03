'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const STATUS_AR:any={Pending:'معلق',Partial:'جزئي',Paid:'مدفوع'}
const STATUS_C:any={Pending:'badge-amber',Partial:'badge-blue',Paid:'badge-green'}

const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const years=Array.from({length:5},(_,i)=>2024+i)
const periodOptions=years.flatMap(y=>months.map(m=>`${m} ${y}`))

const newForm=()=>({broker_name:'',project_id:'',tech_id:'',sales_amount:'0',commission_pct:'5',paid_amount:'0',period_month:`${months[new Date().getMonth()]} ${new Date().getFullYear()}`,status:'Pending',notes:''})

export default function CommissionsPage() {
  const [rows,setRows]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:c},{data:p},{data:t}]=await Promise.all([
      supabase.from('commissions').select('*,projects(project_name),technicians(full_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({broker_name:r.broker_name||'',project_id:r.project_id||'',tech_id:r.tech_id||'',sales_amount:String(r.sales_amount||0),commission_pct:String(r.commission_pct||5),paid_amount:String(r.paid_amount||0),period_month:r.period_month||'',status:r.status||'Pending',notes:r.notes||''})
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    setSaving(true)
    const sales=parseFloat(form.sales_amount)||0
    const pct=parseFloat(form.commission_pct)||0
    const commission=Math.round(sales*pct/100*100)/100
    const paid=parseFloat(form.paid_amount)||0
    const payload={broker_name:form.broker_name||null,project_id:form.project_id||null,tech_id:form.tech_id||null,sales_amount:sales,commission_pct:pct,commission_amt:commission,paid_amount:paid,balance:Math.max(0,commission-paid),period_month:form.period_month||null,status:form.status,notes:form.notes||null}
    const {error}=editId?await supabase.from('commissions').update(payload).eq('id',editId):await supabase.from('commissions').insert(payload)
    if(error) alert('خطأ: '+error.message); else{setModal(false);load()}
    setSaving(false)
  }
  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('commissions').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>(r.broker_name||r.technicians?.full_name||'').toLowerCase().includes(search.toLowerCase())||r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()))
  const totalDue=rows.reduce((s,r)=>s+(r.commission_amt||0),0)
  const totalPaid=rows.reduce((s,r)=>s+(r.paid_amount||0),0)
  const sales=parseFloat(form.sales_amount)||0
  const pct=parseFloat(form.commission_pct)||0
  const commission=Math.round(sales*pct/100*100)/100

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">العمولات</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>سجل عمولة</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>إجمالي المستحق</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(totalDue)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>المدفوع</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalPaid)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>المتبقي</div><div style={{fontSize:20,fontWeight:800,color:'var(--cs-red)'}}>{fmt(totalDue-totalPaid)} ر.س</div></div>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}><div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالوسيط أو المشروع..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الوسيط</th><th>المشروع</th><th>الفترة</th><th>المبيعات</th><th>النسبة%</th><th>العمولة</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عمولات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontWeight:600}}>{r.broker_name||r.technicians?.full_name||'—'}</td>
                  <td>{r.projects?.project_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.period_month||'—'}</td>
                  <td>{fmt(r.sales_amount)}</td>
                  <td>{r.commission_pct}%</td>
                  <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.commission_amt)}</td>
                  <td style={{color:'var(--cs-green)'}}>{fmt(r.paid_amount)}</td>
                  <td style={{color:'var(--cs-red)',fontWeight:700}}>{fmt(r.balance||0)}</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
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
          <div id="cm-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>سجل عمولة</div>
              <div style={{display:'flex',gap:8}}><button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button><button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button></div>
            </div>
            {[{l:'الوسيط',v:viewItem.broker_name||viewItem.technicians?.full_name},{l:'المشروع',v:viewItem.projects?.project_name},{l:'الفترة',v:viewItem.period_month},{l:'المبيعات',v:fmt(viewItem.sales_amount)+' ر.س'},{l:'النسبة',v:viewItem.commission_pct+'%'},{l:'العمولة',v:fmt(viewItem.commission_amt)+' ر.س'},{l:'المدفوع',v:fmt(viewItem.paid_amount)+' ر.س'},{l:'المتبقي',v:fmt(viewItem.balance||0)+' ر.س'},{l:'الحالة',v:STATUS_AR[viewItem.status]},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}><span style={{width:130,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span><span style={{fontWeight:600,fontSize:13}}>{v}</span></div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#cm-print,#cm-print *{visibility:visible}#cm-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل عمولة جديد'}</div><button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">اسم الوسيط (اختياري)</label><input className="form-input" placeholder="اسم الوسيط أو المندوب" value={form.broker_name} onChange={e=>setForm({...form,broker_name:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني (اختياري)</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">قيمة المبيعات (ر.س)</label><input type="number" min="0" className="form-input" value={form.sales_amount} onChange={e=>setForm({...form,sales_amount:e.target.value})}/></div>
              <div><label className="form-label">نسبة العمولة %</label><input type="number" min="0" max="100" step="0.5" className="form-input" value={form.commission_pct} onChange={e=>setForm({...form,commission_pct:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'10px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,textAlign:'center'}}>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>العمولة المحسوبة</div><div style={{fontWeight:800,color:'var(--cs-blue)',fontSize:18}}>{fmt(commission)} ر.س</div></div>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>المتبقي</div><div style={{fontWeight:800,color:'var(--cs-red)',fontSize:18}}>{fmt(Math.max(0,commission-(parseFloat(form.paid_amount)||0)))} ر.س</div></div>
              </div>
              <div><label className="form-label">المدفوع (ر.س)</label><input type="number" min="0" className="form-input" value={form.paid_amount} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div><label className="form-label">الفترة</label><select className="form-input" value={form.period_month} onChange={e=>setForm({...form,period_month:e.target.value})}>{periodOptions.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Pending','Partial','Paid'].map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button><button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
