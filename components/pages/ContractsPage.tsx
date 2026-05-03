'use client'
const generateCode_ContractsPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'AMC201'
  const nums = rows
    .map((r:any) => r.contract_code?.toString().replace('AMC','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'AMC201'
  return 'AMC' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const EMPTY = { contract_code:`AMC-${201+Math.floor(Date.now()/1000)%9000}` as string, client_id:'', tech_id:'', start_date:'', end_date:'', annual_value:0, units_count:'', visit_frequency:'', status:'Active', paid_amount:0, notes:'' }

const SECTORS=['قطاع حكومي','قطاع خاص','مطور عقاري','شركة مقاولات','قطاع فندقي','مطاعم','شركة هندسية وديكور','مدارس','قاعات مناسبات','مسجد','فردي']

export default function ContractsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewItem,setViewItem]=useState<any>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: c }, { data: cl }, { data: t }] = await Promise.all([
      supabase.from('contracts_amc').select('*, clients(company_name), technicians(full_name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(c||[]); setClients(cl||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.contract_code?.includes(search) || r.clients?.company_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.contract_code) return alert('كود العقد مطلوب')
    setSaving(true)
    const payload = { ...form, annual_value: parseFloat(form.annual_value)||0, paid_amount: parseFloat(form.paid_amount)||0, units_count: parseInt(form.units_count)||null }
    if (editId) await supabase.from('contracts_amc').update(payload).eq('id', editId)
    else await supabase.from('contracts_amc').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا العقد؟')) return
    await supabase.from('contracts_amc').delete().eq('id', id)
    load()
  }

  const fmt = (n: number) => n ? new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س' : '—'
  const statusC: any = { Active:'badge-green', Expired:'badge-red', Renewed:'badge-blue', Cancelled:'badge-gray' }
  const statusAr: any = { Active:'نشط', Expired:'منتهي', Renewed:'مجدد', Cancelled:'ملغي' }
  const totalValue = rows.filter(r=>r.status==='Active').reduce((s,r)=>s+(r.annual_value||0),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">عقود AMC</div><div className="page-subtitle">قيمة العقود النشطة: {fmt(totalValue)}</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...EMPTY,contract_code:'AMC'+(rows.length+201)});setEditId(null);setModal(true)}}><Plus size={16}/>عقد جديد</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالعميل أو كود العقد..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>كود العقد</th><th>العميل</th><th>الفني</th><th>تاريخ البدء</th><th>تاريخ الانتهاء</th><th>القيمة السنوية</th><th>القيمة الشهرية</th><th>الرصيد</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد عقود</td></tr>
                  : filtered.map(r=>(
                    <tr key={r.id}>
                      <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.contract_code}</span></td>
                      <td style={{fontWeight:600}}>{r.clients?.company_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td style={{fontSize:12}}>{r.start_date}</td>
                      <td style={{fontSize:12}}>{r.end_date}</td>
                      <td>{fmt(r.annual_value)}</td>
                      <td>{fmt(r.monthly_value)}</td>
                      <td style={{color:r.balance>0?'var(--cs-red)':'var(--cs-green)'}}>{fmt(r.balance)}</td>
                      <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{statusAr[r.status]||r.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setForm({...r,client_id:r.client_id||'',tech_id:r.tech_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل العقد':'عقد AMC جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود العقد *</label><input className="form-input" value={form.contract_code||''} onChange={e=>setForm({...form,contract_code:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">تكرار الزيارة</label><select className="form-input" value={form.visit_frequency||''} onChange={e=>setForm({...form,visit_frequency:e.target.value})}><option value="">اختر...</option>{['Monthly','Quarterly','Semi-Annual','Annual'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">تاريخ البدء</label><input type="date" className="form-input" value={form.start_date||''} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الانتهاء</label><input type="date" className="form-input" value={form.end_date||''} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
              <div><label className="form-label">القيمة السنوية (ر.س)</label><input type="number" className="form-input" value={form.annual_value||0} onChange={e=>setForm({...form,annual_value:e.target.value})}/></div>
              <div><label className="form-label">القيمة الشهرية</label><input className="form-input" readOnly value={((parseFloat(form.annual_value)||0)/12).toFixed(0)+' ر.س'} style={{background:'var(--cs-gray-light)',color:'var(--cs-text-muted)'}}/></div>
              <div><label className="form-label">عدد الوحدات</label><input type="number" className="form-input" value={form.units_count||''} onChange={e=>setForm({...form,units_count:e.target.value})}/></div>
              <div><label className="form-label">المدفوع (ر.س)</label><input type="number" className="form-input" value={form.paid_amount||0} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})}>{['Active','Expired','Renewed','Cancelled'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
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
