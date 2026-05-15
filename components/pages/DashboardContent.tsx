'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AlertTriangle, FileText, CheckCircle, AlertCircle, Clock,
  Building2, TrendingUp, Lock, FolderOpen, Wrench, ClipboardList,
  ClipboardCheck, RefreshCw, ShoppingCart, DollarSign, UserCheck,
  Shield, Star, FileWarning, Car, Package, BarChart2, FileCheck,
  Banknote, Users, Settings
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────
const fmt = (n: number) =>
  n != null ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) + ' ر.س' : '—'
const fmtN = (n: number) =>
  n != null ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) : '—'

// ─── Reusable Components ──────────────────────────────

// Alert Chip in command center
function AChip({ type, icon: Icon, label, value, onClick }: any) {
  const styles: any = {
    r: { bg: '#FEF2F2', border: '#FCA5A5', iconBg: '#FEE2E2', iconColor: '#DC2626', labelColor: '#991B1B', valColor: '#DC2626' },
    a: { bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7', iconColor: '#D97706', labelColor: '#92400E', valColor: '#D97706' },
    g: { bg: '#F0FDF4', border: '#BBF7D0', iconBg: '#DCFCE7', iconColor: '#16A34A', labelColor: '#14532D', valColor: '#16A34A' },
    n: { bg: '#F8FAFC', border: '#E2E8F0', iconBg: '#F1F5F9', iconColor: '#94A3B8', labelColor: '#475569', valColor: '#CBD5E1' },
  }
  const s = styles[type] || styles.n
  return (
    <div onClick={onClick} style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '8px 10px',
      display: 'flex', alignItems: 'center', gap: 8,
      cursor: onClick ? 'pointer' : 'default'
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={s.iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: s.labelColor, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 17, fontWeight: 900, lineHeight: 1.1, color: s.valColor }}>{value}</div>
      </div>
    </div>
  )
}

// KPI icon card
function ICard({ icon: Icon, iconBg, iconColor, label, value, valuColor, sub, onClick }: any) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
      padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8,
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color .15s'
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#BFDBFE')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
    >
      <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 7, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 900, fontSize: 15, lineHeight: 1, color: valuColor || '#0D1C2E', whiteSpace: 'nowrap' }}>{value}</div>
        {sub && <div style={{ fontSize: 8, color: '#CBD5E1', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
    </div>
  )
}

// Section label
function SecLabel({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 2.5, height: 11, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 8.5, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

// Quick Nav Button
function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6,
      padding: '5px 7px', cursor: 'pointer', fontSize: 10.5,
      fontFamily: 'Tajawal,sans-serif', fontWeight: 600,
      color: '#0F4C81', textAlign: 'center', whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis', width: '100%',
      transition: 'background .12s'
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FD')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F8FAFC')}
    >
      {label}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────
export default function DashboardContent({ onNav }: { onNav: (id: string) => void }) {
  const [d, setD]           = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts]   = useState<any>({ expired: [], soon: [], later: [] })

  useEffect(() => {
    async function load() {
      const today   = new Date()
      const m1start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

      const [
        { data: inv },   { data: proj },     { data: maint },
        { data: techs }, { data: veh },      { data: docs },
        { data: amcs },  { data: quot },     { data: punches },
        { data: recur }, { data: po },       { data: exp },
        { data: warranty }, { data: comm }, { data: inv2 },
        { data: contr }, { data: maintRep },
      ] = await Promise.all([
        supabase.from('invoices').select('total_amount,paid_amount,balance,status'),
        supabase.from('projects').select('project_name,status,completion_pct,budget,actual_cost'),
        supabase.from('maintenance').select('status,cost,job_code,description'),
        supabase.from('technicians').select('full_name,status,residence_expiry,engineers_membership_exp,passport_expiry,has_driving_license,driving_license_expiry'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date,is_monthly'),
        supabase.from('contracts_amc').select('contract_code,status,annual_value,end_date,clients(company_name)'),
        supabase.from('quotations').select('status,total_amount'),
        supabase.from('punch_list').select('status'),
        supabase.from('recurring_jobs').select('status'),
        supabase.from('purchase_orders').select('status').eq('status', 'Sent'),
        supabase.from('expenses').select('amount,transaction_type,status'),
        supabase.from('warranty_tracking').select('start_date,duration_months'),
        supabase.from('commissions').select('balance'),
        supabase.from('inventory').select('status,quantity,min_quantity'),
        supabase.from('contractors').select('status'),
        supabase.from('maint_reports').select('id').gte('created_at', m1start),
      ])

      // ── FINANCIAL ─────────────────────────────────
      const totalInvoiced  = (inv||[]).reduce((s,r)=>s+(r.total_amount||0),0)
      const totalCollected = (inv||[]).reduce((s,r)=>s+(r.paid_amount||0),0)
      const balanceDue     = (inv||[]).reduce((s,r)=>s+(r.balance||0),0)
      const overdueInv     = (inv||[]).filter(r=>r.status==='Overdue')
      const overdueCount   = overdueInv.length
      const contractsValue = (proj||[]).reduce((s,r)=>s+(r.budget||0),0)
      const netProfit      = (proj||[]).reduce((s,r)=>s+((r.budget||0)-(r.actual_cost||0)),0)
      const activeAMCCount = (amcs||[]).filter(c=>c.status==='Active').length
      const retentionVal   = totalInvoiced * 0.1
      const collectionPct  = totalInvoiced > 0 ? Math.round(totalCollected/totalInvoiced*100) : 0

      // ── OPERATIONS ─────────────────────────────────
      const activeProj        = (proj||[]).filter(p=>p.status==='In Progress').length
      const openMaint         = (maint||[]).filter(m=>m.status==='Open').length
      const maintThisMonth    = (maintRep||[]).length
      const overduePunch      = (punches||[]).filter(p=>p.status==='متأخر').length
      const sentQuotes        = (quot||[]).filter(q=>q.status==='Sent').length
      const overdueRecurring  = (recur||[]).filter(r=>r.status==='متأخرة').length
      const openPOs           = (po||[]).length
      const pendingExp        = (exp||[]).filter(e=>e.status==='Pending').length

      // ── PEOPLE & ASSETS ────────────────────────────
      const activeTechs       = (techs||[]).filter(t=>t.status==='Active').length
      const warrantyExpiring  = (warranty||[]).filter((w:any)=>{
        if (!w.start_date||!w.duration_months) return false
        const exp=new Date(w.start_date); exp.setMonth(exp.getMonth()+w.duration_months)
        const days=Math.ceil((exp.getTime()-today.getTime())/86400000)
        return days>0&&days<=30
      }).length
      const dueCommissions    = (comm||[]).reduce((s:number,r:any)=>s+(r.balance||0),0)
      const lowStock          = (inv2||[]).filter(i=>i.status==='Low Stock').length

      // ── ALERTS ─────────────────────────────────────
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
        if(t.residence_expiry)          addAlert(t.full_name,t.residence_expiry,'إقامة')
        if(t.engineers_membership_exp)  addAlert(t.full_name,t.engineers_membership_exp,'عضوية')
        if(t.passport_expiry)           addAlert(t.full_name,t.passport_expiry,'جواز سفر')
        if(t.has_driving_license&&t.driving_license_expiry) addAlert(t.full_name,t.driving_license_expiry,'رخصة قيادة')
      })
      ;(veh||[]).forEach((v:any)=>{
        const n=`${v.brand||''} (${v.plate_no||''})`
        if(v.insurance_expiry)    addAlert(n,v.insurance_expiry,'تأمين')
        if(v.registration_expiry) addAlert(n,v.registration_expiry,'استمارة')
      })
      ;(docs||[]).forEach((d:any)=>{
        if(d.expiry_date) {
          // الوثائق الشهرية تنبه قبل 10 أيام، البقية قبل 30 يوم
          const thresh = d.is_monthly ? 10 : 30
          const days   = Math.ceil((new Date(d.expiry_date.split('T')[0]).getTime()-today.getTime())/86400000)
          if (days <= 0) expired.push({name:`${d.is_monthly?'🔄 ':''} وثيقة: ${d.doc_name}`, detail:'منتهية'})
          else if (days <= thresh) soon.push({name:`${d.is_monthly?'🔄 ':''} وثيقة: ${d.doc_name}`, detail:`${days} يوم`})
          else if (days <= 60) later.push({name:`وثيقة: ${d.doc_name}`, detail:`${days} يوم`})
        }
      })
      ;(amcs||[]).filter((a:any)=>a.status==='Active').forEach((a:any)=>{
        if(a.end_date) addAlert(a.clients?.company_name||a.contract_code,a.end_date,'عقد AMC')
      })
      setAlerts({ expired, soon, later })

      // ── ALERT COUNTS ───────────────────────────────
      const expiredVehDocs=(veh||[]).filter(v=>{
        const ins=v.insurance_expiry&&new Date(v.insurance_expiry)<today
        const reg=v.registration_expiry&&new Date(v.registration_expiry)<today
        return ins||reg
      }).length
      const residencyExpiring=(techs||[]).filter(t=>{
        if(!t.residence_expiry) return false
        const days=Math.ceil((new Date(t.residence_expiry).getTime()-today.getTime())/86400000)
        return days>0&&days<=14
      }).length
      const expiredDocs=(docs||[]).filter(d=>d.expiry_date&&new Date(d.expiry_date.split('T')[0])<today).length
      const monthlyDocsDueSoon=(docs||[]).filter(d=>{
        if(!d.is_monthly||!d.expiry_date) return false
        const days=Math.ceil((new Date(d.expiry_date.split('T')[0]).getTime()-today.getTime())/86400000)
        return days>0&&days<=10
      }).length
      const docs60=(docs||[]).filter(d=>{
        if(!d.expiry_date) return false
        const days=Math.ceil((new Date(d.expiry_date).getTime()-today.getTime())/86400000)
        return days>0&&days<=60
      }).length
      const openMaintLate=(maint||[]).filter(m=>m.status==='Overdue'||m.status==='متأخرة').length

      setD({
        totalInvoiced, totalCollected, balanceDue, overdueCount, contractsValue,
        netProfit, activeAMCCount, retentionVal, collectionPct,
        activeProj, openMaint, maintThisMonth, overduePunch, sentQuotes,
        overdueRecurring, openPOs, pendingExp,
        activeTechs, warrantyExpiring, dueCommissions, lowStock,
        expiredVehDocs, residencyExpiring, expiredDocs, docs60,
        openMaintLate, expiredDocsDetail: expired,
        projTotal: (proj||[]).length,
        invTotal:  (inv||[]).length,
        invPaid:   (inv||[]).filter(i=>i.status==='Paid').length,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: 4 }}>
      {[...Array(20)].map((_,i) => (
        <div key={i} className="skeleton" style={{ height: 54, borderRadius: 8 }} />
      ))}
    </div>
  )

  const totalAlerts = (d.overdueCount>0?1:0)+(d.expiredDocs>0?1:0)+(d.overduePunch>0?1:0)+(d.expiredVehDocs>0?1:0)+(d.docs60>0?1:0)+(d.residencyExpiring>0?1:0)+(d.openMaintLate>0?1:0)
  const alertChipType = (v:number, urgent=true) => v>0 ? (urgent?'r':'a') : 'n'

  // ─── STYLES ──────────────────────────────────────
  const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

      {/* ═══ ALERT COMMAND CENTER ═══ */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FEF9EC)', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #FDE68A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#78350F', letterSpacing: '.6px', textTransform: 'uppercase' }}>
            <AlertTriangle size={13} color="#D97706" />
            مركز التنبيهات
            {totalAlerts > 0 && (
              <span style={{ background: '#DC2626', color: 'white', fontSize: 9, fontWeight: 900, padding: '1px 8px', borderRadius: 20, fontFamily: 'Cairo,sans-serif' }}>
                {totalAlerts} نشطة
              </span>
            )}
            {totalAlerts === 0 && (
              <span style={{ background: '#059669', color: 'white', fontSize: 9, fontWeight: 900, padding: '1px 8px', borderRadius: 20, fontFamily: 'Cairo,sans-serif' }}>
                كل شيء سليم ✅
              </span>
            )}
          </div>
          <div style={{ fontSize: 9, color: '#92400E', fontWeight: 500 }}>
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Chips */}
        <div style={{ padding: '9px 11px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          <AChip type={alertChipType(d.overdueCount)}     icon={FileText}      label="فواتير متأخرة"    value={d.overdueCount}      onClick={()=>onNav('invoices')} />
          <AChip type={alertChipType(d.expiredDocs)}      icon={FileWarning}   label="وثائق منتهية"     value={d.expiredDocs}       onClick={()=>onNav('company_docs')} />
          <AChip type={alertChipType(d.overduePunch)}     icon={ClipboardCheck} label="Punch List متأخر" value={d.overduePunch}      onClick={()=>onNav('punch_list')} />
          <AChip type={alertChipType(d.expiredVehDocs)}   icon={Car}           label="وثائق مركبات"     value={d.expiredVehDocs}    onClick={()=>onNav('vehicles')} />
          <AChip type={alertChipType(d.docs60, false)}    icon={Clock}         label="وثائق 60 يوم"     value={d.docs60}            onClick={()=>onNav('company_docs')} />
          <AChip type={alertChipType(d.residencyExpiring, false)} icon={UserCheck} label="إقامات تنتهي" value={d.residencyExpiring} onClick={()=>onNav('technicians')} />
          <AChip type={alertChipType(d.openMaintLate)}    icon={Wrench}        label="صيانة متأخرة"     value={d.openMaintLate}     onClick={()=>onNav('maintenance')} />
          <AChip type={d.overdueCount===0&&d.expiredDocs===0?'g':'n'} icon={CheckCircle} label="مخالفات مركبات" value={0} onClick={()=>onNav('vehicles')} />
        </div>

        {/* Document detail strip */}
        {alerts.expired.length > 0 && (
          <div style={{ borderTop: '1px solid #FEF3C7', padding: '6px 12px', background: '#FFFBEB', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileWarning size={12} color="#D97706" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#92400E' }}>
                وثائق منتهية: {alerts.expired.length}
              </div>
              <div style={{ fontSize: 8.5, color: '#B45309' }}>
                {alerts.expired.slice(0, 3).map((a:any) => a.name).join(' · ')}
                {alerts.expired.length > 3 && ` · +${alerts.expired.length - 3} أخرى`}
              </div>
            </div>
            {alerts.soon.length > 0 && (
              <div style={{ fontSize: 8.5, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 4 }}>
                {alerts.soon.length} تنتهي خلال 30 يوم
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MOMENTUM BAR ═══ */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9, padding: '11px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 9 }}>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 2 }}>
              إيرادات {new Date().toLocaleDateString('ar-SA',{month:'long',year:'numeric'})}
            </div>
            <div style={{ fontFamily: 'Cairo,sans-serif', fontWeight: 900, fontSize: 19, color: '#0D1C2E', lineHeight: 1 }}>
              {fmt(d.totalInvoiced)}
            </div>
            <div style={{ fontSize: 8.5, color: '#94A3B8', marginTop: 2 }}>
              إجمالي الفواتير الصادرة · {d.invTotal} فاتورة
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 2 }}>
              نسبة التحصيل
            </div>
            <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 24, fontWeight: 900, color: '#1E9CD7', lineHeight: 1 }}>
              {d.collectionPct}%
            </div>
            <div style={{ fontSize: 8.5, color: '#94A3B8', marginTop: 2 }}>
              {fmt(d.totalCollected)} محصّل من {fmt(d.totalInvoiced)}
            </div>
          </div>
        </div>
        <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
          <div style={{ height: 4, background: '#1E9CD7', borderRadius: 4, width: `${Math.min(d.collectionPct, 100)}%`, transition: 'width .6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {['٠%','٢٥%','٥٠%','٧٥%','١٠٠%'].map(m => (
            <span key={m} style={{ fontSize: 7.5, color: '#CBD5E1' }}>{m}</span>
          ))}
        </div>
      </div>

      {/* ═══ FINANCIAL 8 ═══ */}
      <SecLabel color="#1E9CD7" label="الملف المالي · Financial Overview" />
      <div style={grid4}>
        <ICard icon={FileText}    iconBg="#EFF6FF" iconColor="#2563EB" label="إجمالي الفواتير"  value={fmt(d.totalInvoiced)}  sub="Total Invoiced"    onClick={()=>onNav('invoices')} />
        <ICard icon={CheckCircle} iconBg="#ECFDF5" iconColor="#059669" label="المحصّل"          value={fmt(d.totalCollected)} valuColor="#059669" sub="Collected"          onClick={()=>onNav('invoices')} />
        <ICard icon={AlertCircle} iconBg="#FEF2F2" iconColor="#DC2626" label="الرصيد المتبقي"  value={fmt(d.balanceDue)}     valuColor={d.balanceDue>0?'#DC2626':'#059669'} sub="Balance Due" onClick={()=>onNav('invoices')} />
        <ICard icon={Clock}       iconBg="#FEF2F2" iconColor="#DC2626" label="فواتير متأخرة"   value={fmtN(d.overdueCount)}  valuColor={d.overdueCount>0?'#DC2626':'#CBD5E1'} sub="Overdue Invoices" onClick={()=>onNav('invoices')} />
        <ICard icon={Building2}   iconBg="#F5F3FF" iconColor="#7C3AED" label="قيمة العقود"     value={d.contractsValue>0?fmt(d.contractsValue):'—'} sub="Contracts Value"  onClick={()=>onNav('projects')} />
        <ICard icon={TrendingUp}  iconBg="#F0FDFA" iconColor="#0D9488" label="إجمالي الربح"    value={d.netProfit!==0?fmt(d.netProfit):'—'} valuColor={d.netProfit>=0?'#059669':'#DC2626'} sub="Net Profit" onClick={()=>onNav('job_costing')} />
        <ICard icon={FileCheck}   iconBg="#FFFBEB" iconColor="#D97706" label="عقود AMC نشطة"  value={fmtN(d.activeAMCCount)} valuColor={d.activeAMCCount>0?'#D97706':'#CBD5E1'} sub="Active AMC" onClick={()=>onNav('amc_dashboard')} />
        <ICard icon={Lock}        iconBg="#F8FAFC" iconColor="#94A3B8" label="الضمان المحتجز" value={d.retentionVal>0?fmt(d.retentionVal):'—'} sub="Retention"          onClick={()=>onNav('retention')} />
      </div>

      {/* ═══ OPERATIONS 8 ═══ */}
      <SecLabel color="#7C3AED" label="العمليات · Operations" />
      <div style={grid4}>
        <ICard icon={FolderOpen}   iconBg="#EFF6FF" iconColor="#2563EB" label="مشاريع نشطة"           value={fmtN(d.activeProj)}        valuColor={d.activeProj>0?'#2563EB':'#CBD5E1'}  sub="Active Projects"       onClick={()=>onNav('projects')} />
        <ICard icon={Wrench}       iconBg="#FFFBEB" iconColor="#D97706" label="صيانة مفتوحة"          value={fmtN(d.openMaint)}         valuColor={d.openMaint>0?'#D97706':'#CBD5E1'}   sub="Open Maintenance"      onClick={()=>onNav('maintenance')} />
        <ICard icon={ClipboardList} iconBg="#F0FDFA" iconColor="#0D9488" label="تقارير الصيانة"       value={fmtN(d.maintThisMonth)}    valuColor={d.maintThisMonth>0?'#0D9488':'#CBD5E1'} sub="هذا الشهر"            onClick={()=>onNav('maint_report')} />
        <ICard icon={ClipboardCheck} iconBg="#FEF2F2" iconColor="#DC2626" label="Punch List متأخر"   value={fmtN(d.overduePunch)}      valuColor={d.overduePunch>0?'#DC2626':'#CBD5E1'} sub="Overdue Punch"         onClick={()=>onNav('punch_list')} />
        <ICard icon={FileText}     iconBg="#ECFDF5" iconColor="#059669" label="عروض مرسلة"           value={fmtN(d.sentQuotes)}        valuColor={d.sentQuotes>0?'#059669':'#CBD5E1'}  sub="Sent Quotes"           onClick={()=>onNav('quotations')} />
        <ICard icon={RefreshCw}    iconBg="#F5F3FF" iconColor="#7C3AED" label="أعمال متكررة متأخرة"  value={fmtN(d.overdueRecurring)}  valuColor={d.overdueRecurring>0?'#DC2626':'#CBD5E1'} sub="Overdue Recurring"  onClick={()=>onNav('recurring_jobs')} />
        <ICard icon={ShoppingCart} iconBg="#FFFBEB" iconColor="#D97706" label="طلبات شراء مفتوحة"   value={fmtN(d.openPOs)}           valuColor={d.openPOs>0?'#D97706':'#CBD5E1'}     sub="Open POs"              onClick={()=>onNav('purchase_orders')} />
        <ICard icon={DollarSign}   iconBg="#F8FAFC" iconColor="#94A3B8" label="مصروفات معلقة"        value={fmtN(d.pendingExp)}        valuColor={d.pendingExp>0?'#D97706':'#CBD5E1'}  sub="Pending Expenses"      onClick={()=>onNav('expenses')} />
      </div>

      {/* ═══ PEOPLE & ASSETS 4 ═══ */}
      <SecLabel color="#D97706" label="الموارد والأصول · People & Assets" />
      <div style={grid4}>
        <ICard icon={UserCheck}  iconBg="#ECFDF5" iconColor="#059669" label="فنيون نشطون"       value={fmtN(d.activeTechs)}      valuColor={d.activeTechs>0?'#059669':'#CBD5E1'} sub="Active Techs"      onClick={()=>onNav('technicians')} />
        <ICard icon={Shield}     iconBg="#F0FDFA" iconColor="#0D9488" label="ضمانات تنتهي قريباً" value={fmtN(d.warrantyExpiring)} valuColor={d.warrantyExpiring>0?'#D97706':'#CBD5E1'} sub="Warranty Expiring" onClick={()=>onNav('warranty')} />
        <ICard icon={Star}       iconBg="#F5F3FF" iconColor="#7C3AED" label="عمولات مستحقة"     value={d.dueCommissions>0?fmt(d.dueCommissions):'—'} sub="Due Commissions"    onClick={()=>onNav('commissions')} />
        <ICard icon={ClipboardCheck} iconBg="#EFF6FF" iconColor="#2563EB" label="قوائم الفحص"   value={d.lowStock>0?fmtN(d.lowStock)+'  صنف':'—'} sub="Job Checklists"      onClick={()=>onNav('job_checklists')} />
      </div>

      {/* ═══ QUICK NAVIGATION ═══ */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{ background: '#F8FAFC', padding: '7px 13px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={11} color="#94A3B8" />
          <span style={{ fontSize: 8.5, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' }}>التنقل السريع · Quick Navigation</span>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { title: '💰 المالية', items: [{l:'الفواتير',n:'invoices'},{l:'عروض الأسعار',n:'quotations'},{l:'عقود AMC',n:'contracts'},{l:'لوحة AMC',n:'amc_dashboard'},{l:'الضمانات',n:'retention'},{l:'المصروفات',n:'expenses'},{l:'العمولات',n:'commissions'},{l:'تكاليف المشاريع',n:'job_costing'}] },
            { title: '⚙️ المشاريع والعمليات', items: [{l:'المشاريع',n:'projects'},{l:'Dispatch Board',n:'dispatch'},{l:'الصيانة',n:'maintenance'},{l:'تقارير الصيانة',n:'maint_report'},{l:'أوامر التغيير',n:'change_orders'},{l:'Punch List',n:'punch_list'},{l:'أعمال متكررة',n:'recurring_jobs'},{l:'وثائق الشركة',n:'company_docs'}] },
            { title: '👥 العملاء والفريق', items: [{l:'العملاء',n:'clients'},{l:'الفنيون',n:'technicians'},{l:'Call Center',n:'call_center'},{l:'متابعة العملاء',n:'customer_followup'},{l:'المقاولون',n:'contractors'},{l:'الحضور',n:'hr_attendance'},{l:'كارت العميل',n:'client_card'},{l:'Leaderboard',n:'leaderboard'}] },
            { title: '📦 المواد والمخزون', items: [{l:'المخزون',n:'inventory'},{l:'الفريون',n:'freon'},{l:'النحاس',n:'copper_pipe'},{l:'الدكت',n:'duct_works'},{l:'المعدات',n:'equipment'},{l:'أوامر الشراء',n:'purchase_orders'},{l:'كتاب الأسعار',n:'pricebook'},{l:'الموردون',n:'supplier_compare'}] },
          ].map((group, gi) => (
            <div key={gi}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 5 }}>{group.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 4 }}>
                {group.items.map((item, i) => <NavBtn key={i} label={item.l} onClick={() => onNav(item.n)} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 9, color: '#CBD5E1', paddingBottom: 4, letterSpacing: '.3px' }}>
        COOL SEASONS ERP · Premium Light Edition · {totalAlerts} Alerts · 20 KPIs
      </div>

    </div>
  )
}
