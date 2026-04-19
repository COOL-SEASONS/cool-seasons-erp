'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const UNITS = ['قطعة','كيلو','متر','لفة','وحدة','علبة','لتر']
const STATUSES = ['Draft','Sent','Confirmed','Received','Partial','Cancelled']
const STATUS_AR: any = { Draft:'مسودة', Sent:'مرسل', Confirmed:'مؤكد', Received:'مستلم', Partial:'جزئي', Cancelled:'ملغي' }
const EMPTY = { po_code:'', project_id:'', supplier:'', description:'', qty:1, unit:'قطعة', unit_price:0, order_date: new Date().toISOString().split('T')[0], expected_date:'', status:'Draft', notes:'' }

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: po }, { data: p }] = await Promise.all([
      supabase.from('purchase_orders').select('*, projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(po||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.po_code?.includes(search) || r.supplier?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.po_code || !form.supplier) return alert('رقم الأمر والمورد مطلوبان')
    setSaving(true)
    const payload = { ...form, qty: parseFloat(form.qty)||1, unit_price: parseFloat(form.unit_price)||0, project_id: form.project_id||null }
    if (editId) await supabase.from('purchase_orders').update(payload).eq('id', editId)
    else await supabase.from('purchase_orders').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('purchase_orders').delete().eq('id',id); load() }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const statusC: any = { Draft:'badge-gray', Sent:'badge-blue', Confirmed:'badge-amber', Received:'badge-green', Partial:'badge-amber', Cancelled:'badge-red' }
  const totalValue = rows.reduce((s,r)=>s+(r.grand_total||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">أوامر الشراء</div><div className="page-subtitle">إجمالي: {fmt(totalValue)} ر.س</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>أمر شراء جديد</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث برقم الأمر أو المورد أو المواد..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>رقم الأمر</th><th>المشروع</th><th>المورد</th><th>المواد</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>+VAT</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أوامر شراء</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.po_code}</span></td>
                  <td style={{fontSize:12}}>{r.projects?.project_name||'—'}</td>
                  <td style={{fontWeight:600}}>{r.supplier}</td>
                  <td style={{maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</td>
                  <td>{r.qty} {r.unit}</td>
                  <td>{fmt(r.unit_price)} ر.س</td>
                  <td style={{fontWeight:700}}>{fmt(r.total_amount)} ر.س</td>
                  <td>{fmt(r.grand_total)} ر.س</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,project_id:r.project_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'أمر شراء جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم الأمر *</label><input className="form-input" placeholder="PO-001" value={form.po_code||''} onChange={e=>setForm({...form,po_code:e.target.value})}/></div>
              <div><label className="form-label">المشروع (اختياري)</label><select className="form-input" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">بدون مشروع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">المورد *</label><input className="form-input" value={form.supplier||''} onChange={e=>setForm({...form,supplier:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف المواد</label><input className="form-input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">الكمية</label><input type="number" className="form-input" value={form.qty||1} onChange={e=>setForm({...form,qty:e.target.value})}/></div>
              <div><label className="form-label">الوحدة</label><select className="form-input" value={form.unit||'قطعة'} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              <div><label className="form-label">سعر الوحدة (ر.س)</label><input type="number" className="form-input" value={form.unit_price||0} onChange={e=>setForm({...form,unit_price:e.target.value})}/></div>
              <div style={{background:'var(--cs-blue-light)',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:2}}>الإجمالي + VAT 15%</div>
                <div style={{fontSize:16,fontWeight:800,color:'var(--cs-blue)'}}>{fmt((parseFloat(form.qty)||1)*(parseFloat(form.unit_price)||0)*1.15)} ر.س</div>
              </div>
              <div><label className="form-label">تاريخ الطلب</label><input type="date" className="form-input" value={form.order_date||''} onChange={e=>setForm({...form,order_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الاستلام المتوقع</label><input type="date" className="form-input" value={form.expected_date||''} onChange={e=>setForm({...form,expected_date:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Draft'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]||s}</option>)}</select></div>
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
