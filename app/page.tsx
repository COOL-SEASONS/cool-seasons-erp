'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Users, FolderOpen, Wrench, DollarSign, Package, UserCheck, FileText, Bell, ChevronDown, AlertCircle, TrendingUp, Building2, Settings, Menu, X, BarChart3 } from 'lucide-react'
import ClientsPage from '@/components/pages/ClientsPage'
import ProjectsPage from '@/components/pages/ProjectsPage'
import TechniciansPage from '@/components/pages/TechniciansPage'
import InvoicesPage from '@/components/pages/InvoicesPage'
import MaintenancePage from '@/components/pages/MaintenancePage'
import InventoryPage from '@/components/pages/InventoryPage'
import ExpensesPage from '@/components/pages/ExpensesPage'
import ContractsPage from '@/components/pages/ContractsPage'

const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM', icon: Users, children: [
    { id: 'clients', label: 'العملاء' },
    { id: 'call_center', label: 'Call Center' },
  ]},
  { id: 'ops', label: 'العمليات', icon: FolderOpen, children: [
    { id: 'projects', label: 'المشاريع' },
    { id: 'invoices', label: 'الفواتير' },
    { id: 'expenses', label: 'المصروفات' },
  ]},
  { id: 'maint_grp', label: 'الصيانة', icon: Wrench, children: [
    { id: 'maintenance', label: 'جدول الصيانة' },
  ]},
  { id: 'hr_grp', label: 'الموارد البشرية', icon: UserCheck, children: [
    { id: 'technicians', label: 'الفنيون' },
  ]},
  { id: 'inv_grp', label: 'المخزون', icon: Package, children: [
    { id: 'inventory', label: 'المخزون' },
  ]},
  { id: 'con_grp', label: 'العقود', icon: FileText, children: [
    { id: 'contracts', label: 'عقود AMC' },
  ]},
]

const MOBILE_NAV = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'clients', label: 'العملاء', icon: Users },
  { id: 'projects', label: 'المشاريع', icon: FolderOpen },
  { id: 'maintenance', label: 'الصيانة', icon: Wrench },
  { id: 'invoices', label: 'الفواتير', icon: DollarSign },
]

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--cs-text-muted)', fontWeight:600, marginBottom:6 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:800, color:'var(--cs-text)', fontFamily:'Cairo,sans-serif' }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize:12, color:'var(--cs-text-muted)', marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ background:color+'20', borderRadius:10, padding:10 }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [
        { count: cc }, { count: pc }, { count: tc },
        { data: invData }, { count: oc }, { count: ls },
        { data: projs }, { count: mo },
      ] = await Promise.all([
        supabase.from('clients').select('*',{count:'exact',head:true}),
        supabase.from('projects').select('*',{count:'exact',head:true}).eq('status','In Progress'),
        supabase.from('technicians').select('*',{count:'exact',head:true}).eq('status','Active'),
        supabase.from('invoices').select('total_amount,paid_amount'),
        supabase.from('invoices').select('*',{count:'exact',head:true}).eq('status','Overdue'),
        supabase.from('inventory').select('*',{count:'exact',head:true}).eq('status','Low Stock'),
        supabase.from('projects').select('project_name,status,completion_pct').order('created_at',{ascending:false}).limit(5),
        supabase.from('maintenance').select('*',{count:'exact',head:true}).eq('status','Overdue'),
      ])
      const totalInv = invData?.reduce((s,r)=>s+(r.total_amount||0),0)||0
      const totalPaid = invData?.reduce((s,r)=>s+(r.paid_amount||0),0)||0
      setStats({ cc, pc, tc, totalInv, totalPaid, oc, ls, mo })
      setRecentProjects(projs||[])
      const a:any[]=[]
      if (oc) a.push({type:'red',msg:`${oc} فاتورة متأخرة`})
      if (mo) a.push({type:'amber',msg:`${mo} صيانة متأخرة`})
      if (ls) a.push({type:'blue',msg:`${ls} صنف مخزون منخفض`})
      setAlerts(a)
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n)+' ر.س'

  if (loading) return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>{[...Array(8)].map((_,i)=><div key={i} className="skeleton" style={{height:100}}/>)}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">لوحة التحكم</div>
          <div className="page-subtitle">COOL SEASONS & DARAJA.STORE</div>
        </div>
      </div>
      {alerts.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {alerts.map((a,i)=>(
            <div key={i} className={`badge badge-${a.type}`} style={{padding:'10px 14px',borderRadius:8,fontSize:13,display:'flex',alignItems:'center',gap:8}}>
              <AlertCircle size={15}/> {a.msg}
            </div>
          ))}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:14,marginBottom:24}}>
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
        {recentProjects.length===0
          ? <div style={{textAlign:'center',color:'var(--cs-text-muted)',padding:30}}>لا توجد بيانات بعد — ابدأ بإضافة مشاريع</div>
          : <div className="table-wrap"><table><thead><tr><th>اسم المشروع</th><th>الحالة</th><th>الإنجاز</th></tr></thead>
            <tbody>{recentProjects.map((p,i)=>(
              <tr key={i}>
                <td style={{fontWeight:600}}>{p.project_name}</td>
                <td><span className={`badge ${p.status==='Completed'?'badge-green':p.status==='In Progress'?'badge-blue':'badge-gray'}`}>{p.status}</span></td>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1,background:'var(--cs-border)',borderRadius:4,height:6}}>
                      <div style={{width:`${p.completion_pct||0}%`,background:'var(--cs-blue)',height:6,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:12,color:'var(--cs-text-muted)',minWidth:30}}>{p.completion_pct||0}%</span>
                  </div>
                </td>
              </tr>
            ))}</tbody></table></div>
        }
      </div>
    </div>
  )
}

export default function Home() {
  const [page, setPage] = useState('dashboard')
  const [open, setOpen] = useState<string[]>(['crm','ops'])
  const [mob, setMob] = useState(false)

  const nav = (id:string) => { setPage(id); setMob(false) }

  function renderPage() {
    switch(page) {
      case 'dashboard':   return <Dashboard/>
      case 'clients':     return <ClientsPage/>
      case 'projects':    return <ProjectsPage/>
      case 'technicians': return <TechniciansPage/>
      case 'invoices':    return <InvoicesPage/>
      case 'maintenance': return <MaintenancePage/>
      case 'inventory':   return <InventoryPage/>
      case 'expenses':    return <ExpensesPage/>
      case 'contracts':   return <ContractsPage/>
      default: return (
        <div style={{textAlign:'center',padding:60,color:'var(--cs-text-muted)'}}>
          <BarChart3 size={40} style={{marginBottom:12,opacity:0.3}}/>
          <div style={{fontWeight:600}}>هذه الصفحة قيد التطوير</div>
        </div>
      )
    }
  }

  const SidebarContent = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--cs-border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{background:'var(--cs-blue)',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Building2 size={18} color="white"/>
          </div>
          <div>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:13,color:'var(--cs-text)',lineHeight:1.2}}>COOL SEASONS</div>
            <div style={{fontSize:10,color:'var(--cs-text-muted)'}}>DARAJA.STORE</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
        {NAV.map(item=>(
          <div key={item.id}>
            {item.children ? (
              <div>
                <div className="nav-item" onClick={()=>setOpen(p=>p.includes(item.id)?p.filter(x=>x!==item.id):[...p,item.id])} style={{justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}><item.icon size={16}/><span>{item.label}</span></div>
                  <ChevronDown size={14} style={{transform:open.includes(item.id)?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
                </div>
                {open.includes(item.id) && (
                  <div style={{paddingRight:26,marginBottom:4}}>
                    {item.children.map(c=>(
                      <div key={c.id} className={`nav-item ${page===c.id?'active':''}`} onClick={()=>nav(c.id)} style={{fontSize:13,padding:'7px 12px'}}>{c.label}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={`nav-item ${page===item.id?'active':''}`} onClick={()=>nav(item.id)}>
                <item.icon size={16}/><span>{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div style={{padding:'12px 10px',borderTop:'1px solid var(--cs-border)'}}>
        <div className="nav-item"><Settings size={16}/><span>الإعدادات</span></div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* Desktop sidebar */}
      <aside style={{width:240,background:'white',borderLeft:'1px solid var(--cs-border)',position:'fixed',top:0,right:0,height:'100vh',zIndex:50,overflowY:'auto'}} className="sidebar">
        <SidebarContent/>
      </aside>

      {/* Mobile overlay */}
      {mob && <>
        <div onClick={()=>setMob(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99}}/>
        <aside style={{width:260,background:'white',position:'fixed',top:0,right:0,height:'100vh',zIndex:100,overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:16,borderBottom:'1px solid var(--cs-border)'}}>
            <span style={{fontWeight:700}}>القائمة</span>
            <button onClick={()=>setMob(false)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={20}/></button>
          </div>
          <SidebarContent/>
        </aside>
      </>}

      <main className="main-content" style={{flex:1,marginRight:240,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <header style={{background:'white',borderBottom:'1px solid var(--cs-border)',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <button onClick={()=>setMob(true)} style={{background:'none',border:'none',cursor:'pointer'}} id="mob-btn"><Menu size={22}/></button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,background:'var(--cs-green)',borderRadius:'50%'}}/>
            <span style={{fontSize:12,color:'var(--cs-text-muted)'}}>متصل بـ Supabase</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Bell size={18} color="var(--cs-text-muted)" style={{cursor:'pointer'}}/>
            <div style={{width:32,height:32,background:'var(--cs-blue)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700}}>م</div>
          </div>
        </header>
        <div style={{flex:1,padding:24}}>{renderPage()}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav id="mob-nav" style={{display:'none',position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid var(--cs-border)',zIndex:100,padding:'6px 0'}}>
        {MOBILE_NAV.map(item=>(
          <button key={item.id} onClick={()=>nav(item.id)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 0',color:page===item.id?'var(--cs-blue)':'var(--cs-text-muted)',fontSize:10,fontFamily:'Tajawal,sans-serif',fontWeight:600}}>
            <item.icon size={20}/>{item.label}
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
      `}</style>
    </div>
  )
}
