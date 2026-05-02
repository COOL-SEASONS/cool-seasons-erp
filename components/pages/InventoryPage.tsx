'use client'
const generateCode_InventoryPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'ITEM-1000'
  const nums = rows
    .map((r:any) => r.item_code?.toString().replace('ITEM-','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'ITEM-1000'
  return 'ITEM-' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const EMPTY = { item_code:'', description:'', category:'', unit:'', qty:0, min_stock:0, max_stock:'', unit_price:'', supplier:'', location:'', notes:'' }

export default function InventoryPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('inventory').select('*').order('updated_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.description?.toLowerCase().includes(search.toLowerCase()) || r.item_code?.includes(search))

  const save = async () => {
    if (!form.item_code || !form.description) return alert('الكود والوصف مطلوبان')
    setSaving(true)
    const payload = { ...form, qty: parseFloat(form.qty)||0, min_stock: parseFloat(form.min_stock)||0, max_stock: parseFloat(form.max_stock)||null, unit_price: parseFloat(form.unit_price)||null }
    if (editId) await supabase.from('inventory').update(payload).eq('id', editId)
    else await supabase.from('inventory').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا الصنف؟')) return
    await supabase.from('inventory').delete().eq('id', id)
    load()
  }

  const stockBadge = (s: string) => {
    const m: any = { 'In Stock': 'badge-green', 'Low Stock': 'badge-amber', 'Out of Stock': 'badge-red' }
    const l: any = { 'In Stock': 'متوفر', 'Low Stock': 'منخفض', 'Out of Stock': 'نفذ' }
    return <span className={`badge ${m[s]||'badge-gray'}`}>{l[s]||s}</span>
  }

  const totalValue = rows.reduce((s, r) => s + ((r.qty || 0) * (r.unit_price || 0)), 0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">المخزون</div><div className="page-subtitle">{rows.length} صنف — قيمة: {new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(totalValue)} ر.س</div></div>
        <button className="btn-primary" onClick={() => { setForm({...EMPTY,item_code:'INV-'+(rows.length+1001)});setEditId(null);setModal(true) }}><Plus size={16}/>إضافة صنف</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الوصف..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>الكود</th><th>الوصف</th><th>الفئة</th><th>الكمية</th><th>الحد الأدنى</th><th>سعر الوحدة</th><th>القيمة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أصناف</td></tr>
                  : filtered.map(r => (
                    <tr key={r.id}>
                      <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.item_code}</span></td>
                      <td style={{fontWeight:600}}>{r.description}</td>
                      <td>{r.category}</td>
                      <td style={{fontWeight:700,color:r.qty<=r.min_stock?'var(--cs-red)':'inherit'}}>{r.qty} {r.unit}</td>
                      <td>{r.min_stock}</td>
                      <td>{r.unit_price ? r.unit_price+' ر.س' : '—'}</td>
                      <td>{r.unit_price ? new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format((r.qty||0)*(r.unit_price||0))+' ر.س' : '—'}</td>
                      <td>{stockBadge(r.status)}</td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setForm(r);setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الصنف':'إضافة صنف'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[{key:'item_code',label:'كود الصنف *'},{key:'description',label:'الوصف *'},{key:'category',label:'الفئة'},{key:'unit',label:'الوحدة'},{key:'supplier',label:'المورد'},{key:'location',label:'الموقع'}].map(f=>(
                <div key={f.key}><label className="form-label">{f.label}</label><input className="form-input" value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/></div>
              ))}
              {[{key:'qty',label:'الكمية'},{key:'min_stock',label:'الحد الأدنى'},{key:'max_stock',label:'الحد الأقصى'},{key:'unit_price',label:'سعر الوحدة (ر.س)'}].map(f=>(
                <div key={f.key}><label className="form-label">{f.label}</label><input type="number" className="form-input" value={form[f.key]||''} onChange={e=>setForm({...form,[f.key]:e.target.value})}/></div>
              ))}
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
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
