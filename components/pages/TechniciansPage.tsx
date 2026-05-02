'use client'
const generateCode_TechniciansPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'T-50'
  const nums = rows
    .map((r:any) => r.tech_code?.toString().replace('T-','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'T-50'
  return 'T-' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle, Printer} from 'lucide-react'

const SPECIALTIES = ['تركيب تكييف','صيانة','أعمال كهربائية','ميكانيك مبردات','قنوات هواء','مواسير','فريون','عمل عام']
const LEVELS = ['Trainee','Mid','Senior','Specialist','Expert']
const EMPTY = { tech_code:`T-${50+Math.floor(Date.now()/1000)%9000}` as string, full_name:'', specialty:'', phone:'', nationality:'', hire_date:'', status:'Active', level:'', hourly_rate:'', id_number:'', document_type:'هوية وطنية', residence_expiry:'', engineers_membership_exp:'', notes:'' }

export default function TechniciansPage() {
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
    const { data } = await supabase.from('technicians').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.tech_code?.includes(search) || r.specialty?.includes(search))

  const daysLeft = (d: string) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  }

  const expiryBadge = (expiry: string, label: string) => {
    const days = daysLeft(expiry)
    if (days === null) return null
    if (days <= 0) return <div style={{display:'flex',alignItems:'center',gap:4,color:'#C0392B',fontSize:11}}><AlertTriangle size={12}/>{label}: منتهية</div>
    if (days <= 30) return <div style={{display:'flex',alignItems:'center',gap:4,color:'#E67E22',fontSize:11}}><AlertTriangle size={12}/>{label}: {days} يوم</div>
    if (days <= 60) return <div style={{display:'flex',alignItems:'center',gap:4,color:'#1E9CD7',fontSize:11}}><AlertTriangle size={12}/>{label}: {days} يوم</div>
    return null
  }

  const save = async () => {
    if (!form.tech_code || !form.full_name) return alert('كود الفني والاسم مطلوبان')
    setSaving(true)
    const payload = { ...form, hourly_rate: parseFloat(form.hourly_rate)||null }
    if (editId) await supabase.from('technicians').update(payload).eq('id', editId)
    else await supabase.from('technicians').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا الفني؟')) return
    await supabase.from('technicians').delete().eq('id', id)
    load()
  }

  const expiredCount = rows.filter(r => {
    const d1 = daysLeft(r.residence_expiry); const d2 = daysLeft(r.engineers_membership_exp)
    return (d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0)
  }).length
  const soonCount = rows.filter(r => {
    const d1 = daysLeft(r.residence_expiry); const d2 = daysLeft(r.engineers_membership_exp)
    return (d1 !== null && d1 > 0 && d1 <= 30) || (d2 !== null && d2 > 0 && d2 <= 30)
  }).length

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الفنيون</div><div className="page-subtitle">{rows.length} فني مسجل</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>إضافة فني</button>
      </div>

      {(expiredCount > 0 || soonCount > 0) && (
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          {expiredCount > 0 && <div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={15} color="#C0392B"/><span style={{fontSize:13,fontWeight:700,color:'#C0392B'}}>{expiredCount} فني وثائقه منتهية</span></div>}
          {soonCount > 0 && <div style={{background:'#FEF3E2',border:'1px solid #E67E2230',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={15} color="#E67E22"/><span style={{fontSize:13,fontWeight:700,color:'#E67E22'}}>{soonCount} فني وثائقه تنتهي قريباً</span></div>}
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالاسم أو الكود أو التخصص..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>الكود</th><th>الاسم</th><th>التخصص</th><th>المستوى</th>
                <th>الهاتف</th><th>الجنسية</th><th>الحالة</th><th>الوثائق</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد فنيون</td></tr>
                  : filtered.map(r => {
                    const resD = daysLeft(r.residence_expiry)
                    const engD = daysLeft(r.engineers_membership_exp)
                    const hasAlert = (resD !== null && resD <= 60) || (engD !== null && engD <= 60)
                    return (
                      <tr key={r.id} style={{background: hasAlert && ((resD!==null&&resD<=0)||(engD!==null&&engD<=0)) ? '#FFF5F5' : hasAlert ? '#FFFBF0' : 'inherit'}}>
                        <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.tech_code}</span></td>
                        <td style={{fontWeight:600}}>{r.full_name}</td>
                        <td>{r.specialty}</td>
                        <td><span className={`badge ${r.level==='Expert'?'badge-green':r.level==='Senior'?'badge-blue':r.level==='Specialist'?'badge-amber':'badge-gray'}`}>{r.level}</span></td>
                        <td style={{direction:'ltr',fontSize:13}}>{r.phone}</td>
                        <td>{r.nationality}</td>
                        <td><span className={`badge ${r.status==='Active'?'badge-green':'badge-gray'}`}>{r.status==='Active'?'نشط':'غير نشط'}</span></td>
                        <td>
                          <div style={{display:'flex',flexDirection:'column',gap:2}}>
                            {expiryBadge(r.residence_expiry,'إقامة')}
                            {expiryBadge(r.engineers_membership_exp,'عضوية')}
                            {!expiryBadge(r.residence_expiry,'') && !expiryBadge(r.engineers_membership_exp,'') && r.residence_expiry && <div style={{display:'flex',alignItems:'center',gap:4,color:'#27AE60',fontSize:11}}><CheckCircle size={12}/>سارية</div>}
                          </div>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>{setForm(r);setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                            <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:620,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل بيانات الفني':'إضافة فني جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>

            {/* Section: البيانات الأساسية */}
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,fontWeight:700,color:'var(--cs-text-muted)'}}>البيانات الأساسية</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              <div><label className="form-label">كود الفني *</label><input className="form-input" placeholder="T-001" value={form.tech_code||''} onChange={e=>setForm({...form,tech_code:e.target.value})}/></div>
              <div><label className="form-label">الاسم الكامل *</label><input className="form-input" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
              <div>
                <label className="form-label">التخصص</label>
                <select className="form-input" value={form.specialty||''} onChange={e=>setForm({...form,specialty:e.target.value})}>
                  <option value="">اختر...</option>
                  {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المستوى</label>
                <select className="form-input" value={form.level||''} onChange={e=>setForm({...form,level:e.target.value})}>
                  <option value="">اختر...</option>
                  {LEVELS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label className="form-label">الهاتف</label><input className="form-input" dir="ltr" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="form-label">الجنسية</label><input className="form-input" value={form.nationality||''} onChange={e=>setForm({...form,nationality:e.target.value})}/></div>
              <div><label className="form-label">سعر/ساعة (ر.س)</label><input type="number" className="form-input" value={form.hourly_rate||''} onChange={e=>setForm({...form,hourly_rate:e.target.value})}/></div>
              <div><label className="form-label">تاريخ التعيين</label><input type="date" className="form-input" value={form.hire_date||''} onChange={e=>setForm({...form,hire_date:e.target.value})}/></div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option value="Active">نشط</option>
                  <option value="Inactive">غير نشط</option>
                  <option value="On Leave">إجازة</option>
                </select>
              </div>
            </div>

            {/* Section: وثائق الهوية */}
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,fontWeight:700,color:'var(--cs-text-muted)'}}>وثائق الهوية</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              <div>
                <label className="form-label">نوع الوثيقة</label>
                <select className="form-input" value={form.document_type||'هوية وطنية'} onChange={e=>setForm({...form,document_type:e.target.value})}>
                  <option value="هوية وطنية">هوية وطنية</option>
                  <option value="جواز سفر">جواز سفر</option>
                </select>
              </div>
              <div>
                <label className="form-label">{form.document_type==='هوية وطنية'?'رقم الهوية الوطنية':'رقم جواز السفر'}</label>
                <input className="form-input" dir="ltr" value={form.id_number||''} onChange={e=>setForm({...form,id_number:e.target.value})}/>
              </div>
            </div>

            {/* Section: تواريخ انتهاء الوثائق */}
            <div style={{background:'#FDECEA',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,fontWeight:700,color:'#C0392B'}}>⚠️ تواريخ انتهاء الوثائق — تنبيه تلقائي</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
              <div>
                <label className="form-label">تاريخ انتهاء الإقامة</label>
                <input type="date" className="form-input" value={form.residence_expiry?.split('T')[0]||''} onChange={e=>setForm({...form,residence_expiry:e.target.value})}/>
                {form.residence_expiry && (() => { const d = daysLeft(form.residence_expiry); return d !== null ? <div style={{fontSize:11,marginTop:3,color:d<=0?'#C0392B':d<=30?'#E67E22':'#27AE60',fontWeight:600}}>{d<=0?'⚠️ منتهية':d<=30?`⚠️ تنتهي خلال ${d} يوم`:`✅ متبقي ${d} يوم`}</div> : null })()} 
              </div>
              <div>
                <label className="form-label">تاريخ انتهاء عضوية المهندسين</label>
                <input type="date" className="form-input" value={form.engineers_membership_exp?.split('T')[0]||''} onChange={e=>setForm({...form,engineers_membership_exp:e.target.value})}/>
                {form.engineers_membership_exp && (() => { const d = daysLeft(form.engineers_membership_exp); return d !== null ? <div style={{fontSize:11,marginTop:3,color:d<=0?'#C0392B':d<=30?'#E67E22':'#27AE60',fontWeight:600}}>{d<=0?'⚠️ منتهية':d<=30?`⚠️ تنتهي خلال ${d} يوم`:`✅ متبقي ${d} يوم`}</div> : null })()}
              </div>
            </div>

            <div><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>

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
