'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const SPECIALTIES=['كهرباء','سباكة','نجارة','حدادة','أعمال جبس','دهانات','أرضيات','أسقف معلقة','عوازل','زجاج وألمنيوم','مدني','نظام إطفاء الحرائق والمستشعرات','أخرى']
const PAYMENT_METHODS=['حسب الإنجاز','شهري','أسبوعي','نقدي','تحويل بنكي','أخرى']

const newCode=()=>`CCND-${11+Math.floor(Date.now()/1000)%9000}`
const newForm=()=>({contractor_code:newCode(),company_name:'',specialty:'كهرباء',phone:'',cr_number:'',link_type:'project',project_id:'',contract_id:'',payment_method:'حسب الإنجاز',contract_start:new Date().toISOString().split('T')[0],contract_end:'',contract_value:'0',paid_amount:'0',status:'نشط',notes:''})

export default function ContractorPage() {
  const [rows,setRows]=useState<any[]>([])
  const [projects,setProjects]=useState<any[]>([])
  const [contracts,setContracts]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:r},{data:p},{data:amc}]=await Promise.all([
      supabase.from('contractors').select('*,projects(project_name),contracts_amc(contract_code,clients(company_name))').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
      supabase.from('contracts_amc').select('id,contract_code,clients(company_name)').eq('status','Active'),
    ])
    setRows(r||[]); setProjects(p||[]); setContracts(amc||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({contractor_code:r.contractor_code||'',company_name:r.company_name||'',specialty:r.specialty||'كهرباء',phone:r.phone||'',cr_number:r.cr_number||'',link_type:r.link_type||'project',project_id:r.project_id||'',contract_id:r.contract_id||'',payment_method:r.payment_method||'حسب الإنجاز',contract_start:r.contract_start?.split('T')[0]||'',contract_end:r.contract_end?.split('T')[0]||'',contract_value:String(r.contract_value||0),paid_amount:String(r.paid_amount||0),status:r.status||'نشط',notes:r.notes||''})
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.contractor_code.trim()) return alert('الكود مطلوب')
    if(!form.company_name.trim()) return alert('اسم الشركة مطلوب')
    setSaving(true)
    const payload={contractor_code:form.contractor_code.trim(),company_name:form.company_name.trim(),specialty:form.specialty||null,phone:form.phone||null,cr_number:form.cr_number||null,link_type:form.link_type||'project',project_id:form.link_type==='project'?(form.project_id||null):null,contract_id:form.link_type==='amc'?(form.contract_id||null):null,payment_method:form.payment_method||null,contract_start:form.contract_start||null,contract_end:form.contract_end||null,contract_value:parseFloat(form.contract_value)||0,paid_amount:parseFloat(form.paid_amount)||0,status:form.status||'نشط',notes:form.notes||null}
    const {error}=editId?await supabase.from('contractors').update(payload).eq('id',editId):await supabase.from('contractors').insert(payload)
    if(error) alert('خطأ: '+error.message); else{setModal(false);load()}
    setSaving(false)
  }
  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('contractors').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.contractor_code?.includes(search)||r.company_name?.toLowerCase().includes(search.toLowerCase())||r.specialty?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">إدارة المقاولين</div><div className="page-subtitle">{rows.length} مقاول</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>مقاول جديد</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي المقاولين',v:rows.length,c:'var(--cs-blue)'},{l:'نشطون',v:rows.filter(r=>r.status==='نشط').length,c:'var(--cs-green)'},{l:'قيمة العقود',v:fmt(rows.reduce((s,r)=>s+(r.contract_value||0),0))+' ر.س',c:'var(--cs-orange)'},{l:'المدفوع',v:fmt(rows.reduce((s,r)=>s+(r.paid_amount||0),0))+' ر.س',c:'var(--cs-green)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الشركة أو التخصص..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الشركة</th><th>التخصص</th><th>الهاتف</th><th>المشروع</th><th>قيمة العقد</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا يوجد مقاولون</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.contractor_code}</td>
                  <td style={{fontWeight:600}}>{r.company_name}</td>
                  <td><span className="badge badge-blue">{r.specialty}</span></td>
                  <td><a href={`tel:${r.phone}`} style={{color:'var(--cs-blue)',textDecoration:'none'}}>{r.phone||'—'}</a></td>
                  <td>
                    {r.link_type==='amc'&&r.contracts_amc?(
                      <span style={{fontSize:11}}><span style={{background:'#F0FDFA',color:'#0D9488',padding:'1px 6px',borderRadius:4,fontSize:10,fontWeight:700}}>🔄 AMC</span> {r.contracts_amc.contract_code}</span>
                    ):(r.projects?.project_name||'—')}
                  </td>
                  <td style={{fontWeight:700,color:'var(--cs-orange)'}}>{fmt(r.contract_value)} ر.س</td>
                  <td style={{color:'var(--cs-green)'}}>{fmt(r.paid_amount)} ر.س</td>
                  <td style={{color:'var(--cs-red)',fontWeight:700}}>{fmt((r.contract_value||0)-(r.paid_amount||0))} ر.س</td>
                  <td><span className={`badge ${r.status==='نشط'?'badge-green':'badge-gray'}`}>{r.status}</span></td>
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
          <div id="ct-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>مقاول — {viewItem.contractor_code}</div>
              <div style={{display:'flex',gap:8}}><button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button><button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button></div>
            </div>
            {[{l:'الكود',v:viewItem.contractor_code},{l:'الشركة',v:viewItem.company_name},{l:'التخصص',v:viewItem.specialty},{l:'الهاتف',v:viewItem.phone},{l:'السجل التجاري',v:viewItem.cr_number},{l:'المشروع',v:viewItem.projects?.project_name},{l:'طريقة الدفع',v:viewItem.payment_method},{l:'قيمة العقد',v:fmt(viewItem.contract_value)+' ر.س'},{l:'المدفوع',v:fmt(viewItem.paid_amount)+' ر.س'},{l:'تاريخ البداية',v:viewItem.contract_start?.split('T')[0]},{l:'تاريخ النهاية',v:viewItem.contract_end?.split('T')[0]},{l:'الحالة',v:viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}><span style={{width:130,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span><span style={{fontWeight:600,fontSize:13}}>{v}</span></div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#ct-print,#ct-print *{visibility:visible}#ct-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}
      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'مقاول جديد'}</div><button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" value={form.contractor_code} onChange={e=>setForm({...form,contractor_code:e.target.value})}/></div>
              <div><label className="form-label">اسم الشركة *</label><input className="form-input" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></div>
              <div><label className="form-label">التخصص</label><select className="form-input" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">رقم الهاتف</label><input className="form-input" dir="ltr" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="form-label">السجل التجاري</label><input className="form-input" value={form.cr_number} onChange={e=>setForm({...form,cr_number:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="form-label">نوع الارتباط *</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  {[{v:'project',l:'📋 مشروع'},{v:'amc',l:'🔄 عقد AMC'}].map(opt=>(
                    <label key={opt.v} style={{flex:1,display:'flex',alignItems:'center',gap:7,padding:'8px 12px',border:`2px solid ${form.link_type===opt.v?'var(--cs-blue)':'var(--cs-border)'}`,borderRadius:8,cursor:'pointer',background:form.link_type===opt.v?'#EFF6FD':'white'}}>
                      <input type="radio" name="ct_link" value={opt.v} checked={form.link_type===opt.v} onChange={()=>setForm({...form,link_type:opt.v,project_id:'',contract_id:''})} style={{accentColor:'var(--cs-blue)'}}/>
                      <span style={{fontSize:13,fontWeight:700,color:form.link_type===opt.v?'var(--cs-blue)':'var(--cs-text)'}}>{opt.l}</span>
                    </label>
                  ))}
                </div>
                {form.link_type==='project'?(
                  <select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر مشروعاً —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
                ):(
                  <select className="form-input" value={form.contract_id} onChange={e=>setForm({...form,contract_id:e.target.value})}><option value="">— اختر عقد AMC —</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_code} — {c.clients?.company_name}</option>)}</select>
                )}
              </div>
              <div><label className="form-label">طريقة الدفع</label><select className="form-input" value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}>{PAYMENT_METHODS.map(p=><option key={p}>{p}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="نشط">نشط</option><option value="منتهي">منتهي</option><option value="ملغي">ملغي</option></select></div>
              <div><label className="form-label">قيمة العقد</label><input type="number" min="0" className="form-input" value={form.contract_value} onChange={e=>setForm({...form,contract_value:e.target.value})}/></div>
              <div><label className="form-label">المدفوع</label><input type="number" min="0" className="form-input" value={form.paid_amount} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div><label className="form-label">تاريخ البدء</label><input type="date" className="form-input" value={form.contract_start} onChange={e=>setForm({...form,contract_start:e.target.value})}/></div>
              <div><label className="form-label">تاريخ النهاية</label><input type="date" className="form-input" value={form.contract_end} onChange={e=>setForm({...form,contract_end:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}><button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button><button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري...':'حفظ'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
