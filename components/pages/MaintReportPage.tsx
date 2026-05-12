'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save, Printer } from 'lucide-react'

const UNIT_TYPES = ['SPLIT','D.SPLIT','PACKAGED','VRF','CHILLER','FCU','AHU','أخرى']
const PROBLEMS = [
  'COMP.NOT WORK','COIL LEAK','FAN BLOWER','BCP','COPMP.WIRE','COMP.WEAK','COMP.F',
  'LEAK COPPER PIPE','CON.LEAK','DRAIN LEAK','BLOWER FAN M','OUT FAN M',
  'COPPER PIPE INSULATION','DUCT INSULATION','CAPACITOR','PCP','REMOT',
  'EXP.VALVE','TXP.VALVE','FILL FERION'
]

const UNITS_LIST = (() => {
  const list:string[] = []
  for(let bldg=1; bldg<=6; bldg++) {
    for(const wing of ['A','B']) {
      for(let floor=1; floor<=4; floor++) {
        for(let unit=1; unit<=3; unit++) {
          list.push(`${bldg}${wing}-${floor}0${unit}`)
        }
      }
      list.push(`${bldg}${wing}-501`)
      list.push(`${bldg}${wing}-601`)
    }
  }
  for(let i=1; i<=6; i++) list.push(`RB${i}`)
  for(let i=1; i<=6; i++) list.push(`GRDB${i}`)
  return list
})()

const STATUSES=['Open','In Progress','Completed']
const STATUS_AR:any={Open:'مفتوح','In Progress':'جاري',Completed:'مكتمل'}
const STATUS_C:any={Open:'badge-blue','In Progress':'badge-amber',Completed:'badge-green'}

// ✅ إضافة unit_no لـ newForm
const newForm=()=>({
  report_no:`MS-${10280+Math.floor(Date.now()/1000)%9000}` as string,
  report_date:new Date().toISOString().split('T')[0],
  client_id:'',tech_id:'',customer:'',section:'',
  unit_no:'',  // ✅ FIX 1: أضفنا unit_no
  unit_type:'SPLIT',equipment:'',model:'',serial_no:'',
  complaint:'',problem:'',call_time:'',attend_time:'',done_time:'',
  parts_used:'',cost:'0',status:'Open',notes:''
})

const generateCode = (rows: any[]) => {
  if(!rows.length) return 'MS-10280'
  const nums = rows
    .map((r:any) => r.report_no?.replace('MS-',''))
    .filter(Boolean)
    .map((n:string) => parseInt(n.replace(/\D/g,'')))
    .filter((n:number) => !isNaN(n))
  if(!nums.length) return 'MS-10280'
  return 'MS-' + (Math.max(...nums) + 1)
}

export default function MaintReportPage() {
  const [rows,setRows]=useState<any[]>([])
  const [clients,setClients]=useState<any[]>([])
  const [techs,setTechs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [form,setForm]=useState<any>(newForm())
  const [viewItem,setViewItem]=useState<any>(null)

  const load=async()=>{
    setLoading(true)
    const [{data:r},{data:c},{data:t}]=await Promise.all([
      supabase.from('maint_reports').select('*,clients(company_name),technicians(full_name)').order('report_date',{ascending:false,nullsFirst:false}),
      supabase.from('clients').select('id,company_name'),
      supabase.from('technicians').select('id,full_name').eq('status','Active'),
    ])
    setRows(r||[]); setClients(c||[]); setTechs(t||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const openEdit=(r:any)=>{
    setForm({
      report_no:r.report_no||'',report_date:r.report_date?.split('T')[0]||'',
      client_id:r.client_id||'',tech_id:r.tech_id||'',
      customer:r.customer||'',section:r.section||'',
      unit_no:r.unit_no||'',  // ✅ FIX 2: أضفنا unit_no
      unit_type:r.unit_type||'SPLIT',equipment:r.equipment||'',
      model:r.model||'',serial_no:r.serial_no||'',
      complaint:r.complaint||'',problem:r.problem||'',
      call_time:r.call_time||'',attend_time:r.attend_time||'',done_time:r.done_time||'',
      parts_used:r.parts_used||'',cost:String(r.cost||0),status:r.status||'Open',notes:r.notes||''
    })
    setEditId(r.id); setModal(true)
  }

  const save=async()=>{
    if(!form.report_no?.trim()) return alert('رقم التقرير مطلوب')
    setSaving(true)
    const payload={
      report_no:form.report_no.trim(), report_date:form.report_date||null,
      client_id:form.client_id||null, tech_id:form.tech_id||null,
      customer:form.customer||null, section:form.section||null,
      unit_no:form.unit_no||null,   // ✅ FIX 3: أضفنا unit_no للـ payload
      unit_type:form.unit_type||null, equipment:form.equipment||null,
      model:form.model||null, serial_no:form.serial_no||null,
      complaint:form.complaint||null, problem:form.problem||null,
      call_time:form.call_time||null, attend_time:form.attend_time||null,
      done_time:form.done_time||null, parts_used:form.parts_used||null,
      cost:parseFloat(form.cost)||0, status:form.status||'Open', notes:form.notes||null,
    }
    const {error}=editId
      ? await supabase.from('maint_reports').update(payload).eq('id',editId)
      : await supabase.from('maint_reports').insert(payload)
    if(error) alert('خطأ: '+error.message)
    else{setModal(false);load()}
    setSaving(false)
  }

  const del=async(id:string)=>{if(!confirm('حذف؟'))return;await supabase.from('maint_reports').delete().eq('id',id);load()}
  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered=rows.filter(r=>r.report_no?.includes(search)||r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())||r.technicians?.full_name?.toLowerCase().includes(search.toLowerCase())||r.problem?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">تقارير الصيانة</div><div className="page-subtitle">{rows.length} تقرير</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600}}><Printer size={15}/>طباعة</button>
          <button className="btn-primary" onClick={()=>{setForm({...newForm(),report_no:generateCode(rows)});setEditId(null);setModal(true)}}><Plus size={16}/>تقرير جديد</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث برقم التقرير أو العميل أو المشكلة..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>
      <div className="card">
        {loading?<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>:(
          <div className="table-wrap"><table>
            <thead><tr>
              <th>رقم التقرير</th>
              <th>التاريخ</th>
              <th>العميل</th>
              <th>الفني</th>
              <th>الوحدة السكنية</th>{/* ✅ FIX 4: هذا الـ header كان ناقصاً */}
              <th>نوع الوحدة</th>
              <th>المشكلة</th>
              <th>التكلفة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد تقارير</td></tr>
              :filtered.map(r=>(
                <tr key={r.id}>
                  <td><span style={{fontFamily:'monospace',background:'var(--cs-blue-light)',padding:'2px 8px',borderRadius:4,fontSize:12}}>{r.report_no}</span></td>
                  <td style={{fontSize:12}}>{r.report_date?.split('T')[0]||'—'}</td>
                  <td style={{fontWeight:600}}>{r.clients?.company_name||r.customer||'—'}</td>
                  <td>{r.technicians?.full_name||'—'}</td>
                  <td style={{fontWeight:600,fontSize:12}}>{r.unit_no||'—'}</td>
                  <td><span className="badge badge-gray">{r.unit_type||'—'}</span></td>
                  <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>{r.problem||'—'}</td>
                  <td style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(r.cost)} ر.س</td>
                  <td><span className={`badge ${STATUS_C[r.status]||'badge-gray'}`}>{STATUS_AR[r.status]||r.status}</span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setViewItem(r)} title="عرض وطباعة" style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-green)'}}><Printer size={14}/></button>
                    <button onClick={()=>openEdit(r)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-blue)'}}><Edit2 size={14}/></button>
                    <button onClick={()=>del(r.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--cs-red)'}}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {viewItem&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div id="mr-print" className="card" style={{width:'100%',maxWidth:600,maxHeight:'90vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>تقرير صيانة — {viewItem.report_no}</div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>window.print()} style={{background:'var(--cs-blue)',color:'white',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12}}><Printer size={13}/>طباعة</button>
                <button onClick={()=>setViewItem(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
              {[{l:'رقم التقرير',v:viewItem.report_no},{l:'التاريخ',v:viewItem.report_date?.split('T')[0]},{l:'العميل',v:viewItem.clients?.company_name||viewItem.customer},{l:'الفني',v:viewItem.technicians?.full_name},{l:'القسم',v:viewItem.section},{l:'الوحدة السكنية',v:viewItem.unit_no},{l:'نوع الوحدة',v:viewItem.unit_type},{l:'المعدة',v:viewItem.equipment},{l:'الموديل',v:viewItem.model},{l:'الرقم التسلسلي',v:viewItem.serial_no},{l:'الشكوى',v:viewItem.complaint},{l:'المشكلة',v:viewItem.problem},{l:'القطع المستخدمة',v:viewItem.parts_used},{l:'وقت البلاغ',v:viewItem.call_time},{l:'وقت الوصول',v:viewItem.attend_time},{l:'وقت الإنجاز',v:viewItem.done_time},{l:'التكلفة',v:viewItem.cost?fmt(viewItem.cost)+' ر.س':null},{l:'الحالة',v:STATUS_AR[viewItem.status]||viewItem.status},{l:'ملاحظات',v:viewItem.notes}].map(({l,v},i)=>(
                <div key={i} style={{padding:'7px 10px',borderBottom:'1px solid var(--cs-border)',borderLeft:i%2===0?'none':'1px solid var(--cs-border)'}}>
                  <span style={{fontSize:11,color:'var(--cs-text-muted)',display:'block',marginBottom:2}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:600}}>{v||'—'}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:20,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              {['توقيع الفني','توقيع المشرف','توقيع العميل'].map((l,i)=>(
                <div key={i} style={{textAlign:'center',borderTop:'2px solid var(--cs-border)',paddingTop:8,fontSize:11,color:'var(--cs-text-muted)',fontWeight:600}}>{l}</div>
              ))}
            </div>
          </div>
          <style>{`@media print{body *{visibility:hidden}#mr-print,#mr-print *{visibility:visible}#mr-print{position:fixed;top:0;left:0;width:100%;max-height:none!important}}`}</style>
        </div>
      )}

      {modal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="card" style={{width:'100%',maxWidth:620,maxHeight:'92vh',overflow:'auto',padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:18}}>{editId?'تعديل التقرير':'تقرير صيانة جديد'}</div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label className="form-label">رقم التقرير *</label><input className="form-input" placeholder="MR-001" value={form.report_no} onChange={e=>setForm({...form,report_no:e.target.value})}/></div>
              <div><label className="form-label">التاريخ</label><input type="date" className="form-input" value={form.report_date} onChange={e=>setForm({...form,report_date:e.target.value})}/></div>
              <div><label className="form-label">العميل</label><select className="form-input" value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value,customer:clients.find(c=>c.id===e.target.value)?.company_name||form.customer})}><option value="">— اختر —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label className="form-label">الفني</label><select className="form-input" value={form.tech_id} onChange={e=>setForm({...form,tech_id:e.target.value})}><option value="">— اختر —</option>{techs.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
              <div><label className="form-label">القسم / الموقع</label><input className="form-input" value={form.section} onChange={e=>setForm({...form,section:e.target.value})}/></div>
              <div><label className="form-label">الوحدة السكنية</label><input className="form-input" list="units-list" placeholder="اختر أو اكتب..." value={form.unit_no||''} onChange={e=>setForm({...form,unit_no:e.target.value})}/><datalist id="units-list">{UNITS_LIST.map(u=><option key={u} value={u}/>)}</datalist></div>
              <div><label className="form-label">نوع الوحدة</label><select className="form-input" value={form.unit_type} onChange={e=>setForm({...form,unit_type:e.target.value})}>{UNIT_TYPES.map(u=><option key={u}>{u}</option>)}</select></div>
              <div><label className="form-label">المعدة / Equipment</label><input className="form-input" value={form.equipment} onChange={e=>setForm({...form,equipment:e.target.value})}/></div>
              <div><label className="form-label">الموديل</label><input className="form-input" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
              <div><label className="form-label">الرقم التسلسلي</label><input className="form-input" dir="ltr" value={form.serial_no} onChange={e=>setForm({...form,serial_no:e.target.value})}/></div>
              <div><label className="form-label">الحالة</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{STATUS_AR[s]}</option>)}</select></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">الشكوى / Complaint</label><input className="form-input" value={form.complaint} onChange={e=>setForm({...form,complaint:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="form-label">المشكلة / Problem ▾</label>
                <select className="form-input" value={form.problem} onChange={e=>setForm({...form,problem:e.target.value})}>
                  <option value="">— اختر المشكلة —</option>
                  {PROBLEMS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="form-label">وقت البلاغ</label><input type="time" className="form-input" value={form.call_time} onChange={e=>setForm({...form,call_time:e.target.value})}/></div>
              <div><label className="form-label">وقت الوصول</label><input type="time" className="form-input" value={form.attend_time} onChange={e=>setForm({...form,attend_time:e.target.value})}/></div>
              <div><label className="form-label">وقت الإنجاز</label><input type="time" className="form-input" value={form.done_time} onChange={e=>setForm({...form,done_time:e.target.value})}/></div>
              <div><label className="form-label">التكلفة (ر.س)</label><input type="number" min="0" className="form-input" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="form-label">القطع المستخدمة</label><input className="form-input" value={form.parts_used} onChange={e=>setForm({...form,parts_used:e.target.value})}/></div>
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
