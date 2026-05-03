'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const STATUS_AR:any={Pending:'انتظار موافقة',Approved:'موافق عليها',Rejected:'مرفوضة',Cancelled:'ملغية'}
const STATUS_C:any={Pending:'badge-amber',Approved:'badge-green',Rejected:'badge-red',Cancelled:'badge-gray'}
const newForm=()=>({co_code:`CO-${551+Math.floor(Date.now()/1000)%9000}` as string,project_id:'',client_id:'',description:'',amount:'0',requested_date:new Date().toISOString().split('T')[0],approved_date:'',status:'Pending',notes:''})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'CO-551'
    const nums = rows
      .map((r:any) => r.co_code?.replace('CO-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'CO-551'
    return 'CO-' + (Math.max(...nums) + 1)
  }


export default function ChangeOrdersPage() {
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
    const [{data:c},{data:p},{data:cl}]=await Promise.all([
      supabase.from('change_orders').select('*,projects(project_name),clients(company_name)').order('requested_date',{ascending:false,nullsFirst:false}),
      supabase.from('projects').select('id,project_name,client_id'),
      supabase.from('clients').select('id,company_name'),
    ])
    setRows(c||[]); setProjects(p||[]); setClients(cl||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const save=async()=>{
    if(!form.co_code?.trim()) return alert('رقم الأمر مطلوب')
    setSaving(true)
    const {error}=editId
      ? await supabase.from('change_orders').update({co_code:form.co_code.trim(),project_id:form.project_id||null,client_id:form.client_id||null,description:form.description||null,amount:parseFloat(form.amount)||0,requested_date:form.requested_date||null,approved_date:form.approved_date||null,status:form.status,notes:form.notes||null}).eq('id',editId)
      : await supabase.from('change_orders').insert({co_code:form.co_code.trim(),project_id:form.project_id||null,client_id:form.client_id||null,description:form.description||null,amount:parseFloat(form.amount)||0,requested_date:form.requested_date||null,approved_date:form.approved_date||null,status:form.status,notes:form.notes||null})
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('change_orders').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.co_code?.includes(search)||r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.description?.toLowerCase().includes(search.toLowerCase()))
  const totalApproved=rows.filter(r=>r.status==='Approved').reduce((s,r)=>s+(r.amount||0),0)
  const totalPending=rows.filter(r=>r.status==='Pending').reduce((s,r)=>s+(r.amount||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">أوامر التغيير</div><div className="page-subtitle">{rows.length} أمر تغيير</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...newForm(),co_code:'CO-'+(rows.length+551)});setEditId(null);setModal(true)}}><Plus size={16}/>أمر تغيير جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'الإجمالي',v:fmt(totalApproved+totalPending)+' ر.س',c:'var(--cs-blue)'},{l:'موافق عليها',v:fmt(totalApproved)+' ر.س',c:'var(--cs-green)'},{l:'انتظار موافقة',v:fmt(totalPending)+' ر.س',c:'var(--cs-orange)'},{l:'مرفوضة',v:rows.filter(r=>r.status==='Rejected').length,c:'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم الأمر</th><th>المشروع</th><th>العميل</th><th>الوصف</th><th>القيمة</th><th>تاريخ الطلب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أوامر</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.co_code}</span></td>
                  <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                  <td>{r.clients?.company_name||'—'}</td>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                  <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.amount)} ر.س</td>
                  <td style={{fontSize:12}}>{r.requested_date}</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>{setForm({co_code:r.co_code||'',project_id:r.project_id||'',client_id:r.client_id||'',description:r.description||'',amount:String(r.amount||0),requested_date:r.requested_date||'',approved_date:r.approved_date||'',status:r.status||'Pending',notes:r.notes||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
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
          <div id="co-print" className="card" style={{width:'100%',maxWidth:520,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>أمر تغيير — {viewItem.co_code}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'رقم الأمر',v:viewItem.co_code},{l:'المشروع',v:viewItem.projects?.project_name},{l:'العميل',v:viewItem.clients?.company_name},{l:'الوصف',v:viewItem.description},{l:'القيمة',v:fmt(viewItem.amount)+' ر.س'},{l:'تاريخ الطلب',v:viewItem.requested_date},{l:'تاريخ الموافقة',v:viewItem.approved_date||'—'},{l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
            <div style={{marginTop:24,display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              {['توقيع المدير','توقيع العميل'].map((l,i)=>(
                <div key={i} style={{textAlign:'center',borderTop:'2px solid var(--cs-border)',paddingTop:8,fontSize:12,color:'var(--cs-text-muted)',fontWeight:600}}>{l}</div>
              ))}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#co-print,#co-print *{visibility:visible}#co-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'أمر تغيير جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الأمر *</label><input className="form-input" placeholder="CO-001" value={form.co_code||''} onChange={e=>setForm({...form,co_code:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>{Object.keys(STATUS_AR).map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);setForm({...form,project_id:e.target.value,client_id:p?.client_id||form.client_id})}}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف التغيير</label><textarea className="form-input" rows={2} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">القيمة (ر.س)</label><input type="number" min="0" className="form-input" value={form.amount||'0'} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الطلب</label><input type="date" className="form-input" value={form.requested_date||''} onChange={e=>setForm({...form,requested_date:e.target.value})}/></div>
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
