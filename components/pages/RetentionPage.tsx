'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { retention_code:'', client_id:'', project_id:'', total_retained:0, released_amount:0, release_date:'', status:'Held', notes:'' }

export default function RetentionPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('retention_tracking').select('*, clients(company_name), projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(r||[]); setClients(c||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.retention_code) return alert('الكود مطلوب')
    setSaving(true)
    const payload = { ...form, total_retained: parseFloat(form.total_retained)||0, released_amount: parseFloat(form.released_amount)||0, client_id: form.client_id||null, project_id: form.project_id||null }
    if (editId) await supabase.from('retention_tracking').update(payload).eq('id', editId)
    else await supabase.from('retention_tracking').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('retention_tracking').delete().eq('id',id); load() }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const totalHeld = rows.reduce((s,r)=>s+(r.total_retained||0),0)
  const totalReleased = rows.reduce((s,r)=>s+(r.released_amount||0),0)
  const totalNet = rows.reduce((s,r)=>s+(r.net_retained||0),0)
  const statusC: any = { Held:'badge-amber', Released:'badge-green', Partial:'badge-blue', Overdue:'badge-red' }
  const statusAr: any = { Held:'محتجز', Released:'مُفرَج', Partial:'جزئي', Overdue:'متأخر' }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">مبالغ الضمان المحتجزة</div><div className="page-subtitle">Retention Tracking</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>سجل جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>إجمالي المحتجز</div><div style={{fontSize:18,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(totalHeld)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>المُفرَج منه</div><div style={{fontSize:18,fontWeight:800,color:'var(--cs-green)'}}>{fmt(totalReleased)} ر.س</div></div>
        <div className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>الباقي المحتجز</div><div style={{fontSize:18,fontWeight:800,color:'var(--cs-red)'}}>{fmt(totalNet)} ر.س</div></div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>العميل</th><th>المشروع</th><th>المحتجز</th><th>المُفرَج</th><th>الباقي</th><th>تاريخ الإفراج</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {rows.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              : rows.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.retention_code}</td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name}</td>
                  <td>{r.projects?.project_name}</td>
                  <td style={{fontWeight:700,color:'var(--cs-orange)'}}>{fmt(r.total_retained)} ر.س</td>
                  <td style={{color:'var(--cs-green)'}}>{fmt(r.released_amount)} ر.س</td>
                  <td style={{fontWeight:700,color:'var(--cs-red)'}}>{fmt(r.net_retained)} ر.س</td>
                  <td style={{fontSize:12}}>{r.release_date}</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,client_id:r.client_id||'',project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل ضمان جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" placeholder="RET-001" value={form.retention_code||''} onChange={e=>setForm({...form,retention_code:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">المبلغ المحتجز (ر.س)</label><input type="number" className="form-input" value={form.total_retained||0} onChange={e=>setForm({...form,total_retained:e.target.value})}/></div>
              <div><label className="form-label">المُفرَج منه (ر.س)</label><input type="number" className="form-input" value={form.released_amount||0} onChange={e=>setForm({...form,released_amount:e.target.value})}/></div>
              <div><label className="form-label">الباقي (تلقائي)</label><input className="form-input" readOnly value={((parseFloat(form.total_retained)||0)-(parseFloat(form.released_amount)||0)).toFixed(0)+' ر.س'} style={{background:'var(--cs-gray-light)',color:'var(--cs-text-muted)'}}/></div>
              <div><label className="form-label">تاريخ الإفراج المتوقع</label><input type="date" className="form-input" value={form.release_date||''} onChange={e=>setForm({...form,release_date:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Held'} onChange={e=>setForm({...form,status:e.target.value})}>{['Held','Partial','Released','Overdue'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
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
