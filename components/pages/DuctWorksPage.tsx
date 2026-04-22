'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const DUCT_TYPES = ['مجرى هواء Supply','مجرى هواء Return','Flex Duct','مجرى مستطيل','مجرى دائري','Plenum Box','تحويلة T-Branch','أخرى']
const UNITS = ['متر طولي','متر مربع','طن','قطعة']
const GRILLE_STATUSES = ['لم يبدأ','قيد التركيب','تم تركيب الجريلات','متأخر']

const newForm = () => ({
  duct_id:'', client_id:'', project_id:'', tech_id:'',
  entry_date: new Date().toISOString().split('T')[0],
  duct_type:'مجرى هواء Supply', unit:'متر طولي',
  total_qty:'0', delivered_qty:'0',
  width_mm:'', height_mm:'',
  grille_status:'لم يبدأ', notes:''
})

export default function DuctWorksPage() {
  const [rows,setRows] = useState<any[]>([])
  const [clients,setClients] = useState<any[]>([])
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
    const [{data:d},{data:c},{data:p},{data:t}] = await Promise.all([
      supabase.from('duct_works').select('*,clients(company_name),projects(project_name),technicians(full_name)').order('entry_date',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(d||[]); setClients(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openEdit = (r:any) => {
    setForm({
      duct_id:r.duct_id||'', client_id:r.client_id||'', project_id:r.project_id||'',
      tech_id:r.tech_id||'', entry_date:r.entry_date?.split('T')[0]||'',
      duct_type:r.duct_type||'', unit:r.unit||'متر طولي',
      total_qty:String(r.total_qty||0), delivered_qty:String(r.delivered_qty||0),
      width_mm:String(r.width_mm||''), height_mm:String(r.height_mm||''),
      grille_status:r.grille_status||'لم يبدأ', notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.duct_id.trim()){alert('رقم السجل مطلوب');return}
    setSaving(true)
    const total = parseFloat(form.total_qty)||0
    const delivered = parseFloat(form.delivered_qty)||0
    const remaining = total - delivered
    const w = parseFloat(form.width_mm)||0
    const h = parseFloat(form.height_mm)||0
    const perimeter = (w && h) ? Math.round(2*(w+h)/100*100)/100 : null
    const payload = {
      duct_id: form.duct_id.trim(),
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      entry_date: form.entry_date||null,
      duct_type: form.duct_type||null,
      unit: form.unit||null,
      total_qty: total, delivered_qty: delivered, remaining_qty: remaining,
      width_mm: w||null, height_mm: h||null, perimeter_m: perimeter||null,
      grille_status: form.grille_status||null,
      notes: (form.client_id ? `عميل: ${form.client_id} | ` : '') + (form.notes||'') || null,
    }
    const {error} = editId
      ? await supabase.from('duct_works').update(payload).eq('id',editId)
      : await supabase.from('duct_works').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('duct_works').delete().eq('id',id); load() }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(n||0)

  const totalQty = rows.reduce((s,r)=>s+(r.total_qty||0),0)
  const totalDelivered = rows.reduce((s,r)=>s+(r.delivered_qty||0),0)
  const totalRemaining = rows.reduce((s,r)=>s+(r.remaining_qty||0),0)
  const grillesInstalled = rows.filter(r=>r.grille_status==='تم تركيب الجريلات').length

  const liveRemaining = (parseFloat(form.total_qty)||0) - (parseFloat(form.delivered_qty)||0)
  const livePerimeter = (parseFloat(form.width_mm)&&parseFloat(form.height_mm)) ? Math.round(2*(parseFloat(form.width_mm)+parseFloat(form.height_mm))/100*100)/100 : 0

  const statusC:any = {'لم يبدأ':'badge-gray','قيد التركيب':'badge-blue','تم تركيب الجريلات':'badge-green','متأخر':'badge-red'}

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">أعمال الدكت</div><div className="page-subtitle">Duct Works Tracking</div></div>
        <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي الكمية',v:fmt(totalQty),c:'var(--cs-blue)'},
          {l:'المسلّم للعميل',v:fmt(totalDelivered),c:'var(--cs-green)'},
          {l:'الباقي',v:fmt(totalRemaining),c:'var(--cs-orange)'},
          {l:'جريلات مركّبة',v:grillesInstalled+' مشروع',c:'var(--cs-blue)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالمشروع أو العميل..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم السجل</th><th>التاريخ</th><th>العميل</th><th>المشروع</th><th>الفني</th><th>نوع الدكت</th><th>الوحدة</th><th>الكمية</th><th>المسلّم</th><th>الباقي</th><th>الجريلات</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.filter(r=>r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())||r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.duct_id?.includes(search)).length===0
                ?<tr><td colSpan={12} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
                :rows.filter(r=>r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())||r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())||r.duct_id?.includes(search)).map(r=>(
                  <tr key={r.id}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.duct_id}</td>
                    <td style={{fontSize:12}}>{r.entry_date?.split('T')[0]}</td>
                    <td style={{fontWeight:600}}>{r.clients?.company_name||'—'}</td>
                    <td style={{fontSize:12}}>{r.projects?.project_name||'—'}</td>
                    <td style={{fontSize:12}}>{r.technicians?.full_name||'—'}</td>
                    <td style={{fontSize:11}}>{r.duct_type}</td>
                    <td style={{fontSize:12}}>{r.unit}</td>
                    <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.total_qty)}</td>
                    <td style={{color:'var(--cs-green)'}}>{fmt(r.delivered_qty)}</td>
                    <td style={{color:(r.remaining_qty||0)>0?'var(--cs-orange)':'var(--cs-green)',fontWeight:700}}>{fmt(r.remaining_qty)}</td>
                    <td><span className={`badge ${statusC[r.grille_status]||'badge-gray'}`} style={{fontSize:10}}>{r.grille_status}</span></td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        )}
      </div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل دكت جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم السجل *</label><input className="form-input" placeholder="DK-001" value={form.duct_id} onChange={e=>setForm({...form,duct_id:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">نوع الدكت</label><select className="form-input" value={form.duct_type} onChange={e=>setForm({...form,duct_type:e.target.value})}>{DUCT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الوحدة</label><select className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              <div><label className="form-label">الكمية الكلية</label><input type="number" min="0" step="0.5" className="form-input" value={form.total_qty} onChange={e=>setForm({...form,total_qty:e.target.value})}/></div>
              <div><label className="form-label">الكمية المسلّمة</label><input type="number" min="0" step="0.5" className="form-input" value={form.delivered_qty} onChange={e=>setForm({...form,delivered_qty:e.target.value})}/></div>
              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 12px',gridColumn:'1/-1',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,textAlign:'center'}}>
                <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>الباقي</div><div style={{fontWeight:800,color:liveRemaining>=0?'var(--cs-orange)':'var(--cs-red)',fontSize:16}}>{fmt(liveRemaining)}</div></div>
                {livePerimeter>0&&<div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>المحيط (م)</div><div style={{fontWeight:800,color:'var(--cs-blue)',fontSize:16}}>{livePerimeter} م</div></div>}
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
