'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer, Eye } from 'lucide-react'

const UNIT_TYPES = ['SPLIT','D.SPLIT','PACKAGED','VRF','CHILLER','FCU','AHU','أخرى']
const PROBLEMS = [
  'DRAIN LEAK - تسريب تصريف',
  'GAS LEAK - نقص غاز',
  'COMPRESSOR FAULT - عطل كمبروسر',
  'FAN MOTOR FAULT - مروحة معطلة',
  'DIRTY FILTER - فلتر متسخ',
  'WATER LEAK - تسريب مياه',
  'POOR COOLING - ضعف تبريد',
  'NOISE ISSUE - ضوضاء',
  'CONTROL BOARD - بورد تحكم',
  'CAPACITOR FAULT - كابيستر',
  'EXPANSION VALVE - صمام تمدد',
  'REMOTE CONTROL - ريموت',
  'Routine Maintenance - صيانة دورية',
  'Other - أخرى',
]
const STATUSES = ['Open','In Progress','Completed']
const STATUS_AR: Record<string,string> = { Open:'مفتوح', 'In Progress':'جاري', Completed:'مكتمل' }
const STATUS_C:  Record<string,string> = { Open:'badge-blue', 'In Progress':'badge-amber', Completed:'badge-green' }

const emptyForm = () => ({
  report_no:    '',
  report_date:  new Date().toISOString().split('T')[0],
  client_id:    '',
  tech_id:      '',
  unit_type:    'SPLIT',
  problem:      '',
  call_time:    '',
  attend_time:  '',
  done_time:    '',
  parts_used:   '',
  cost:         '0',
  status:       'Open',
  notes:        '',
  customer:     '',
  section:      '',
  equipment:    '',
  model:        '',
  serial_no:    '',
  complaint:    '',
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
  const [form,    setForm]    = useState<any>(emptyForm())
  const [viewItem,setViewItem]= useState<any>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
      supabase
        .from('maint_reports')
        .select('*,clients(company_name),technicians(full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r || [])
    setClients(c || [])
    setTechs(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(emptyForm())
    setEditId(null)
    setModal(true)
  }

  const openEdit = (r: any) => {
    setForm({
      report_no:   r.report_no   || '',
      report_date: r.report_date?.split('T')[0] || '',
      client_id:   r.client_id   || '',
      tech_id:     r.tech_id     || '',
      unit_type:   r.unit_type   || 'SPLIT',
      problem:     r.problem     || '',
      call_time:   r.call_time   || '',
      attend_time: r.attend_time || '',
      done_time:   r.done_time   || '',
      parts_used:  r.parts_used  || '',
      cost:        String(r.cost || 0),
      status:      r.status      || 'Open',
      notes:       r.notes       || '',
      customer:    r.customer    || '',
      section:     r.section     || '',
      equipment:   r.equipment   || '',
      model:       r.model       || '',
      serial_no:   r.serial_no   || '',
      complaint:   r.complaint   || '',
    })
    setEditId(r.id)
    setModal(true)
  }

  const save = async () => {
    if (!form.report_no?.trim()) { alert('رقم التقرير مطلوب'); return }
    setSaving(true)
    const payload = {
      report_no:   form.report_no.trim(),
      report_date: form.report_date || null,
      client_id:   form.client_id   || null,
      tech_id:     form.tech_id     || null,
      unit_type:   form.unit_type   || null,
      problem:     form.problem     || null,
      call_time:   form.call_time   || null,
      attend_time: form.attend_time || null,
      done_time:   form.done_time   || null,
      parts_used:  form.parts_used  || null,
      cost:        parseFloat(form.cost) || 0,
      status:      form.status      || 'Open',
      notes:       form.notes       || null,
      customer:    form.customer    || null,
      section:     form.section     || null,
      equipment:   form.equipment   || null,
      model:       form.model       || null,
      serial_no:   form.serial_no   || null,
      complaint:   form.complaint   || null,
    }
    const { error } = editId
      ? await supabase.from('maint_reports').update(payload).eq('id', editId)
      : await supabase.from('maint_reports').insert(payload)
    setSaving(false)
    if (error) { alert('خطأ: ' + error.message); return }
    setModal(false)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا التقرير؟')) return
    await supabase.from('maint_reports').delete().eq('id', id)
    load()
  }

  const printReport = (r: any) => {
    const clientName = r.clients?.company_name || r.customer || '—'
    const techName   = r.technicians?.full_name || '—'
    const w = window.open('', '_blank')!
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8">
      <title>تقرير صيانة ${r.report_no}</title>
      <style>
        body{font-family:'Tajawal',Arial,sans-serif;padding:30px;color:#222;direction:rtl}
        h2{color:#1E9CD7;border-bottom:2px solid #1E9CD7;padding-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:8px 12px;text-align:right}
        th{background:#f0f4f8;font-weight:600}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px}
        .open{background:#dbeafe;color:#1d4ed8}
        .inprog{background:#fef3c7;color:#d97706}
        .done{background:#d1fae5;color:#065f46}
        @media print{button{display:none}}
      </style></head><body>
      <h2>تقرير صيانة — ${r.report_no}</h2>
      <table>
        <tr><th>رقم التقرير</th><td>${r.report_no}</td><th>التاريخ</th><td>${r.report_date||'—'}</td></tr>
        <tr><th>العميل</th><td>${clientName}</td><th>الفني</th><td>${techName}</td></tr>
        <tr><th>نوع الوحدة</th><td>${r.unit_type||'—'}</td><th>الحالة</th>
            <td><span class="badge ${r.status==='Open'?'open':r.status==='In Progress'?'inprog':'done'}">${STATUS_AR[r.status]||r.status}</span></td></tr>
        <tr><th>المشكلة</th><td colspan="3">${r.problem||'—'}</td></tr>
        <tr><th>الشكوى</th><td colspan="3">${r.complaint||'—'}</td></tr>
        <tr><th>القطع المستخدمة</th><td colspan="3">${r.parts_used||'—'}</td></tr>
        <tr><th>التكلفة</th><td>${Number(r.cost||0).toFixed(2)} ر.س</td><th>القسم</th><td>${r.section||'—'}</td></tr>
        <tr><th>وقت الاتصال</th><td>${r.call_time||'—'}</td><th>وقت الوصول</th><td>${r.attend_time||'—'}</td></tr>
        <tr><th>ملاحظات</th><td colspan="3">${r.notes||'—'}</td></tr>
      </table>
      <br><button onclick="window.print()">🖨 طباعة</button>
      </body></html>
    `)
    w.document.close()
  }

  const f = (r: any, key: string) => r[key] || r.clients?.company_name || r.technicians?.full_name || '—'

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (
      (r.report_no || '').toLowerCase().includes(q) ||
      (r.clients?.company_name || '').toLowerCase().includes(q) ||
      (r.problem || '').toLowerCase().includes(q) ||
      (r.customer || '').toLowerCase().includes(q)
    )
  })

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">تقارير الصيانة</h1>
          <p className="page-subtitle">{rows.length} تقرير</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16}/> طباعة
          </button>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16}/> + تقرير جديد
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom:20 }}>
        <Search size={16} style={{ color:'var(--cs-text-muted)', flexShrink:0 }}/>
        <input
          className="search-input"
          placeholder="بحث برقم التقرير أو العميل أو المشكلة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {/* ✅ 9 headers — must match 9 data cells below exactly */}
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
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:40 }}>
                <div className="loading-spinner"/>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--cs-text-muted)' }}>
                لا توجد تقارير
              </td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                {/* ✅ cell 1 — رقم التقرير */}
                <td style={{ fontWeight:700, color:'var(--cs-blue)' }}>
                  {r.report_no || '—'}
                </td>
                {/* ✅ cell 2 — التاريخ */}
                <td style={{ fontSize:13, color:'var(--cs-text-muted)' }}>
                  {r.report_date || '—'}
                </td>
                {/* ✅ cell 3 — العميل */}
                <td style={{ fontWeight:600 }}>
                  {r.clients?.company_name || r.customer || '—'}
                </td>
                {/* ✅ cell 4 — الفني */}
                <td>
                  {r.technicians?.full_name || '—'}
                </td>
                {/* ✅ cell 5 — نوع الوحدة */}
                <td>
                  <span className="badge badge-gray">{r.unit_type || '—'}</span>
                </td>
                {/* ✅ cell 6 — المشكلة */}
                <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {r.problem || '—'}
                </td>
                {/* ✅ cell 7 — التكلفة */}
                <td style={{ fontWeight:600, color:'var(--cs-text)' }}>
                  {Number(r.cost || 0).toFixed(2)} ر.س
                </td>
                {/* ✅ cell 8 — الحالة */}
                <td>
                  <span className={`badge ${STATUS_C[r.status] || 'badge-gray'}`}>
                    {STATUS_AR[r.status] || r.status || '—'}
                  </span>
                </td>
                {/* ✅ cell 9 — إجراءات */}
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="icon-btn" onClick={() => setViewItem(r)} title="عرض">
                      <Eye size={15}/>
                    </button>
                    <button className="icon-btn" onClick={() => openEdit(r)} title="تعديل">
                      <Edit2 size={15}/>
                    </button>
                    <button className="icon-btn icon-btn-danger" onClick={() => del(r.id)} title="حذف">
                      <Trash2 size={15}/>
                    </button>
                    <button className="icon-btn" onClick={() => printReport(r)} title="طباعة">
                      <Printer size={15}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-box" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تقرير — {viewItem.report_no}</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}><X size={18}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8 }}>
              {[
                { l:'رقم التقرير',   v: viewItem.report_no },
                { l:'التاريخ',       v: viewItem.report_date },
                { l:'العميل',        v: viewItem.clients?.company_name || viewItem.customer },
                { l:'الفني',         v: viewItem.technicians?.full_name },
                { l:'نوع الوحدة',    v: viewItem.unit_type },
                { l:'الحالة',        v: STATUS_AR[viewItem.status] || viewItem.status },
                { l:'المشكلة',       v: viewItem.problem },
                { l:'التكلفة',       v: Number(viewItem.cost||0).toFixed(2) + ' ر.س' },
                { l:'القسم',         v: viewItem.section },
                { l:'المعدة',        v: viewItem.equipment },
                { l:'الموديل',       v: viewItem.model },
                { l:'الرقم التسلسلي',v: viewItem.serial_no },
                { l:'وقت الاتصال',   v: viewItem.call_time },
                { l:'وقت الوصول',    v: viewItem.attend_time },
                { l:'وقت الانتهاء',  v: viewItem.done_time },
                { l:'القطع المستخدمة',v: viewItem.parts_used },
              ].map(({ l, v }) => (
                <div key={l} style={{ background:'var(--cs-gray-light)', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:3 }}>{l}</div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{v || '—'}</div>
                </div>
              ))}
              {viewItem.complaint && (
                <div style={{ gridColumn:'1/-1', background:'var(--cs-gray-light)', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:3 }}>الشكوى</div>
                  <div style={{ fontSize:14 }}>{viewItem.complaint}</div>
                </div>
              )}
              {viewItem.notes && (
                <div style={{ gridColumn:'1/-1', background:'var(--cs-gray-light)', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ fontSize:11, color:'var(--cs-text-muted)', marginBottom:3 }}>ملاحظات</div>
                  <div style={{ fontSize:14 }}>{viewItem.notes}</div>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => printReport(viewItem)}>
                <Printer size={15}/> طباعة
              </button>
              <button className="btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}>
                <Edit2 size={15}/> تعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ maxWidth:700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'تعديل تقرير' : 'تقرير صيانة جديد'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18}/></button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:8 }}>
              {/* Row 1 */}
              <div>
                <label className="form-label">رقم التقرير *</label>
                <input className="form-input" value={form.report_no} onChange={e => set('report_no', e.target.value)} placeholder="MR-1001"/>
              </div>
              <div>
                <label className="form-label">التاريخ</label>
                <input type="date" className="form-input" value={form.report_date} onChange={e => set('report_date', e.target.value)}/>
              </div>

              {/* Row 2 */}
              <div>
                <label className="form-label">العميل</label>
                <select className="form-input" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                  <option value="">-- اختر العميل --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الفني</label>
                <select className="form-input" value={form.tech_id} onChange={e => set('tech_id', e.target.value)}>
                  <option value="">-- اختر الفني --</option>
                  {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              {/* Row 3 */}
              <div>
                <label className="form-label">نوع الوحدة</label>
                <select className="form-input" value={form.unit_type} onChange={e => set('unit_type', e.target.value)}>
                  {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">المشكلة / Problem</label>
                <select className="form-input" value={form.problem} onChange={e => set('problem', e.target.value)}>
                  <option value="">-- اختر المشكلة --</option>
                  {PROBLEMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Row 4 */}
              <div>
                <label className="form-label">الحالة</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">التكلفة (ر.س)</label>
                <input type="number" className="form-input" value={form.cost} onChange={e => set('cost', e.target.value)} min={0}/>
              </div>

              {/* Row 5 — Times */}
              <div>
                <label className="form-label">وقت الاتصال</label>
                <input type="time" className="form-input" value={form.call_time} onChange={e => set('call_time', e.target.value)}/>
              </div>
              <div>
                <label className="form-label">وقت الوصول</label>
                <input type="time" className="form-input" value={form.attend_time} onChange={e => set('attend_time', e.target.value)}/>
              </div>

              {/* Row 6 */}
              <div>
                <label className="form-label">وقت الانتهاء</label>
                <input type="time" className="form-input" value={form.done_time} onChange={e => set('done_time', e.target.value)}/>
              </div>
              <div>
                <label className="form-label">القسم / Section</label>
                <input className="form-input" value={form.section} onChange={e => set('section', e.target.value)}/>
              </div>

              {/* Row 7 */}
              <div>
                <label className="form-label">المعدة / Equipment</label>
                <input className="form-input" value={form.equipment} onChange={e => set('equipment', e.target.value)}/>
              </div>
              <div>
                <label className="form-label">الموديل / Model</label>
                <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)}/>
              </div>

              {/* Row 8 — Full width */}
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">القطع المستخدمة</label>
                <input className="form-input" value={form.parts_used} onChange={e => set('parts_used', e.target.value)} placeholder="فلتر، غاز R410A ..."/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">الشكوى</label>
                <textarea className="form-input" rows={2} value={form.complaint} onChange={e => set('complaint', e.target.value)}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}/>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                <Save size={15}/> {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
