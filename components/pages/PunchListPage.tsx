'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const CATEGORIES = ['كهرباء','ميكانيكا','مدني','دهانات','تشطيبات','توثيق','فحص واختبار','أخرى']
const PRIORITIES = ['🔴 عالي','🟠 متوسط','🟢 منخفض']
const STATUSES = ['لم يبدأ','قيد التنفيذ','مكتمل','متأخر','ملغي']
const EMPTY = { punch_code:'', project_id:'', description:'', category:'', responsible:'', due_date:'', status:'لم يبدأ', notes:'' }

export default function PunchListPage() {
  const [rows, setRows] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: p }, { data: pr }, { data: t }] = await Promise.all([
      supabase.from('punch_list').select('*, projects(project_name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(p||[]); setProjects(pr||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const matchSearch = r.description?.toLowerCase().includes(search.toLowerCase()) || r.projects?.project_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const save = async () => {
    if (!form.punch_code) return alert('رقم البند مطلوب')
    setSaving(true)
    const payload = { ...form, project_id: form.project_id||null }
    if (editId) await supabase.from('punch_list').update(payload).eq('id', editId)
    else await supabase.from('punch_list').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا البند؟')) return
    await supabase.from('punch_list').delete().eq('id', id)
    load()
  }

  const statusC: any = { 'مكتمل':'badge-green','قيد التنفيذ':'badge-blue','متأخر':'badge-red','لم يبدأ':'badge-gray','ملغي':'badge-gray' }
  const total = rows.length
  const done = rows.filter(r=>r.status==='مكتمل').length
  const late = rows.filter(r=>r.status==='متأخر').length
  const pct = total ? Math.round(done/total*100) : 0

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Punch List — قائمة التشطيبات</div><div className="page-subtitle">{pct}% مكتمل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>بند جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي البنود',v:total,c:'var(--cs-blue)'},{l:'مكتملة',v:done,c:'var(--cs-green)'},{l:'قيد التنفيذ',v:rows.filter(r=>r.status==='قيد التنفيذ').length,c:'var(--cs-orange)'},{l:'متأخرة',v:late,c:'var(--cs-red)'},{l:'نسبة الإنجاز',v:pct+'%',c:'var(--cs-blue)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالوصف أو المشروع..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{width:150}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>رقم البند</th><th>المشروع</th><th>الوصف</th><th>الفئة</th><th>المسؤول</th><th>الموعد</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد بنود</td></tr>
                : filtered.map(r=>(
                  <tr key={r.id} style={{background:r.status==='متأخر'?'#FFF5F5':r.status==='مكتمل'?'#F0FFF4':'inherit'}}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.punch_code}</span></td>
                    <td>{r.projects?.project_name}</td>
                    <td style={{fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                    <td>{r.category}</td>
                    <td>{r.responsible}</td>
                    <td style={{fontSize:12,color:r.status==='متأخر'?'var(--cs-red)':'inherit'}}>{r.due_date}</td>
                    <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{r.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setForm({...r,project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل البند':'بند جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم البند *</label><input className="form-input" placeholder="PL-001" value={form.punch_code||''} onChange={e=>setForm({...form,punch_code:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف البند</label><textarea className="form-input" rows={2} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">الفئة</label><select className="form-input" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">اختر...</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="form-label">المسؤول</label><select className="form-input" value={form.responsible||''} onChange={e=>setForm({...form,responsible:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.full_name}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">الموعد المستهدف</label><input type="date" className="form-input" value={form.due_date||''} onChange={e=>setForm({...form,due_date:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'لم يبدأ'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
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
