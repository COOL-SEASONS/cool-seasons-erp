'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const CATEGORIES = ['تشخيص وفحص','تعبئة مبرد','تبديل قطع','تنظيف وصيانة','تركيب جديد','إصلاح كهربائي','ضبط وضع التشغيل','أخرى']
const newForm = () => ({
  service_code:'', service_name:'', category:'تشخيص وفحص',
  labor_hours:'1', material_cost:'0',
  price_economy:'0', price_standard:'0', price_premium:'0',
  status:'نشط', notes:''
})

export default function FlatRatePage() {
  const [rows,setRows] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [filterCat,setFilterCat] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('flat_rate_pricing').select('*').order('category').order('service_code')
    setRows(data||[])
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openEdit = (r:any) => {
    setForm({
      service_code:r.service_code||'', service_name:r.service_name||'',
      category:r.category||'تشخيص وفحص', labor_hours:String(r.labor_hours||1),
      material_cost:String(r.material_cost||0), price_economy:String(r.price_economy||0),
      price_standard:String(r.price_standard||0), price_premium:String(r.price_premium||0),
      status:r.status||'نشط', notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.service_code.trim()||!form.service_name.trim()){alert('الكود والاسم مطلوبان');return}
    setSaving(true)
    const HOURLY_RATE = 25 // default hourly rate
    const laborCost = (parseFloat(form.labor_hours)||0) * HOURLY_RATE
    const payload = {
      service_code: form.service_code.trim(),
      service_name: form.service_name.trim(),
      category: form.category,
      labor_hours: parseFloat(form.labor_hours)||0,
      labor_cost: laborCost,
      material_cost: parseFloat(form.material_cost)||0,
      price_economy: parseFloat(form.price_economy)||0,
      price_standard: parseFloat(form.price_standard)||0,
      price_premium: parseFloat(form.price_premium)||0,
      status: form.status,
      notes: form.notes||null,
    }
    const {error} = editId
      ? await supabase.from('flat_rate_pricing').update(payload).eq('id',editId)
      : await supabase.from('flat_rate_pricing').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('flat_rate_pricing').delete().eq('id',id); load() }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered = rows.filter(r => {
    const m = r.service_name?.toLowerCase().includes(search.toLowerCase()) || r.service_code?.includes(search)
    const c = !filterCat || r.category === filterCat
    return m && c
  })

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">قائمة الأسعار الثابتة</div><div className="page-subtitle">Flat Rate Pricing — {rows.filter(r=>r.status==='نشط').length} خدمة نشطة</div></div>
        <button className="btn-primary" onClick={()=>{setForm(newForm());setEditId(null);setModal(true)}}><Plus size={16}/>إضافة خدمة</button>
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:34}} placeholder="بحث باسم الخدمة أو الكود..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{width:160}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">كل الفئات</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الكود</th><th>الخدمة</th><th>الفئة</th><th>ساعات العمل</th><th>تكلفة المواد</th>
                  <th style={{background:'#E8F8EF',color:'var(--cs-green)'}}>💚 اقتصادي</th>
                  <th style={{background:'#FEF9E7',color:'#B7950B'}}>💛 قياسي</th>
                  <th style={{background:'#EBF5FB',color:'var(--cs-blue)'}}>💎 متميز</th>
                  <th>الحالة</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد خدمات</td></tr>
                :filtered.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.service_code}</td>
                    <td style={{fontWeight:600}}>{r.service_name}</td>
                    <td><span className="badge badge-gray">{r.category}</span></td>
                    <td style={{textAlign:'center'}}>{r.labor_hours}h</td>
                    <td>{fmt(r.material_cost)} ر.س</td>
                    <td style={{background:'#F0FFF4',fontWeight:700,color:'var(--cs-green)',textAlign:'center'}}>{fmt(r.price_economy)} ر.س</td>
                    <td style={{background:'#FFFDF0',fontWeight:700,color:'#B7950B',textAlign:'center'}}>{fmt(r.price_standard)} ر.س</td>
                    <td style={{background:'#EBF5FB',fontWeight:700,color:'var(--cs-blue)',textAlign:'center'}}>{fmt(r.price_premium)} ر.س</td>
                    <td><span className={`badge ${r.status==='نشط'?'badge-green':'badge-gray'}`}>{r.status}</span></td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الخدمة':'خدمة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الخدمة *</label><input className="form-input" placeholder="FR-001" value={form.service_code} onChange={e=>setForm({...form,service_code:e.target.value})}/></div>
              <div><label className="form-label">الفئة</label><select className="form-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">اسم الخدمة *</label><input className="form-input" value={form.service_name} onChange={e=>setForm({...form,service_name:e.target.value})}/></div>
              <div><label className="form-label">ساعات العمل</label><input type="number" min="0" step="0.5" className="form-input" value={form.labor_hours} onChange={e=>setForm({...form,labor_hours:e.target.value})}/></div>
              <div><label className="form-label">تكلفة المواد (ر.س)</label><input type="number" min="0" className="form-input" value={form.material_cost} onChange={e=>setForm({...form,material_cost:e.target.value})}/></div>
            </div>
            {/* Pricing tiers */}
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:14,marginTop:14}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>مستويات التسعير</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--cs-green)',marginBottom:4,display:'block'}}>💚 اقتصادي (ر.س)</label>
                  <input type="number" min="0" className="form-input" style={{borderColor:'var(--cs-green)'}} value={form.price_economy} onChange={e=>setForm({...form,price_economy:e.target.value})}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:'#B7950B',marginBottom:4,display:'block'}}>💛 قياسي (ر.س)</label>
                  <input type="number" min="0" className="form-input" style={{borderColor:'#F0D060'}} value={form.price_standard} onChange={e=>setForm({...form,price_standard:e.target.value})}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--cs-blue)',marginBottom:4,display:'block'}}>💎 متميز (ر.س)</label>
                  <input type="number" min="0" className="form-input" style={{borderColor:'var(--cs-blue)'}} value={form.price_premium} onChange={e=>setForm({...form,price_premium:e.target.value})}/>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="نشط">نشط</option><option value="غير نشط">غير نشط</option></select></div>
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
