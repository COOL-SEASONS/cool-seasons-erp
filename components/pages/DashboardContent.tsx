'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, FileWarning } from 'lucide-react'

const fmt = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:0})
const fmtMoney = (n:number) => Number(n||0).toLocaleString('ar-SA',{maximumFractionDigits:0})

export default function DashboardContent(){
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({
    // Top alerts (8)
    invoicesOverdue: 0,
    maintenanceOverdue: 0,
    companyDocsExpired: 0,
    docs60Days: 0,
    punchListOverdue: 0,
    residencyExpiring: 0,
    expiredVehicleDocs: 0,
    vehicleViolations: 0,
    
    // Financial (8)
    totalInvoiced: 0,
    totalCollected: 0,
    balanceDue: 0,
    overdueAmount: 0,
    contractsValue: 0,
    netProfit: 0,
    activeAMC: 0,
    retention: 0,
    
    // Operations (8)
    activeProjects: 0,
    openMaintenance: 0,
    maintReportsMonth: 0,
    sentQuotes: 0,
    overdueRecurring: 0,
    openPOs: 0,
    pendingExpenses: 0,
    
    // People & Assets (5)
    activeTechs: 0,
    warrantyExpiring: 0,
    dueCommissions: 0,
    lowStockItems: 0,
    activeContractors: 0,
    
    // Detail
    docsDetail: []
  })

  useEffect(() => {
    load()
  }, [])

  const safeFetch = async (table:string) => {
    try {
      const r = await supabase.from(table).select('*')
      return r.data || []
    } catch (e) {
      return []
    }
  }

  const load = async () => {
    setLoading(true)
    const now = new Date()
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const in60Days = new Date(now.getTime() + 60*24*60*60*1000).toISOString().split('T')[0]
    const in14Days = new Date(now.getTime() + 14*24*60*60*1000).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]

    const [
      invoices, projects, maintenance, expenses, 
      techs, docs, quotes, contracts,
      vehicles, commissions, contractors, pos, punchList,
      recurring, warranties, inventory
    ] = await Promise.all([
      safeFetch('invoices'),
      safeFetch('projects'),
      safeFetch('maintenance'),
      safeFetch('expenses'),
      safeFetch('technicians'),
      safeFetch('company_docs'),
      safeFetch('quotes'),
      safeFetch('contracts_amc'),
      safeFetch('vehicles'),
      safeFetch('commissions'),
      safeFetch('contractors'),
      safeFetch('purchase_orders'),
      safeFetch('punch_list'),
      safeFetch('recurring_works'),
      safeFetch('warranty_tracking'),
      safeFetch('inventory')
    ])

    // ═══════ شريط التنبيهات (8) ═══════
    const invoicesOverdue = invoices.filter((i:any) => 
      i.status !== 'Paid' && i.due_date && i.due_date < today
    ).length

    const maintenanceOverdue = maintenance.filter((m:any) =>
      m.status !== 'Completed' && m.scheduled_date && m.scheduled_date < today
    ).length

    const companyDocsExpired = docs.filter((d:any) =>
      d.expiry_date && d.expiry_date < today
    ).length

    const docs60Days = docs.filter((d:any) =>
      d.expiry_date && d.expiry_date >= today && d.expiry_date <= in60Days
    ).length

    const punchListOverdue = punchList.filter((p:any) =>
      p.status !== 'Completed' && p.due_date && p.due_date < today
    ).length

    const residencyExpiring = techs.filter((t:any) => 
      t.residency_expiry && t.residency_expiry >= today && t.residency_expiry <= in14Days
    ).length

    const expiredVehicleDocs = vehicles.reduce((s:number,v:any) => {
      const expired = ['istimara_expiry','insurance_expiry','license_expiry']
        .filter((f:string) => v[f] && v[f] < today).length
      return s + expired
    }, 0)

    const vehicleViolations = vehicles.reduce((s:number,v:any) => 
      s + (v.violations_count || 0), 0
    )

    // ═══════ القسم المالي ═══════
    const totalInvoiced = invoices.reduce((s:number,i:any) => s + (i.total_amount || i.amount || 0), 0)
    const totalCollected = invoices.filter((i:any) => i.status === 'Paid').reduce((s:number,i:any) => s + (i.total_amount || i.amount || 0), 0)
    const balanceDue = totalInvoiced - totalCollected
    const overdueAmount = invoices.filter((i:any) => 
      i.status !== 'Paid' && i.due_date && i.due_date < today
    ).reduce((s:number,i:any) => s + (i.total_amount || i.amount || 0), 0)
    
    const contractsValue = contracts.reduce((s:number,c:any) => s + (c.contract_value || c.value || 0), 0)
    const totalExpensesApproved = expenses.filter((e:any) => 
      e.status === 'Approved' && e.transaction_type === 'صرف'
    ).reduce((s:number,e:any) => s + (e.amount || 0), 0)
    const netProfit = totalCollected - totalExpensesApproved
    
    const activeAMC = contracts.filter((c:any) => 
      c.status === 'Active' && (!c.end_date || c.end_date >= today)
    ).length
    
    const retention = invoices.reduce((s:number,i:any) => s + (i.retention_amount || 0), 0)

    // ═══════ العمليات ═══════
    const activeProjects = projects.filter((p:any) => 
      ['New','In Progress','Active'].includes(p.status)
    ).length
    
    const openMaintenance = maintenance.filter((m:any) => 
      ['Open','Pending','In Progress'].includes(m.status)
    ).length
    
    const maintReportsMonth = maintenance.filter((m:any) => 
      m.completed_date && m.completed_date >= firstDayMonth
    ).length
    
    const sentQuotes = quotes.filter((q:any) => 
      ['Sent','Pending'].includes(q.status)
    ).length
    
    const overdueRecurring = recurring.filter((r:any) => 
      r.status !== 'Completed' && r.next_date && r.next_date < today
    ).length
    
    const openPOs = pos.filter((p:any) => 
      ['Open','Pending'].includes(p.status)
    ).length
    
    const pendingExpenses = expenses.filter((e:any) => e.status === 'Pending').length

    // ═══════ الموارد ═══════
    const activeTechs = techs.filter((t:any) => t.status === 'Active').length
    
    const warrantyExpiring = warranties.filter((w:any) => 
      w.expiry_date && w.expiry_date >= today && w.expiry_date <= in60Days
    ).length
    
    const dueCommissions = commissions.filter((c:any) => 
      c.status === 'Due' || c.status === 'Pending'
    ).reduce((s:number,c:any) => s + (c.amount || 0), 0)
    
    const lowStockItems = inventory.filter((i:any) => 
      i.current_qty < (i.min_qty || 5)
    ).length
    
    const activeContractors = contractors.filter((c:any) => c.status === 'Active').length

    // تفاصيل الوثائق
    const docsDetail = docs.map((d:any) => {
      if (!d.expiry_date) return null
      const expiry = new Date(d.expiry_date)
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000*60*60*24))
      if (daysLeft < 0) return {...d, daysLeft, status: 'expired'}
      if (daysLeft <= 60) return {...d, daysLeft, status: 'soon'}
      return null
    }).filter(Boolean).sort((a:any,b:any) => a.daysLeft - b.daysLeft)

    setData({
      invoicesOverdue, maintenanceOverdue, companyDocsExpired, docs60Days, punchListOverdue,
      residencyExpiring, expiredVehicleDocs, vehicleViolations,
      totalInvoiced, totalCollected, balanceDue, overdueAmount,
      contractsValue, netProfit, activeAMC, retention,
      activeProjects, openMaintenance, maintReportsMonth, 
      sentQuotes, overdueRecurring, openPOs, pendingExpenses,
      activeTechs, warrantyExpiring, dueCommissions,
      lowStockItems, activeContractors,
      docsDetail
    })
    setLoading(false)
  }

  if (loading) return <div style={{padding:'4rem',textAlign:'center',color:'#94A3B8',fontSize:14}}>جاري التحميل...</div>

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      background: 'linear-gradient(180deg, #F8FBFF 0%, #F0F6FD 100%)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <div style={{
            fontSize: 10,
            color: '#94A3B8',
            letterSpacing: 2,
            fontWeight: 700,
            marginBottom: 4
          }}>
            COOL SEASONS · DARAJA.STORE
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            fontFamily: 'Tajawal, Cairo, sans-serif'
          }}>
            🏢 لوحة التحكم
          </h1>
          <div style={{fontSize:12, color:'#64748B', marginTop:4}}>
            HVAC Management v15 · {new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.85)',
          padding: '7px 12px',
          borderRadius: 10,
          border: '1px solid rgba(30, 156, 215, 0.15)',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: '#16A34A',
            boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.15)'
          }}/>
          <span style={{fontSize:11, color:'#475569', fontWeight:600}}>متصل بـ Supabase</span>
        </div>
      </div>

      {/* ═══════════ شريط التنبيهات العلوي (8 تنبيهات) ═══════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF1F1 0%, #FEF2F2 100%)',
        border: '1px solid #FCA5A5',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 16,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(239, 68, 68, 0.05)'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:6,paddingLeft:10,borderLeft:'2px solid #FCA5A5'}}>
          <AlertTriangle size={14} color="#DC2626"/>
          <span style={{fontSize:11, fontWeight:800, color:'#991B1B'}}>تنبيهات</span>
        </div>
        
        <AlertChip label="فواتير متأخرة" value={data.invoicesOverdue}/>
        <AlertChip label="صيانة متأخرة" value={data.maintenanceOverdue}/>
        <AlertChip label="وثائق منتهية" value={data.companyDocsExpired}/>
        <AlertChip label="وثائق 60 يوم" value={data.docs60Days} warning/>
        <AlertChip label="Punch List" value={data.punchListOverdue}/>
        <AlertChip label="إقامات تنتهي" value={data.residencyExpiring} warning/>
        <AlertChip label="وثائق مركبات" value={data.expiredVehicleDocs}/>
        <AlertChip label="مخالفات المركبات" value={data.vehicleViolations} warning/>
      </div>

      {/* ═══════════ تفاصيل الوثائق ═══════════ */}
      {data.docsDetail.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFFBF0 0%, #FEF9E7 100%)',
          border: '1px solid #FCD34D',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <FileWarning size={14} color="#F59E0B"/>
            <span style={{fontSize:12, fontWeight:800, color:'#78350F'}}>تفاصيل الوثائق</span>
            <span style={{fontSize:10, color:'#92400E',marginRight:'auto'}}>{data.docsDetail.length} وثيقة</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:8}}>
            {data.docsDetail.slice(0,6).map((d:any, i:number) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: 8,
                padding: '7px 11px',
                border: `1px solid ${d.status==='expired'?'#FCA5A5':'#FCD34D'}`
              }}>
                <div style={{fontSize:11, fontWeight:700, color:'#1E293B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{d.doc_name || d.document_type || 'وثيقة'}</div>
                <div style={{fontSize:10, color: d.status==='expired'?'#DC2626':'#D97706', fontWeight:600}}>
                  {d.status === 'expired' ? `منتهية منذ ${Math.abs(d.daysLeft)} يوم` : `تنتهي خلال ${d.daysLeft} يوم`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ القسم 1: المالي (8 KPIs) ═══════ */}
      <SectionHeader icon="💰" title="الملف المالي" subtitle="FINANCIAL OVERVIEW" color="#1E9CD7"/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginBottom:18}}>
        <KPICard label="إجمالي الفواتير" sub="Total Invoiced" value={fmtMoney(data.totalInvoiced)} unit="ر.س" color="#1E9CD7" grad="linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%)"/>
        <KPICard label="المحصّل" sub="Collected" value={fmtMoney(data.totalCollected)} unit="ر.س" color="#16A34A" grad="linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)"/>
        <KPICard label="الرصيد المتبقي" sub="Balance Due" value={fmtMoney(data.balanceDue)} unit="ر.س" color="#D97706" grad="linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)"/>
        <KPICard label="فواتير متأخرة" sub="Overdue" value={fmtMoney(data.overdueAmount)} unit="ر.س" color="#DC2626" grad="linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)"/>
        <KPICard label="قيمة العقود" sub="Contracts Value" value={fmtMoney(data.contractsValue)} unit="ر.س" color="#7C3AED" grad="linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)"/>
        <KPICard label="إجمالي الربح ✦" sub="Net Profit" value={fmtMoney(data.netProfit)} unit="ر.س" color={data.netProfit>=0?"#15803D":"#DC2626"} grad={data.netProfit>=0?"linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)":"linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)"}/>
        <KPICard label="عقود AMC نشطة" sub="Active AMC" value={fmt(data.activeAMC)} unit="عقد" color="#0891B2" grad="linear-gradient(135deg, #CFFAFE 0%, #ECFEFF 100%)"/>
        <KPICard label="الضمان المحتجز" sub="Retention" value={fmtMoney(data.retention)} unit="ر.س" color="#64748B" grad="linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)"/>
      </div>

      {/* ═══════ القسم 2: العمليات (7 KPIs) ═══════ */}
      <SectionHeader icon="⚙️" title="العمليات" subtitle="OPERATIONS" color="#7C3AED"/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginBottom:18}}>
        <KPICard label="مشاريع نشطة" sub="Active Projects" value={fmt(data.activeProjects)} unit="مشروع" color="#7C3AED" grad="linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)"/>
        <KPICard label="صيانة مفتوحة" sub="Open Maintenance" value={fmt(data.openMaintenance)} color="#1E9CD7" grad="linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%)"/>
        <KPICard label="تقارير صيانة" sub="Reports / Month" value={fmt(data.maintReportsMonth)} unit="هذا الشهر" color="#16A34A" grad="linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)"/>
        <KPICard label="عروض مرسلة" sub="Sent Quotes" value={fmt(data.sentQuotes)} color="#D97706" grad="linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)"/>
        <KPICard label="أعمال متكررة متأخرة" sub="Overdue Recurring" value={fmt(data.overdueRecurring)} color="#DC2626" grad="linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)"/>
        <KPICard label="طلبات شراء مفتوحة" sub="Open POs" value={fmt(data.openPOs)} color="#0891B2" grad="linear-gradient(135deg, #CFFAFE 0%, #ECFEFF 100%)"/>
        <KPICard label="مصروفات معلقة" sub="Pending Expenses" value={fmt(data.pendingExpenses)} color="#F59E0B" grad="linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)"/>
      </div>

      {/* ═══════ القسم 3: الموارد (5 KPIs) ═══════ */}
      <SectionHeader icon="👷" title="الموارد والأصول" subtitle="PEOPLE & ASSETS" color="#16A34A"/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginBottom:18}}>
        <KPICard label="فنيون نشطون" sub="Active Techs" value={fmt(data.activeTechs)} unit="فني" color="#16A34A" grad="linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)"/>
        <KPICard label="ضمانات تنتهي" sub="Warranty Expiring" value={fmt(data.warrantyExpiring)} color="#7C3AED" grad="linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)"/>
        <KPICard label="عمولات مستحقة" sub="Due Commissions" value={fmtMoney(data.dueCommissions)} unit="ر.س" color="#0891B2" grad="linear-gradient(135deg, #CFFAFE 0%, #ECFEFF 100%)"/>
        <KPICard label="مخزون منخفض" sub="Low Stock" value={fmt(data.lowStockItems)} unit="صنف" color="#DC2626" grad="linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)"/>
        <KPICard label="مقاولون نشطون" sub="Active Contractors" value={fmt(data.activeContractors)} color="#64748B" grad="linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)"/>
      </div>

      <div style={{
        marginTop: 18,
        textAlign: 'center',
        fontSize: 10,
        color: '#94A3B8',
        letterSpacing: 1
      }}>
        COOL SEASONS ERP · Premium Light Edition · 8 Alerts + 20 KPIs
      </div>
    </div>
  )
}

function AlertChip({ label, value, warning = false }: any) {
  const isHigh = value > 0
  const color = warning ? '#D97706' : (isHigh ? '#DC2626' : '#64748B')
  const bg = warning ? '#FEF3C7' : (isHigh ? '#FEE2E2' : '#F1F5F9')
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: bg,
      padding: '4px 10px',
      borderRadius: 7,
      border: `1px solid ${color}33`
    }}>
      <span style={{fontSize:10, color, fontWeight:600}}>{label}:</span>
      <span style={{fontSize:12, fontWeight:900, color, fontFamily:'Cairo, sans-serif'}}>{value}</span>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle, color }: any) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      paddingRight: 4
    }}>
      <span style={{fontSize:20}}>{icon}</span>
      <div>
        <div style={{fontSize:15, fontWeight:800, color: '#0F172A', lineHeight:1}}>{title}</div>
        <div style={{fontSize:9, color: '#94A3B8', letterSpacing: 1, marginTop:2}}>{subtitle}</div>
      </div>
      <div style={{
        flex: 1,
        height: 1,
        background: `linear-gradient(90deg, ${color}40, transparent)`,
        marginRight: 12
      }}/>
    </div>
  )
}

function KPICard({ label, sub, value, unit, color, grad }: any) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '12px 14px',
      border: '1px solid rgba(15, 23, 42, 0.06)',
      boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 36,
        background: grad,
        opacity: 0.4
      }}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:11, color:'#1E293B', fontWeight:700, marginBottom:2}}>{label}</div>
        <div style={{fontSize:9, color:'#94A3B8', fontWeight:500, marginBottom:8, letterSpacing:0.5}}>{sub}</div>
        <div style={{
          fontSize: 20,
          fontWeight: 900,
          color: color,
          fontFamily: 'Cairo, sans-serif',
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}>
          {value}
          {unit && <span style={{fontSize:10, fontWeight:600, color:'#64748B', marginRight:3}}>{unit}</span>}
        </div>
      </div>
    </div>
  )
}
