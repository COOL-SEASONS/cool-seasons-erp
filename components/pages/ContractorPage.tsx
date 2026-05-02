'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer} from 'lucide-react'

const SPECIALTIES = ['أعمال كهربائية','أعمال مدنية','دهانات','سباكة','نجارة','تكييف فرعي','ميكانيكا','عزل','أخرى']
const PAYMENT_METHODS = ['شهري','دفعة واحدة','حسب الإنجاز','أسبوعي']
const newForm = () => ({
  contractor_code:`CCND-${11+Math.floor(Date.now()/1000)%9000}` as string, company_name:'', specialty:'', phone:'',
  cr_number:'', project_id:'', payment_method:'حسب الإنجاز',
  status:'نشط', contract_start:'', contract_end:'',
  contract_value:'0', paid_amount:'0', notes:''
})

  const generateCode = (rows: any[]) => {
    if(!rows.length) return 'CCND-11'
    const nums = rows
      .map((r:any) => r.contractor_code?.replace('CCND-',''))
      .filter(Boolean)
      .map((n:string) => parseInt(n.replace(/\D/g,'')))
      .filter((n:number) => !isNaN(n))
    if(!nums.length) return 'CCND-11'
    return 'CCND-' + (Math.max(...nums) + 1)
  }


export default function ContractorPage() {
  const [viewItem,setViewItem]=useState<any>(null)
  const [rows,setRows] = useState<any[]>([])
  const [projects,setProjects] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [search,setSearch] = useState('')
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)
  const [form,setForm] = useState<any>(newForm())

  const load = async () => {
    setLoading(true)
    const [{data:c},{data:p}] = await Promise.all([
      supabase.from('contractors').select('*,projects(project_name)').order('created_at',{ascending:false}),
      supabase.from('projects').select('id,project_name'),
    ])
    setRows(c||[]); setProjects(p||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit = (r:any) => {
    setForm({
      contractor_code:r.contractor_code||'',company_name:r.company_name||'',
      specialty:r.specialty||'',phone:r.phone||'',cr_number:r.cr_number||'',
      project_id:r.project_id||'',payment_method:r.payment_method||'حسب الإنجاز',
      status:r.status||'نشط',contract_start:r.contract_start||'',
      contract_end:r.contract_end||'',contract_value:String(r.contract_value||0),
      paid_amount:String(r.paid_amount||0),notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save = async () => {
    if(!form.contractor_code.trim()||!form.company_name.trim()){alert('الكود والاسم مطلوبان');return}
    setSaving(true)
    const payload = {
      contractor_code:form.contractor_code.trim(), company_name:form.company_name.trim(),
      specialty:form.specialty||null, phone:form.phone||null, cr_number:form.cr_number||null,
      project_id:form.project_id||null, payment_method:form.payment_method,
      status:form.status, contract_start:form.contract_start||null,
      contract_end:form.contract_end||null, contract_value:parseFloat(form.contract_value)||0,
      paid_amount:parseFloat(form.paid_amount)||0, notes:form.notes||null
    }
    const {error} = editId
      ? await supabase.from('contractors').update(payload).eq('id',editId)
      : await supabase.from('contractors').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else { setModal(false); load() }
    setSaving(false)
  }

  const del = async (id:string) => { if(!confirm('حذف؟'))return; await supabase.from('contractors').delete().eq('id',id); load() }
  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered = rows.filter(r=>r.company_name?.toLowerCase().includes(search.toLowerCase())||r.contractor_code?.includes(search))
  const totalPaid = rows.reduce((s,r)=>s+(r.paid_amount||0),0)
  const totalDue = rows.reduce((s,r)=>s+((r.contract_value||0)-(r.paid_amount||0)),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">إدارة المقاولين</div><div className="page-subtitle">{rows.length} مقاول</div></div>
        <button className="btn-primary" onClick={()=>{setForm({...newForm(),contractor_code:'CCND-'+(rows.length+11)});setEditId(null);setModal(true)}}><Plus size={16}/>مقاول جديد</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:20}}>
        {[{l:'إجمالي المقاولين',v:rows.length,c:'var(--cs-blue)'},{l:'نشطون',v:rows.filter(r=>r.status==='نشط').length,c:'var(--cs-green)'},{l:'إجمالي المدفوع',v:fmt(totalPaid)+' ر.س',c:'var(--cs-orange)'},{l:'المستحق',v:fmt(totalDue)+' ر.س',c:'var(--cs-red)'}].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:17,fontWeight:800,color:s.c}}>{s.v}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث باسم الشركة أو الكود..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr><th>الكود</th><th>الشركة</th><th>التخصص</th><th>المشروع</th><th>قيمة العقد</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد مقاولون</td></tr>
              :filtered.map(r=>{
                const balance = (r.contract_value||0)-(r.paid_amount||0)
                return (
                  <tr key={r.id}>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.contractor_code}</td>
                    <td style={{fontWeight:600}}>{r.company_name}</td>
                    <td>{r.specialty}</td>
                    <td style={{fontSize:12}}>{r.projects?.project_name||'—'}</td>
                    <td>{fmt(r.contract_value)} ر.س</td>
                    <td style={{color:'var(--cs-green)'}}>{fmt(r.paid_amount)} ر.س</td>
                    <td style={{color:balance>0?'var(--cs-red)':'var(--cs-green)',fontWeight:700}}>{fmt(balance)} ر.س</td>
                    <td><span className={`badge ${r.status==='نشط'?'badge-green':'badge-gray'}`}>{r.status}</span></td>
                    <td><div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={15}/></button>
                      <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={15}/></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>
      
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

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل':'مقاول جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">الكود *</label><input className="form-input" placeholder="CT-001" value={form.contractor_code} onChange={e=>setForm({...form,contractor_code:e.target.value})}/></div>
              <div><label className="form-label">اسم الشركة *</label><input className="form-input" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></div>
              <div><label className="form-label">التخصص</label><select className="form-input" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}><option value="">اختر...</option>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="form-label">الهاتف</label><input className="form-input" dir="ltr" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div><label className="form-label">السجل التجاري</label><input className="form-input" dir="ltr" value={form.cr_number} onChange={e=>setForm({...form,cr_number:e.target.value})}/></div>
              <div><label className="form-label">المشروع</label><select className="form-input" value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">— اختر —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select></div>
              <div><label className="form-label">طريقة الدفع</label><select className="form-input" value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="نشط">نشط</option><option value="غير نشط">غير نشط</option><option value="منتهي">منتهي</option></select></div>
              <div><label className="form-label">بداية العقد</label><input type="date" className="form-input" value={form.contract_start} onChange={e=>setForm({...form,contract_start:e.target.value})}/></div>
              <div><label className="form-label">نهاية العقد</label><input type="date" className="form-input" value={form.contract_end} onChange={e=>setForm({...form,contract_end:e.target.value})}/></div>
              <div><label className="form-label">قيمة العقد (ر.س)</label><input type="number" min="0" className="form-input" value={form.contract_value} onChange={e=>setForm({...form,contract_value:e.target.value})}/></div>
              <div><label className="form-label">المدفوع (ر.س)</label><input type="number" min="0" className="form-input" value={form.paid_amount} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1',background:'#E8F6FC',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>المتبقي:</span>
                <span style={{fontWeight:800,color:'var(--cs-red)',fontSize:15}}>{fmt((parseFloat(form.contract_value)||0)-(parseFloat(form.paid_amount)||0))} ر.س</span>
              </div>
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
