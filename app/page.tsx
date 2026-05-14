'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/pages/LoginPage'
import { LayoutDashboard,Users,FolderOpen,Wrench,DollarSign,Package,UserCheck,FileText,Bell,ChevronDown,AlertCircle,AlertTriangle,TrendingUp,Building2,Settings,Menu,X,BarChart3,BarChart2 } from 'lucide-react'

import DashboardContent from '@/components/pages/DashboardContent'
const DashboardAny = DashboardContent as React.ComponentType<any>
import ClientsPage from '@/components/pages/ClientsPage'
import ProjectsPage from '@/components/pages/ProjectsPage'
import TechniciansPage from '@/components/pages/TechniciansPage'
import InvoicesPage from '@/components/pages/InvoicesPage'
import MaintenancePage from '@/components/pages/MaintenancePage'
import MaintReportPage from '@/components/pages/MaintReportPage'
import InventoryPage from '@/components/pages/InventoryPage'
import ExpensesPage from '@/components/pages/ExpensesPage'
import ContractsPage from '@/components/pages/ContractsPage'
import VehiclesPage from '@/components/pages/VehiclesPage'
import CompanyDocsPage from '@/components/pages/CompanyDocsPage'
import QuotationsPage from '@/components/pages/QuotationsPage'
import DailyLogsPage from '@/components/pages/DailyLogsPage'
import PunchListPage from '@/components/pages/PunchListPage'
import HRAttendancePage from '@/components/pages/HRAttendancePage'
import CallCenterPage from '@/components/pages/CallCenterPage'
import CommissionsPage from '@/components/pages/CommissionsPage'
import DispatchBoardPage from '@/components/pages/DispatchBoardPage'
import WIPPage from '@/components/pages/WIPPage'
import JobCostingPage from '@/components/pages/JobCostingPage'
import RetentionPage from '@/components/pages/RetentionPage'
import PricebookPage from '@/components/pages/PricebookPage'
import RecurringJobsPage from '@/components/pages/RecurringJobsPage'
import FreonPage from '@/components/pages/FreonPage'
import PurchaseOrdersPage from '@/components/pages/PurchaseOrdersPage'
import EquipmentPage from '@/components/pages/EquipmentPage'
import WarrantyPage from '@/components/pages/WarrantyPage'
import ContractorPage from '@/components/pages/ContractorPage'
import CustomerFollowupPage from '@/components/pages/CustomerFollowupPage'
import TechLeaderboardPage from '@/components/pages/TechLeaderboardPage'
import GanttPage from '@/components/pages/GanttPage'
import PrintProjectPage from '@/components/pages/PrintProjectPage'
import ReportsPage from '@/components/pages/ReportsPage'
import SettingsPage from '@/components/pages/SettingsPage'
import UnsoldEstimatesPage from '@/components/pages/UnsoldEstimatesPage'
import AMCDashboardPage from '@/components/pages/AMCDashboardPage'
import CapacityPlanPage from '@/components/pages/CapacityPlanPage'
import ClientCardPage from '@/components/pages/ClientCardPage'
import JobChecklistsPage from '@/components/pages/JobChecklistsPage'
import MultiQuotesPage from '@/components/pages/MultiQuotesPage'
import MonthlyReportPage from '@/components/pages/MonthlyReportPage'
import SupplierComparePage from '@/components/pages/SupplierComparePage'
import CashFlowPage from '@/components/pages/CashFlowPage'
import FlatRatePage from '@/components/pages/FlatRatePage'
import CopperPipePage from '@/components/pages/CopperPipePage'
import DuctWorksPage from '@/components/pages/DuctWorksPage'

const NAV = [
  { id:'dashboard', label:'لوحة التحكم', icon:LayoutDashboard },
  { id:'crm', label:'CRM', icon:Users, children:[
    {id:'clients',label:'العملاء'},
    {id:'quotations',label:'عروض الأسعار'},
    {id:'multi_quotes',label:'عروض متعددة الخيارات'},
    {id:'call_center',label:'Call Center'},
    {id:'customer_followup',label:'متابعة العملاء'},
    {id:'unsold_estimates',label:'العروض المعلقة'},
    {id:'client_card',label:'بطاقة العميل'},
  ]},
  { id:'ops', label:'العمليات', icon:FolderOpen, children:[
    {id:'projects',label:'المشاريع'},
    {id:'dispatch',label:'Dispatch Board'},
    {id:'gantt',label:'مخطط جانت'},
    {id:'invoices',label:'الفواتير'},
    {id:'expenses',label:'المصروفات'},
    {id:'punch_list',label:'Punch List'},
    {id:'daily_logs',label:'السجل اليومي'},
    {id:'recurring_jobs',label:'أعمال متكررة'},
    {id:'job_checklists',label:'قوائم الفحص'},
    {id:'print_project',label:'طباعة أمر المشروع'},
  ]},
  { id:'maint_grp', label:'الصيانة', icon:Wrench, children:[
    {id:'maintenance',label:'جدول الصيانة'},
    {id:'maint_report',label:'تقارير الصيانة'},
    {id:'warranty',label:'الضمانات'},
  ]},
  { id:'hr_grp', label:'الموارد البشرية', icon:UserCheck, children:[
    {id:'technicians',label:'الفنيون'},
    {id:'hr_attendance',label:'الحضور'},
    {id:'commissions',label:'العمولات'},
    {id:'leaderboard',label:'لوحة الأداء'},
    {id:'vehicles',label:'المركبات'},
  ]},
  { id:'inv_grp', label:'المخزون', icon:Package, children:[
    {id:'inventory',label:'المخزون'},
    {id:'purchase_orders',label:'أوامر الشراء'},
    {id:'equipment',label:'المعدات المركّبة'},
    {id:'freon',label:'سجل الفريون'},
    {id:'pricebook',label:'كتالوج الأسعار'},
    {id:'flat_rate',label:'أسعار ثابتة'},
    {id:'copper_pipe',label:'مواسير النحاس'},
    {id:'duct_works',label:'أعمال الدكت'},
    {id:'supplier_compare',label:'مقارنة الموردين'},
  ]},
  { id:'finance_grp', label:'المالية', icon:BarChart2, children:[
    {id:'wip',label:'تقرير WIP'},
    {id:'job_costing',label:'تكاليف المشاريع'},
    {id:'retention',label:'مبالغ الضمان'},
    {id:'cash_flow',label:'التدفق النقدي'},
    {id:'capacity_plan',label:'خطة الطاقة الإنتاجية'},
    {id:'monthly_report',label:'التقرير الشهري'},
    {id:'reports',label:'التقارير والإحصاءات'},
  ]},
  { id:'con_grp', label:'العقود والوثائق', icon:FileText, children:[
    {id:'contracts',label:'عقود AMC'},
    {id:'amc_dashboard',label:'لوحة AMC'},
    {id:'contractors',label:'المقاولون'},
    {id:'company_docs',label:'وثائق الشركة'},
  ]},
]

const MOBILE_NAV = [
  {id:'dashboard',label:'الرئيسية',icon:LayoutDashboard},
  {id:'clients',label:'العملاء',icon:Users},
  {id:'projects',label:'المشاريع',icon:FolderOpen},
  {id:'maintenance',label:'الصيانة',icon:Wrench},
  {id:'invoices',label:'الفواتير',icon:DollarSign},
]

function StatCard({label,value,icon:Icon,color}:any) {
  return (
    <div className="stat-card">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:6}}>{label}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--cs-text)',fontFamily:'Cairo,sans-serif'}}>{value??'—'}</div>
        </div>
        <div style={{background:color+'20',borderRadius:10,padding:10}}><Icon size={20} color={color}/></div>
      </div>
    </div>
  )
}

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
          <div key={i} style={{fontSize:12,color:c,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{item.name}</span>
            <span style={{background:c+'15',padding:'1px 8px',borderRadius:10,fontWeight:600}}>{item.detail}</span>
          </div>
        ))}
        {items.length>5&&<div style={{fontSize:11,color:c,opacity:0.7}}>+ {items.length-5} أخرى</div>}
      </div>
    </div>
  )
}

function Dashboard({onNav}:{onNav:(id:string)=>void}) {
  const [stats,setStats]=useState<any>({})
  const [loading,setLoading]=useState(true)
  const [recentProjects,setRecentProjects]=useState<any[]>([])
  const [alerts,setAlerts]=useState<any>({expired:[],expiringSoon:[],expiringLater:[]})

  useEffect(()=>{
    async function load() {
      const today=new Date()
      const [{count:cc},{count:pc},{count:tc},{data:invData},{count:oc},{count:ls},{data:projs},{count:mo},{data:techs},{data:vehicles},{data:docs},{data:amcs}]=await Promise.all([
        supabase.from('clients').select('*',{count:'exact',head:true}),
        supabase.from('projects').select('*',{count:'exact',head:true}).eq('status','In Progress'),
        supabase.from('technicians').select('*',{count:'exact',head:true}).eq('status','Active'),
        supabase.from('invoices').select('total_amount,paid_amount'),
        supabase.from('invoices').select('*',{count:'exact',head:true}).eq('status','Overdue'),
        supabase.from('inventory').select('*',{count:'exact',head:true}).eq('status','Low Stock'),
        supabase.from('projects').select('project_name,status,completion_pct').order('created_at',{ascending:false}).limit(5),
        supabase.from('maintenance').select('*',{count:'exact',head:true}).eq('status','Overdue'),
        supabase.from('technicians').select('full_name,residence_expiry,engineers_membership_exp').eq('status','Active'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,end_date,clients(company_name)').eq('status','Active'),
      ])
      const totalInv=invData?.reduce((s,r)=>s+(r.total_amount||0),0)||0
      const totalPaid=invData?.reduce((s,r)=>s+(r.paid_amount||0),0)||0
      setStats({cc,pc,tc,totalInv,totalPaid,oc,ls,mo})
      setRecentProjects(projs||[])
      const expired:any[]=[],expiringSoon:any[]=[],expiringLater:any[]=[]
      function addDoc(name:string,expiry:string,cat:string){
        if(!expiry) return
        const d=expiry.split('T')[0]
        const days=Math.ceil((new Date(d).getTime()-today.getTime())/86400000)
        const item={name:`${cat}: ${name}`,detail:days<=0?'منتهية':`${days} يوم`}
        if(days<=0) expired.push(item)
        else if(days<=30) expiringSoon.push(item)
        else if(days<=60) expiringLater.push(item)
      }
      techs?.forEach((t:any)=>{
        if(t.residence_expiry) addDoc(t.full_name,t.residence_expiry,'إقامة')
        if(t.engineers_membership_exp) addDoc(t.full_name,t.engineers_membership_exp,'عضوية')
      })
      vehicles?.forEach((v:any)=>{
        const n=`${v.brand||''} ${v.model||''} (${v.plate_no||''})`
        if(v.insurance_expiry) addDoc(n,v.insurance_expiry,'تأمين')
        if(v.registration_expiry) addDoc(n,v.registration_expiry,'استمارة')
      })
      docs?.forEach((d:any)=>{if(d.expiry_date) addDoc(d.doc_name,d.expiry_date,'وثيقة')})
      amcs?.forEach((a:any)=>{if(a.end_date) addDoc(a.clients?.company_name||a.contract_code,a.end_date,'عقد AMC')})
      setAlerts({expired,expiringSoon,expiringLater})
      setLoading(false)
    }
    load()
  },[])

  const fmt=(n:number)=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س'
  const totalAlerts=alerts.expired.length+alerts.expiringSoon.length+alerts.expiringLater.length
  if(loading) return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>{[...Array(8)].map((_,i)=><div key={i} className="skeleton" style={{height:100}}/>)}</div>

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">لوحة التحكم</div><div className="page-subtitle">COOL SEASONS & DARAJA.STORE</div></div>
        {totalAlerts>0&&<div style={{background:'#FDECEA',border:'1px solid #C0392B30',borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={16} color="#C0392B"/><span style={{fontSize:13,fontWeight:700,color:'#C0392B'}}>{totalAlerts} تنبيه</span></div>}
      </div>
      {totalAlerts>0&&(
        <div className="card" style={{padding:20,marginBottom:20,borderRight:'4px solid #C0392B'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}><AlertTriangle size={18} color="#C0392B"/><span style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,color:'#C0392B'}}>تنبيهات الوثائق والتراخيص</span></div>
          <AlertRow type="red" title="منتهية الصلاحية" items={alerts.expired}/>
          <AlertRow type="amber" title="تنتهي خلال 30 يوم" items={alerts.expiringSoon}/>
          <AlertRow type="blue" title="تنتهي خلال 60 يوم" items={alerts.expiringLater}/>
          <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
            {[{id:'technicians',l:'الفنيون'},{id:'vehicles',l:'المركبات'},{id:'company_docs',l:'وثائق الشركة'}].map(b=>(
              <button key={b.id} onClick={()=>onNav(b.id)} style={{fontSize:12,background:'none',border:'1px solid var(--cs-border)',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:'var(--cs-text-muted)'}}>← {b.l}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <StatCard label="العملاء" value={stats.cc} icon={Users} color="var(--cs-blue)"/>
        <StatCard label="مشاريع جارية" value={stats.pc} icon={FolderOpen} color="var(--cs-green)"/>
        <StatCard label="الفنيون النشطون" value={stats.tc} icon={UserCheck} color="var(--cs-orange)"/>
        <StatCard label="إجمالي الفواتير" value={fmt(stats.totalInv)} icon={DollarSign} color="var(--cs-blue)"/>
        <StatCard label="المحصّل" value={fmt(stats.totalPaid)} icon={TrendingUp} color="var(--cs-green)"/>
        <StatCard label="فواتير متأخرة" value={stats.oc} icon={AlertCircle} color="var(--cs-red)"/>
        <StatCard label="صيانة متأخرة" value={stats.mo} icon={Wrench} color="var(--cs-orange)"/>
        <StatCard label="مخزون منخفض" value={stats.ls} icon={Package} color="var(--cs-red)"/>
      </div>
      <div className="card" style={{padding:20}}>
        <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:16}}>أحدث المشاريع</div>
        {recentProjects.length===0?<div style={{textAlign:'center',color:'var(--cs-text-muted)',padding:30}}>لا توجد مشاريع بعد</div>:(
          <div className="table-wrap"><table><thead><tr><th>اسم المشروع</th><th>الحالة</th><th>الإنجاز</th></tr></thead>
          <tbody>{recentProjects.map((p,i)=>(
            <tr key={i}>
              <td style={{fontWeight:600}}>{p.project_name}</td>
              <td><span className={`badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-blue':'badge-gray'}`}>{p.status}</span></td>
              <td><div style={{display:'flex',alignItems:'center',gap:8,minWidth:100}}>
                <div style={{flex:1,background:'var(--cs-border)',borderRadius:4,height:6}}><div style={{width:`${p.completion_pct||0}%`,background:'var(--cs-blue)',height:6,borderRadius:4}}/></div>
                <span style={{fontSize:12,color:'var(--cs-text-muted)',minWidth:30}}>{p.completion_pct||0}%</span>
              </div></td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  // ─── Auth ─────────────────────────────────────────
  const [session, setSession] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_,s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'linear-gradient(135deg,#0F4C81,#1E9CD7)',fontFamily:'Tajawal,sans-serif'}}>
      <div style={{color:'white',fontSize:16,fontWeight:600}}>⏳ جاري التحقق...</div>
    </div>
  )

  if (!session) return <LoginPage onLogin={() => supabase.auth.getSession().then(({data:{session}})=>setSession(session))}/>

  // ─── App ──────────────────────────────────────────
  const [page,setPage]=useState('dashboard')
  const [open,setOpen]=useState<string[]>(['crm','ops'])
  const [mob,setMob]=useState(false)
  const nav=(id:string)=>{setPage(id);setMob(false)}

  function renderPage() {
    switch(page) {
      case 'dashboard':         return <DashboardAny onNav={nav}/>
      case 'clients':           return <ClientsPage/>
      case 'projects':          return <ProjectsPage/>
      case 'technicians':       return <TechniciansPage/>
      case 'invoices':          return <InvoicesPage/>
      case 'maintenance':       return <MaintenancePage/>
      case 'maint_report':      return <MaintReportPage/>
      case 'inventory':         return <InventoryPage/>
      case 'expenses':          return <ExpensesPage/>
      case 'contracts':         return <ContractsPage/>
      case 'vehicles':          return <VehiclesPage/>
      case 'company_docs':      return <CompanyDocsPage/>
      case 'quotations':        return <QuotationsPage/>
      case 'daily_logs':        return <DailyLogsPage/>
      case 'punch_list':        return <PunchListPage/>
      case 'hr_attendance':     return <HRAttendancePage/>
      case 'call_center':       return <CallCenterPage/>
      case 'commissions':       return <CommissionsPage/>
      case 'dispatch':          return <DispatchBoardPage/>
      case 'wip':               return <WIPPage/>
      case 'job_costing':       return <JobCostingPage/>
      case 'retention':         return <RetentionPage/>
      case 'pricebook':         return <PricebookPage/>
      case 'recurring_jobs':    return <RecurringJobsPage/>
      case 'freon':             return <FreonPage/>
      case 'purchase_orders':   return <PurchaseOrdersPage/>
      case 'equipment':         return <EquipmentPage/>
      case 'warranty':          return <WarrantyPage/>
      case 'contractors':       return <ContractorPage/>
      case 'customer_followup': return <CustomerFollowupPage/>
      case 'leaderboard':       return <TechLeaderboardPage/>
      case 'gantt':             return <GanttPage/>
      case 'print_project':     return <PrintProjectPage/>
      case 'reports':           return <ReportsPage/>
      case 'settings_page':     return <SettingsPage/>
      case 'unsold_estimates':  return <UnsoldEstimatesPage/>
      case 'amc_dashboard':     return <AMCDashboardPage/>
      case 'capacity_plan':     return <CapacityPlanPage/>
      case 'client_card':       return <ClientCardPage/>
      case 'job_checklists':    return <JobChecklistsPage/>
      case 'multi_quotes':      return <MultiQuotesPage/>
      case 'monthly_report':    return <MonthlyReportPage/>
      case 'supplier_compare':  return <SupplierComparePage/>
      case 'cash_flow':         return <CashFlowPage/>
      case 'flat_rate':         return <FlatRatePage/>
      case 'copper_pipe':       return <CopperPipePage/>
      case 'duct_works':        return <DuctWorksPage/>
      default: return <div style={{textAlign:'center',padding:60,color:'var(--cs-text-muted)'}}><BarChart3 size={40} style={{marginBottom:12,opacity:0.3}}/><div style={{fontWeight:600}}>قيد التطوير</div></div>
    }
  }

  const SidebarContent=()=>(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--cs-border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{background:'var(--cs-blue)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center'}}><Building2 size={18} color="white"/></div>
          <div>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:13,color:'var(--cs-text)',lineHeight:1.2}}>COOL SEASONS</div>
            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>DARAJA.STORE</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
        {NAV.map(item=>(
          <div key={item.id}>
            {item.children?(
              <div>
                <div className="nav-item" onClick={()=>setOpen(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])} style={{justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><item.icon size={16}/><span>{item.label}</span></div>
                  <ChevronDown size={14} style={{transform:open.includes(item.id)?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
                </div>
                <div style={{paddingRight:26,marginBottom:4,display:open.includes(item.id)?'block':'none'}}>
                    {item.children.map(c=>(
                      <div key={c.id} className={`nav-item ${page===c.id?'active':''}`} onClick={()=>nav(c.id)} style={{fontSize:13,padding:'7px 12px'}}>{c.label}</div>
                    ))}
                  </div>
              </div>
            ):(
              <div className={`nav-item ${page===item.id?'active':''}`} onClick={()=>nav(item.id)}><item.icon size={16}/><span>{item.label}</span></div>
            )}
          </div>
        ))}
      </nav>
      <div style={{padding:'12px 10px',borderTop:'1px solid var(--cs-border)'}}>
        <div className={`nav-item ${page==='settings_page'?'active':''}`} onClick={()=>nav('settings_page')}><Settings size={16}/><span>الإعدادات</span></div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <aside style={{width:240,background:'white',borderLeft:'1px solid var(--cs-border)',position:'fixed',top:0,right:0,height:'100vh',zIndex:50,overflowY:'auto'}} className="sidebar">{SidebarContent()}</aside>
      {mob&&<>
        <div onClick={()=>setMob(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99}}/>
        <aside style={{width:260,background:'white',position:'fixed',top:0,right:0,height:'100vh',zIndex:100,overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:16,borderBottom:'1px solid var(--cs-border)'}}>
            <span style={{fontWeight:700}}>القائمة</span>
            <button onClick={()=>setMob(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
          </div>
          {SidebarContent()}
        </aside>
      </>}
      <main className="main-content" style={{flex:1,marginRight:240,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <header style={{background:'white',borderBottom:'1px solid var(--cs-border)',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <button onClick={()=>setMob(true)} style={{background:'none',border:'none',cursor:'pointer'}} id="mob-btn"><Menu size={22}/></button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,background:'var(--cs-green)',borderRadius:'50%'}}/>
            <span style={{fontSize:12,color:'var(--cs-text-muted)'}}>متصل بـ Supabase</span>
            <button onClick={()=>supabase.auth.signOut()} style={{marginRight:8,background:'#FEF2F2',color:'#DC2626',border:'1px solid #FCA5A5',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>خروج 🚪</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Bell size={18} color="var(--cs-text-muted)" style={{cursor:'pointer'}}/>
            <div style={{width:32,height:32,background:'var(--cs-blue)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700}}>م</div>
          </div>
        </header>
        <div style={{flex:1,padding:24}}>{renderPage()}</div>
      </main>
      <nav id="mob-nav" style={{display:'none',position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid var(--cs-border)',zIndex:100,padding:'6px 0'}}>
        {MOBILE_NAV.map(item=>(
          <button key={item.id} onClick={()=>nav(item.id)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 0',color:page===item.id?'var(--cs-blue)':'var(--cs-text-muted)',fontSize:10,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>
            <item.icon size={20}/>{item.label}
          </button>
        ))}
      </nav>
      <style>{`@media(max-width:768px){.sidebar{display:none!important}.main-content{margin-right:0!important;padding-bottom:70px}#mob-nav{display:flex!important}#mob-btn{display:flex!important}}@media(min-width:769px){#mob-btn{display:none!important}}`}</style>
    </div>
  )
}
