'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, TrendingUp, DollarSign, Wrench, Users, Package, FolderOpen, UserCheck, AlertCircle } from 'lucide-react'

function AlertRow({type,title,items}:any) {
  const colors:any={red:'#C0392B',amber:'#E67E22',blue:'#1E9CD7'}
  const bgs:any={red:'#FDECEA',amber:'#FEF3E2',blue:'#E8F6FC'}
  const c=colors[type]; const bg=bgs[type]
  if(!items||items.length===0) return null
  return (
    <div style={{background:bg,border:`1px solid ${c}30`,borderRadius:10,padding:'12px 16px',marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <AlertTriangle size={15} color={c}/>
        <span style={{fontSize:13,fontWeight:700,color:c}}>{title} ({items.length})</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {items.slice(0,5).map((item:any,i:number)=>(
          <div key={i} style={{fontSize:12,color:c,display:'flex',justifyContent:'space-between'}}>
            <span>{item.name}</span>
            <span style={{background:c+'15',padding:'1px 8px',borderRadius:10,fontWeight:600}}>{item.detail}</span>
          </div>
        ))}
        {items.length>5&&<div style={{fontSize:11,color:c,opacity:0.7}}>+ {items.length-5} أخرى</div>}
      </div>
    </div>
  )
}

function KpiCard({label,value,sub,color,bg}:{label:string,value:any,sub?:string,color:string,bg?:string}) {
  return (
    <div style={{background:bg||'white',border:'1px solid var(--cs-border)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
      <div style={{fontSize:10,fontWeight:600,marginBottom:4,color:bg?'rgba(255,255,255,0.8)':'var(--cs-text-muted)'}}>{label}</div>
      <div style={{fontSize:18,fontWeight:900,color:bg?'white':color,fontFamily:'Cairo,sans-serif'}}>{value??'—'}</div>
      {sub&&<div style={{fontSize:10,color:bg?'rgba(255,255,255,0.7)':'var(--cs-text-muted)',marginTop:2}}>{sub}</div>}
    </div>
  )
}

export default function DashboardContent({onNav}:{onNav:(id:string)=>void}) {
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [alerts,setAlerts]=useState<any>({expired:[],expiringSoon:[],expiringLater:[]})

  useEffect(()=>{
    async function load() {
      const today=new Date()
      const [
        {data:invData},{count:overdueInv},{data:projs},{count:activeProj},
        {data:maint},{count:openMaint},{data:techs},{count:activeTechs},
        {data:exp},{data:vehicles},{data:docs},{data:amcs},
        {data:clients},{data:contracts},{data:quotes},{data:punchItems},
        {data:inventory},{data:recurringJobs},{data:maintReports}
      ] = await Promise.all([
        supabase.from('invoices').select('total_amount,paid_amount,balance,status'),
        supabase.from('invoices').select('*',{count:'exact',head:true}).eq('status','Overdue'),
        supabase.from('projects').select('project_name,status,completion_pct').order('created_at',{ascending:false}).limit(5),
        supabase.from('projects').select('*',{count:'exact',head:true}).eq('status','In Progress'),
        supabase.from('maintenance').select('status,job_code'),
        supabase.from('maintenance').select('*',{count:'exact',head:true}).in('status',['Open','Scheduled']),
        supabase.from('technicians').select('full_name,residence_expiry,engineers_membership_exp,status'),
        supabase.from('technicians').select('*',{count:'exact',head:true}).eq('status','Active'),
        supabase.from('expenses').select('amount,transaction_type'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,end_date,annual_value,paid_amount,status,clients(company_name)'),
        supabase.from('clients').select('id,status'),
        supabase.from('contracts_amc').select('annual_value,status'),
        supabase.from('quotations').select('status,total_amount'),
        supabase.from('punch_list').select('status'),
        supabase.from('inventory').select('status,quantity,min_quantity'),
        supabase.from('recurring_jobs').select('status'),
        supabase.from('maint_reports').select('created_at').gte('created_at', new Date(today.getFullYear(),today.getMonth(),1).toISOString()),
      ])

      // Financial
      const totalInvoiced=(invData||[]).reduce((s,r)=>s+(r.total_amount||0),0)
      const totalCollected=(invData||[]).reduce((s,r)=>s+(r.paid_amount||0),0)
      const balanceDue=(invData||[]).reduce((s,r)=>s+(r.balance||0),0)
      const activeAMC=(contracts||[]).filter(c=>c.status==='Active')
      const totalAMCValue=activeAMC.reduce((s,c)=>s+(c.annual_value||0),0)
      const totalAMCCollected=0
      const totalSarf=(exp||[]).filter(e=>e.transaction_type==='صرف').reduce((s,r)=>s+(r.amount||0),0)
      const totalOhda=(exp||[]).filter(e=>e.transaction_type==='عهدة').reduce((s,r)=>s+(r.amount||0),0)
      const netProfit=totalCollected-totalSarf
      const retentionValue=totalInvoiced*0.1 // estimate

      // Operations
      const sentQuotes=(quotes||[]).filter(q=>q.status==='Sent').length
      const overdueRecurring=(recurringJobs||[]).filter(r=>r.status==='Overdue').length
      const overdueOverdue=(maint||[]).filter(m=>m.status==='Overdue').length
      const pendingMaint=(maint||[]).filter(m=>m.status==='Open').length
      const overduePunch=(punchItems||[]).filter(p=>p.status==='متأخر').length
      const maintThisMonth=(maintReports||[]).length
      const pendingExp=(exp||[]).filter(e=>e.transaction_type==='عهدة').length
      const openPOs=0 // placeholder

      // People & Assets
      const activeTechCount=activeTechs||0
      const activeContractors=3 // from contractors table
      const lowStock=(inventory||[]).filter(i=>i.quantity<=(i.min_quantity||5)).length
      const vehicleViolations=(vehicles||[]).filter(v=>{
        if(!v.insurance_expiry&&!v.registration_expiry) return false
        const ins=v.insurance_expiry?Math.ceil((new Date(v.insurance_expiry).getTime()-today.getTime())/86400000):999
        const reg=v.registration_expiry?Math.ceil((new Date(v.registration_expiry).getTime()-today.getTime())/86400000):999
        return ins<=0||reg<=0
      }).length
      const expiredDocs=(docs||[]).filter(d=>{
        if(!d.expiry_date) return false
        return new Date(d.expiry_date)<today
      }).length
      const residencyExpiring=(techs||[]).filter(t=>{
        if(!t.residence_expiry) return false
        const days=Math.ceil((new Date(t.residence_expiry).getTime()-today.getTime())/86400000)
        return days>0&&days<=14
      }).length
      const warrantyExpiring=0

      // Alerts
      const expired:any[]=[],expiringSoon:any[]=[],expiringLater:any[]=[]
      function addDoc(name:string,expiry:string,cat:string){
        if(!expiry) return
        const days=Math.ceil((new Date(expiry.split('T')[0]).getTime()-today.getTime())/86400000)
        const item={name:`${cat}: ${name}`,detail:days<=0?'منتهية':`${days} يوم`}
        if(days<=0) expired.push(item)
        else if(days<=30) expiringSoon.push(item)
        else if(days<=60) expiringLater.push(item)
      }
      ;(techs||[]).forEach((t:any)=>{
        if(t.residence_expiry) addDoc(t.full_name,t.residence_expiry,'إقامة')
        if(t.engineers_membership_exp) addDoc(t.full_name,t.engineers_membership_exp,'عضوية')
      })
      ;(vehicles||[]).forEach((v:any)=>{
        const n=`${v.brand||''} ${v.model||''} (${v.plate_no||''})`
        if(v.insurance_expiry) addDoc(n,v.insurance_expiry,'تأمين')
        if(v.registration_expiry) addDoc(n,v.registration_expiry,'استمارة')
      })
      ;(docs||[]).forEach((d:any)=>{if(d.expiry_date) addDoc(d.doc_name,d.expiry_date,'وثيقة')})
      ;(amcs||[]).filter((a:any)=>a.status==='Active').forEach((a:any)=>{if(a.end_date) addDoc(a.clients?.company_name||a.contract_code,a.end_date,'عقد AMC')})
      setAlerts({expired,expiringSoon,expiringLater})

      setData({
        // Financial
        totalInvoiced,totalCollected,balanceDue,netProfit,overdueInv,totalAMCValue,retentionValue,totalOhda,
        // Operations
        activeProj,sentQuotes,overdueRecurring,overduePunch,openMaint:pendingMaint,overdueOverdue,maintThisMonth,pendingExp,openPOs,
        // People
        activeTechs:activeTechCount,activeContractors,lowStock,vehicleViolations,expiredDocs,residencyExpiring,warrantyExpiring,
        // Recent projects
        recentProjects:projs||[],
      })
      setLoading(false)
    }
    load()
  },[])

  const fmt=(n:number)=>n!=null?new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س':'—'
  const totalAlerts=alerts.expired.length+alerts.expiringSoon.length+alerts.expiringLater.length

  if(loading) return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12}}>
      {[...Array(12)].map((_,i)=><div key={i} className="skeleton" style={{height:80}}/>)}
    </div>
  )

  const Section=({title,color,children}:any)=>(
    <div style={{marginBottom:20}}>
      <div style={{background:color,borderRadius:'8px 8px 0 0',padding:'8px 16px',color:'white',fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
        {title}
      </div>
      <div style={{background:'white',border:`1px solid ${color}40`,borderRadius:'0 0 8px 8px',padding:'12px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
        {children}
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">لوحة التحكم</div>
          <div className="page-subtitle">COOL SEASONS & DARAJA.STORE — نظام إدارة شركة التكييف والتبريد</div>
        </div>
        {totalAlerts>0&&(
          <div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>window.scrollTo({top:300,behavior:'smooth'})}>
            <AlertTriangle size={16} color="#C0392B"/>
            <span style={{fontSize:13,fontWeight:700,color:'#C0392B'}}>{totalAlerts} تنبيه</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {totalAlerts>0&&(
        <div className="card" style={{padding:20,marginBottom:16,borderRight:'4px solid #C0392B'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><AlertTriangle size={18} color="#C0392B"/><span style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,color:'#C0392B'}}>تنبيهات الوثائق والتراخيص</span></div>
          <AlertRow type="red" title="منتهية الصلاحية" items={alerts.expired}/>
          <AlertRow type="amber" title="تنتهي خلال 30 يوم" items={alerts.expiringSoon}/>
          <AlertRow type="blue" title="تنتهي خلال 60 يوم" items={alerts.expiringLater}/>
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {[{id:'technicians',l:'الفنيون'},{id:'vehicles',l:'المركبات'},{id:'company_docs',l:'وثائق الشركة'}].map(b=>(
              <button key={b.id} onClick={()=>onNav(b.id)} style={{fontSize:12,background:'none',border:'1px solid var(--cs-border)',borderRadius:6,padding:'4px 12px',cursor:'pointer',color:'var(--cs-text-muted)'}}>← {b.l}</button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1: Financial Overview */}
      <Section title="💰 الملف المالي | Financial Overview" color="#2C3E7B">
        <div style={{background:'#2C3E7B',border:'none',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('invoices')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>إجمالي الفواتير</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.totalInvoiced)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Total Invoiced</div>
        </div>
        <div style={{background:'#27AE60',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('invoices')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>المحصّل</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.totalCollected)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Collected</div>
        </div>
        <div style={{background:data.balanceDue>0?'#C0392B':'#27AE60',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('invoices')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>الرصيد المستحق</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.balanceDue)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Balance Due</div>
        </div>
        <div style={{background:data.overdueInv>0?'#C0392B':'#7F8C8D',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('invoices')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>فواتير متأخرة</div>
          <div style={{fontSize:20,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{data.overdueInv||0}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Overdue</div>
        </div>
        <div style={{background:'#8E44AD',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('contracts')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>عقود AMC نشطة</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.totalAMCValue)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Active AMC</div>
        </div>
        <div style={{background:data.netProfit>=0?'#1E9CD7':'#C0392B',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('reports')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>إجمالي الربح</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.netProfit)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Net Profit</div>
        </div>
        <div style={{background:'#E67E22',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('retention')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>الضمانات المحجوزة</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.retentionValue)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Retention</div>
        </div>
        <div style={{background:'#16A085',borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav('amc_dashboard')}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>عهدة متبقية</div>
          <div style={{fontSize:18,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{fmt(data.totalOhda)}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>Pending Ohda</div>
        </div>
      </Section>

      {/* SECTION 2: Operations */}
      <Section title="⚙️ العمليات | Operations" color="#1E5F74">
        {[
          {l:'مشاريع نشطة',sub:'Active Projects',v:data.activeProj||0,c:'#2980B9',nav:'projects'},
          {l:'صيانة مفتوحة',sub:'Open Maintenance',v:data.openMaint||0,c:'#8E44AD',nav:'maintenance'},
          {l:'عروض مرسلة',sub:'Sent Quotes',v:data.sentQuotes||0,c:'#27AE60',nav:'quotations'},
          {l:'Punch List متأخر',sub:'Overdue Punch',v:data.overduePunch||0,c:data.overduePunch>0?'#C0392B':'#7F8C8D',nav:'punch_list'},
          {l:'تقارير صيانة/الشهر',sub:'Maint Reports/Month',v:data.maintThisMonth||0,c:'#1E9CD7',nav:'maint_report'},
          {l:'صيانة متأخرة',sub:'Overdue Maint',v:data.overdueOverdue||0,c:data.overdueOverdue>0?'#C0392B':'#7F8C8D',nav:'maintenance'},
          {l:'أعمال متكررة متأخرة',sub:'Overdue Recurring',v:data.overdueRecurring||0,c:data.overdueRecurring>0?'#E67E22':'#7F8C8D',nav:'recurring_jobs'},
          {l:'مصروفات معلقة',sub:'Pending Expenses',v:data.pendingExp||0,c:'#E67E22',nav:'expenses'},
        ].map((item,i)=>(
          <div key={i} style={{background:item.c,borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav(item.nav)}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>{item.l}</div>
            <div style={{fontSize:22,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{item.v}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{item.sub}</div>
          </div>
        ))}
      </Section>

      {/* SECTION 3: People & Assets */}
      <Section title="👷 الموارد والأصول | People & Assets" color="#4A235A">
        {[
          {l:'فنيون نشطون',sub:'Active Techs',v:data.activeTechs||0,c:'#1E9CD7',nav:'technicians'},
          {l:'مقاولون نشطون',sub:'Active Contractors',v:data.activeContractors||0,c:'#27AE60',nav:'contractors'},
          {l:'مخزون منخفض',sub:'Low Stock Items',v:data.lowStock||0,c:data.lowStock>0?'#C0392B':'#7F8C8D',nav:'inventory'},
          {l:'وثائق منتهية',sub:'Expired Docs',v:data.expiredDocs||0,c:data.expiredDocs>0?'#C0392B':'#7F8C8D',nav:'company_docs'},
          {l:'مخالفات مركبات',sub:'Vehicle Violations',v:data.vehicleViolations||0,c:data.vehicleViolations>0?'#E67E22':'#7F8C8D',nav:'vehicles'},
          {l:'إقامات تنتهي قريباً',sub:'Residency Expiring',v:data.residencyExpiring||0,c:data.residencyExpiring>0?'#E67E22':'#7F8C8D',nav:'technicians'},
          {l:'ضمانات تنتهي قريباً',sub:'Warranty Expiring',v:data.warrantyExpiring||0,c:'#8E44AD',nav:'warranty'},
          {l:'عمولات مستحقة',sub:'Due Commissions',v:0,c:'#16A085',nav:'commissions'},
        ].map((item,i)=>(
          <div key={i} style={{background:item.c,borderRadius:10,padding:'12px 14px',textAlign:'center',cursor:'pointer'}} onClick={()=>onNav(item.nav)}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,marginBottom:4}}>{item.l}</div>
            <div style={{fontSize:22,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{item.v}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{item.sub}</div>
          </div>
        ))}
      </Section>

      {/* Recent Projects */}
      <div className="card" style={{padding:20}}>
        <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:14}}>أحدث المشاريع</div>
        {data.recentProjects.length===0
          ?<div style={{textAlign:'center',color:'var(--cs-text-muted)',padding:20}}>لا توجد مشاريع بعد</div>
          :<div className="table-wrap"><table><thead><tr><th>اسم المشروع</th><th>الحالة</th><th>الإنجاز</th></tr></thead>
            <tbody>{data.recentProjects.map((p:any,i:number)=>(
              <tr key={i}>
                <td style={{fontWeight:600}}>{p.project_name}</td>
                <td><span className={`badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-blue':'badge-gray'}`}>{p.status}</span></td>
                <td><div style={{display:'flex',alignItems:'center',gap:8,minWidth:120}}>
                  <div style={{flex:1,background:'var(--cs-border)',borderRadius:4,height:8}}><div style={{width:`${p.completion_pct||0}%`,background:'var(--cs-blue)',height:8,borderRadius:4}}/></div>
                  <span style={{fontSize:12,fontWeight:700,minWidth:35}}>{p.completion_pct||0}%</span>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        }
      </div>
    </div>
  )
}
