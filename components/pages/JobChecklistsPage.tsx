'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, CheckCircle, Circle } from 'lucide-react'

const DEFAULT_ITEMS = [
  'فحص مستوى الغاز (Freon Level Check)',
  'فحص ضغط التبخير (Suction Pressure)',
  'فحص ضغط التكثيف (Discharge Pressure)',
  'فحص الكابيستر (Capacitor Test)',
  'تنظيف الفلتر (Filter Cleaning)',
  'فحص تيار الضاغط (Compressor Ampere)',
  'فحص تيار المروحة (Fan Motor Ampere)',
  'فحص درجة حرارة العادم (Supply Air Temp)',
  'فحص درجة حرارة العودة (Return Air Temp)',
  'فحص نظافة الكويل (Coil Cleaning)',
  'فحص اتصالات الكهرباء (Electrical Check)',
  'فحص البان الكهربائي (Control Board)',
  'فحص صمام التمدد (Expansion Valve)',
  'فحص عزل الأنابيب (Pipe Insulation)',
  'التوقيع والمراجعة النهائية',
]

const newForm = () => ({
  checklist_code: '', project_id: '', tech_id: '',
  check_date: new Date().toISOString().split('T')[0],
  notes: ''
})

export default function JobChecklistsPage() {
  const [rows,setRows] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [techs,setTechs] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())
  const [checkItems,setCheckItems] = useState<Record<string,string>>({})

  const load = async () => {
    setLoading(true)
    const [{data:c},{data:p},{data:t}] = await Promise.all([
      supabase.from('job_checklists').select('*,projects(project_name),technicians(full_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openAdd = () => {
    setForm(newForm())
    const init: Record<string,string> = {}
    DEFAULT_ITEMS.forEach(item => { init[item] = 'Pending' })
    setCheckItems(init)
    setEditId(null); setModal(true)
  }

  const openEdit = (r:any) => {
    setForm({ checklist_code:r.checklist_code||'', project_id:r.project_id||'', tech_id:r.tech_id||'', check_date:r.check_date?.split('T')[0]||'', notes:r.notes||'' })
    setCheckItems(r.items || {})
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.checklist_code.trim()) return alert('رقم القائمة مطلوب')
    setSaving(true)
    const total = Object.keys(checkItems).length
    const done = Object.values(checkItems).filter(v=>v==='Completed').length
    const pct = total > 0 ? Math.round(done/total*100) : 0
    const payload = {
      checklist_code: form.checklist_code.trim(),
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      check_date: form.check_date||null,
      items: checkItems,
      total_items: total,
      completed_items: done,
      completion_pct: pct,
      notes: form.notes||null,
    }
    const {error} = editId
      ? await supabase.from('job_checklists').update(payload).eq('id',editId)
      : await supabase.from('job_checklists').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('job_checklists').delete().eq('id',id); load() }

  const filtered = rows.filter(r =>
    r.checklist_code?.includes(search) ||
    r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const currentDone = Object.values(checkItems).filter(v=>v==='Completed').length
  const currentTotal = Object.keys(checkItems).length

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">قوائم الفحص</div><div className="page-subtitle">Job Checklists — {rows.length} قائمة</div></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16}/>قائمة جديدة</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي القوائم',v:rows.length,c:'var(--cs-blue)'},
          {l:'مكتملة 100%',v:rows.filter(r=>r.completion_pct===100).length,c:'var(--cs-green)'},
          {l:'جارية',v:rows.filter(r=>(r.completion_pct||0)>0&&r.completion_pct<100).length,c:'var(--cs-orange)'},
          {l:'لم تبدأ',v:rows.filter(r=>!r.completion_pct).length,c:'var(--cs-text-muted)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو المشروع أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>رقم القائمة</th><th>المشروع</th><th>الفني</th><th>التاريخ</th><th>المكتملة</th><th>الإنجاز</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد قوائم</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.checklist_code}</span></td>
                  <td style={{fontWeight:600}}>{r.projects?.project_name||'—'}</td>
                  <td>{r.technicians?.full_name||'—'}</td>
                  <td style={{fontSize:12}}>{r.check_date?.split('T')[0]}</td>
                  <td style={{textAlign:'center'}}>{r.completed_items||0}/{r.total_items||0}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:120}}>
                      <div style={{flex:1,background:'var(--cs-border)',borderRadius:4,height:8}}>
                        <div style={{width:`${r.completion_pct||0}%`,background:r.completion_pct===100?'var(--cs-green)':'var(--cs-blue)',height:8,borderRadius:4,transition:'width 0.3s'}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:r.completion_pct===100?'var(--cs-green)':'var(--cs-text)',minWidth:35}}>{r.completion_pct||0}%</span>
                    </div>
                  </td>
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
          <div className="card" style={{width:'100%',maxWidth:620,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل القائمة':'قائمة فحص جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div><label className="form-label">رقم القائمة *</label><input className="form-input" placeholder="CL-001" value={form.checklist_code} onChange={e=>setForm({...form,checklist_code:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الفحص</label><input type="date" className="form-input" value={form.check_date} onChange={e=>setForm({...form,check_date:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
            </div>

            {/* Progress bar */}
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600}}>الإنجاز: {currentDone}/{currentTotal}</span>
                <span style={{fontSize:13,fontWeight:800,color:currentDone===currentTotal?'var(--cs-green)':'var(--cs-blue)'}}>{currentTotal>0?Math.round(currentDone/currentTotal*100):0}%</span>
              </div>
              <div style={{background:'var(--cs-border)',borderRadius:6,height:10}}>
                <div style={{width:`${currentTotal>0?Math.round(currentDone/currentTotal*100):0}%`,background:'var(--cs-green)',height:10,borderRadius:6,transition:'width 0.2s'}}/>
              </div>
            </div>

            {/* Checklist items */}
            <div style={{border:'1px solid var(--cs-border)',borderRadius:8,overflow:'hidden',marginBottom:14}}>
              {Object.keys(checkItems).map((item,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderBottom:i<Object.keys(checkItems).length-1?'1px solid var(--cs-border)':'none',background:checkItems[item]==='Completed'?'#F0FFF4':'white',cursor:'pointer'}}
                  onClick={()=>setCheckItems(prev=>({...prev,[item]:prev[item]==='Completed'?'Pending':'Completed'}))}>
                  {checkItems[item]==='Completed'
                    ? <CheckCircle size={20} color="var(--cs-green)"/>
                    : <Circle size={20} color="var(--cs-border)"/>}
                  <span style={{flex:1,fontSize:13,fontWeight:600,color:checkItems[item]==='Completed'?'var(--cs-green)':'var(--cs-text)',textDecoration:checkItems[item]==='Completed'?'line-through':'none'}}>{item}</span>
                  <span style={{fontSize:11,color:checkItems[item]==='Completed'?'var(--cs-green)':'var(--cs-text-muted)'}}>{checkItems[item]==='Completed'?'✓ مكتمل':'معلق'}</span>
                </div>
              ))}
            </div>

            <div style={{marginBottom:14}}>
              <label className="form-label">ملاحظات</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
