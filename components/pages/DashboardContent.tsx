'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Arctic Luxury KPI Card
function KpiCard({ icon, label, value, unit, trend, trendType, accent, iconBg, onClick }: any) {
  const trendColors: any = {
    up: { bg: '#DCFCE7', color: '#16A34A' },
    down: { bg: '#FEE2E2', color: '#DC2626' },
    neutral: { bg: '#F1F5F9', color: '#64748B' },
  }
  const t = trendColors[trendType || 'neutral']
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 16,
        padding: '20px 22px',
        boxShadow: '0 4px 16px rgba(15, 27, 45, 0.04)',
        border: '1px solid rgba(226, 232, 240, 0.6)',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', background: accent }} />
      <div
        style={{
          width: 40, height: 40, background: iconBg, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, marginBottom: 12,
        }}
      >{icon}</div>
      <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B2D', lineHeight: 1.1, fontFamily: 'Cairo,sans-serif' }}>
        {value}{unit && <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginRight: 4 }}>{unit}</span>}
      </div>
      {trend && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            background: t.bg, color: t.color,
          }}
        >{trend}</span>
      )}
    </div>
  )
}

// Arctic Luxury Alert Item
function AlertItem({ icon, title, severity, desc, value, label, action, actionType, onAction, isLast }: any) {
  const sevStyles: any = {
    critical: { tagBg: '#FEE2E2', tagColor: '#DC2626', iconBg: '#FEE2E2', iconColor: '#DC2626' },
    warning:  { tagBg: '#FEF3C7', tagColor: '#D97706', iconBg: '#FEF3C7', iconColor: '#D97706' },
  }
  const s = sevStyles[severity] || sevStyles.warning
  const isDanger = actionType === 'danger'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: 16,
        alignItems: 'center',
        padding: '16px 0',
        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, background: s.iconBg, color: s.iconColor,
        }}
      >{icon}</div>
      <div>
        <div style={{ fontWeight: 700, color: '#0F1B2D', fontSize: 15, marginBottom: 3 }}>
          {title}
          {severity && (
            <span
              style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 700, marginRight: 8,
                background: s.tagBg, color: s.tagColor,
              }}
            >{severity === 'critical' ? 'حرج' : 'تحذير'}</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#64748B' }}>{desc}</div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 700, color: '#0F1B2D', fontSize: 15 }}>{value}</div>
        {label && <div style={{ fontSize: 12, color: '#94A3B8' }}>{label}</div>}
      </div>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: isDanger ? '#C0392B' : '#1E9CD7',
            color: 'white',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >{action}</button>
      )}
    </div>
  )
}

export default function DashboardContent({ onNav }: { onNav: (id: string) => void }) {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const today = new Date()
      const m1start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

      const [
        { data: inv }, { data: proj }, { data: maint },
        { data: techs }, { data: veh }, { data: docs }, { data: amcs },
        { data: quot }, { data: punches }, { data: recur },
        { data: po }, { data: exp }, { data: warranty },
        { data: comm }, { data: inv2 }, { data: contr },
        { data: maintRep }
      ] = await Promise.all([
        supabase.from('invoices').select('id,invoice_no,total_amount,paid_amount,balance,status,clients(company_name)'),
        supabase.from('projects').select('project_name,status,completion_pct,budget,actual_cost,end_date'),
        supabase.from('maintenance').select('status,cost,job_code,description'),
        supabase.from('technicians').select('full_name,status,residence_expiry,engineers_membership_exp'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,status,annual_value,end_date,clients(company_name)'),
        supabase.from('quotations').select('status,total_amount'),
        supabase.from('punch_list').select('status'),
        supabase.from('recurring_jobs').select('status'),
        supabase.from('purchase_orders').select('status').eq('status', 'Sent'),
        supabase.from('expenses').select('amount,transaction_type,status'),
        supabase.from('warranty_tracking').select('start_date,duration_months'),
        supabase.from('commissions').select('balance'),
        supabase.from('inventory').select('item_name,status,quantity,min_quantity'),
        supabase.from('contractors').select('status'),
        supabase.from('maint_reports').select('id').gte('created_at', m1start),
      ])

      // ===== FINANCIAL =====
      const totalInvoiced = (inv || []).reduce((s, r) => s + (r.total_amount || 0), 0)
      const totalCollected = (inv || []).reduce((s, r) => s + (r.paid_amount || 0), 0)
      const balanceDue = (inv || []).reduce((s, r) => s + (r.balance || 0), 0)
      const overdueCount = (inv || []).filter(r => r.status === 'Overdue').length
      const overdueInvoices = (inv || []).filter(r => r.status === 'Overdue')
      const contractsValue = (proj || []).reduce((s, r) => s + (r.budget || 0), 0)
      const jobCostingProfit = (proj || []).reduce((s, r) => s + (((r.budget || 0) - (r.actual_cost || 0))), 0)
      const activeAMCCount = (amcs || []).filter(c => c.status === 'Active').length
      const totalSarf = (exp || [])
        .filter(e => e.transaction_type === 'صرف' && e.status === 'Approved')
        .reduce((s, r) => s + (r.amount || 0), 0)
      const retentionVal = totalInvoiced * 0.1

      // ===== OPERATIONS =====
      const activeProj = (proj || []).filter(p => p.status === 'In Progress').length
      const openMaint = (maint || []).filter(m => m.status === 'Open').length
      const maintThisMonth = (maintRep || []).length
      const overduePunch = (punches || []).filter(p => p.status === 'متأخر').length
      const sentQuotes = (quot || []).filter(q => q.status === 'Sent').length
      const overdueRecurring = (recur || []).filter(r => r.status === 'متأخرة').length
      const openPOs = (po || []).length
      const pendingExp = (exp || []).filter(e => e.status === 'Pending').length

      // ===== PEOPLE & ASSETS =====
      const activeTechs = (techs || []).filter(t => t.status === 'Active').length
      const residencyExpiring = (techs || []).filter(t => {
        if (!t.residence_expiry) return false
        const days = Math.ceil((new Date(t.residence_expiry).getTime() - today.getTime()) / 86400000)
        return days > 0 && days <= 14
      }).length
      const warrantyExpiring = (warranty || []).filter((w: any) => {
        if (!w.start_date || !w.duration_months) return false
        const exp = new Date(w.start_date); exp.setMonth(exp.getMonth() + w.duration_months)
        const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000)
        return days > 0 && days <= 30
      }).length
      const dueCommissions = (comm || []).reduce((s: number, r: any) => s + (r.balance || 0), 0)
      const lowStockItems = (inv2 || []).filter((i: any) => i.status === 'Low Stock')
      const lowStock = lowStockItems.length
      const expiredVehDocs = (veh || []).filter(v => {
        const ins = v.insurance_expiry && new Date(v.insurance_expiry) < today
        const reg = v.registration_expiry && new Date(v.registration_expiry) < today
        return ins || reg
      }).length
      const activeContractors = (contr || []).filter((c: any) => c.status === 'نشط').length
      const inventoryValue = (inv2 || []).reduce((s: number, i: any) => s + ((i.quantity || 0) * 0), 0) // placeholder

      // ===== CRITICAL ALERTS (Arctic Luxury) =====
      const alerts: any[] = []

      // Low stock
      lowStockItems.slice(0, 3).forEach((item: any) => {
        alerts.push({
          icon: '🔥',
          title: `${item.item_name} — مخزون منخفض`,
          severity: 'critical',
          desc: `متبقي ${item.quantity || 0} (الحد الأدنى ${item.min_quantity || 0})`,
          value: `${item.quantity || 0} / ${item.min_quantity || 0}`,
          label: 'المتوفر / الأدنى',
          action: 'طلب توريد',
          actionType: 'danger',
          onAction: () => onNav('inventory'),
        })
      })

      // AMC contracts expiring soon
      ;(amcs || []).filter((a: any) => a.status === 'Active' && a.end_date).forEach((a: any) => {
        const days = Math.ceil((new Date(a.end_date).getTime() - today.getTime()) / 86400000)
        if (days > 0 && days <= 30) {
          alerts.push({
            icon: '📑',
            title: `عقد AMC — ${a.clients?.company_name || a.contract_code}`,
            severity: days <= 7 ? 'critical' : 'warning',
            desc: `ينتهي خلال ${days} يوم · قيمة العقد ${(a.annual_value || 0).toLocaleString()} ر.س`,
            value: `${days} يوم`,
            label: 'حتى الانتهاء',
            action: 'تجديد',
            actionType: days <= 7 ? 'danger' : 'normal',
            onAction: () => onNav('contracts'),
          })
        }
      })

      // Overdue invoices
      overdueInvoices.slice(0, 3).forEach((i: any) => {
        alerts.push({
          icon: '💸',
          title: `فاتورة #${i.invoice_no || i.id} — ${i.clients?.company_name || ''}`,
          severity: 'warning',
          desc: `الرصيد المتبقي ${(i.balance || 0).toLocaleString()} ر.س`,
          value: `${(i.balance || 0).toLocaleString()} ر.س`,
          label: 'المبلغ المستحق',
          action: 'متابعة',
          actionType: 'normal',
          onAction: () => onNav('invoices'),
        })
      })

      // Expired vehicle docs
      ;(veh || []).filter(v => {
        const ins = v.insurance_expiry && new Date(v.insurance_expiry) < today
        const reg = v.registration_expiry && new Date(v.registration_expiry) < today
        return ins || reg
      }).slice(0, 2).forEach((v: any) => {
        alerts.push({
          icon: '🚐',
          title: `مركبة ${v.brand || ''} (${v.plate_no || ''}) — وثائق منتهية`,
          severity: 'critical',
          desc: `التأمين أو الاستمارة منتهية الصلاحية`,
          value: 'منتهية',
          label: 'الحالة',
          action: 'تجديد',
          actionType: 'danger',
          onAction: () => onNav('vehicles'),
        })
      })

      // Residency expiring
      ;(techs || []).filter((t: any) => {
        if (!t.residence_expiry) return false
        const days = Math.ceil((new Date(t.residence_expiry).getTime() - today.getTime()) / 86400000)
        return days > 0 && days <= 14
      }).slice(0, 2).forEach((t: any) => {
        const days = Math.ceil((new Date(t.residence_expiry).getTime() - today.getTime()) / 86400000)
        alerts.push({
          icon: '🪪',
          title: `إقامة ${t.full_name} — قاربت الانتهاء`,
          severity: days <= 7 ? 'critical' : 'warning',
          desc: `تنتهي خلال ${days} يوم`,
          value: `${days} يوم`,
          label: 'حتى الانتهاء',
          action: 'متابعة',
          actionType: days <= 7 ? 'danger' : 'normal',
          onAction: () => onNav('technicians'),
        })
      })

      const totalCritical = alerts.filter(a => a.severity === 'critical').length
        + alerts.filter(a => a.severity === 'warning').length

      setCriticalAlerts(alerts)

      // ===== MODULE SUMMARY =====
      const projPaid = (inv || []).filter(i => i.status === 'Paid').length
      const projTotal = (inv || []).length

      setD({
        totalInvoiced, totalCollected, balanceDue, overdueCount, contractsValue,
        netProfit: jobCostingProfit, activeAMCCount, retentionVal, totalSarf,
        activeProj, openMaint, maintThisMonth, overduePunch, sentQuotes,
        overdueRecurring, openPOs, pendingExp,
        activeTechs, residencyExpiring, warrantyExpiring, dueCommissions, lowStock,
        expiredVehDocs, activeContractors, inventoryValue,
        totalCritical: alerts.length,
        projActive: (proj || []).filter(p => p.status === 'In Progress').length,
        projTotal: (proj || []).length,
        maintOpen: (maint || []).filter(m => m.status === 'Open').length,
        maintTotal: (maint || []).length,
        invPaid: projPaid, invTotal: projTotal,
        invTotalValue: totalInvoiced,
      })
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n: number) =>
    n != null ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) : '—'
  const fmtK = (n: number) => {
    if (n == null) return '—'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return Math.round(n / 1_000) + 'K'
    return String(Math.round(n))
  }

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />)}
    </div>
  )

  return (
    <div style={{
      background: 'linear-gradient(135deg, #F4F7FA 0%, #E8F2FB 100%)',
      minHeight: '100vh',
      margin: -20, padding: 28,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F1B2D', fontFamily: 'Cairo,sans-serif', margin: 0 }}>
            لوحة التحكم
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Cool Seasons — نظرة شاملة على العمليات والتنبيهات
          </div>
        </div>
        <div style={{
          background: 'white', padding: '12px 20px', borderRadius: 12,
          boxShadow: '0 2px 8px rgba(30, 156, 215, 0.08)',
          fontSize: 14, color: '#475569', fontWeight: 500,
        }}>
          📅 {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Strip — 5 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard
          icon="🏗️" label="مشاريع جارية" value={d.activeProj}
          accent="#1E9CD7" iconBg="#E0F2FE"
          trend={`من إجمالي ${d.projTotal}`} trendType="neutral"
          onClick={() => onNav('projects')}
        />
        <KpiCard
          icon="💰" label="إجمالي الفواتير" value={fmtK(d.totalInvoiced)} unit="ر.س"
          accent="#16A34A" iconBg="#DCFCE7"
          trend={`محصّل: ${fmtK(d.totalCollected)}`} trendType="up"
          onClick={() => onNav('invoices')}
        />
        <KpiCard
          icon="📉" label="مصروفات معتمدة" value={fmtK(d.totalSarf)} unit="ر.س"
          accent="#F59E0B" iconBg="#FEF3C7"
          trend={`${d.pendingExp} معلقة`} trendType="neutral"
          onClick={() => onNav('expenses')}
        />
        <KpiCard
          icon="📦" label="الرصيد المتبقي" value={fmtK(d.balanceDue)} unit="ر.س"
          accent="#8B5CF6" iconBg="#EDE9FE"
          trend={`${d.overdueCount} فاتورة متأخرة`} trendType={d.overdueCount > 0 ? 'down' : 'neutral'}
          onClick={() => onNav('invoices')}
        />
        <KpiCard
          icon="🚨" label="تنبيهات حرجة" value={d.totalCritical || 0}
          accent="#C0392B" iconBg="#FEE2E2"
          trend={d.lowStock > 0 ? `${d.lowStock} مخزون منخفض` : 'لا تنبيهات'}
          trendType={d.totalCritical > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Critical Alerts */}
      <div style={{
        fontSize: 18, fontWeight: 700, color: '#0F1B2D', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Cairo,sans-serif',
      }}>
        🚨 التنبيهات الحرجة
        {criticalAlerts.length > 0 && (
          <span style={{
            background: '#FEE2E2', color: '#DC2626', padding: '2px 10px',
            borderRadius: 20, fontSize: 13, fontWeight: 700,
          }}>{criticalAlerts.length}</span>
        )}
      </div>

      <div style={{
        background: 'white', borderRadius: 20, padding: 24,
        boxShadow: '0 4px 20px rgba(15, 27, 45, 0.05)',
        border: '1px solid rgba(226, 232, 240, 0.6)',
        marginBottom: 24,
      }}>
        {criticalAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#64748B' }}>
            ✅ لا توجد تنبيهات حرجة حالياً
          </div>
        ) : (
          criticalAlerts.map((a, i) => (
            <AlertItem key={i} {...a} isLast={i === criticalAlerts.length - 1} />
          ))
        )}
      </div>

    </div>
  )
}
