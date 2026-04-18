'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const COMMISSION_TYPES = ['% من المبيعات','مبلغ ثابت','% من الربح']
const EMPTY = { record_id:'', project_id:'', tech_id:'', period_month:'', sales_amount:0, commission_pct:5, commission_amt:0, paid_amount:0, status:'Pending', notes:'' }

export default function CommissionsPage() {
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
    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('commissions').select('*, projects(project_name), technicians(full_name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,project_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(c||[]); setProjects(p||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.projects?.project_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.tech_id) return alert('الفني مطلوب')
    setSaving(true)
    const sales = parseFloat(form.sales_amount)||0
    const pct = parseFloat(form.commission_pct)||0
    const commission = Math.round(sales * pct / 100 * 100) / 100
    const payload = { ...form, sales_amount: sales, commission_pct: pct, paid_amount: parseFloat(form.paid_amount)||0, project_id: form.project_id||null }
    if (editId) await supabase.from('commissions').update(payload).eq('id', editId)
    else await supabase.from('commissions').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return
    await supabase.from('commissions').delete().eq('id', id)
    load()
  }

  const fmt = (n: number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const statusC: any = { Pending:'badge-amber', Paid:'badge-green', Partial:'badge-blue' }
  const statusAr: any = { Pending:'معلق', Paid:'مدفوع', Partial:'جزئي' }
  const totalDue = rows.reduce((s,r)=>s+(r.commission_amt||0),0)
  const totalPaid = rows.reduce((s,r)=>s+(r.paid_amount||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">عمولات الفنيين</div><div className="page-subtitle">{rows.length} سجل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>سجل عمولة</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي المستحق',v:fmt(totalDue)+' ر.س',c:'var(--cs-blue)'},{l:'المدفوع',v:fmt(totalPaid)+' ر.س',c:'var(--cs-green)'},{l:'المتبقي',v:fmt(totalDue-totalPaid)+' ر.س',c:'var(--cs-red)'}].map((s,i)=>
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div></div>
        )}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالفني أو المشروع..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الفني</th><th>المشروع</th><th>المبيعات</th><th>النسبة %</th><th>العمولة</th><th>مكافأة</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عمولات</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontWeight:600}}>{r.technicians?.full_name}</td>
                  <td>{r.projects?.project_name}</td>
                  <td>{fmt(r.sales_amount)}</td>
                  <td>{r.commission_pct}%</td>
                  <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.commission_amt)}</td>
                  <td>{fmt(r.bonus||0)}</td>
                  <td style={{color:'var(--cs-green)'}}>{fmt(r.paid_amount)}</td>
                  <td style={{color:'var(--cs-red)',fontWeight:700}}>{fmt(r.balance||0)}</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,project_id:r.project_id||'',tech_id:r.tech_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل عمولة جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الفني *</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">اختر...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">قيمة المبيعات (ر.س)</label><input type="number" className="form-input" value={form.sales_amount||0} onChange={e=>setForm({...form,sales_amount:e.target.value})}/></div>
              <div><label className="form-label">نسبة العمولة %</label><input type="number" step="0.5" className="form-input" value={form.commission_pct||5} onChange={e=>setForm({...form,commission_pct:e.target.value})}/></div>
              <div><label className="form-label">العمولة المحسوبة (تلقائي)</label><input className="form-input" readOnly value={fmt((parseFloat(form.sales_amount)||0)*(parseFloat(form.commission_pct)||0)/100)+' ر.س'} style={{background:'var(--cs-gray-light)',color:'var(--cs-text-muted)'}}/></div>
              <div><label className="form-label">المدفوع (ر.س)</label><input type="number" className="form-input" value={form.paid_amount||0} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div><label className="form-label">الفترة</label><input className="form-input" placeholder="مارس 2026" value={form.period_month||''} onChange={e=>setForm({...form,period_month:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Pending'} onChange={e=>setForm({...form,status:e.target.value})}>{['Pending','Partial','Paid'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
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
