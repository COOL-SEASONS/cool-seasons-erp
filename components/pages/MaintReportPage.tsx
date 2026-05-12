'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, Eye } from 'lucide-react'

const UNIT_TYPES = ['SPLIT','D.SPLIT','PACKAGED','VRF','CHILLER','FCU','AHU','أخرى']
const PROBLEMS = ['DRAIN LEAK','GAS LEAK','COMPRESSOR FAULT','FAN MOTOR FAULT','DIRTY FILTER','WATER LEAK','POOR COOLING','NOISE ISSUE','CONTROL BOARD','CAPACITOR FAULT','EXPANSION VALVE','REMOTE CONTROL','Routine Maintenance - صيانة دورية','Other - أخرى']
const STATUSES = ['Open','In Progress','Completed']
const STATUS_AR: any = { Open:'مفتوح', 'In Progress':'جاري', Completed:'مكتمل' }
const STATUS_C:  any = { Open:'badge-blue', 'In Progress':'badge-amber', Completed:'badge-green' }

const newForm = () => ({
  report_no:'', report_date: new Date().toISOString().split('T')[0],
  client_id:'', tech_id:'', customer:'', section:'',
  unit_type:'SPLIT', equipment:'', model:'', serial_no:'',
  complaint:'', problem:'', call_time:'', attend_time:'', done_time:'',
  parts_used:'', cost:'0', status:'Open', notes:''
})

export default function MaintReportPage() {
  const [rows,    setRows]    = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [techs,   setTechs]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState<string|null>(null)
  const [form,    setForm]    = useState<any>(newForm())
  const [viewItem,setViewItem]= useState<any>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('maint_reports').select('*,clients(company_name),technicians(full_name)').order('created_at',{ ascending: false }),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openEdit = (r: any) => {
    setForm({
      report_no: r.report_no||'', report_date: r.report_date?.split('T')[0]||'',
      client_id: r.client_id||'', tech_id: r.tech_id||'',
      customer: r.customer||'', section: r.section||'',
      unit_type: r.unit_type||'SPLIT', equipment: r.equipment||'',
      model: r.model||'', serial_no: r.serial_no||'',
      complaint: r.complaint||'', problem: r.problem||'',
      call_time: r.call_time||'', attend_time: r.attend_time||'', done_time: r.done_time||'',
      parts_used: r.parts_used||'', cost: String(r.cost||0), status: r.status||'Open', notes: r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if (!form.report_no?.trim()) return alert('رقم التقرير مطلوب')
    setSaving(true)
    const payload = {
      report_no: form.report_no.trim(), report_date: form.report_date||null,
      client_id: form.client_id||null, tech_id: form.tech_id||null,
      customer: form.customer||null, section: form.section||null,
      unit_type: form.unit_type||null, equipment: form.equipment||null,
      model: form.model||null, serial_no: form.serial_no||null,
      complaint: form.complaint||null, problem: form.problem||null,
      call_time: form.call_time||null, attend_time: form.attend_time||null, done_time: form.done_time||null,
      parts_used: form.parts_used||null, cost: parseFloat(form.cost)||0,
      status: form.status||'Open', notes: form.notes||null,
    }
    const { error } = editId
      ? await supabase.from('maint_reports').update(payload).eq('id', editId)
      : await supabase.from('maint_reports').insert(payload)
    if (error) alert('خطأ: ' + error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا التقرير؟')) return
    await supabase.from('maint_reports').delete().eq('id', id); load()
  }

  const printReport = (r: any) => {
    const w = window.open('', '_blank')!
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>تقرير ${r.report_no}</title>
    <style>body{font-family:Tajawal,Arial,sans-serif;padding:30px;direction:rtl}h2{color:#1E9CD7;border-bottom:2px solid #1E9CD7;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:right}th{background:#f0f4f8}</style></head><body>
    <h2>تقرير صيانة — ${r.report_no}</h2><table>
    <tr><th>العميل</th><td>${r.clients?.company_name||r.customer||'—'}</td><th>التاريخ</th><td>${r.report_date||'—'}</td></tr>
    <tr><th>الفني</th><td>${r.technicians?.full_name||'—'}</td><th>نوع الوحدة</th><td>${r.unit_type||'—'}</td></tr>
    <tr><th>المشكلة</th><td colspan="3">${r.problem||'—'}</td></tr>
    <tr><th>القطع</th><td colspan="3">${r.parts_used||'—'}</td></tr>
    <tr><th>التكلفة</th><td>${Number(r.cost||0).toFixed(2)} ر.س</td><th>الحالة</th><td>${STATUS_AR[r.status]||r.status}</td></tr>
    <tr><th>ملاحظات</th><td colspan="3">${r.notes||'—'}</td></tr>
    </table><br><button onclick="window.print()">🖨 طباعة</button></body></html>`)
    w.document.close()
  }

  const filtered = rows.filter(r =>
    (r.report_no||'').toLowerCase().includes(search.toLowerCase()) ||
    (r.clients?.company_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (r.problem||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">تقارير الصيانة</div><div className="page-subtitle">{rows.length} تقرير</div></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => window.print()} style={{ display:'flex', alignItems:'center', gap:6, background:'white', color:'var(--cs-blue)', border:'1px solid var(--cs-blue)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontFamily:'Tajawal,sans-serif', fontWeight:600 }}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={() => { setForm(newForm()); setEditId(null); setModal(true) }}><Plus size={16}/>+ تقرير جديد</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { l:'مفتوحة',  v: rows.filter(r=>r.status==='Open').length,         c:'var(--cs-blue)' },
          { l:'جارية',   v: rows.filter(r=>r.status==='In Progress').length,  c:'var(--cs-orange)' },
          { l:'مكتملة',  v: rows.filter(r=>r.status==='Completed').length,    c:'var(--cs-green)' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize:11, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom:16, padding:'12px 16px' }}>
        <div style={{ position:'relative' }}>
          <Search size={16} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--cs-text-muted)' }}/>
          <input className="form-input" style={{ paddingRight:34 }} placeholder="بحث برقم التقرير أو العميل أو المشكلة..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--cs-text-muted)' }}>جاري التحميل...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم التقرير</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الفني</th>
                  <th>نوع الوحدة</th>
                  <th>المشكلة</th>
                  <th>التكلفة</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>لا توجد تقارير</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:700, color:'var(--cs-blue)' }}>{r.report_no||'—'}</td>
                    <td>{r.report_date||'—'}</td>
                    <td style={{ fontWeight:600 }}>{r.clients?.company_name||r.customer||'—'}</td>
                    <td>{r.technicians?.full_name||'—'}</td>
                    <td><span className="badge badge-gray">{r.unit_type||'—'}</span></td>
                    <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.problem||'—'}</td>
                    <td style={{ fontWeight:600 }}>{Number(r.cost||0).toFixed(2)} ر.س</td>
                    <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status||'—'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="icon-btn" onClick={() => setViewItem(r)} title="عرض"><Eye size={14}/></button>
                        <button className="icon-btn" onClick={() => openEdit(r)} title="تعديل"><Edit2 size={14}/></button>
                        <button className="icon-btn" onClick={() => del(r.id)} title="حذف"><Trash2 size={14}/></button>
                        <button className="icon-btn" onClick={() => printReport(r)} title="طباعة"><Printer size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-box" style={{ maxWidth:500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تقرير — {viewItem.report_no}</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}><X size={18}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
              {[
                { l:'العميل',v:viewItem.clients?.company_name||viewItem.customer },
                { l:'التاريخ',v:viewItem.report_date },
                { l:'الفني',v:viewItem.technicians?.full_name },
                { l:'نوع الوحدة',v:viewItem.unit_type },
                { l:'القسم',v:viewItem.section },
                { l:'الموديل',v:viewItem.model },
                { l:'المشكلة',v:viewItem.problem },
                { l:'التكلفة',v:Number(viewItem.cost||0).toFixed(2)+' ر.س' },
                { l:'وقت الاتصال',v:viewItem.call_time },
                { l:'وقت الوصول',v:viewItem.attend_time },
                { l:'القطع المستخدمة',v:viewItem.parts_used },
                { l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status },
              ].map(({ l, v }) => (
                <div key={l} style={{ background:'var(--cs-gray-light)', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:3 }}>{l}</div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{v||'—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => printReport(viewItem)} style={{ display:'flex', alignItems:'center', gap:6, background:'white', color:'var(--cs-blue)', border:'1px solid var(--cs-blue)', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13, fontFamily:'Tajawal,sans-serif', fontWeight:600 }}><Printer size={15}/>طباعة</button>
              <button className="btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Edit2 size={15}/>تعديل</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'تعديل تقرير' : 'تقرير صيانة جديد'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:8 }}>
              <div>
                <label className="form-label">رقم التقرير *</label>
                <input className="form-input" value={form.report_no} onChange={e => setForm({...form,report_no:e.target.value})} placeholder="MR-1001"/>
              </div>
              <div>
                <label className="form-label">التاريخ</label>
                <input type="date" className="form-input" value={form.report_date} onChange={e => setForm({...form,report_date:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">العميل</label>
                <select className="form-input" value={form.client_id} onChange={e => setForm({...form,client_id:e.target.value})}>
                  <option value="">-- اختر --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الفني</label>
                <select className="form-input" value={form.tech_id} onChange={e => setForm({...form,tech_id:e.target.value})}>
                  <option value="">-- اختر --</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">نوع الوحدة</label>
                <select className="form-input" value={form.unit_type} onChange={e => setForm({...form,unit_type:e.target.value})}>
                  {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المشكلة / Problem</label>
                <select className="form-input" value={form.problem} onChange={e => setForm({...form,problem:e.target.value})}>
                  <option value="">-- اختر --</option>
                  {PROBLEMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">التكلفة (ر.س)</label>
                <input type="number" min={0} className="form-input" value={form.cost} onChange={e => setForm({...form,cost:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">وقت الاتصال</label>
                <input type="time" className="form-input" value={form.call_time} onChange={e => setForm({...form,call_time:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">وقت الوصول</label>
                <input type="time" className="form-input" value={form.attend_time} onChange={e => setForm({...form,attend_time:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">القسم</label>
                <input className="form-input" value={form.section} onChange={e => setForm({...form,section:e.target.value})}/>
              </div>
              <div>
                <label className="form-label">الموديل</label>
                <input className="form-input" value={form.model} onChange={e => setForm({...form,model:e.target.value})}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">القطع المستخدمة</label>
                <input className="form-input" value={form.parts_used} onChange={e => setForm({...form,parts_used:e.target.value})} placeholder="فلتر، غاز R410A ..."/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">الشكوى</label>
                <textarea className="form-input" rows={2} value={form.complaint} onChange={e => setForm({...form,complaint:e.target.value})}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'جاري الحفظ...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
