'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const ASSET_TYPES=['مكيف سبليت','مكيف دبل سبليت','VRF','مكيف مخفي','مكيف مركزي','Chiller','FCU','AHU','ثلاجة','معدة مطبخ','أخرى']
const UNITS=['طن','كيلو واط','BTU','وحدة']
const newCode=()=>`AST-${11000+Math.floor(Date.now()/1000)%9000}`

const newForm=()=>({
  asset_code:newCode(),asset_name:'',asset_type:'مكيف سبليت',
  brand:'',model:'',serial_no:'',capacity:'',unit:'طن',
  project_id:'',client_id:'',tech_id:'',location:'',
  install_date:'',warranty_expiry:'',purchase_price:'0',
  status:'Active',notes:''
})

export default function EquipmentPage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
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
    const [{data:e},{data:c},{data:p},{data:t}]=await Promise.all([
      supabase.from('equipment_assets').select('*,clients(company_name),projects(project_name),technicians(full_name)').order('install_date',{ascending:false,nullsFirst:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(e||[]); setClients(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({
      asset_code:r.asset_code||'',asset_name:r.asset_name||'',asset_type:r.asset_type||'مكيف سبليت',
      brand:r.brand||'',model:r.model||'',serial_no:r.serial_no||'',capacity:r.capacity||'',unit:r.unit||'طن',
      project_id:r.project_id||'',client_id:r.client_id||'',tech_id:r.tech_id||'',location:r.location||'',
      install_date:r.install_date?.split('T')[0]||'',warranty_expiry:r.warranty_expiry?.split('T')[0]||'',
      purchase_price:String(r.purchase_price||0),status:r.status||'Active',notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.asset_code.trim()) return alert('الكود مطلوب')
    setSaving(true)
    const payload={
      asset_code:form.asset_code.trim(),asset_name:form.asset_name||null,
      asset_type:form.asset_type||null,brand:form.brand||null,model:form.model||null,
      serial_no:form.serial_no||null,capacity:form.capacity||null,unit:form.unit||null,
      project_id:form.project_id||null,client_id:form.client_id||null,tech_id:form.tech_id||null,
      location:form.location||null,install_date:form.install_date||null,
      warranty_expiry:form.warranty_expiry||null,
      purchase_price:parseFloat(form.purchase_price)||0,
      status:form.status||'Active',notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('equipment_assets').update(payload).eq('id',editId)
      : await supabase.from('equipment_assets').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('equipment_assets').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.asset_code?.includes(search)||r.asset_name?.toLowerCase().includes(search.toLowerCase())||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">المعدات المركّبة</div><div className="page-subtitle">{rows.length} معدة</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>معدة جديدة</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي المعدات',v:rows.length,c:'var(--cs-blue)'},{l:'نشطة',v:rows.filter(r=>r.status==='Active').length,c:'var(--cs-green)'},{l:'صيانة',v:rows.filter(r=>r.status==='Under Maintenance').length,c:'var(--cs-orange)'},{l:'خارج الخدمة',v:rows.filter(r=>r.status==='Inactive').length,c:'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الاسم أو العميل..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>اسم المعدة</th><th>النوع</th><th>الماركة</th><th>العميل</th><th>الموقع</th><th>تركيب</th><th>ضمان ينتهي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد معدات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.asset_code}</td>
                  <td style={{fontWeight:600}}>{r.asset_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.asset_type}</td>
                  <td>{r.brand||'—'}</td>
                  <td>{r.clients?.company_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.location||'—'}</td>
                  <td style={{fontSize:12}}>{r.install_date?.split('T')[0]||'—'}</td>
                  <td style={{fontSize:12,color:r.warranty_expiry&&new Date(r.warranty_expiry)<new Date()?'var(--cs-red)':'inherit'}}>{r.warranty_expiry?.split('T')[0]||'—'}</td>
                  <td><span className={`badge ${r.status==='Active'?'badge-green':r.status==='Under Maintenance'?'badge-amber':'badge-gray'}`}>{r.status}</span></td>
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
          <div id="eq-print" className="card" style={{width:'100%',maxWidth:500,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>معدة — {viewItem.asset_code}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'الكود',v:viewItem.asset_code},{l:'الاسم',v:viewItem.asset_name},{l:'النوع',v:viewItem.asset_type},{l:'الماركة',v:viewItem.brand},{l:'الموديل',v:viewItem.model},{l:'الرقم التسلسلي',v:viewItem.serial_no},{l:'الطاقة',v:viewItem.capacity?`${viewItem.capacity} ${viewItem.unit}`:null},{l:'العميل',v:viewItem.clients?.company_name},{l:'الموقع',v:viewItem.location},{l:'تاريخ التركيب',v:viewItem.install_date?.split('T')[0]},{l:'انتهاء الضمان',v:viewItem.warranty_expiry?.split('T')[0]},{l:'الحالة',v:viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'6px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:140,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#eq-print,#eq-print *{visibility:visible}#eq-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'معدة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" value={form.asset_code} onChange={e=>setForm({...form,asset_code:e.target.value})}/></div>
              <div><label className="form-label">نوع المعدة</label><select className="form-input" value={form.asset_type} onChange={e=>setForm({...form,asset_type:e.target.value})}>{ASSET_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">اسم المعدة</label><input className="form-input" value={form.asset_name} onChange={e=>setForm({...form,asset_name:e.target.value})}/></div>
              <div><label className="form-label">الماركة</label><input className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">الرقم التسلسلي</label><input className="form-input" dir="ltr" value={form.serial_no} onChange={e=>setForm({...form,serial_no:e.target.value})}/></div>
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:2}}><label className="form-label">الطاقة</label><input className="form-input" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></div>
                <div style={{flex:1}}><label className="form-label">الوحدة</label><select className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="form-label">الموقع</label><input className="form-input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">تاريخ التركيب</label><input type="date" className="form-input" value={form.install_date} onChange={e=>setForm({...form,install_date:e.target.value})}/></div>
              <div><label className="form-label">انتهاء الضمان</label><input type="date" className="form-input" value={form.warranty_expiry} onChange={e=>setForm({...form,warranty_expiry:e.target.value})}/></div>
              <div><label className="form-label">سعر الشراء (ر.س)</label><input type="number" min="0" className="form-input" value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Active">نشطة</option><option value="Under Maintenance">تحت الصيانة</option><option value="Inactive">خارج الخدمة</option></select></div>
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
