'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { expense_code:'', expense_date: new Date().toISOString().split('T')[0], project_id:'', tech_id:'', category:'', amount:0, description:'', status:'Pending', transaction_type:'صرف' }

export default function ExpensesPage() {
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
    const [{ data: e }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('expenses').select('*, technicians(full_name), projects(project_name)').order('created_at', { ascending: false }),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(e||[]); setTechs(t||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.expense_code?.includes(search) || r.description?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.expense_code) return alert('كود المصروف مطلوب')
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount)||0 }
    if (editId) await supabase.from('expenses').update(payload).eq('id', editId)
    else await supabase.from('expenses').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا المصروف؟')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0)
  const fmt = (n: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n)
  const statusAr: any = { Pending:'معلق', Approved:'معتمد', Rejected:'مرفوض', Paid:'مدفوع' }
  const statusC: any = { Pending:'badge-amber', Approved:'badge-blue', Rejected:'badge-red', Paid:'badge-green' }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">المصروفات والتكاليف</div><div className="page-subtitle">الإجمالي: {fmt(totalAmount)} ر.س</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>مصروف جديد</button>
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
              <thead><tr><th>الكود</th><th>التاريخ</th><th>المشروع</th><th>الفني</th><th>الفئة</th><th>المبلغ</th><th>النوع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد مصروفات</td></tr>
                  : filtered.map(r=>(
                    <tr key={r.id}>
                      <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.expense_code}</span></td>
                      <td style={{fontSize:12}}>{r.expense_date}</td>
                      <td>{r.projects?.project_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td>{r.category}</td>
                      <td style={{fontWeight:700}}>{fmt(r.amount)} ر.س</td>
                      <td><span className={`badge ${r.transaction_type==='عهدة'?'badge-blue':'badge-gray'}`}>{r.transaction_type}</span></td>
                      <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
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
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'مصروف جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود المصروف *</label><input className="form-input" value={form.expense_code||''} onChange={e=>setForm({...form,expense_code:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.expense_date||''} onChange={e=>setForm({...form,expense_date:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">الفئة</label><select className="form-input" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">اختر...</option>{['مواد','نقل','معدات','وقود','اتصالات','أخرى'].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="form-label">المبلغ (ر.س)</label><input type="number" className="form-input" value={form.amount||0} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">نوع المعاملة</label><select className="form-input" value={form.transaction_type||'صرف'} onChange={e=>setForm({...form,transaction_type:e.target.value})}><option value="صرف">صرف</option><option value="عهدة">عهدة</option></select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>{['Pending','Approved','Rejected','Paid'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الوصف</label><textarea className="form-input" rows={2} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
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
