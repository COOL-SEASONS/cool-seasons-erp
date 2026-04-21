'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Phone, Mail, MapPin, Building2, FileText, Wrench, DollarSign } from 'lucide-react'

export default function ClientCardPage() {
  const [clients,setClients] = useState<any[]>([])
  const [selected,setSelected] = useState<any>(null)
  const [details,setDetails] = useState<any>({})
  const [search,setSearch] = useState('')
  const [loading,setLoading] = useState(true)
  const [loadingDetails,setLoadingDetails] = useState(false)

  useEffect(()=>{
    supabase.from('clients').select('id,company_name,contact_name,phone,email,city,status').order('company_name').then(({data})=>{ setClients(data||[]); setLoading(false) })
  },[])

  const loadClientDetails = async (client:any) => {
    setSelected(client); setLoadingDetails(true)
    const [
      {data:projects},{data:invoices},{data:maintenance},
      {data:contracts},{data:quotations},{data:followups}
    ] = await Promise.all([
      supabase.from('projects').select('project_name,status,completion_pct,budget').eq('client_id',client.id),
      supabase.from('invoices').select('invoice_code,total_amount,paid_amount,status,invoice_date').eq('client_id',client.id),
      supabase.from('maintenance').select('job_code,description,status,scheduled_date').eq('client_id',client.id).order('scheduled_date',{ascending:false}).limit(5),
      supabase.from('contracts_amc').select('contract_code,annual_value,status,end_date').eq('client_id',client.id),
      supabase.from('quotations').select('quote_code,amount,status,quote_date').eq('client_id',client.id).order('quote_date',{ascending:false}).limit(5),
      supabase.from('customer_followup').select('followup_code,rating,action_required,scheduled_date').eq('client_id',client.id).order('scheduled_date',{ascending:false}).limit(3),
    ])
    const totalInvoiced = (invoices||[]).reduce((s,i)=>s+(i.total_amount||0),0)
    const totalPaid = (invoices||[]).reduce((s,i)=>s+(i.paid_amount||0),0)
    setDetails({ projects:projects||[], invoices:invoices||[], maintenance:maintenance||[], contracts:contracts||[], quotations:quotations||[], followups:followups||[], totalInvoiced, totalPaid })
    setLoadingDetails(false)
  }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered = clients.filter(c=>c.company_name?.toLowerCase().includes(search.toLowerCase())||c.contact_name?.toLowerCase().includes(search.toLowerCase())||c.city?.includes(search))

  return (
    <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16,height:'calc(100vh - 120px)'}}>
      {/* Client list */}
      <div style={{display:'flex',flexDirection:'column',gap:0}}>
        <div className="card" style={{padding:'12px 14px',marginBottom:8}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:28,fontSize:13}} placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div className="card" style={{flex:1,overflow:'auto',padding:0}}>
          {loading?<div style={{padding:20,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>
          :filtered.map(c=>(
            <div key={c.id} onClick={()=>loadClientDetails(c)}
              style={{padding:'12px 14px',cursor:'pointer',borderBottom:'1px solid var(--cs-border)',
                background:selected?.id===c.id?'var(--cs-blue-light)':'white',
                borderRight:selected?.id===c.id?'3px solid var(--cs-blue)':'3px solid transparent',
                transition:'all 0.15s'}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{c.company_name}</div>
              <div style={{fontSize:11,color:'var(--cs-text-muted)'}}>{c.contact_name} {c.city?`— ${c.city}`:''}</div>
              <span style={{fontSize:10,background:c.status==='Active'?'#E8F8EF':'#F4F7FA',color:c.status==='Active'?'var(--cs-green)':'var(--cs-text-muted)',padding:'1px 6px',borderRadius:10,fontWeight:600}}>{c.status==='Active'?'نشط':'غير نشط'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Client details */}
      <div style={{overflow:'auto'}}>
        {!selected?(
          <div className="card" style={{padding:60,textAlign:'center',color:'var(--cs-text-muted)'}}>
            <Building2 size={48} style={{marginBottom:12,opacity:0.2}}/>
            <div style={{fontWeight:600}}>اختر عميلاً من القائمة</div>
          </div>
        ):loadingDetails?(
          <div className="card" style={{padding:60,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {/* Header */}
            <div className="card" style={{padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:22,marginBottom:6}}>{selected.company_name}</div>
                  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                    {selected.contact_name&&<span style={{fontSize:13,color:'var(--cs-text-muted)'}}>👤 {selected.contact_name}</span>}
                    {selected.phone&&<a href={`tel:${selected.phone}`} style={{fontSize:13,color:'var(--cs-blue)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><Phone size={13}/>{selected.phone}</a>}
                    {selected.email&&<a href={`mailto:${selected.email}`} style={{fontSize:13,color:'var(--cs-green)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><Mail size={13}/>{selected.email}</a>}
                    {selected.city&&<span style={{fontSize:13,color:'var(--cs-text-muted)',display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/>{selected.city}</span>}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {l:'إجمالي الفواتير',v:fmt(details.totalInvoiced)+' ر.س',c:'var(--cs-blue)'},
                    {l:'المحصّل',v:fmt(details.totalPaid)+' ر.س',c:'var(--cs-green)'},
                    {l:'مشاريع',v:details.projects.length,c:'var(--cs-orange)'},
                    {l:'عقود AMC',v:details.contracts.length,c:'var(--cs-blue)'},
                  ].map((s,i)=>(
                    <div key={i} style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'8px 12px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--cs-text-muted)',marginBottom:2}}>{s.l}</div>
                      <div style={{fontWeight:800,color:s.c,fontSize:14}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects */}
            {details.projects.length>0&&(
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><FileText size={16} color="var(--cs-blue)"/>المشاريع ({details.projects.length})</div>
                {details.projects.map((p:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<details.projects.length-1?'1px solid var(--cs-border)':'none'}}>
                    <span style={{fontWeight:600,fontSize:13}}>{p.project_name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:60,background:'var(--cs-border)',borderRadius:4,height:6}}><div style={{width:`${p.completion_pct||0}%`,background:'var(--cs-blue)',height:6,borderRadius:4}}/></div>
                      <span style={{fontSize:11,minWidth:30}}>{p.completion_pct||0}%</span>
                      <span className={`badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-blue':'badge-gray'}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Invoices */}
            {details.invoices.length>0&&(
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><DollarSign size={16} color="var(--cs-green)"/>الفواتير ({details.invoices.length})</div>
                {details.invoices.slice(0,5).map((inv:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<Math.min(4,details.invoices.length-1)?'1px solid var(--cs-border)':'none'}}>
                    <span style={{fontFamily:'monospace',fontSize:11,color:'var(--cs-text-muted)'}}>{inv.invoice_code}</span>
                    <span style={{fontWeight:700,color:'var(--cs-blue)'}}>{fmt(inv.total_amount)} ر.س</span>
                    <span className={`badge ${inv.status==='Paid'?'badge-green':inv.status==='Overdue'?'badge-red':'badge-amber'}`}>{inv.status==='Paid'?'مدفوعة':inv.status==='Overdue'?'متأخرة':'معلقة'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Maintenance */}
            {details.maintenance.length>0&&(
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><Wrench size={16} color="var(--cs-orange)"/>آخر طلبات الصيانة</div>
                {details.maintenance.map((m:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<details.maintenance.length-1?'1px solid var(--cs-border)':'none'}}>
                    <span style={{fontSize:13}}>{m.description}</span>
                    <span className={`badge ${m.status==='Completed'?'badge-green':m.status==='Open'?'badge-blue':'badge-amber'}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Followups */}
            {details.followups.length>0&&(
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,marginBottom:12}}>📞 آخر متابعات</div>
                {details.followups.map((f:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<details.followups.length-1?'1px solid var(--cs-border)':'none'}}>
                    <span style={{fontSize:12}}>{f.rating}</span>
                    <span style={{fontSize:11,color:'var(--cs-text-muted)'}}>{f.scheduled_date?.split('T')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
