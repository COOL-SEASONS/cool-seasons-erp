'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle } from 'lucide-react'

function AlertRow({type,title,items}:any) {
  const col:any={red:'#C0392B',amber:'#E67E22',blue:'#1E9CD7'}
  const bg:any={red:'#FDECEA',amber:'#FEF3E2',blue:'#E8F6FC'}
  const c=col[type]
  if(!items?.length) return null
  return (
    <div style={{background:bg[type],border:`1px solid ${c}30`,borderRadius:8,padding:'10px 14px',marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
        <AlertTriangle size={14} color={c}/>
        <span style={{fontSize:12,fontWeight:700,color:c}}>{title} ({items.length})</span>
      </div>
      {items.slice(0,4).map((item:any,i:number)=>(
        <div key={i} style={{fontSize:11,color:c,display:'flex',justifyContent:'space-between',marginBottom:2}}>
          <span>{item.name}</span>
          <span style={{background:c+'15',padding:'0 7px',borderRadius:8,fontWeight:600}}>{item.detail}</span>
        </div>
      ))}
      {items.length>4&&<div style={{fontSize:10,color:c,opacity:0.7}}>+ {items.length-4} أخرى</div>}
    </div>
  )
}

// Colored KPI card matching Excel style
function KPI({label,sub,value,color,onClick}:{label:string,sub?:string,value:any,color:string,onClick?:()=>void}) {
  return (
    <div onClick={onClick} style={{background:color,borderRadius:8,padding:'10px 12px',textAlign:'center',cursor:onClick?'pointer':'default',minWidth:0}}>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.85)',fontWeight:600,lineHeight:1.3,marginBottom:4}}>{label}{sub&&<><br/><span style={{fontSize:9,opacity:0.8}}>{sub}</span></>}</div>
      <div style={{fontSize:20,fontWeight:900,color:'white',fontFamily:'Cairo,sans-serif'}}>{value??'—'}</div>
    </div>
  )
}

// Section header matching Excel
function Section({title,color}:{title:string,color:string}) {
  return (
    <div style={{background:color,borderRadius:'8px 8px 0 0',padding:'8px 16px',color:'white',fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:13,marginTop:16}}>
      {title}
    </div>
  )
}

function Grid8({children}:{children:any}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:6,background:'white',border:'1px solid var(--cs-border)',borderRadius:'0 0 8px 8px',padding:10,marginBottom:4}}>
      {children}
    </div>
  )
}

function NavBtn({label,onClick}:{label:string,onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{background:'white',border:'1px solid #E0E7EF',borderRadius:6,padding:'6px 8px',cursor:'pointer',fontSize:11,fontFamily:'Tajawal,sans-serif',fontWeight:600,color:'#2C3E7B',textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',width:'100%'}}>
      {label}
    </button>
  )
}

export default function DashboardContent({onNav}:{onNav:(id:string)=>void}) {
  const [d,setD]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [alerts,setAlerts]=useState<any>({expired:[],soon:[],later:[]})

  useEffect(()=>{
    async function load() {
      const today=new Date()
      const m1start=new Date(today.getFullYear(),today.getMonth(),1).toISOString()

      const [
        {data:inv},{data:proj},{data:maint},
        {data:techs},{data:veh},{data:docs},{data:amcs},
        {data:quot},{data:punches},{data:recur},
        {data:po},{data:exp},{data:warranty},
        {data:comm},{data:inv2},{data:contr},
        {data:maintRep}
      ] = await Promise.all([
        supabase.from('invoices').select('total_amount,paid_amount,balance,status'),
        supabase.from('projects').select('project_name,status,completion_pct,budget,actual_cost'),
        supabase.from('maintenance').select('status,cost,job_code,description'),
        supabase.from('technicians').select('full_name,status,residence_expiry,engineers_membership_exp'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,status,annual_value,end_date,clients(company_name)'),
        supabase.from('quotations').select('status,total_amount'),
        supabase.from('punch_list').select('status'),
        supabase.from('recurring_jobs').select('status'),
        supabase.from('purchase_orders').select('status').eq('status','Sent'),
        supabase.from('expenses').select('amount,transaction_type,status'),
        supabase.from('warranty_tracking').select('start_date,duration_months'),
        supabase.from('commissions').select('balance'),
        supabase.from('inventory').select('status,quantity,min_quantity'),
        supabase.from('contractors').select('status'),
        supabase.from('maint_reports').select('id').gte('created_at',m1start),
      ])

      // ===== FINANCIAL =====
      const totalInvoiced=(inv||[]).reduce((s,r)=>s+(r.total_amount||0),0)
      const totalCollected=(inv||[]).reduce((s,r)=>s+(r.paid_amount||0),0)
      const balanceDue=(inv||[]).reduce((s,r)=>s+(r.balance||0),0)
      const overdueCount=(inv||[]).filter(r=>r.status==='Overdue').length
      const contractsValue=(proj||[]).reduce((s,r)=>s+(r.budget||0),0)
      const jobCostingProfit=(proj||[]).reduce((s,r)=>s+(((r.budget||0)-(r.actual_cost||0))),0)
      const activeAMCCount=(amcs||[]).filter(c=>c.status==='Active').length
      const totalSarf=(exp||[]).filter(e=>e.transaction_type==='صرف').reduce((s,r)=>s+(r.amount||0),0)
      const retentionVal=totalInvoiced*0.1

      // ===== OPERATIONS =====
      const activeProj=(proj||[]).filter(p=>p.status==='In Progress').length
      const openMaint=(maint||[]).filter(m=>m.status==='Open').length
      const maintThisMonth=(maintRep||[]).length
      const overduePunch=(punches||[]).filter(p=>p.status==='متأخر').length
      const sentQuotes=(quot||[]).filter(q=>q.status==='Sent').length
      const overdueRecurring=(recur||[]).filter(r=>r.status==='متأخرة').length
      const openPOs=(po||[]).length
      const pendingExp=(exp||[]).filter(e=>e.status==='Pending').length

      // ===== PEOPLE & ASSETS =====
      const activeTechs=(techs||[]).filter(t=>t.status==='Active').length
      // Residency expiring within 14 days
      const residencyExpiring=(techs||[]).filter(t=>{
        if(!t.residence_expiry) return false
        const days=Math.ceil((new Date(t.residence_expiry).getTime()-today.getTime())/86400000)
        return days>0&&days<=14
      }).length
      // Warranty expiring soon
      const warrantyExpiring=(warranty||[]).filter((w:any)=>{
        if(!w.start_date||!w.duration_months) return false
        const exp=new Date(w.start_date); exp.setMonth(exp.getMonth()+w.duration_months)
        const days=Math.ceil((exp.getTime()-today.getTime())/86400000)
        return days>0&&days<=30
      }).length
      const dueCommissions=(comm||[]).reduce((s:number,r:any)=>s+(r.balance||0),0)
      const lowStock=(inv2||[]).filter(i=>i.status==='Low Stock').length
      // Expired vehicle docs
      const expiredVehDocs=(veh||[]).filter(v=>{
        const ins=v.insurance_expiry&&new Date(v.insurance_expiry)<today
        const reg=v.registration_expiry&&new Date(v.registration_expiry)<today
        return ins||reg
      }).length
      const vehicleViolations=expiredVehDocs
      const activeContractors=(contr||[]).filter((c:any)=>c.status==='نشط').length

      // ===== ALERTS =====
      const expired:any[]=[],soon:any[]=[],later:any[]=[]
      const addAlert=(name:string,expiry:string,cat:string)=>{
        if(!expiry) return
        const days=Math.ceil((new Date(expiry.split('T')[0]).getTime()-today.getTime())/86400000)
        const item={name:`${cat}: ${name}`,detail:days<=0?'منتهية':`${days} يوم`}
        if(days<=0) expired.push(item)
        else if(days<=30) soon.push(item)
        else if(days<=60) later.push(item)
      }
      ;(techs||[]).forEach((t:any)=>{
        if(t.residence_expiry) addAlert(t.full_name,t.residence_expiry,'إقامة')
        if(t.engineers_membership_exp) addAlert(t.full_name,t.engineers_membership_exp,'عضوية')
      })
      ;(veh||[]).forEach((v:any)=>{
        const n=`${v.brand||''} (${v.plate_no||''})`
        if(v.insurance_expiry) addAlert(n,v.insurance_expiry,'تأمين')
        if(v.registration_expiry) addAlert(n,v.registration_expiry,'استمارة')
      })
      ;(docs||[]).forEach((d:any)=>{if(d.expiry_date) addAlert(d.doc_name,d.expiry_date,'وثيقة')})
      ;(amcs||[]).filter((a:any)=>a.status==='Active').forEach((a:any)=>{if(a.end_date) addAlert(a.clients?.company_name||a.contract_code,a.end_date,'عقد AMC')})
      setAlerts({expired,soon,later})

      // ===== MODULE SUMMARY =====
      const projPaid=(inv||[]).filter(i=>i.status==='Paid').length
      const projTotal=(inv||[]).length

      setD({
        totalInvoiced,totalCollected,balanceDue,overdueCount,contractsValue,netProfit:jobCostingProfit,activeAMCCount,retentionVal,
        activeProj,openMaint,maintThisMonth,overduePunch,sentQuotes,overdueRecurring,openPOs,pendingExp,
        activeTechs,residencyExpiring,warrantyExpiring,dueCommissions,lowStock,expiredVehDocs,vehicleViolations,activeContractors,
        projActive:(proj||[]).filter(p=>p.status==='In Progress').length,
        projTotal:(proj||[]).length,
        maintOpen:(maint||[]).filter(m=>m.status==='Open').length,
        maintTotal:(maint||[]).length,
        invPaid:projPaid, invTotal:projTotal,
        invTotalValue:totalInvoiced,
        recentProjects:(proj||[]).slice(0,5),
      })
      setLoading(false)
    }
    load()
  },[])

  const fmt=(n:number)=>n!=null?new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س':'—'
  const totalAlerts=alerts.expired.length+alerts.soon.length+alerts.later.length

  if(loading) return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
      {[...Array(24)].map((_,i)=><div key={i} className="skeleton" style={{height:70}}/>)}
    </div>
  )

  // Alert bar (row 3 in Excel)
  const alertText=[]
  if(d.overdueCount>0) alertText.push(`فواتير متأخرة: ${d.overdueCount}`)
  if(d.openMaint>0) alertText.push(`صيانة متأخرة: ${d.openMaint}`)
  if(alerts.expired.length>0) alertText.push(`وثائق منتهية: ${alerts.expired.length}`)
  if(d.overduePunch>0) alertText.push(`Punch List متأخر: ${d.overduePunch}`)

  return (
    <div>
      {/* Title row */}
      <div style={{background:'#2C3E7B',borderRadius:10,padding:'14px 20px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{color:'white',fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:16}}>🏢 نظام إدارة شركة التكييف والتبريد | HVAC Company ERP System</div>
        <div style={{color:'rgba(255,255,255,0.8)',fontSize:12}}>{new Date().toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>

      {/* Alert bar (row 3 in Excel) */}
      {alertText.length>0&&(
        <div style={{background:'#C0392B',borderRadius:8,padding:'7px 16px',marginBottom:8,color:'white',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={14}/>
          {alertText.join(' | ')}
        </div>
      )}

      {/* ===== SECTION 1: FINANCIAL ===== */}
      <Section title="💰  الملف المالي  |  Financial Overview" color="#1E3A5F"/>
      <Grid8>
        <KPI label="إجمالي الفواتير" sub="Total Invoiced" value={fmt(d.totalInvoiced)} color="#2C3E7B" onClick={()=>onNav('invoices')}/>
        <KPI label="المحصّل" sub="Collected" value={fmt(d.totalCollected)} color="#27AE60" onClick={()=>onNav('invoices')}/>
        <KPI label="الرصيد المتبقي" sub="Balance Due" value={fmt(d.balanceDue)} color={d.balanceDue>0?'#C0392B':'#27AE60'} onClick={()=>onNav('invoices')}/>
        <KPI label="فواتير متأخرة" sub="Overdue" value={d.overdueCount} color={d.overdueCount>0?'#C0392B':'#7F8C8D'} onClick={()=>onNav('invoices')}/>
        <KPI label="قيمة العقود" sub="Contracts Value" value={fmt(d.contractsValue)} color="#8E44AD" onClick={()=>onNav('projects')}/>
        <KPI label="إجمالي الربح ✦" sub="Net Profit" value={fmt(d.netProfit)} color={d.netProfit>=0?'#1E9CD7':'#C0392B'} onClick={()=>onNav('job_costing')}/>
        <KPI label="عقود AMC نشطة" sub="Active AMC" value={d.activeAMCCount} color="#16A085" onClick={()=>onNav('amc_dashboard')}/>
        <KPI label="الضمان المحتجز" sub="Retention" value={fmt(d.retentionVal)} color="#E67E22" onClick={()=>onNav('retention')}/>
      </Grid8>

      {/* ===== SECTION 2: OPERATIONS ===== */}
      <Section title="⚙️  العمليات  |  Operations" color="#1A5276"/>
      <Grid8>
        <KPI label="مشاريع نشطة" sub="Active Projects" value={d.activeProj} color="#2980B9" onClick={()=>onNav('projects')}/>
        <KPI label="صيانة مفتوحة" sub="Open Maintenance" value={d.openMaint} color="#8E44AD" onClick={()=>onNav('maintenance')}/>
        <KPI label="تقارير صيانة/الشهر" sub="Maint Reports/Month" value={d.maintThisMonth} color="#1E9CD7" onClick={()=>onNav('maint_report')}/>
        <KPI label="Punch List متأخر" sub="Overdue Punch" value={d.overduePunch} color={d.overduePunch>0?'#C0392B':'#7F8C8D'} onClick={()=>onNav('punch_list')}/>
        <KPI label="عروض مرسلة" sub="Sent Quotes" value={d.sentQuotes} color="#27AE60" onClick={()=>onNav('quotations')}/>
        <KPI label="أعمال متكررة متأخرة" sub="Overdue Recurring" value={d.overdueRecurring} color={d.overdueRecurring>0?'#E67E22':'#7F8C8D'} onClick={()=>onNav('recurring_jobs')}/>
        <KPI label="طلبات شراء مفتوحة" sub="Open POs" value={d.openPOs} color="#D35400" onClick={()=>onNav('purchase_orders')}/>
        <KPI label="مصروفات معلقة" sub="Pending Expenses" value={d.pendingExp} color="#7F8C8D" onClick={()=>onNav('expenses')}/>
      </Grid8>

      {/* ===== SECTION 3: PEOPLE & ASSETS ===== */}
      <Section title="👷  الموارد والأصول  |  People & Assets" color="#4A235A"/>
      <Grid8>
        <KPI label="فنيون نشطون" sub="Active Techs" value={d.activeTechs} color="#1E9CD7" onClick={()=>onNav('technicians')}/>
        <KPI label="إقامات تنتهي أسبوعين" sub="Residency Expiring" value={d.residencyExpiring} color={d.residencyExpiring>0?'#E67E22':'#7F8C8D'} onClick={()=>onNav('technicians')}/>
        <KPI label="ضمانات تنتهي قريباً" sub="Warranty Expiring" value={d.warrantyExpiring} color={d.warrantyExpiring>0?'#E67E22':'#7F8C8D'} onClick={()=>onNav('warranty')}/>
        <KPI label="عمولات مستحقة" sub="Due Commissions" value={fmt(d.dueCommissions)} color="#8E44AD" onClick={()=>onNav('commissions')}/>
        <KPI label="مخزون منخفض" sub="Low Stock Items" value={d.lowStock} color={d.lowStock>0?'#C0392B':'#7F8C8D'} onClick={()=>onNav('inventory')}/>
        <KPI label="وثائق مركبات منتهية" sub="Expired Docs" value={d.expiredVehDocs} color={d.expiredVehDocs>0?'#C0392B':'#7F8C8D'} onClick={()=>onNav('vehicles')}/>
        <KPI label="إجمالي مخالفات المركبات" sub="Vehicle Violations" value={d.vehicleViolations} color={d.vehicleViolations>0?'#E67E22':'#7F8C8D'} onClick={()=>onNav('vehicles')}/>
        <KPI label="مقاولون نشطون" sub="Active Contractors" value={d.activeContractors} color="#27AE60" onClick={()=>onNav('contractors')}/>
      </Grid8>

      {/* Alerts Detail */}
      {totalAlerts>0&&(
        <div className="card" style={{padding:16,marginTop:12,borderRight:'4px solid #C0392B'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <AlertTriangle size={16} color="#C0392B"/>
            <span style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,color:'#C0392B'}}>تنبيهات تفصيلية ({totalAlerts})</span>
          </div>
          <AlertRow type="red" title="منتهية الصلاحية" items={alerts.expired}/>
          <AlertRow type="amber" title="تنتهي خلال 30 يوم" items={alerts.soon}/>
          <AlertRow type="blue" title="تنتهي خلال 60 يوم" items={alerts.later}/>
        </div>
      )}

      {/* ===== QUICK NAVIGATION ===== */}
      <div style={{marginTop:14,marginBottom:4,background:'#566573',borderRadius:'8px 8px 0 0',padding:'8px 16px',color:'white',fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:13}}>
        🗂️ التنقل السريع | Quick Navigation — كافة الصفحات
      </div>
      <div style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:'0 0 8px 8px',padding:12,marginBottom:4}}>
        {[
          {title:'💰 المالية',items:[{l:'💰 الفواتير',n:'invoices'},{l:'📄 عروض الأسعار',n:'quotations'},{l:'📋 عروض متعددة',n:'multi_quotes'},{l:'📊 عروض غير مُباعة',n:'unsold_estimates'},{l:'📑 عقود AMC',n:'contracts'},{l:'📈 لوحة AMC',n:'amc_dashboard'},{l:'🏦 الضمانات',n:'retention'},{l:'💸 المصروفات',n:'expenses'}]},
          {title:'⚙️ المشاريع والعمليات',items:[{l:'📋 المشاريع',n:'projects'},{l:'🖨️ طباعة مشروع',n:'print_project'},{l:'📅 مخطط جانت',n:'gantt'},{l:'🔄 أوامر التغيير',n:'change_orders'},{l:'🏗️ تقرير WIP',n:'wip'},{l:'✅ Punch List',n:'punch_list'},{l:'📊 تكاليف الوظائف',n:'job_costing'},{l:'📂 وثائق الشركة',n:'company_docs'}]},
          {title:'🔧 الصيانة والتقارير',items:[{l:'🔧 الصيانة',n:'maintenance'},{l:'📋 تقرير الصيانة',n:'maint_report'},{l:'✅ قوائم التحقق',n:'job_checklists'},{l:'📝 السجل اليومي',n:'daily_logs'},{l:'🔁 أعمال متكررة',n:'recurring_jobs'},{l:'📞 مركز الاتصال',n:'call_center'},{l:'🛡️ الضمانات',n:'warranty'},{l:'📊 التقارير',n:'reports'}]},
          {title:'👥 العملاء والفريق',items:[{l:'👥 العملاء',n:'clients'},{l:'👷 الفنيون',n:'technicians'},{l:'🏆 ترتيب الفنيين',n:'leaderboard'},{l:'💵 العمولات',n:'commissions'},{l:'📞 متابعة العملاء',n:'customer_followup'},{l:'🔍 كارت العميل',n:'client_card'},{l:'🏗️ المقاولون',n:'contractors'},{l:'👔 الحضور',n:'hr_attendance'}]},
          {title:'📦 المواد والمخزون',items:[{l:'💲 الأسعار الثابتة',n:'flat_rate'},{l:'📦 المخزون',n:'inventory'},{l:'📖 كتاب الأسعار',n:'pricebook'},{l:'🛒 أوامر الشراء',n:'purchase_orders'},{l:'🌡️ الفريون',n:'freon'},{l:'🔧 مواسير النحاس',n:'copper_pipe'},{l:'💨 أعمال الدكت',n:'duct_works'},{l:'🔌 المعدات',n:'equipment'}]},
          {title:'🏢 الموارد والإدارة',items:[{l:'🚗 المركبات',n:'vehicles'},{l:'📤 Dispatch Board',n:'dispatch'},{l:'⚙️ الإعدادات',n:'settings_page'},{l:'📊 مقارنة الموردين',n:'supplier_compare'},{l:'💰 التدفق النقدي',n:'cash_flow'},{l:'📅 التقرير الشهري',n:'monthly_report'},{l:'📈 خطة الطاقة',n:'capacity_plan'},{l:'🔮 بطاقة العميل',n:'client_card'}]},
        ].map((group,gi)=>(
          <div key={gi} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:'#566573',marginBottom:5}}>{group.title}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5}}>
              {group.items.map((item,i)=><NavBtn key={i} label={item.l} onClick={()=>onNav(item.n)}/>)}
            </div>
          </div>
        ))}
      </div>

      {/* ===== MODULE SUMMARY ===== */}
      <div style={{marginTop:12,background:'#2C3E50',borderRadius:'8px 8px 0 0',padding:'8px 16px',color:'white',fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:13}}>
        📊 ملخص الأقسام | Module Summary
      </div>
      <div style={{background:'white',border:'1px solid var(--cs-border)',borderRadius:'0 0 8px 8px',padding:14,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[
          {icon:'📋',title:'المشاريع',stat:`${d.projActive} نشط / ${d.projTotal} إجمالي`,value:fmt(d.contractsValue),nav:'projects'},
          {icon:'🔧',title:'الصيانة',stat:`${d.maintOpen} مفتوح / ${d.maintThisMonth} هذا الشهر`,value:'—',nav:'maintenance'},
          {icon:'💰',title:'الفواتير',stat:`${d.invPaid} مدفوعة / ${d.invTotal} إجمالي`,value:fmt(d.invTotalValue),nav:'invoices'},
        ].map((m,i)=>(
          <div key={i} onClick={()=>onNav(m.nav)} style={{background:'var(--cs-gray-light)',borderRadius:8,padding:14,cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:22,marginBottom:4}}>{m.icon}</div>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,marginBottom:4}}>{m.title}</div>
            <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:6}}>{m.stat}</div>
            <div style={{fontSize:15,fontWeight:800,color:'var(--cs-blue)'}}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
