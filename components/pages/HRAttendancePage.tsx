'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const ATT_STATUSES = ['Present','Absent','Half Day','Leave','Holiday']
const ATT_AR: any = { Present:'حاضر', Absent:'غائب', 'Half Day':'نصف يوم', Leave:'إجازة', Holiday:'إجازة رسمية' }
const EMPTY = { record_code:'', tech_id:'', att_date: new Date().toISOString().split('T')[0], status:'Present', check_in:'', check_out:'', project_id:'', notes:'' }

export default function HRAttendancePage() {
  const [rows, setRows] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: a }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('hr_attendance').select('*, technicians(full_name), projects(project_name)').order('att_date', { ascending: false }).limit(200),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name').eq('status','In Progress'),
    ])
    setRows(a||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.record_code?.includes(search))

  const save = async () => {
    if (!form.record_code || !form.tech_id) return alert('الكود والفني مطلوبان')
    setSaving(true)
    const payload = { ...form, project_id: form.project_id||null }
    if (editId) await supabase.from('hr_attendance').update(payload).eq('id', editId)
    else await supabase.from('hr_attendance').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return
    await supabase.from('hr_attendance').delete().eq('id', id)
    load()
  }

  const statusC: any = { Present:'badge-green', Absent:'badge-red', 'Half Day':'badge-amber', Leave:'badge-blue', Holiday:'badge-gray' }
  const todayPresent = rows.filter(r=>r.att_date===new Date().toISOString().split('T')[0]&&r.status==='Present').length
  const todayAbsent = rows.filter(r=>r.att_date===new Date().toISOString().split('T')[0]&&r.status==='Absent').length

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الحضور والانصراف</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>تسجيل حضور</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'حاضرون اليوم',v:todayPresent,c:'var(--cs-green)'},{l:'غائبون اليوم',v:todayAbsent,c:'var(--cs-red)'},{l:'إجمالي الفنيين',v:techs.length,c:'var(--cs-blue)'}].map((s,i)=>
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        )}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالفني..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>التاريخ</th><th>الفني</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th>ساعات العمل</th><th>المشروع</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontSize:12,fontFamily:'monospace'}}>{r.record_code}</td>
                  <td style={{fontSize:12}}>{r.att_date}</td>
                  <td style={{fontWeight:600}}>{r.technicians?.full_name}</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{ATT_AR[r.status]||r.status}</span></td>
                  <td style={{direction:'ltr',fontSize:12}}>{r.check_in}</td>
                  <td style={{direction:'ltr',fontSize:12}}>{r.check_out}</td>
                  <td style={{fontWeight:600,textAlign:'center'}}>{r.work_hours ? r.work_hours+'h' : '—'}</td>
                  <td style={{fontSize:12}}>{r.projects?.project_name}</td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,tech_id:r.tech_id||'',project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:520,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'تسجيل حضور'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود السجل *</label><input className="form-input" placeholder="ATT-001" value={form.record_code||''} onChange={e=>setForm({...form,record_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.att_date||''} onChange={e=>setForm({...form,att_date:e.target.value})}/></div>
              <div><label className="form-label">الفني *</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Present'} onChange={e=>setForm({...form,status:e.target.value})}>{ATT_STATUSES.map(s=><option key={s} value={s}>{ATT_AR[s]||s}</option>)}</select></div>
              <div><label className="form-label">وقت الحضور</label><input type="time" className="form-input" value={form.check_in||''} onChange={e=>setForm({...form,check_in:e.target.value})}/></div>
              <div><label className="form-label">وقت الانصراف</label><input type="time" className="form-input" value={form.check_out||''} onChange={e=>setForm({...form,check_out:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
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
