'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'

const UNIT_TYPES = ['Split','D.Split','Packaged','VRF','Chiller','FCU','AHU','Cassette','Window','أخرى']
const BRANDS = ['Samsung','LG','Daikin','Mitsubishi','Carrier','York','Trane','Gree','Midea','أخرى']
const STATUSES = ['Active','Under Maintenance','Inactive','Decommissioned']
const STATUS_AR: any = { Active:'نشطة', 'Under Maintenance':'صيانة', Inactive:'متوقفة', Decommissioned:'مسحوبة' }
const EMPTY = { asset_code:'', unit_no:'', client_id:'', location:'', unit_type:'Split', brand:'', model:'', serial_no:'', install_date:'', status:'Active', last_maintenance:'', notes:'' }

export default function EquipmentPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('equipment_assets').select('*, clients(company_name)').order('created_at',{ascending:false}),
      supabase.from('clients').select('id,company_name'),
    ])
    setRows(e||[]); setClients(c||[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const m = r.asset_code?.includes(search) || r.model?.toLowerCase().includes(search.toLowerCase()) || r.serial_no?.includes(search) || r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())
    const c = !filterClient || r.client_id === filterClient
    return m && c
  })

  const daysToWarranty = (d:string) => { if(!d)return null; return Math.ceil((new Date(d).getTime()-Date.now())/86400000) }

  const save = async () => {
    if (!form.asset_code) return alert('كود الأصل مطلوب')
    setSaving(true)
    const payload = { ...form, client_id: form.client_id||null }
    if (editId) await supabase.from('equipment_assets').update(payload).eq('id', editId)
    else await supabase.from('equipment_assets').insert(payload)
    setSaving(false); setModal(false); load()
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('equipment_assets').delete().eq('id',id); load() }

  const statusC: any = { Active:'badge-green', 'Under Maintenance':'badge-amber', Inactive:'badge-gray', Decommissioned:'badge-red' }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">سجل المعدات المركّبة</div><div className="page-subtitle">{rows.length} وحدة</div></div>
        <button className="btn-primary" onClick={()=>{setForm(EMPTY);setEditId(null);setModal(true)}}><Plus size={16}/>إضافة معدة</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي الوحدات',v:rows.length,c:'var(--cs-blue)'},{l:'نشطة',v:rows.filter(r=>r.status==='Active').length,c:'var(--cs-green)'},{l:'صيانة',v:rows.filter(r=>r.status==='Under Maintenance').length,c:'var(--cs-orange)'}].map((s,i)=>
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
        )}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{display:'flex',gap:10}}>
          <div style={{position:'relative',flex:1}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالكود أو الموديل أو الرقم التسلسلي..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="form-input" style={{width:160}} value={filterClient} onChange={e=>setFilterClient(e.target.value)}><option value="">كل العملاء</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>رقم الوحدة</th><th>العميل</th><th>الموقع</th><th>النوع</th><th>الماركة/الموديل</th><th>الرقم التسلسلي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد معدات</td></tr>
              : filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{fontFamily:'monospace',fontSize:12}}>{r.asset_code}</td>
                  <td>{r.unit_no}</td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name}</td>
                  <td style={{fontSize:12}}>{r.location}</td>
                  <td><span className="badge badge-blue">{r.unit_type}</span></td>
                  <td>{r.brand} {r.model}</td>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{r.serial_no}</td>
                  <td><span className={`badge ${statusC[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setForm({...r,client_id:r.client_id||''});setEditId(r.id);setModal(true)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل المعدة':'معدة جديدة'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">كود الأصل *</label><input className="form-input" placeholder="AST-001" value={form.asset_code||''} onChange={e=>setForm({...form,asset_code:e.target.value})}/></div>
              <div><label className="form-label">رقم الوحدة</label><input className="form-input" value={form.unit_no||''} onChange={e=>setForm({...form,unit_no:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">اختر...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الموقع</label><input className="form-input" value={form.location||''} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div><label className="form-label">نوع الوحدة</label><select className="form-input" value={form.unit_type||'Split'} onChange={e=>setForm({...form,unit_type:e.target.value})}>{UNIT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">الماركة</label><select className="form-input" value={form.brand||''} onChange={e=>setForm({...form,brand:e.target.value})}><option value="">اختر...</option>{BRANDS.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model||''} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">الرقم التسلسلي</label><input className="form-input" dir="ltr" value={form.serial_no||''} onChange={e=>setForm({...form,serial_no:e.target.value})}/></div>
              <div><label className="form-label">تاريخ التركيب</label><input type="date" className="form-input" value={form.install_date||''} onChange={e=>setForm({...form,install_date:e.target.value})}/></div>
              <div><label className="form-label">آخر صيانة</label><input type="date" className="form-input" value={form.last_maintenance||''} onChange={e=>setForm({...form,last_maintenance:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status||'Active'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]||s}</option>)}</select></div>
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
