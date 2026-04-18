'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { co_code:'', project_id:'', client_id:'', description:'', amount:0, requested_date: new Date().toISOString().split('T')[0], approved_date:'', status:'Pending', notes:'' }

export default function ChangeOrdersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: co }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('change_orders').select('*, projects(project_name), clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,project_name,client_id'),
      supabase.from('clients').select('id,company_name'),
    ])
    setRows(co||[]); setProjects(p||[]); setClients(c||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.co_code?.includes(search) || r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.co_code) return alert('رقم أمر التغيير مطلوب')
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount)||0, project_id: form.project_id||null, client_id: form.client_id||null }
    if (editId) await supabase.from('change_orders').update(payload).eq('id', editId)
    else await supabase.from('change_orders').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا الأمر؟')) return
    await supabase.from('change_orders').delete().eq('id', id)
    load()
  }

  const statusC: any = { Pending:'badge-amber', Approved:'badge-green', Rejected:'badge-red', Completed:'badge-blue' }
  const statusAr: any = { Pending:'انتظار', Approved:'موافق', Rejected:'مرفوض', Completed:'مكتمل' }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">أوامر التغيير</div><div className="page-subtitle">{rows.length} أمر تغيير</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>أمر تغيير جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'الإجمالي',v:fmt(rows.reduce((s,r)=>s+(r.amount||0),0))+' ر.س',c:'var(--cs-blue)'},
          {l:'انتظار موافقة',v:rows.filter(r=>r.status==='Pending').length,c:'var(--cs-orange)'},
          {l:'موافق عليها',v:rows.filter(r=>r.status==='Approved').length,c:'var(--cs-green)'},
          {l:'مرفوضة',v:rows.filter(r=>r.status==='Rejected').length,c:'var(--cs-red)'},
        ].map((s,i)=><div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{s.v}</div></div>)}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>رقم الأمر</th><th>المشروع</th><th>العميل</th><th>الوصف</th><th>القيمة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أوامر</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.co_code}</span></td>
                  <td style={{fontWeight:600}}>{r.projects?.project_name}</td>
                  <td>{r.clients?.company_name}</td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                  <td style={{fontWeight:700}}>{fmt(r.amount)} ر.س</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,project_id:r.project_id||'',client_id:r.client_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'أمر تغيير جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الأمر *</label><input className="form-input" placeholder="CO-001" value={form.co_code||''} onChange={e=>setForm({...form,co_code:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>{const p=projects.find(x=>x.id===e.target.value);setForm({...form,project_id:e.target.value,client_id:p?.client_id||form.client_id})}}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">القيمة (ر.س)</label><input type="number" className="form-input" value={form.amount||0} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الطلب</label><input type="date" className="form-input" value={form.requested_date||''} onChange={e=>setForm({...form,requested_date:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>{['Pending','Approved','Rejected','Completed'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف التغيير</label><textarea className="form-input" rows={3} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
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
