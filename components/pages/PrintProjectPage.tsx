'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, Search } from 'lucide-react'

export default function PrintProjectPage() {
  const [projects,setProjects] = useState<any[]>([])
  const [selectedId,setSelectedId] = useState('')
  const [project,setProject] = useState<any>(null)
  const [invoices,setInvoices] = useState<any[]>([])
  const [checklists,setChecklists] = useState<any[]>([])
  const [loading,setLoading] = useState(false)
  const [search,setSearch] = useState('')

  useEffect(()=>{
    supabase.from('projects').select('id,project_code,project_name').order('project_name').then(({data})=>setProjects(data||[]))
  },[])

  useEffect(()=>{
    if(!selectedId) return
    setLoading(true)
    Promise.all([
      supabase.from('projects').select('*,clients(company_name,phone,email,city),technicians(full_name,specialty,phone)').eq('id',selectedId).single(),
      supabase.from('invoices').select('invoice_code,amount,total_amount,paid_amount,status,invoice_date').eq('project_id',selectedId),
      supabase.from('job_checklists').select('*').eq('project_id',selectedId).limit(1).maybeSingle(),
    ]).then(([{data:p},{data:inv},{data:cl}])=>{
      setProject(p); setInvoices(inv||[]); setChecklists(cl?.items ? Object.entries(cl.items) : [])
      setLoading(false)
    })
  },[selectedId])

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered = projects.filter(p=>p.project_name?.toLowerCase().includes(search.toLowerCase())||p.project_code?.includes(search))
  const totalInvoiced = invoices.reduce((s,i)=>s+(i.total_amount||0),0)
  const totalPaid = invoices.reduce((s,i)=>s+(i.paid_amount||0),0)
  const profit = (project?.budget||0) - (project?.actual_cost||0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">طباعة أمر المشروع</div><div className="page-subtitle">Print Project Work Order</div></div>
        {project&&<button className="btn-primary" onClick={()=>window.print()}><Printer size={16}/>طباعة</button>}
      </div>

      {/* Project selector */}
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{position:'relative',flex:1,maxWidth:400}}>
            <Search size={15} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/>
            <input className="form-input" style={{paddingRight:32}} placeholder="بحث بالمشروع..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-input" style={{flex:1,maxWidth:320}} value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
            <option value="">— اختر مشروعاً —</option>
            {filtered.map(p=><option key={p.id} value={p.id}>{p.project_code ? `${p.project_code} — ` : ''}{p.project_name}</option>)}
          </select>
        </div>
      </div>

      {loading&&<div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div>}

      {project&&!loading&&(
        <div id="print-area" style={{background:'white',borderRadius:12,border:'1px solid var(--cs-border)',overflow:'hidden'}}>
          {/* Header */}
          <div style={{background:'var(--cs-blue)',color:'white',padding:'20px 28px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:20}}>COOL SEASONS & DARAJA.STORE</div>
              <div style={{fontSize:12,opacity:0.85,marginTop:2}}>المملكة العربية السعودية — للتكييف والتبريد</div>
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:800,fontSize:18}}>أمر المشروع</div>
              <div style={{fontSize:12,opacity:0.85}}>Project Work Order</div>
              <div style={{fontSize:14,fontWeight:700,marginTop:4,background:'rgba(255,255,255,0.2)',padding:'2px 10px',borderRadius:20}}>{project.project_code||'—'}</div>
            </div>
          </div>

          <div style={{padding:'24px 28px'}}>
            {/* Section A: Project Info */}
            <div style={{marginBottom:20}}>
              <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 14px',fontSize:13,fontWeight:700,color:'var(--cs-blue)',marginBottom:12}}>أ — بيانات المشروع / Project Information</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  {l:'اسم المشروع / Name',v:project.project_name},
                  {l:'نوع المشروع / Type',v:project.project_type||'—'},
                  {l:'العميل / Client',v:project.clients?.company_name||'—'},
                  {l:'المدينة / City',v:project.clients?.city||'—'},
                  {l:'الفني المسؤول / Tech',v:project.technicians?.full_name||'—'},
                  {l:'التخصص / Specialty',v:project.technicians?.specialty||'—'},
                  {l:'تاريخ البدء / Start',v:project.start_date?.split('T')[0]||'—'},
                  {l:'تاريخ الانتهاء / End',v:project.end_date?.split('T')[0]||'—'},
                  {l:'الحالة / Status',v:project.status||'—'},
                  {l:'الموقع / Location',v:project.location||'—'},
                ].map(({l,v},i)=>(
                  <div key={i} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid var(--cs-border)'}}>
                    <span style={{color:'var(--cs-text-muted)',fontSize:12,minWidth:160}}>{l}:</span>
                    <span style={{fontWeight:600,fontSize:13}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section B: Financial */}
            <div style={{marginBottom:20}}>
              <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 14px',fontSize:13,fontWeight:700,color:'var(--cs-blue)',marginBottom:12}}>ب — الملف المالي / Financial Summary</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[
                  {l:'الميزانية / Budget',v:fmt(project.budget)+' ر.س',c:'var(--cs-blue)'},
                  {l:'التكلفة الفعلية / Actual',v:fmt(project.actual_cost)+' ر.س',c:'var(--cs-orange)'},
                  {l:'الفواتير / Invoiced',v:fmt(totalInvoiced)+' ر.س',c:'var(--cs-blue)'},
                  {l:'الربح / P&L',v:(profit>=0?'+':'')+fmt(profit)+' ر.س',c:profit>=0?'var(--cs-green)':'var(--cs-red)'},
                ].map(({l,v,c},i)=>(
                  <div key={i} style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'12px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:4}}>{l}</div>
                    <div style={{fontWeight:800,color:c,fontSize:16,fontFamily:'Cairo,sans-serif'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section C: Progress */}
            <div style={{marginBottom:20}}>
              <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 14px',fontSize:13,fontWeight:700,color:'var(--cs-blue)',marginBottom:12}}>ج — نسبة الإنجاز / Progress</div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{flex:1,background:'var(--cs-border)',borderRadius:8,height:24,overflow:'hidden'}}>
                  <div style={{width:`${project.completion_pct||0}%`,background:project.completion_pct===100?'var(--cs-green)':'var(--cs-blue)',height:24,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {(project.completion_pct||0)>=15&&<span style={{color:'white',fontWeight:700,fontSize:13}}>{project.completion_pct||0}%</span>}
                  </div>
                </div>
                <span style={{fontWeight:800,fontSize:22,color:project.completion_pct===100?'var(--cs-green)':'var(--cs-blue)',minWidth:60}}>{project.completion_pct||0}%</span>
              </div>
              {project.notes&&<div style={{marginTop:10,padding:'10px 14px',background:'#FFFBF0',borderRadius:8,fontSize:13,color:'var(--cs-text-muted)'}}>{project.notes}</div>}
            </div>

            {/* Section D: Invoices */}
            {invoices.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 14px',fontSize:13,fontWeight:700,color:'var(--cs-blue)',marginBottom:12}}>د — الفواتير / Invoices</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:'var(--cs-gray-light)'}}>
                    {['رقم الفاتورة','التاريخ','المبلغ','الإجمالي+VAT','المدفوع','الرصيد','الحالة'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'right',fontWeight:700,borderBottom:'1px solid var(--cs-border)'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {invoices.map((inv,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--cs-border)'}}>
                        <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{inv.invoice_code}</td>
                        <td style={{padding:'6px 10px'}}>{inv.invoice_date?.split('T')[0]}</td>
                        <td style={{padding:'6px 10px'}}>{fmt(inv.amount)}</td>
                        <td style={{padding:'6px 10px',fontWeight:700}}>{fmt(inv.total_amount)}</td>
                        <td style={{padding:'6px 10px',color:'var(--cs-green)'}}>{fmt(inv.paid_amount)}</td>
                        <td style={{padding:'6px 10px',color:'var(--cs-red)',fontWeight:700}}>{fmt((inv.total_amount||0)-(inv.paid_amount||0))}</td>
                        <td style={{padding:'6px 10px'}}><span className={`badge ${inv.status==='Paid'?'badge-green':inv.status==='Overdue'?'badge-red':'badge-amber'}`} style={{fontSize:10}}>{inv.status}</span></td>
                      </tr>
                    ))}
                    <tr style={{background:'var(--cs-gray-light)',fontWeight:700}}>
                      <td colSpan={4} style={{padding:'8px 10px',textAlign:'left'}}>الإجمالي</td>
                      <td style={{padding:'8px 10px',color:'var(--cs-green)'}}>{fmt(totalPaid)}</td>
                      <td style={{padding:'8px 10px',color:'var(--cs-red)'}}>{fmt(totalInvoiced-totalPaid)}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Section E: Checklist */}
            {checklists.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{background:'var(--cs-gray-light)',borderRadius:8,padding:'6px 14px',fontSize:13,fontWeight:700,color:'var(--cs-blue)',marginBottom:12}}>هـ — قائمة الفحص / Job Checklist</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {checklists.map(([item,status],i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',background:status==='Completed'?'#F0FFF4':'#FFF',border:'1px solid var(--cs-border)',borderRadius:6}}>
                      <span style={{fontSize:16}}>{status==='Completed'?'✅':'⬜'}</span>
                      <span style={{fontSize:11,color:status==='Completed'?'var(--cs-green)':'var(--cs-text)'}}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div style={{marginTop:32,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20}}>
              {['مدير المشروع / PM','الفني المنفذ / Tech','العميل / Client'].map((label,i)=>(
                <div key={i} style={{textAlign:'center'}}>
                  <div style={{borderTop:'2px solid var(--cs-border)',paddingTop:8,fontSize:12,color:'var(--cs-text-muted)',fontWeight:600}}>{label}</div>
                  <div style={{fontSize:11,color:'var(--cs-border)',marginTop:4}}>التوقيع والتاريخ</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .btn-primary, .card:not(#print-area) { display: none !important; }
        }
      `}</style>
    </div>
  )
}
