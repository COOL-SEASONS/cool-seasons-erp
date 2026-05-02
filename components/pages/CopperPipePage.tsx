'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const PIPE_SIZES = ['1/4','3/8-1/4','1/2-1/4','5/8-3/8','3/4-1/2','7/8-1/2','1 1/8-5/8']

const newForm = () => ({
  record_id:`CP-${1001+Math.floor(Date.now()/1000)%9000}` as string, entry_date: new Date().toISOString().split('T')[0],
  project_id:'', tech_id:'', pipe_size:'3/8-1/4 بوصة (1 طن)',
  coils_count:'0', meters_per_coil:'15',
  meters_installed:'0', unit_price:'0', notes:''
})

export default function CopperPipePage() {
  const [viewItem,setViewItem]=useState<any>(null)
  const [rows,setRows] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const [{data:r},{data:p},{data:t}] = await Promise.all([
      supabase.from('copper_pipe').select('*,projects(project_name),technicians(full_name)').order('entry_date',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openEdit = (r:any) => {
    setForm({
      record_id:r.record_id||'', entry_date:r.entry_date?.split('T')[0]||'',
      project_id:r.project_id||'', tech_id:r.tech_id||'',
      pipe_size:r.pipe_size||'', coils_count:String(r.coils_count||0),
      meters_per_coil:String(r.meters_per_coil||15),
      meters_installed:String(r.meters_installed||0),
      unit_price:String(r.unit_price||0), notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.record_id.trim()){alert('رقم السجل مطلوب');return}
    setSaving(true)
    const coils = parseFloat(form.coils_count)||0
    const mpc = parseFloat(form.meters_per_coil)||15
    const totalReceived = coils * mpc
    const installed = parseFloat(form.meters_installed)||0
    const remaining = totalReceived - installed
    const totalValue = coils * (parseFloat(form.unit_price)||0)
    const payload = {
      record_id: form.record_id.trim(),
      entry_date: form.entry_date||null,
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      pipe_size: form.pipe_size||null,
      meters_per_coil: mpc,
      total_meters_received: totalReceived,
      meters_installed: installed,
      remaining_meters: remaining,
      unit_price: parseFloat(form.unit_price)||0,
      notes: form.notes ? `لفات: ${coils} | ${form.notes}` : `لفات: ${coils}`,
    }
    const {error} = editId
      ? await supabase.from('copper_pipe').update(payload).eq('id',editId)
      : await supabase.from('copper_pipe').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('copper_pipe').delete().eq('id',id); load() }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(n||0)

  const totalReceived = rows.reduce((s,r)=>s+(r.total_meters_received||0),0)
  const totalInstalled = rows.reduce((s,r)=>s+(r.meters_installed||0),0)
  const totalRemaining = rows.reduce((s,r)=>s+(r.remaining_meters||0),0)

  // Live calculation in form
  const liveReceived = (parseFloat(form.coils_count)||0) * (parseFloat(form.meters_per_coil)||15)
  const liveRemaining = liveReceived - (parseFloat(form.meters_installed)||0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">مواسير النحاس</div><div className="page-subtitle">Copper Pipe Tracking</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...newForm(),record_id:'CP-'+(rows.length+1001)});setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي المستلم',v:fmt(totalReceived)+' م',c:'var(--cs-blue)'},
          {l:'إجمالي المركّب',v:fmt(totalInstalled)+' م',c:'var(--cs-green)'},
          {l:'المتبقي',v:fmt(totalRemaining)+' م',c:totalRemaining>=0?'var(--cs-orange)':'var(--cs-red)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالمشروع أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم السجل</th><th>التاريخ</th><th>المشروع</th><th>الفني</th><th>مقاس الأنبوب</th><th>عدد اللفات</th><th>م مستلمة</th><th>م مركّبة</th><th>م متبقية</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.filter(r=>r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.record_id?.includes(search)).length===0
                ?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
                :rows.filter(r=>r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.record_id?.includes(search)).map(r=>(
                  <tr key={r.id}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.record_id}</td>
                    <td style={{fontSize:12}}>{r.entry_date?.split('T')[0]}</td>
                    <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                    <td>{r.technicians?.full_name||'—'}</td>
                    <td style={{fontSize:11}}>{r.pipe_size}</td>
                    <td style={{textAlign:'center'}}>{r.coils_count}</td>
                    <td style={{color:'var(--cs-blue)',fontWeight:700}}>{fmt(r.total_meters_received)} م</td>
                    <td style={{color:'var(--cs-green)',fontWeight:700}}>{fmt(r.meters_installed)} م</td>
                    <td style={{color:(r.remaining_meters||0)>=0?'var(--cs-orange)':'var(--cs-red)',fontWeight:700}}>{fmt(r.remaining_meters)} م</td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        )}
      </div>

      
      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="view-print-area" className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16}}>تفاصيل السجل</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'6px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12,fontFamily:'Tajawal,sans-serif'}}><Printer size={14}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-text-muted)'}}><X size={20}/></button>
              </div>
            </div>
            <div>
              {Object.entries(viewItem).filter(([k])=>!['id','created_at','updated_at'].includes(k)&&typeof viewItem[k]!=='object').map(([k,v]:any,i)=>
                v!=null&&v!==''?(
                  <div key={i} style={{display:'flex',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
                    <span style={{width:160,color:'var(--cs-text-muted)',fontSize:12,fontWeight:600,flexShrink:0}}>{k.replace(/_/g,' ')}</span>
                    <span style={{fontWeight:600,fontSize:13}}>{String(v)}</span>
                  </div>
                ):null
              )}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#view-print-area,#view-print-area *{visibility:visible}#view-print-area{position:fixed;top:0;left:0;width:100%;max-height:none!important}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل مواسير نحاس جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم السجل *</label><input className="form-input" placeholder="CP-001" value={form.record_id} onChange={e=>setForm({...form,record_id:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">مقاس الأنبوب</label><select className="form-input" value={form.pipe_size} onChange={e=>setForm({...form,pipe_size:e.target.value})}>{PIPE_SIZES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">عدد اللفات</label><input type="number" min="0" className="form-input" value={form.coils_count} onChange={e=>setForm({...form,coils_count:e.target.value})}/></div>
              <div><label className="form-label">متر/لفة</label><input type="number" min="1" className="form-input" value={form.meters_per_coil} onChange={e=>setForm({...form,meters_per_coil:e.target.value})}/></div>
              {/* Live calc */}
              <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'10px 14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>إجمالي مستلم</div><div style={{fontWeight:800,color:'var(--cs-blue)',fontSize:16}}>{fmt(liveReceived)} م</div></div>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>مركّب</div><div style={{fontWeight:800,color:'var(--cs-green)',fontSize:16}}>{fmt(parseFloat(form.meters_installed)||0)} م</div></div>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>متبقي</div><div style={{fontWeight:800,color:liveRemaining>=0?'var(--cs-orange)':'var(--cs-red)',fontSize:16}}>{fmt(liveRemaining)} م</div></div>
              </div>
              <div><label className="form-label">الأمتار المركّبة</label><input type="number" min="0" step="0.5" className="form-input" value={form.meters_installed} onChange={e=>setForm({...form,meters_installed:e.target.value})}/></div>
              <div><label className="form-label">سعر اللفة (ر.س)</label><input type="number" min="0" className="form-input" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})}/></div>
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
