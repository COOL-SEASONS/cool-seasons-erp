'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const CATEGORIES = ['قطعة غيار','خدمة','مواد','معدات','فريون','مواسير','كهرباء','أخرى']
const UNITS = ['قطعة','كيلو','متر','لفة','وحدة','ساعة','خدمة']
const EMPTY = { item_code:'', description:'', category:'', unit:'قطعة', cost_price:0, margin_pct:35, floor_price:'', supplier:'', notes:'' }

export default function PricebookPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('pricebook').select('*').order('category').order('item_code')
    setRows(data||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const m = r.description?.toLowerCase().includes(search.toLowerCase()) || r.item_code?.includes(search)
    const c = !filterCat || r.category === filterCat
    return m && c
  })

  const save = async () => {
    if (!form.item_code || !form.description) return alert('الكود والوصف مطلوبان')
    setSaving(true)
    const cost = parseFloat(form.cost_price)||0
    const margin = parseFloat(form.margin_pct)||0
    const payload = { ...form, cost_price: cost, margin_pct: margin, floor_price: parseFloat(form.floor_price)||null }
    if (editId) await supabase.from('pricebook').update(payload).eq('id', editId)
    else await supabase.from('pricebook').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('pricebook').delete().eq('id',id); load() }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n||0)
  const calcSell = (cost:number, margin:number) => Math.round(cost * (1 + margin/100) * 100) / 100

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">كتالوج الأسعار</div><div className="page-subtitle">{rows.length} صنف</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>إضافة صنف</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الوصف..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-input" style={{width:140}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option value="">كل الفئات</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الوصف</th><th>الفئة</th><th>الوحدة</th><th>التكلفة</th><th>الهامش %</th><th>سعر البيع</th><th>+VAT</th><th>الحد الأدنى</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد أصناف</td></tr>
              : filtered.map(r=>{
                const sell = r.sell_price || calcSell(r.cost_price||0, r.margin_pct||0)
                return (
                  <tr key={r.id}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.item_code}</td>
                    <td style={{fontWeight:600,maxWidth:200}}>{r.description}</td>
                    <td><span className="badge badge-gray">{r.category}</span></td>
                    <td>{r.unit}</td>
                    <td>{fmt(r.cost_price)}</td>
                    <td style={{fontWeight:600,color:'var(--cs-blue)'}}>{r.margin_pct ? (r.margin_pct*100).toFixed(0) : 0}%</td>
                    <td style={{fontWeight:700,color:'var(--cs-green)'}}>{fmt(sell)} ر.س</td>
                    <td>{fmt(sell*1.15)} ر.س</td>
                    <td style={{fontSize:12,color:'var(--cs-text-muted)'}}>{r.floor_price ? fmt(r.floor_price)+' ر.س' : '—'}</td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setForm({...r,margin_pct:r.margin_pct?(r.margin_pct*100):35});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الصنف':'صنف جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الصنف *</label><input className="form-input" placeholder="PB-001" value={form.item_code||''} onChange={e=>setForm({...form,item_code:e.target.value})}/></div>
              <div><label className="form-label">الفئة</label><select className="form-input" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">اختر...</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الوصف *</label><input className="form-input" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">الوحدة</label><select className="form-input" value={form.unit||'قطعة'} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              <div><label className="form-label">تكلفة الشراء (ر.س)</label><input type="number" className="form-input" value={form.cost_price||0} onChange={e=>setForm({...form,cost_price:e.target.value})}/></div>
              <div><label className="form-label">هامش الربح %</label><input type="number" min="0" max="200" className="form-input" value={form.margin_pct||35} onChange={e=>setForm({...form,margin_pct:e.target.value})}/></div>
              <div style={{background:'var(--cs-blue-light)',borderRadius:8,padding:'10px 12px',gridColumn:'1/-1'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center'}}>
                  <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>سعر البيع</div><div style={{fontSize:16,fontWeight:800,color:'var(--cs-blue)'}}>{fmt(calcSell(parseFloat(form.cost_price)||0, parseFloat(form.margin_pct)||0))} ر.س</div></div>
                  <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>VAT 15%</div><div style={{fontSize:16,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(calcSell(parseFloat(form.cost_price)||0, parseFloat(form.margin_pct)||0)*0.15)} ر.س</div></div>
                  <div><div style={{fontSize:11,color:'var(--cs-text-muted)'}}>الإجمالي</div><div style={{fontSize:16,fontWeight:800,color:'var(--cs-green)'}}>{fmt(calcSell(parseFloat(form.cost_price)||0, parseFloat(form.margin_pct)||0)*1.15)} ر.س</div></div>
                </div>
              </div>
              <div><label className="form-label">الحد الأدنى المقبول</label><input type="number" className="form-input" value={form.floor_price||''} onChange={e=>setForm({...form,floor_price:e.target.value})}/></div>
              <div><label className="form-label">المورد</label><input className="form-input" value={form.supplier||''} onChange={e=>setForm({...form,supplier:e.target.value})}/></div>
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
