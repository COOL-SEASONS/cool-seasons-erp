'use client'
import { useState } from 'react'
import {
  LayoutDashboard, Users, FolderOpen, Wrench, DollarSign, Package, UserCheck,
  FileText, Bell, ChevronDown, Settings, Menu, X, BarChart3, BarChart2
} from 'lucide-react'

import DashboardContent    from '@/components/pages/DashboardContent'
import ClientsPage         from '@/components/pages/ClientsPage'
import ProjectsPage        from '@/components/pages/ProjectsPage'
import TechniciansPage     from '@/components/pages/TechniciansPage'
import InvoicesPage        from '@/components/pages/InvoicesPage'
import MaintenancePage     from '@/components/pages/MaintenancePage'
import MaintReportPage     from '@/components/pages/MaintReportPage'
import InventoryPage       from '@/components/pages/InventoryPage'
import ExpensesPage        from '@/components/pages/ExpensesPage'
import ContractsPage       from '@/components/pages/ContractsPage'
import VehiclesPage        from '@/components/pages/VehiclesPage'
import CompanyDocsPage     from '@/components/pages/CompanyDocsPage'
import QuotationsPage      from '@/components/pages/QuotationsPage'
import DailyLogsPage       from '@/components/pages/DailyLogsPage'
import PunchListPage       from '@/components/pages/PunchListPage'
import ChangeOrdersPage    from '@/components/pages/ChangeOrdersPage'
import HRAttendancePage    from '@/components/pages/HRAttendancePage'
import CallCenterPage      from '@/components/pages/CallCenterPage'
import CommissionsPage     from '@/components/pages/CommissionsPage'
import DispatchBoardPage   from '@/components/pages/DispatchBoardPage'
import WIPPage             from '@/components/pages/WIPPage'
import JobCostingPage      from '@/components/pages/JobCostingPage'
import RetentionPage       from '@/components/pages/RetentionPage'
import PricebookPage       from '@/components/pages/PricebookPage'
import RecurringJobsPage   from '@/components/pages/RecurringJobsPage'
import FreonPage           from '@/components/pages/FreonPage'
import PurchaseOrdersPage  from '@/components/pages/PurchaseOrdersPage'
import EquipmentPage       from '@/components/pages/EquipmentPage'
import WarrantyPage        from '@/components/pages/WarrantyPage'
import ContractorPage      from '@/components/pages/ContractorPage'
import CustomerFollowupPage from '@/components/pages/CustomerFollowupPage'
import TechLeaderboardPage from '@/components/pages/TechLeaderboardPage'
import GanttPage           from '@/components/pages/GanttPage'
import PrintProjectPage    from '@/components/pages/PrintProjectPage'
import ReportsPage         from '@/components/pages/ReportsPage'
import SettingsPage        from '@/components/pages/SettingsPage'
import UnsoldEstimatesPage from '@/components/pages/UnsoldEstimatesPage'
import AMCDashboardPage    from '@/components/pages/AMCDashboardPage'
import CapacityPlanPage    from '@/components/pages/CapacityPlanPage'
import ClientCardPage      from '@/components/pages/ClientCardPage'
import JobChecklistsPage   from '@/components/pages/JobChecklistsPage'
import MultiQuotesPage     from '@/components/pages/MultiQuotesPage'
import MonthlyReportPage   from '@/components/pages/MonthlyReportPage'
import SupplierComparePage from '@/components/pages/SupplierComparePage'
import CashFlowPage        from '@/components/pages/CashFlowPage'
import FlatRatePage        from '@/components/pages/FlatRatePage'
import CopperPipePage      from '@/components/pages/CopperPipePage'
import DuctWorksPage       from '@/components/pages/DuctWorksPage'

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
    {id:'change_orders',label:'أوامر التغيير'},
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

function getPageLabel(page: string) {
  for (const item of NAV) {
    if (item.id === page) return item.label
    if (item.children) {
      const child = item.children.find(c => c.id === page)
      if (child) return child.label
    }
  }
  return ''
}

export default function Home() {
  const [page, setPage] = useState('dashboard')
  const [open, setOpen] = useState<string[]>(['crm','ops'])
  const [mob,  setMob]  = useState(false)
  const nav = (id: string) => { setPage(id); setMob(false) }

  const isDashboard = page === 'dashboard'

  function renderPage() {
    switch(page) {
      case 'dashboard':         return <DashboardContent onNav={nav}/>
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
      case 'change_orders':     return <ChangeOrdersPage/>
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
      default: return (
        <div style={{textAlign:'center',padding:60,color:'var(--cs-text-muted)'}}>
          <BarChart3 size={40} style={{marginBottom:12,opacity:0.3}}/>
          <div style={{fontWeight:600}}>قيد التطوير</div>
        </div>
      )
    }
  }

  const SidebarContent = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      {/* ── Logo ── */}
      <div style={{padding:'18px 14px 14px',borderBottom:'1px solid rgba(34,211,238,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#22D3EE,#0891B2)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
              <g stroke="white" strokeWidth="3.5" strokeLinecap="round">
                <line x1="30" y1="8"  x2="30" y2="52"/>
                <line x1="10" y1="19" x2="50" y2="41"/>
                <line x1="10" y1="41" x2="50" y2="19"/>
                <line x1="23" y1="12" x2="30" y2="20"/>
                <line x1="37" y1="12" x2="30" y2="20"/>
                <line x1="23" y1="48" x2="30" y2="40"/>
                <line x1="37" y1="48" x2="30" y2="40"/>
              </g>
              <circle cx="30" cy="30" r="5" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:12.5,color:'#F1F5F9',lineHeight:1.3}}>مواسم البرودة</div>
            <div style={{fontFamily:'monospace',fontSize:8.5,color:'#22D3EE',letterSpacing:'1.5px',marginTop:1,fontWeight:600}}>COOL SEASONS ERP</div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{flex:1,padding:'10px 8px',overflowY:'auto'}}>
        {NAV.map(item => (
          <div key={item.id}>
            {item.children ? (
              <div>
                <div
                  className="nav-item"
                  onClick={() => setOpen(p => p.includes(item.id) ? p.filter(x=>x!==item.id) : [...p,item.id])}
                  style={{justifyContent:'space-between'}}
                >
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <item.icon size={14} style={{opacity:0.6}}/>
                    <span style={{fontSize:12.5,fontWeight:600}}>{item.label}</span>
                  </div>
                  <ChevronDown size={12} style={{transform:open.includes(item.id)?'rotate(180deg)':'none',transition:'transform 0.2s',opacity:0.4}}/>
                </div>
                {open.includes(item.id) && (
                  <div style={{paddingRight:23,marginBottom:2}}>
                    {item.children.map(c => (
                      <div
                        key={c.id}
                        className={`nav-item ${page===c.id?'active':''}`}
                        onClick={() => nav(c.id)}
                        style={{fontSize:12,padding:'6px 10px'}}
                      >
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`nav-item ${page===item.id?'active':''}`}
                onClick={() => nav(item.id)}
                style={{fontSize:13,fontWeight:700}}
              >
                <item.icon size={15}/><span>{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ── Settings ── */}
      <div style={{padding:'10px 8px',borderTop:'1px solid rgba(34,211,238,0.06)'}}>
        <div
          className={`nav-item ${page==='settings_page'?'active':''}`}
          onClick={() => nav('settings_page')}
          style={{fontSize:12.5}}
        >
          <Settings size={14}/><span>الإعدادات</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>

      {/* ── SIDEBAR (dark always) ── */}
      <aside className="sidebar" style={{
        width:240, background:'#0B1623',
        borderLeft:'1px solid rgba(34,211,238,0.08)',
        position:'fixed', top:0, right:0,
        height:'100vh', zIndex:50, overflowY:'auto',
      }}>
        <SidebarContent/>
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {mob && <>
        <div onClick={() => setMob(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:99}}/>
        <aside style={{width:260,background:'#0B1623',position:'fixed',top:0,right:0,height:'100vh',zIndex:100,overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid rgba(34,211,238,0.08)'}}>
            <span style={{fontWeight:700,color:'#E2E8F0',fontSize:13}}>القائمة</span>
            <button onClick={() => setMob(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#64748B'}}><X size={18}/></button>
          </div>
          <SidebarContent/>
        </aside>
      </>}

      {/* ── MAIN ── */}
      <main className="main-content" style={{
        flex:1, marginRight:240, minHeight:'100vh',
        display:'flex', flexDirection:'column',
        /* dashboard → dark bg | other pages → original light bg */
        background: isDashboard ? '#06080F' : 'var(--cs-gray-light)',
      }}>

        {/* ── HEADER (dark always) ── */}
        <header style={{
          background:'#080C16',
          borderBottom:'1px solid rgba(34,211,238,0.07)',
          padding:'0 22px', height:56,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:40,
        }}>
          <button onClick={() => setMob(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#475569'}} id="mob-btn">
            <Menu size={20}/>
          </button>

          <div style={{fontFamily:'monospace',fontSize:12,fontWeight:600,letterSpacing:'0.5px',
            color: isDashboard ? '#22D3EE' : '#94A3B8'}}>
            {isDashboard ? '⬡ MISSION CONTROL' : getPageLabel(page)}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(34,211,238,0.05)',border:'1px solid rgba(34,211,238,0.12)',borderRadius:20,padding:'3px 10px'}}>
              <div style={{width:6,height:6,background:'#22C55E',borderRadius:'50%',animation:'pulseLive 2s infinite'}}/>
              <span style={{fontSize:10,color:'#22D3EE',fontFamily:'monospace',fontWeight:600,letterSpacing:'0.5px'}}>LIVE</span>
            </div>
            <Bell size={16} color="#475569" style={{cursor:'pointer'}}/>
            <div style={{width:28,height:28,background:'linear-gradient(135deg,#22D3EE,#0891B2)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,fontWeight:700}}>م</div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div style={{flex:1, padding: isDashboard ? '18px 20px' : '24px'}}>
          {renderPage()}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav id="mob-nav" style={{display:'none',position:'fixed',bottom:0,left:0,right:0,background:'#0B1623',borderTop:'1px solid rgba(34,211,238,0.08)',zIndex:100,padding:'5px 0'}}>
        {MOBILE_NAV.map(item => (
          <button key={item.id} onClick={() => nav(item.id)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 0',color:page===item.id?'#22D3EE':'#475569',fontSize:10,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>
            <item.icon size={19}/>{item.label}
          </button>
        ))}
      </nav>

      <style>{`
        @media(max-width:768px){
          .sidebar{display:none!important}
          .main-content{margin-right:0!important;padding-bottom:70px}
          #mob-nav{display:flex!important}
          #mob-btn{display:flex!important}
        }
        @media(min-width:769px){#mob-btn{display:none!important}}
        @keyframes pulseLive{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  )
}
