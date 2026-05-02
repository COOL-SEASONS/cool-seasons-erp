'use client'
const generateCode_QuotationsPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'QT-501'
  const nums = rows
    .map((r:any) => r.quote_code?.toString().replace('QT-','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'QT-501'
  return 'QT-' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const PROJECT_TYPES = ['تركيب تكييف','صيانة','VRF','Chiller','Packaged','duct works','كهرباء','سباكة','أخرى']
const PAYMENT_TERMS = ['مقدم','50/50','30/30/40','25/50/25','25/75','على الإنجاز']
const EMPTY = { quote_code:'', client_id:'', description:'', quote_date: new Date().toISOString().split('T')[0], expiry_date:'', project_type:'', amount:0, payment_terms:'', status:'Draft', notes:'' }

export default function QuotationsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: q }, { data: c }] = await Promise.all([
      supabase.from('quotations').select('*, clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id,company_name').eq('status','Active'),
    ])
    setRows(q||[]); setClients(c||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.quote_code?.includes(search) || r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.quote_code) return alert('رقم العرض مطلوب')
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount)||0, client_id: form.client_id||null }
    if (editId) await supabase.from('quotations').update(payload).eq('id', editId)
    else await supabase.from('quotations').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا العرض؟')) return
    await supabase.from('quotations').delete().eq('id', id)
    load()
  }

  const fmt = (n: number) => n ? new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n) : '0'
  const statusC: any = { Draft:'badge-gray', Sent:'badge-blue', Accepted:'badge-green', Rejected:'badge-red', Expired:'badge-amber' }
  const statusAr: any = { Draft:'مسودة', Sent:'مرسل', Accepted:'مقبول', Rejected:'مرفوض', Expired:'منتهي' }
  const totalSent = rows.filter(r=>r.status==='Sent').reduce((s,r)=>s+(r.total_amount||0),0)
  const totalAccepted = rows.filter(r=>r.status==='Accepted').reduce((s,r)=>s+(r.total_amount||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">عروض الأسعار</div><div className="page-subtitle">{rows.length} عرض</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...EMPTY,quote_code:'QT-'+(rows.length+1001)});setEditId(null);setModal(true)}}><Plus size={16}/>عرض جديد</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[{label:'إجمالي العروض',val:rows.length,color:'var(--cs-blue)'},{label:'مرسلة',val:fmt(totalSent)+' ر.س',color:'var(--cs-orange)'},{label:'مقبولة',val:fmt(totalAccepted)+' ر.س',color:'var(--cs-green)'},{label:'معدل القبول',val:rows.length?Math.round(rows.filter(r=>r.status==='Accepted').length/rows.length*100)+'%':'0%',color:'var(--cs-blue)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.label}</div><div style={{fontSize:20,fontWeight:800,color:s.color,fontFamily:'Cairo,sans-serif'}}>{s.val}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالعميل أو رقم العرض..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>رقم العرض</th><th>العميل</th><th>نوع المشروع</th><th>القيمة</th><th>الإجمالي+VAT</th><th>شروط الدفع</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عروض</td></tr>
                : filtered.map(r=>(
                  <tr key={r.id}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.quote_code}</span></td>
                    <td style={{fontWeight:600}}>{r.clients?.company_name}</td>
                    <td>{r.project_type}</td>
                    <td>{fmt(r.amount)} ر.س</td>
                    <td style={{fontWeight:600}}>{fmt(r.total_amount)} ر.س</td>
                    <td>{r.payment_terms}</td>
                    <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setForm({...r,client_id:r.client_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل العرض':'عرض سعر جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم العرض *</label><input className="form-input" placeholder="QT-001" value={form.quote_code||''} onChange={e=>setForm({...form,quote_code:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">وصف العمل</label><textarea className="form-input" rows={2} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></div>
              <div><label className="form-label">تاريخ العرض</label><input type="date" className="form-input" value={form.quote_date||''} onChange={e=>setForm({...form,quote_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الانتهاء</label><input type="date" className="form-input" value={form.expiry_date||''} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></div>
              <div><label className="form-label">نوع المشروع</label><select className="form-input" value={form.project_type||''} onChange={e=>setForm({...form,project_type:e.target.value})}><option value="">اختر...</option>{PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">شروط الدفع</label><select className="form-input" value={form.payment_terms||''} onChange={e=>setForm({...form,payment_terms:e.target.value})}><option value="">اختر...</option>{PAYMENT_TERMS.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">القيمة (ر.س)</label><input type="number" className="form-input" value={form.amount||0} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
              <div><label className="form-label">VAT 15% (تلقائي)</label><input className="form-input" readOnly value={((parseFloat(form.amount)||0)*0.15).toFixed(2)+' ر.س'} style={{background:'var(--cs-gray-light)',color:'var(--cs-text-muted)'}}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Draft'} onChange={e=>setForm({...form,status:e.target.value})}>{['Draft','Sent','Accepted','Rejected','Expired'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
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
