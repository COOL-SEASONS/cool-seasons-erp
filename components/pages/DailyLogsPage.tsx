'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { log_code:'', log_date: new Date().toISOString().split('T')[0], project_id:'', tech_id:'', work_done:'', obstacles:'', materials_used:'', work_hours:'', notes:'' }

export default function DailyLogsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: l }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('daily_logs').select('*, projects(project_name), technicians(full_name)').order('log_date', { ascending: false }),
      supabase.from('projects').select('id,project_name').eq('status','In Progress'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(l||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.log_code?.includes(search) || r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()) || r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.log_code) return alert('كود السجل مطلوب')
    setSaving(true)
    const payload = { ...form, work_hours: parseFloat(form.work_hours)||null, project_id: form.project_id||null, tech_id: form.tech_id||null }
    if (editId) await supabase.from('daily_logs').update(payload).eq('id', editId)
    else await supabase.from('daily_logs').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return
    await supabase.from('daily_logs').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">السجل اليومي</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالمشروع أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>كود السجل</th><th>التاريخ</th><th>المشروع</th><th>الفني</th><th>ما تم إنجازه</th><th>ساعات العمل</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
                : filtered.map(r=>(
                  <tr key={r.id}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.log_code}</span></td>
                    <td style={{fontSize:12}}>{r.log_date}</td>
                    <td style={{fontWeight:600}}>{r.projects?.project_name}</td>
                    <td>{r.technicians?.full_name}</td>
                    <td style={{maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.work_done}</td>
                    <td style={{fontWeight:600,textAlign:'center'}}>{r.work_hours} ساعة</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setForm({...r,project_id:r.project_id||'',tech_id:r.tech_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                        <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل السجل':'سجل يومي جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود السجل *</label><input className="form-input" placeholder="DL-001" value={form.log_code||''} onChange={e=>setForm({...form,log_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.log_date||''} onChange={e=>setForm({...form,log_date:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">ساعات العمل</label><input type="number" step="0.5" className="form-input" value={form.work_hours||''} onChange={e=>setForm({...form,work_hours:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ما تم إنجازه</label><textarea className="form-input" rows={3} value={form.work_done||''} onChange={e=>setForm({...form,work_done:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">العوائق والمشاكل</label><textarea className="form-input" rows={2} value={form.obstacles||''} onChange={e=>setForm({...form,obstacles:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">المواد المستخدمة</label><textarea className="form-input" rows={2} value={form.materials_used||''} onChange={e=>setForm({...form,materials_used:e.target.value})}/></div>
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
