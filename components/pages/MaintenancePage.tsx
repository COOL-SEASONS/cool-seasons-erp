'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

function useCRUD(table: string, orderCol = 'created_at') {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = async (query?: any) => {
    setLoading(true)
    const q = query || supabase.from(table).select('*').order(orderCol, { ascending: false })
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }
  const save = async (form: any, editId: string | null) => {
    if (editId) await supabase.from(table).update(form).eq('id', editId)
    else await supabase.from(table).insert(form)
  }
  const del = async (id: string) => {
    await supabase.from(table).delete().eq('id', id)
  }
  return { rows, loading, load, save, del }
}

// ──────────────────────────────────────────────
export function MaintenancePage() {
  const { rows, loading, load, save: saveFn, del: delFn } = useCRUD('maintenance')
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load(supabase.from('maintenance').select('*, clients(company_name), technicians(full_name)').order('next_due'))
    Promise.all([
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ]).then(([{data:c},{data:t},{data:p}]) => { setClients(c||[]); setTechs(t||[]); setProjects(p||[]) })
  }, [])

  const reload = () => load(supabase.from('maintenance').select('*, clients(company_name), technicians(full_name)').order('next_due'))
  const filtered = rows.filter(r => r.description?.toLowerCase().includes(search.toLowerCase()) || r.job_code?.includes(search))
  const statusC: any = { Open:'badge-blue', Scheduled:'badge-amber', Completed:'badge-green', Overdue:'badge-red', Cancelled:'badge-gray' }
  const statusAr: any = { Open:'مفتوح', Scheduled:'مجدول', Completed:'مكتمل', Overdue:'متأخر', Cancelled:'ملغي' }
  const EMPTY = { job_code:'', description:'', last_service:'', next_due:'', frequency:'Monthly', status:'Open', cost:'', notes:'' }

  const doSave = async () => {
    if (!form.job_code) return alert('كود الخدمة مطلوب')
    setSaving(true)
    await saveFn({...form, cost:parseFloat(form.cost)||null}, editId)
    setSaving(false); setModal(false); reload()
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">جدول الصيانة</div><div className="page-subtitle">{rows.length} طلب</div></div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setModal(true) }}><Plus size={16}/>طلب صيانة</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الكود</th><th>الوصف</th><th>العميل</th><th>الفني</th><th>آخر خدمة</th><th>الموعد القادم</th><th>التكرار</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد بيانات</td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.job_code}</span></td>
                      <td style={{fontWeight:600}}>{r.description}</td>
                      <td>{r.clients?.company_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td style={{fontSize:12}}>{r.last_service}</td>
                      <td style={{fontSize:12,color:r.status==='Overdue'?'var(--cs-red)':'inherit'}}>{r.next_due}</td>
                      <td>{r.frequency}</td>
                      <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setForm({...r,client_id:r.client_id||'',tech_id:r.tech_id||'',project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                          <button onClick={async()=>{if(!confirm('حذف؟'))return;await delFn(r.id);reload()}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'طلب صيانة جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الخدمة *</label><input className="form-input" value={form.job_code||''} onChange={e=>setForm({...form,job_code:e.target.value})}/></div>
              <div><label className="form-label">الوصف</label><input className="form-input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">آخر خدمة</label><input type="date" className="form-input" value={form.last_service||''} onChange={e=>setForm({...form,last_service:e.target.value})}/></div>
              <div><label className="form-label">الموعد القادم</label><input type="date" className="form-input" value={form.next_due||''} onChange={e=>setForm({...form,next_due:e.target.value})}/></div>
              <div><label className="form-label">التكرار</label><select className="form-input" value={form.frequency||'Monthly'} onChange={e=>setForm({...form,frequency:e.target.value})}>{['Monthly','Quarterly','Semi-Annual','Annual','Weekly'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Open'} onChange={e=>setForm({...form,status:e.target.value})}>{['Open','Scheduled','Completed','Overdue','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">التكلفة (ر.س)</label><input type="number" className="form-input" value={form.cost||''} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={doSave} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenancePage
