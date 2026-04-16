'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'

const EMPTY = {
  plate_no:'', vehicle_type:'', brand:'', model:'', year:'',
  assigned_tech_id:'', status:'Active',
  insurance_expiry:'', registration_expiry:'',
  last_service_date:'', next_service_date:'', odometer:'', notes:''
}

export default function VehiclesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: v }, { data: t }] = await Promise.all([
      supabase.from('vehicles').select('*, technicians(full_name)').order('created_at', { ascending: false }),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(v||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    r.plate_no?.includes(search) ||
    r.brand?.toLowerCase().includes(search.toLowerCase()) ||
    r.model?.toLowerCase().includes(search.toLowerCase())
  )

  const daysLeft = (d: string) => {
    if (!d) return null
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  }

  const docBadge = (expiry: string, label: string) => {
    const days = daysLeft(expiry)
    if (days === null) return <span className="badge badge-gray">غير محدد</span>
    if (days <= 0) return <span className="badge badge-red">{label}: منتهية</span>
    if (days <= 30) return <span className="badge badge-amber">{label}: {days} يوم</span>
    return <span className="badge badge-green">{label}: {days} يوم</span>
  }

  const save = async () => {
    if (!form.plate_no) return alert('رقم اللوحة مطلوب')
    setSaving(true)
    const payload = { ...form, year: parseInt(form.year)||null, odometer: parseInt(form.odometer)||null, assigned_tech_id: form.assigned_tech_id||null }
    if (editId) await supabase.from('vehicles').update(payload).eq('id', editId)
    else await supabase.from('vehicles').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذه المركبة؟')) return
    await supabase.from('vehicles').delete().eq('id', id)
    load()
  }

  // Count alerts
  const expiredCount = rows.filter(r => {
    const d1 = daysLeft(r.insurance_expiry); const d2 = daysLeft(r.registration_expiry)
    return (d1 !== null && d1 <= 0) || (d2 !== null && d2 <= 0)
  }).length
  const soonCount = rows.filter(r => {
    const d1 = daysLeft(r.insurance_expiry); const d2 = daysLeft(r.registration_expiry)
    return (d1 !== null && d1 > 0 && d1 <= 30) || (d2 !== null && d2 > 0 && d2 <= 30)
  }).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">المركبات</div>
          <div className="page-subtitle">{rows.length} مركبة مسجلة</div>
        </div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>إضافة مركبة</button>
      </div>

      {/* Alert summary */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
          {expiredCount > 0 && (
            <div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
              <AlertTriangle size={15} color="#C0392B"/>
              <span style={{fontSize:13,fontWeight:700,color:'#C0392B'}}>{expiredCount} مركبة وثائقها منتهية</span>
            </div>
          )}
          {soonCount > 0 && (
            <div style={{background:'#FEF3E2',border:'1px solid #E67E2230',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
              <AlertTriangle size={15} color="#E67E22"/>
              <span style={{fontSize:13,fontWeight:700,color:'#E67E22'}}>{soonCount} مركبة وثائقها تنتهي قريباً</span>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث برقم اللوحة أو الماركة..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>رقم اللوحة</th><th>النوع</th><th>الماركة/الموديل</th>
                <th>السائق</th><th>التأمين</th><th>الاستمارة</th>
                <th>الحالة</th><th>إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد مركبات</td></tr>
                  : filtered.map(r => {
                    const insD = daysLeft(r.insurance_expiry)
                    const regD = daysLeft(r.registration_expiry)
                    const hasAlert = (insD !== null && insD <= 30) || (regD !== null && regD <= 30)
                    return (
                      <tr key={r.id} style={{background: hasAlert && (insD!==null&&insD<=0)||(regD!==null&&regD<=0) ? '#FFF5F5' : hasAlert ? '#FFFBF0' : 'inherit'}}>
                        <td style={{fontWeight:700}}>{r.plate_no}</td>
                        <td>{r.vehicle_type}</td>
                        <td>{r.brand} {r.model} {r.year ? `(${r.year})` : ''}</td>
                        <td>{r.technicians?.full_name || '—'}</td>
                        <td>{r.insurance_expiry ? docBadge(r.insurance_expiry, 'تأمين') : <span className="badge badge-gray">غير محدد</span>}</td>
                        <td>{r.registration_expiry ? docBadge(r.registration_expiry, 'استمارة') : <span className="badge badge-gray">غير محدد</span>}</td>
                        <td><span className={`badge ${r.status==='Active'?'badge-green':r.status==='Maintenance'?'badge-amber':'badge-gray'}`}>{r.status==='Active'?'نشطة':r.status==='Maintenance'?'صيانة':'غير نشطة'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>{setForm({...r,assigned_tech_id:r.assigned_tech_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
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
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل المركبة':'مركبة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">رقم اللوحة *</label><input className="form-input" value={form.plate_no||''} onChange={e=>setForm({...form,plate_no:e.target.value})}/></div>
              <div><label className="form-label">نوع المركبة</label><select className="form-input" value={form.vehicle_type||''} onChange={e=>setForm({...form,vehicle_type:e.target.value})}><option value="">اختر...</option>{['شاحنة نقل','سيارة','فان','بيك آب','دراجة نارية'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الماركة</label><input className="form-input" value={form.brand||''} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model||''} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">سنة الصنع</label><input type="number" className="form-input" value={form.year||''} onChange={e=>setForm({...form,year:e.target.value})}/></div>
              <div><label className="form-label">السائق المكلف</label><select className="form-input" value={form.assigned_tech_id||''} onChange={e=>setForm({...form,assigned_tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">تاريخ انتهاء التأمين</label><input type="date" className="form-input" value={form.insurance_expiry||''} onChange={e=>setForm({...form,insurance_expiry:e.target.value})}/></div>
              <div><label className="form-label">تاريخ انتهاء الاستمارة</label><input type="date" className="form-input" value={form.registration_expiry||''} onChange={e=>setForm({...form,registration_expiry:e.target.value})}/></div>
              <div><label className="form-label">آخر صيانة</label><input type="date" className="form-input" value={form.last_service_date||''} onChange={e=>setForm({...form,last_service_date:e.target.value})}/></div>
              <div><label className="form-label">الصيانة القادمة</label><input type="date" className="form-input" value={form.next_service_date||''} onChange={e=>setForm({...form,next_service_date:e.target.value})}/></div>
              <div><label className="form-label">عداد الكيلومترات</label><input type="number" className="form-input" value={form.odometer||''} onChange={e=>setForm({...form,odometer:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})}><option value="Active">نشطة</option><option value="Maintenance">صيانة</option><option value="Inactive">غير نشطة</option></select></div>
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
