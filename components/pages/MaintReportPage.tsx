'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const UNIT_TYPES = ['SPLIT','D.SPLIT','PACKAGED','VRF','CHILLER','FCU','AHU','أخرى']
const EMPTY = { report_no:'', report_date: new Date().toISOString().split('T')[0], client_id:'', tech_id:'', company:'', customer:'', section:'', unit_type:'SPLIT', equipment:'', model:'', serial_no:'', complaint:'', problem:'', problem_detail:'', call_time:'', attend_time:'', done_time:'', parts_used:'', cost:0, status:'Open', customer_signature:'', notes:'' }

export default function MaintReportPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('maint_reports').select('*, clients(company_name), technicians(full_name)').order('report_date', { ascending: false }),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => r.report_no?.includes(search) || r.customer?.toLowerCase().includes(search.toLowerCase()) || r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase()))

  const save = async () => {
    if (!form.report_no) return alert('رقم التقرير مطلوب')
    setSaving(true)
    const payload = { ...form, cost: parseFloat(form.cost)||0, client_id: form.client_id||null, tech_id: form.tech_id||null }
    if (editId) await supabase.from('maint_reports').update(payload).eq('id', editId)
    else await supabase.from('maint_reports').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا التقرير؟')) return
    await supabase.from('maint_reports').delete().eq('id', id)
    load()
  }

  const statusC: any = { Open:'badge-blue', 'In Progress':'badge-amber', Completed:'badge-green' }
  const statusAr: any = { Open:'مفتوح', 'In Progress':'جاري', Completed:'مكتمل' }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">تقارير الصيانة</div><div className="page-subtitle">{rows.length} تقرير</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>تقرير جديد</button>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}>
          <Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
          <input className="form-input" style={{paddingRight:34}} placeholder="بحث برقم التقرير أو العميل أو الفني..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>رقم التقرير</th><th>التاريخ</th><th>العميل</th><th>الفني</th><th>نوع الوحدة</th><th>العطل</th><th>الحالة</th><th>إجراءات</th></tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد تقارير</td></tr>
                : filtered.map(r=>(
                  <tr key={r.id}>
                    <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.report_no}</span></td>
                    <td style={{fontSize:12}}>{r.report_date}</td>
                    <td style={{fontWeight:600}}>{r.clients?.company_name || r.customer}</td>
                    <td>{r.technicians?.full_name}</td>
                    <td><span className="badge badge-blue">{r.unit_type}</span></td>
                    <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.complaint}</td>
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
          <div className="card" style={{width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل التقرير':'تقرير صيانة جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 12px',marginBottom:12,fontSize:12,fontWeight:700,color:'var(--cs-text-muted)'}}>بيانات التقرير</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div><label className="form-label">رقم التقرير *</label><input className="form-input" placeholder="RPT-001" value={form.report_no||''} onChange={e=>setForm({...form,report_no:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.report_date||''} onChange={e=>setForm({...form,report_date:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>{const c=clients.find(x=>x.id===e.target.value);setForm({...form,client_id:e.target.value,customer:c?.company_name||form.customer})}}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id||''} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">اختر...</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">القسم / الموقع</label><input className="form-input" value={form.section||''} onChange={e=>setForm({...form,section:e.target.value})}/></div>
              <div><label className="form-label">نوع الوحدة</label><select className="form-input" value={form.unit_type||'SPLIT'} onChange={e=>setForm({...form,unit_type:e.target.value})}>{UNIT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">المعدة / Equipment</label><input className="form-input" value={form.equipment||''} onChange={e=>setForm({...form,equipment:e.target.value})}/></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model||''} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">الرقم التسلسلي</label><input className="form-input" dir="ltr" value={form.serial_no||''} onChange={e=>setForm({...form,serial_no:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Open'} onChange={e=>setForm({...form,status:e.target.value})}>{['Open','In Progress','Completed'].map(s=><option key={s} value={s}>{statusAr[s]||s}</option>)}</select></div>
            </div>
            <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 12px',marginBottom:12,fontSize:12,fontWeight:700,color:'var(--cs-text-muted)'}}>تفاصيل العطل</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الشكوى / Complaint</label><input className="form-input" value={form.complaint||''} onChange={e=>setForm({...form,complaint:e.target.value})}/></div>
              <div><label className="form-label">المشكلة / Problem</label><input className="form-input" value={form.problem||''} onChange={e=>setForm({...form,problem:e.target.value})}/></div>
              <div><label className="form-label">التكلفة (ر.س)</label><input type="number" className="form-input" value={form.cost||0} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
              <div><label className="form-label">وقت البلاغ</label><input type="time" className="form-input" value={form.call_time||''} onChange={e=>setForm({...form,call_time:e.target.value})}/></div>
              <div><label className="form-label">وقت الوصول</label><input type="time" className="form-input" value={form.attend_time||''} onChange={e=>setForm({...form,attend_time:e.target.value})}/></div>
              <div><label className="form-label">وقت الإنجاز</label><input type="time" className="form-input" value={form.done_time||''} onChange={e=>setForm({...form,done_time:e.target.value})}/></div>
              <div><label className="form-label">القطع المستخدمة</label><input className="form-input" value={form.parts_used||''} onChange={e=>setForm({...form,parts_used:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">ملاحظات</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16,justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
