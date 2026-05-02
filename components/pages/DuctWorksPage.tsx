'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const DUCT_TYPES=['Supply Duct','Return Duct','Flex Duct','Rectangular','Round','Plenum Box','T-Branch','أخرى']
const UNITS=['متر طولي','متر مربع','طن','قطعة']
const GRILLE_STATUSES=['لم يبدأ','قيد التركيب','تم تركيب الجريلات','متأخر']
const newForm=()=>({duct_id:`DK-${3500+Math.floor(Date.now()/1000)%9000}` as string,project_id:'',tech_id:'',entry_date:new Date().toISOString().split('T')[0],duct_type:'Supply Duct',unit:'متر طولي',total_qty:'0',delivered_qty:'0',width_mm:'',height_mm:'',grille_status:'لم يبدأ',notes:''})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'DK-3500'
    const nums = rows
      .map((r:any) => r.duct_id?.replace('DK-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'DK-3500'
    return 'DK-' + (Math.max(...nums) + 1)
  }


export default function DuctWorksPage() {
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

  // Auto-generate next code
  const genCode=async()=>{
    const {data}=await supabase.from('duct_works').select('duct_id').order('created_at',{ascending:false}).limit(1)
    if(data&&data[0]?.duct_id){
      const num=parseInt((data[0].duct_id).replace(/\D/g,''))||3499
      return 'DK-'+(num+1)
    }
    return 'DK-3500'
  }

  const load=async()=>{
    setLoading(true)
    const [{data:d},{data:p},{data:t}]=await Promise.all([
      supabase.from('duct_works').select('*,projects(project_name),technicians(full_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(d||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({duct_id:r.duct_id||'',project_id:r.project_id||'',tech_id:r.tech_id||'',entry_date:r.entry_date?.split('T')[0]||'',duct_type:r.duct_type||'Supply Duct',unit:r.unit||'متر طولي',total_qty:String(r.total_qty||0),delivered_qty:String(r.delivered_qty||0),width_mm:String(r.width_mm||''),height_mm:String(r.height_mm||''),grille_status:r.grille_status||'لم يبدأ',notes:r.notes||''})
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.duct_id.trim()) return alert('رقم السجل مطلوب')
    setSaving(true)
    const total=parseFloat(form.total_qty)||0
    const delivered=parseFloat(form.delivered_qty)||0
    const remaining=total-delivered
    const w=parseFloat(form.width_mm)||0
    const h=parseFloat(form.height_mm)||0
    // Build payload without computed columns that may have constraints
    const payload:any={
      duct_id:form.duct_id.trim(),
      project_id:form.project_id||null,
      tech_id:form.tech_id||null,
      entry_date:form.entry_date||null,
      duct_type:form.duct_type||null,
      unit:form.unit||null,
      total_qty:total,
      delivered_qty:delivered,
      grille_status:form.grille_status||null,
      notes:form.notes||null,
    }
    // Add optional computed columns - they may not exist yet
    if(w) payload.width_mm=w
    if(h) payload.height_mm=h
    if(w&&h) payload.perimeter_m=Math.round(2*(w+h)/100*100)/100

    // Try with remaining_qty first
    const withRemaining={...payload}
    const {error}=editId
      ? await supabase.from('duct_works').update(withRemaining).eq('id',editId)
      : await supabase.from('duct_works').insert(withRemaining)
    if(error){
      // If remaining_qty is causing issue, try without
      if(error.message?.includes('remaining_qty')||error.message?.includes('non-DEFAULT')){
        const {error:e2}=editId
          ? await supabase.from('duct_works').update(payload).eq('id',editId)
          : await supabase.from('duct_works').insert(payload)
        if(e2) alert('خطأ: '+e2.message)
        else{setModal(false);load()}
      } else alert('خطأ: '+error.message)
    } else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('duct_works').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(n||0)
  const liveRemaining=(parseFloat(form.total_qty)||0)-(parseFloat(form.delivered_qty)||0)
  const statusC:any={'لم يبدأ':'badge-gray','قيد التركيب':'badge-blue','تم تركيب الجريلات':'badge-green','متأخر':'badge-red'}

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">أعمال الدكت</div><div className="page-subtitle">Duct Works Tracking — {rows.length} سجل</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm({...newForm(),duct_id:'DK-'+(rows.length+3500)});setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي الكمية',v:fmt(rows.reduce((s,r)=>s+(r.total_qty||0),0)),c:'var(--cs-blue)'},{l:'المسلّم',v:fmt(rows.reduce((s,r)=>s+(r.delivered_qty||0),0)),c:'var(--cs-green)'},{l:'الباقي',v:fmt(rows.reduce((s,r)=>s+(r.remaining_qty||((r.total_qty||0)-(r.delivered_qty||0))),0)),c:'var(--cs-orange)'},{l:'جريلات مركّبة',v:rows.filter(r=>r.grille_status==='تم تركيب الجريلات').length+' مشروع',c:'var(--cs-blue)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالمشروع أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم السجل</th><th>التاريخ</th><th>المشروع</th><th>الفني</th><th>نوع الدكت</th><th>الكمية</th><th>المسلّم</th><th>الباقي</th><th>الجريلات</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.filter(r=>r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.duct_id?.includes(search)).length===0
                ?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
                :rows.filter(r=>r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.duct_id?.includes(search)).map(r=>{
                  const rem=r.remaining_qty??((r.total_qty||0)-(r.delivered_qty||0))
                  return (
                    <tr key={r.id}>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{r.duct_id}</td>
                      <td style={{fontSize:12}}>{r.entry_date?.split('T')[0]||'—'}</td>
                      <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                      <td>{r.technicians?.full_name||'—'}</td>
                      <td style={{fontSize:11}}>{r.duct_type}</td>
                      <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.total_qty)}</td>
                      <td style={{color:'var(--cs-green)'}}>{fmt(r.delivered_qty)}</td>
                      <td style={{color:rem>0?'var(--cs-orange)':'var(--cs-green)',fontWeight:700}}>{fmt(rem)}</td>
                      <td><span className={`badge ${statusC[r.grille_status]||'badge-gray'}`} style={{fontSize:10}}>{r.grille_status}</span></td>
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
          <div id="dk-print" className="card" style={{width:'100%',maxWidth:480,padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>سجل دكت — {viewItem.duct_id}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            {[{l:'التاريخ',v:viewItem.entry_date?.split('T')[0]},{l:'المشروع',v:viewItem.projects?.project_name},{l:'الفني',v:viewItem.technicians?.full_name},{l:'نوع الدكت',v:viewItem.duct_type},{l:'الوحدة',v:viewItem.unit},{l:'الكمية الكلية',v:fmt(viewItem.total_qty)},{l:'المسلّم',v:fmt(viewItem.delivered_qty)},{l:'الباقي',v:fmt(viewItem.remaining_qty??((viewItem.total_qty||0)-(viewItem.delivered_qty||0)))},{l:'حالة الجريلات',v:viewItem.grille_status}].map(({l,v},i)=>v?(
              <div key={i} style={{display:'flex',padding:'7px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{width:130,color:'var(--cs-text-muted)',fontSize:13}}>{l}:</span>
                <span style={{fontWeight:600,fontSize:13}}>{v}</span>
              </div>
            ):null)}
          </div>
          <style>{`@media print{body *{visibility:hidden}#dk-print,#dk-print *{visibility:visible}#dk-print{position:fixed;top:0;left:0;width:100%}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل دكت جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم السجل *</label><input className="form-input" placeholder="DK-001" value={form.duct_id} onChange={e=>setForm({...form,duct_id:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">نوع الدكت</label><select className="form-input" value={form.duct_type} onChange={e=>setForm({...form,duct_type:e.target.value})}>{DUCT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الوحدة</label><select className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              <div><label className="form-label">الكمية الكلية</label><input type="number" min="0" step="0.5" className="form-input" value={form.total_qty} onChange={e=>setForm({...form,total_qty:e.target.value})}/></div>
              <div><label className="form-label">الكمية المسلّمة</label><input type="number" min="0" step="0.5" className="form-input" value={form.delivered_qty} onChange={e=>setForm({...form,delivered_qty:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'10px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,textAlign:'center'}}>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>الكمية الباقية</div><div style={{fontWeight:800,color:liveRemaining>=0?'var(--cs-orange)':'var(--cs-red)',fontSize:18}}>{fmt(liveRemaining)}</div></div>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>نسبة التسليم</div><div style={{fontWeight:800,color:'var(--cs-blue)',fontSize:18}}>{(parseFloat(form.total_qty)||0)>0?Math.round((parseFloat(form.delivered_qty)||0)/(parseFloat(form.total_qty)||1)*100):0}%</div></div>
              </div>
              <div><label className="form-label">العرض (مم)</label><input type="number" min="0" className="form-input" value={form.width_mm} onChange={e=>setForm({...form,width_mm:e.target.value})}/></div>
              <div><label className="form-label">الارتفاع (مم)</label><input type="number" min="0" className="form-input" value={form.height_mm} onChange={e=>setForm({...form,height_mm:e.target.value})}/></div>
              <div><label className="form-label">حالة الجريلات</label><select className="form-input" value={form.grille_status} onChange={e=>setForm({...form,grille_status:e.target.value})}>{GRILLE_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
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
