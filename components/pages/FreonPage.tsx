'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const FREON_TYPES = ['R-22','R-32','R-410A','R-404A','R-407C','R-134A','R-507']
const ORIGINS = ['أمريكي','هندي','صيني','كوري','أوروبي','مكسيكي']
const OPERATIONS = ['استلام أسطوانة','استخدام لدى عميل']
const EMPTY = { record_id:'', entry_date: new Date().toISOString().split('T')[0], transaction_type:'استلام أسطوانة', freon_type:'R-410A', origin:'أمريكي', brand:'', tech_id:'', client_id:'', project_id:'', cylinders_count:'', kg_used:'', price_per_kg:'', notes:'' }

export default function FreonPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
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
    const [{ data: f }, { data: c }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('freon_tracking').select('*, clients(company_name), technicians(full_name), projects(project_name)').order('entry_date',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(f||[]); setClients(c||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.record_id?.includes(search) || r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.freon_type?.includes(search))

  const save = async () => {
    if (!form.record_id) return alert('رقم السجل مطلوب')
    setSaving(true)
    const isReceipt = form.transaction_type === 'استلام أسطوانة'
    const cyls = parseInt(form.cylinders_count)||0
    const kgReceived = isReceipt ? cyls * 13 : 0
    const kgUsed = !isReceipt ? parseFloat(form.kg_used)||0 : 0
    const payload = {
      record_id: form.record_id,
      project_id: form.project_id||null,
      tech_id: form.tech_id||null,
      entry_date: form.entry_date||null,
      cylinder_no: form.record_id,
      freon_type: form.freon_type,
      kg_received: kgReceived,
      kg_used: kgUsed,
      reason: form.transaction_type,
      notes: form.notes||null,
    }
    if (editId) await supabase.from('freon_tracking').update(payload).eq('id', editId)
    else await supabase.from('freon_tracking').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('freon_tracking').delete().eq('id',id); load() }

  const totalReceived = rows.reduce((s,r)=>s+(r.kg_received||0),0)
  const totalUsed = rows.reduce((s,r)=>s+(r.kg_used||0),0)
  const balance = totalReceived - totalUsed
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:1}).format(n||0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">سجل الفريون</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي الكيلو المستلم',v:fmt(totalReceived)+' كغ',c:'var(--cs-blue)'},
          {l:'إجمالي الكيلو المستخدم',v:fmt(totalUsed)+' كغ',c:'var(--cs-orange)'},
          {l:'المخزون المتبقي',v:fmt(balance)+' كغ',c:balance>0?'var(--cs-green)':'var(--cs-red)'},
        ].map((s,i)=><div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>)}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>رقم السجل</th><th>التاريخ</th><th>العملية</th><th>نوع الفريون</th><th>الفني</th><th>العميل</th><th>كغ مستلم</th><th>كغ مستخدم</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.record_id}</td>
                  <td style={{fontSize:12}}>{r.entry_date}</td>
                  <td><span className={`badge ${r.reason==='استلام أسطوانة'?'badge-green':'badge-blue'}`}>{r.reason||'—'}</span></td>
                  <td style={{fontWeight:600}}>{r.freon_type}</td>
                  <td>{r.technicians?.full_name}</td>
                  <td>{r.clients?.company_name}</td>
                  <td style={{color:'var(--cs-green)',fontWeight:700}}>{r.kg_received>0?fmt(r.kg_received)+' كغ':'—'}</td>
                  <td style={{color:'var(--cs-orange)',fontWeight:700}}>{r.kg_used>0?fmt(r.kg_used)+' كغ':'—'}</td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,tech_id:r.tech_id||'',client_id:r.client_id||'',project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>سجل فريون جديد</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'flex',gap:0,marginBottom:16,borderRadius:8,overflow:'hidden',border:'1.5px solid var(--cs-border)'}}>
              {OPERATIONS.map(op=>(
                <button key={op} onClick={()=>setForm({...form,transaction_type:op})} style={{flex:1,padding:'9px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,background:form.transaction_type===op?'var(--cs-blue)':'white',color:form.transaction_type===op?'white':'var(--cs-text-muted)'}}>
                  {op==='استلام أسطوانة'?'📦 استلام أسطوانة':'🔧 استخدام لدى عميل'}
                </button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم السجل *</label><input className="form-input" placeholder="FR-001" value={form.record_id||''} onChange={e=>setForm({...form,record_id:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.entry_date||''} onChange={e=>setForm({...form,entry_date:e.target.value})}/></div>
              <div><label className="form-label">نوع الفريون</label><select className="form-input" value={form.freon_type||'R-410A'} onChange={e=>setForm({...form,freon_type:e.target.value})}>{FREON_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              {form.transaction_type==='استلام أسطوانة' ? (
                <div><label className="form-label">عدد الأسطوانات (13كغ/أسطوانة)</label><input type="number" className="form-input" value={form.cylinders_count||''} onChange={e=>setForm({...form,cylinders_count:e.target.value})}/></div>
              ) : (
                <>
                  <div><label className="form-label">كغ مستخدم</label><input type="number" step="0.1" className="form-input" value={form.kg_used||''} onChange={e=>setForm({...form,kg_used:e.target.value})}/></div>
                  <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
                  <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
                </>
              )}
              <div><label className="form-label">الماركة / Brand</label><input className="form-input" placeholder="Honeywell, SRF..." value={form.brand||''} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
              <div><label className="form-label">بلد المنشأ</label><select className="form-input" value={form.origin||'أمريكي'} onChange={e=>setForm({...form,origin:e.target.value})}>{ORIGINS.map(o=><option key={o}>{o}</option>)}</select></div>
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
