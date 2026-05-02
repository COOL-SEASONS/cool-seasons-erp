'use client'
const generateCode_ProjectsPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'P5620'
  const nums = rows
    .map((r:any) => r.project_code?.toString().replace('P','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'P5620'
  return 'P' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const EMPTY = { project_code:`P-${5620+Math.floor(Date.now()/1000)%9000}` as string, project_name:'', client_id:'', tech_id:'', start_date:'', end_date:'', status:'New', project_type:'', budget:'', actual_cost:'', location:'', completion_pct:0, notes:'' }

export default function ProjectsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: p }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('projects').select('*, clients(company_name), technicians(full_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, company_name').eq('status', 'Active'),
      supabase.from('technicians').select('id, full_name').eq('status', 'Active'),
    ])
    setRows(p || [])
    setClients(c || [])
    setTechs(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.project_name?.toLowerCase().includes(search.toLowerCase()) || r.project_code?.includes(search))

  const save = async () => {
    if (!form.project_code || !form.project_name) return alert('الكود والاسم مطلوبان')
    setSaving(true)
    const payload = { ...form, budget: parseFloat(form.budget)||null, actual_cost: parseFloat(form.actual_cost)||null, completion_pct: parseFloat(form.completion_pct)||0 }
    if (editId) await supabase.from('projects').update(payload).eq('id', editId)
    else await supabase.from('projects').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا المشروع؟')) return
    await supabase.from('projects').delete().eq('id', id)
    load()
  }

  const statusColor: any = { 'In Progress': 'badge-blue', Completed: 'badge-green', 'On Hold': 'badge-amber', Cancelled: 'badge-red', New: 'badge-gray' }
  const statusAr: any = { 'In Progress': 'جاري', Completed: 'مكتمل', 'On Hold': 'متوقف', Cancelled: 'ملغي', New: 'جديد' }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">المشاريع</div>
          <div className="page-subtitle">{rows.length} مشروع</div>
        </div>
        <button className="btn-primary" onClick={() => { setForm({...EMPTY,project_code:'P'+(rows.length+5620)});setEditId(null);setModal(true) }}><Plus size={16}/>مشروع جديد</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cs-text-muted)' }} />
          <input className="form-input" style={{ paddingRight: 34 }} placeholder="بحث بالاسم أو الكود..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--cs-text-muted)' }}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>الكود</th><th>اسم المشروع</th><th>العميل</th><th>الفني</th>
                <th>الحالة</th><th>الإنجاز</th><th>الميزانية</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--cs-text-muted)' }}>لا توجد مشاريع</td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'monospace', background: 'var(--cs-blue-light)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{r.project_code}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.project_name}</td>
                      <td>{r.clients?.company_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td><span className={`badge ${statusColor[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                          <div style={{ flex: 1, background: 'var(--cs-border)', borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${r.completion_pct || 0}%`, background: 'var(--cs-blue)', height: 6, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--cs-text-muted)', minWidth: 30 }}>{r.completion_pct || 0}%</span>
                        </div>
                      </td>
                      <td style={{ direction: 'ltr' }}>{r.budget ? new Intl.NumberFormat('en').format(r.budget) + ' ر.س' : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setForm({ ...r, client_id: r.client_id||'', tech_id: r.tech_id||'' }); setEditId(r.id); setModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-blue)' }}><Edit2 size={15}/></button>
                          <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-red)' }}><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 18 }}>{editId ? 'تعديل المشروع' : 'مشروع جديد'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'project_code', label: 'كود المشروع *' },
                { key: 'project_name', label: 'اسم المشروع *' },
              ].map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" value={form[f.key]||''} onChange={e => setForm({...form,[f.key]:e.target.value})}/>
                </div>
              ))}
              <div>
                <label className="form-label">العميل</label>
                <select className="form-input" value={form.client_id||''} onChange={e => setForm({...form,client_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الفني</label>
                <select className="form-input" value={form.tech_id||''} onChange={e => setForm({...form,tech_id:e.target.value})}>
                  <option value="">اختر...</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">تاريخ البدء</label>
                <input type="date" className="form-input" value={form.start_date||''} onChange={e => setForm({...form,start_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">تاريخ الانتهاء</label>
                <input type="date" className="form-input" value={form.end_date||''} onChange={e => setForm({...form,end_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {['New','In Progress','On Hold','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع المشروع</label>
                <input className="form-input" value={form.project_type||''} onChange={e => setForm({...form,project_type:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الميزانية (ر.س)</label>
                <input type="number" className="form-input" value={form.budget||''} onChange={e => setForm({...form,budget:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">نسبة الإنجاز %</label>
                <input type="number" min="0" max="100" className="form-input" value={form.completion_pct||0} onChange={e => setForm({...form,completion_pct:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الموقع</label>
                <input className="form-input" value={form.location||''} onChange={e => setForm({...form,location:e.target.value})}/>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  )
}
