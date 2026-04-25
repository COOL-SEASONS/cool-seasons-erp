'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Save, Search, Printer} from 'lucide-react'

const QUALITY_OPTIONS = ['ممتازة','جيدة جداً','جيدة','مقبولة','ضعيفة']
const RELIABILITY_OPTIONS = ['موثوق جداً','موثوق','أحياناً يتأخر','تأخير متكرر','غير موثوق']
const newForm = () => ({
  ref_no:'', item_name:'', supplier:'', qty:'1', unit_price:'0',
  order_date:'', delivery_date:'', quality:'ممتازة',
  delivery_days:'', reliability:'موثوق', notes:''
})

export default function SupplierComparePage() {
  const [viewItem,setViewItem]=useState<any>(null)
  const [rows,setRows] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [filterSupplier,setFilterSupplier] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('supplier_compare').select('*').order('created_at',{ascending:false})
    setRows(data||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openEdit = (r:any) => {
    setForm({
      ref_no:r.ref_no||'', item_name:r.item_name||'', supplier:r.supplier||'',
      qty:String(r.qty||1), unit_price:String(r.unit_price||0),
      order_date:r.order_date?.split('T')[0]||'', delivery_date:r.delivery_date?.split('T')[0]||'',
      quality:r.quality||'ممتازة', delivery_days:String(r.delivery_days||''),
      reliability:r.reliability||'موثوق', notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.ref_no.trim()||!form.supplier.trim()) return alert('الرقم المرجعي والمورد مطلوبان')
    setSaving(true)
    const qty = parseFloat(form.qty)||1
    const up = parseFloat(form.unit_price)||0
    const total = qty * up
    const oDate = form.order_date||null
    const dDate = form.delivery_date||null
    const delivDays = (oDate&&dDate) ? Math.ceil((new Date(dDate).getTime()-new Date(oDate).getTime())/86400000) : (parseInt(form.delivery_days)||null)
    const payload = {
      ref_no: form.ref_no.trim(),
      item_name: form.item_name||null,
      supplier: form.supplier.trim(),
      qty, unit_price: up, total_amount: total,
      order_date: oDate||null,
      delivery_date: dDate||null,
      delivery_days: delivDays||null,
      quality: form.quality||null,
      reliability: form.reliability||null,
      notes: form.notes||null,
    }
    const {error} = editId
      ? await supabase.from('supplier_compare').update(payload).eq('id',editId)
      : await supabase.from('supplier_compare').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('supplier_compare').delete().eq('id',id); load() }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  const suppliers = Array.from(new Set(rows.map(r=>r.supplier).filter(Boolean)))
  const filtered = rows.filter(r => {
    const m = r.item_name?.toLowerCase().includes(search.toLowerCase()) || r.supplier?.toLowerCase().includes(search.toLowerCase()) || r.ref_no?.includes(search)
    const s = !filterSupplier || r.supplier === filterSupplier
    return m && s
  })

  // Supplier stats
  const supplierStats = suppliers.map(s => {
    const sRows = rows.filter(r=>r.supplier===s)
    const totalPurchases = sRows.reduce((sum,r)=>sum+(r.total_amount||0),0)
    const avgDays = sRows.filter(r=>r.delivery_days).reduce((sum,r,_,arr)=>sum+(r.delivery_days||0)/arr.length,0)
    const excellentCount = sRows.filter(r=>r.quality==='ممتازة'||r.quality==='جيدة جداً').length
    const qualityRate = sRows.length > 0 ? Math.round(excellentCount/sRows.length*100) : 0
    return { name:s, total:totalPurchases, avgDays:Math.round(avgDays), qualityRate, count:sRows.length }
  }).sort((a,b)=>b.total-a.total)

  const qualityColor: Record<string,string> = {'ممتازة':'var(--cs-green)','جيدة جداً':'var(--cs-blue)','جيدة':'var(--cs-orange)','مقبولة':'var(--cs-amber)','ضعيفة':'var(--cs-red)'}

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">مقارنة الموردين</div><div className="page-subtitle">Supplier Performance — {suppliers.length} مورد</div></div>
        <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>إضافة سجل</button>
      </div>

      {/* Supplier summary cards */}
      {supplierStats.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
          {supplierStats.slice(0,4).map((s,i)=>(
            <div key={i} className="card" style={{padding:16,cursor:'pointer',border:filterSupplier===s.name?'2px solid var(--cs-blue)':'1px solid var(--cs-border)'}} onClick={()=>setFilterSupplier(filterSupplier===s.name?'':s.name)}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{s.name}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <div><div style={{fontSize:10,color:'var(--cs-text-muted)'}}>إجمالي المشتريات</div><div style={{fontWeight:700,color:'var(--cs-blue)',fontSize:13}}>{fmt(s.total)} ر.س</div></div>
                <div><div style={{fontSize:10,color:'var(--cs-text-muted)'}}>متوسط التسليم</div><div style={{fontWeight:700,color:'var(--cs-orange)',fontSize:13}}>{s.avgDays} يوم</div></div>
                <div><div style={{fontSize:10,color:'var(--cs-text-muted)'}}>جودة ممتازة</div><div style={{fontWeight:700,color:'var(--cs-green)',fontSize:13}}>{s.qualityRate}%</div></div>
                <div><div style={{fontSize:10,color:'var(--cs-text-muted)'}}>عدد الطلبات</div><div style={{fontWeight:700,fontSize:13}}>{s.count}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالصنف أو المورد..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{width:160}} value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)}>
            <option value="">كل الموردين</option>
            {suppliers.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>المرجع</th><th>الصنف</th><th>المورد</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>أيام التسليم</th><th>الجودة</th><th>الموثوقية</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد سجلات</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.ref_no}</td>
                  <td style={{fontWeight:600}}>{r.item_name}</td>
                  <td><span style={{fontWeight:600,color:'var(--cs-blue)'}}>{r.supplier}</span></td>
                  <td style={{textAlign:'center'}}>{r.qty}</td>
                  <td>{fmt(r.unit_price)} ر.س</td>
                  <td style={{fontWeight:700}}>{fmt(r.total_amount)} ر.س</td>
                  <td style={{textAlign:'center',color:r.delivery_days<=3?'var(--cs-green)':r.delivery_days<=7?'var(--cs-orange)':'var(--cs-red)',fontWeight:700}}>{r.delivery_days||'—'} يوم</td>
                  <td><span style={{fontWeight:600,color:qualityColor[r.quality]||'var(--cs-text)'}}>{r.quality}</span></td>
                  <td style={{fontSize:12}}>{r.reliability}</td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      
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

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'سجل مورد جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الرقم المرجعي *</label><input className="form-input" placeholder="SC-001" value={form.ref_no} onChange={e=>setForm({...form,ref_no:e.target.value})}/></div>
              <div><label className="form-label">المورد *</label><input className="form-input" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الصنف</label><input className="form-input" value={form.item_name} onChange={e=>setForm({...form,item_name:e.target.value})}/></div>
              <div><label className="form-label">الكمية</label><input type="number" min="0" className="form-input" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></div>
              <div><label className="form-label">سعر الوحدة (ر.س)</label><input type="number" min="0" className="form-input" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})}/></div>
              <div style={{background:'#E8F6FC',borderRadius:8,padding:'10px 12px',gridColumn:'1/-1',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>الإجمالي:</span>
                <span style={{fontWeight:800,color:'var(--cs-blue)',fontSize:15}}>{fmt((parseFloat(form.qty)||1)*(parseFloat(form.unit_price)||0))} ر.س</span>
              </div>
              <div><label className="form-label">تاريخ الطلب</label><input type="date" className="form-input" value={form.order_date} onChange={e=>setForm({...form,order_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ التسليم</label><input type="date" className="form-input" value={form.delivery_date} onChange={e=>setForm({...form,delivery_date:e.target.value})}/></div>
              <div><label className="form-label">الجودة</label><select className="form-input" value={form.quality} onChange={e=>setForm({...form,quality:e.target.value})}>{QUALITY_OPTIONS.map(q=><option key={q}>{q}</option>)}</select></div>
              <div><label className="form-label">الموثوقية</label><select className="form-input" value={form.reliability} onChange={e=>setForm({...form,reliability:e.target.value})}>{RELIABILITY_OPTIONS.map(r=><option key={r}>{r}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
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
