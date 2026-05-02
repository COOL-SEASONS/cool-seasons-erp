'use client'
const generateCode_CompanyDocsPage = (rows: any[]) => {
  if(!rows || !rows.length) return 'DOC-101'
  const nums = rows
    .map((r:any) => r.doc_code?.toString().replace('DOC-','').replace(/\D/g,''))
    .filter(Boolean).map(Number).filter(n => !isNaN(n))
  if(!nums.length) return 'DOC-101'
  return 'DOC-' + (Math.max(...nums) + 1)
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle, Printer} from 'lucide-react'

const EMPTY = { doc_name:'', doc_type:'', doc_number:'', issue_date:'', expiry_date:'', file_url:'', notes:'' }

const DOC_TYPES = ['سجل تجاري','رخصة بلدية','شهادة زكاة وضريبة','تأمين','وثيقة عمل','ترخيص مهني','عضوية غرفة','شهادة ISO','رخصة سائق','أخرى']

export default function CompanyDocsPage() {
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
    const { data } = await supabase.from('company_docs').select('*').order('expiry_date', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    r.doc_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.doc_type?.toLowerCase().includes(search.toLowerCase()) ||
    r.doc_number?.includes(search)
  )

  const daysLeft = (d: string) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  }

  const statusBadge = (expiry: string) => {
    const days = daysLeft(expiry)
    if (days === null) return <span className="badge badge-gray">غير محدد</span>
    if (days <= 0) return <span className="badge badge-red">منتهية</span>
    if (days <= 30) return <span className="badge badge-amber">{days} يوم</span>
    if (days <= 60) return <span className="badge badge-blue">{days} يوم</span>
    return <span className="badge badge-green">سارية</span>
  }

  const save = async () => {
    if (!form.doc_name) return alert('اسم الوثيقة مطلوب')
    setSaving(true)
    const payload = { ...form }
    if (editId) await supabase.from('company_docs').update(payload).eq('id', editId)
    else await supabase.from('company_docs').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذه الوثيقة؟')) return
    await supabase.from('company_docs').delete().eq('id', id)
    load()
  }

  const expiredDocs = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d <= 0 })
  const soonDocs = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d > 0 && d <= 30 })
  const laterDocs = rows.filter(r => { const d = daysLeft(r.expiry_date); return d !== null && d > 30 && d <= 60 })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">وثائق وتراخيص الشركة</div>
          <div className="page-subtitle">{rows.length} وثيقة مسجلة</div>
        </div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>إضافة وثيقة</button>
      </div>

      {/* Alert cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        <div className="stat-card" style={{borderRight:'3px solid #C0392B',borderRadius:'0 12px 12px 0'}}>
          <div style={{fontSize:11,color:'#C0392B',fontWeight:600,marginBottom:4}}>منتهية</div>
          <div style={{fontSize:28,fontWeight:800,color:'#C0392B'}}>{expiredDocs.length}</div>
        </div>
        <div className="stat-card" style={{borderRight:'3px solid #E67E22',borderRadius:'0 12px 12px 0'}}>
          <div style={{fontSize:11,color:'#E67E22',fontWeight:600,marginBottom:4}}>تنتهي خلال 30 يوم</div>
          <div style={{fontSize:28,fontWeight:800,color:'#E67E22'}}>{soonDocs.length}</div>
        </div>
        <div className="stat-card" style={{borderRight:'3px solid #1E9CD7',borderRadius:'0 12px 12px 0'}}>
          <div style={{fontSize:11,color:'#1E9CD7',fontWeight:600,marginBottom:4}}>تنتهي خلال 60 يوم</div>
          <div style={{fontSize:28,fontWeight:800,color:'#1E9CD7'}}>{laterDocs.length}</div>
        </div>
        <div className="stat-card" style={{borderRight:'3px solid #27AE60',borderRadius:'0 12px 12px 0'}}>
          <div style={{fontSize:11,color:'#27AE60',fontWeight:600,marginBottom:4}}>سارية</div>
          <div style={{fontSize:28,fontWeight:800,color:'#27AE60'}}>{rows.length - expiredDocs.length - soonDocs.length - laterDocs.length}</div>
        </div>
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث بالاسم أو النوع أو الرقم..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>اسم الوثيقة</th><th>النوع</th><th>رقم الوثيقة</th>
                <th>تاريخ الإصدار</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th><th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد وثائق</td></tr>
                  : filtered.map(r => {
                    const days = daysLeft(r.expiry_date)
                    const rowBg = days !== null && days <= 0 ? '#FFF5F5' : days !== null && days <= 30 ? '#FFFBF0' : 'inherit'
                    return (
                      <tr key={r.id} style={{background: rowBg}}>
                        <td style={{fontWeight:600}}>{r.doc_name}</td>
                        <td>{r.doc_type}</td>
                        <td style={{fontFamily:'monospace',fontSize:12}}>{r.doc_number}</td>
                        <td style={{fontSize:12}}>{r.issue_date}</td>
                        <td style={{fontSize:12,color: days !== null && days <= 30 ? '#C0392B' : 'inherit', fontWeight: days !== null && days <= 30 ? 700 : 400}}>{r.expiry_date}</td>
                        <td>
                          {days !== null ? (
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              {days <= 0 ? <AlertTriangle size={14} color="#C0392B"/> : days <= 30 ? <AlertTriangle size={14} color="#E67E22"/> : <CheckCircle size={14} color="#27AE60"/>}
                              <span style={{fontSize:13,fontWeight:600,color: days<=0?'#C0392B':days<=30?'#E67E22':'#27AE60'}}>{days<=0?'منتهية':`${days} يوم`}</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>{statusBadge(r.expiry_date)}</td>
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
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل الوثيقة':'وثيقة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">اسم الوثيقة *</label><input className="form-input" value={form.doc_name||''} onChange={e=>setForm({...form,doc_name:e.target.value})}/></div>
              <div>
                <label className="form-label">نوع الوثيقة</label>
                <select className="form-input" value={form.doc_type||''} onChange={e=>setForm({...form,doc_type:e.target.value})}>
                  <option value="">اختر...</option>
                  {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="form-label">رقم الوثيقة</label><input className="form-input" value={form.doc_number||''} onChange={e=>setForm({...form,doc_number:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الإصدار</label><input type="date" className="form-input" value={form.issue_date||''} onChange={e=>setForm({...form,issue_date:e.target.value})}/></div>
              <div><label className="form-label">تاريخ الانتهاء</label><input type="date" className="form-input" value={form.expiry_date||''} onChange={e=>setForm({...form,expiry_date:e.target.value})}/></div>
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
