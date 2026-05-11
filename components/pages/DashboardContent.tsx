'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── helpers ──────────────────────────────────────────────────
const fmtSAR = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return new Intl.NumberFormat('ar-SA').format(n || 0)
}
const fmt = (n: number) =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n || 0)

interface AlertItem { name: string; cat: string; days: number }

// ── Detailed Alert Strip ──────────────────────────────────────
function AlertStrip({ expired, soon, later }: {
  expired: AlertItem[]; soon: AlertItem[]; later: AlertItem[]
}) {
  const total = expired.length + soon.length + later.length
  if (total === 0) return null

  const Pill = ({ item, color, bg, border, label }: any) => (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 6, padding: '3px 9px', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color, opacity: 0.75 }}>{item.cat}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{item.name}</span>
      <span style={{
        fontSize: 10, fontWeight: 800, padding: '1px 6px',
        borderRadius: 3, background: color, color: 'white',
      }}>{label}</span>
    </div>
  )

  return (
    <div style={{
      background: 'white', border: '1px solid #E2EAF0',
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16,
    }}>
      {/* Title row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', background: '#FEF2F2',
        borderBottom: '1px solid #FECACA',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
        <span style={{ fontFamily: 'Cairo,sans-serif', fontSize: 13, fontWeight: 700, color: '#C0392B' }}>
          تنبيهات الوثائق والتراخيص
        </span>
        <span style={{
          marginRight: 'auto', fontSize: 11, fontWeight: 700,
          background: '#C0392B', color: 'white', padding: '1px 10px', borderRadius: 20,
        }}>{total} بند</span>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* EXPIRED */}
        {expired.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#C0392B', letterSpacing: '0.8px', marginBottom: 5 }}>
              ● منتهية الصلاحية ({expired.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {expired.map((item, i) => (
                <Pill key={i} item={item} color="#991B1B" bg="#FEF2F2" border="#FCA5A5" label="منتهية" />
              ))}
            </div>
          </div>
        )}

        {/* SOON 30 days */}
        {soon.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#D97706', letterSpacing: '0.8px', marginBottom: 5, marginTop: expired.length ? 4 : 0 }}>
              ● تنتهي خلال 30 يوم ({soon.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {soon.map((item, i) => (
                <Pill key={i} item={item} color="#92400E" bg="#FFFBEB" border="#FCD34D" label={`${item.days} يوم`} />
              ))}
            </div>
          </div>
        )}

        {/* LATER 60 days */}
        {later.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1578A8', letterSpacing: '0.8px', marginBottom: 5, marginTop: (expired.length || soon.length) ? 4 : 0 }}>
              ● تنتهي خلال 60 يوم ({later.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {later.map((item, i) => (
                <Pill key={i} item={item} color="#1578A8" bg="#EFF6FF" border="#BAE6FD" label={`${item.days} يوم`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────
function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: '#1E9CD7', borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7C93', textTransform: 'uppercase', letterSpacing: '2px' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#E2EAF0' }} />
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────
function KpiCard({ label, labelEn, value, unit, accent, pct }: any) {
  return (
    <div style={{
      background: 'white', border: '1px solid #E2EAF0',
      borderRadius: 10, padding: '13px 12px',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent || '#E2EAF0' }} />
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7C93', marginBottom: 1 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 8.5, color: '#B0BEC5', marginBottom: 8 }}>{labelEn}</div>
      <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 28, fontWeight: 900, color: accent || '#1A2332', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#B0BEC5', marginTop: 4 }}>{unit}</div>
      {pct !== undefined && (
        <div style={{ height: 2, background: '#F1F5F9', borderRadius: 1, marginTop: 10 }}>
          <div style={{ height: 2, borderRadius: 1, background: accent, width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardContent({ onNav }: { onNav: (id: string) => void }) {
  const [stats, setStats] = useState<any>({})
  const [projs, setProjs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState<AlertItem[]>([])
  const [soon, setSoon] = useState<AlertItem[]>([])
  const [later, setLater] = useState<AlertItem[]>([])

  useEffect(() => {
    async function load() {
      const today = new Date()

      const [
        { count: cc }, { count: pc }, { count: tc },
        { data: invData },
        { count: oc }, { count: ls }, { count: mo },
        { data: projects },
        { data: techs }, { data: vehicles },
        { data: docs }, { data: amcs },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
        supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.from('invoices').select('total_amount,paid_amount'),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'Overdue'),
        supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Low Stock'),
        supabase.from('maintenance').select('*', { count: 'exact', head: true }).eq('status', 'Overdue'),
        supabase.from('projects').select('project_name,status,completion_pct,contract_value').order('created_at', { ascending: false }).limit(6),
        supabase.from('technicians').select('full_name,residence_expiry,engineers_membership_exp').eq('status', 'Active'),
        supabase.from('vehicles').select('plate_no,brand,model,insurance_expiry,registration_expiry'),
        supabase.from('company_docs').select('doc_name,expiry_date'),
        supabase.from('contracts_amc').select('contract_code,end_date,clients(company_name)').eq('status', 'Active'),
      ])

      const totalInv = invData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0
      const totalPaid = invData?.reduce((s, r) => s + (r.paid_amount || 0), 0) || 0
      const pctPaid = totalInv ? Math.round((totalPaid / totalInv) * 100) : 0

      setStats({ cc, pc, tc, totalInv, totalPaid, balance: totalInv - totalPaid, pctPaid, oc, ls, mo })
      setProjs(projects || [])

      // Build detailed alerts
      const exp: AlertItem[] = [], sn: AlertItem[] = [], lt: AlertItem[] = []

      function addDoc(name: string, expiry: string, cat: string) {
        if (!expiry) return
        const d = expiry.split('T')[0]
        const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000)
        if (days <= 0) exp.push({ name, cat, days })
        else if (days <= 30) sn.push({ name, cat, days })
        else if (days <= 60) lt.push({ name, cat, days })
      }

      techs?.forEach((t: any) => {
        if (t.residence_expiry) addDoc(t.full_name, t.residence_expiry, 'إقامة')
        if (t.engineers_membership_exp) addDoc(t.full_name, t.engineers_membership_exp, 'عضوية')
      })
      vehicles?.forEach((v: any) => {
        const name = `${v.brand || ''} ${v.model || ''} (${v.plate_no || ''})`.trim()
        if (v.insurance_expiry) addDoc(name, v.insurance_expiry, 'تأمين')
        if (v.registration_expiry) addDoc(name, v.registration_expiry, 'استمارة')
      })
      docs?.forEach((d: any) => {
        if (d.expiry_date) addDoc(d.doc_name, d.expiry_date, 'وثيقة')
      })
      amcs?.forEach((a: any) => {
        if (a.end_date) addDoc(a.clients?.company_name || a.contract_code, a.end_date, 'عقد AMC')
      })

      setExpired(exp); setSoon(sn); setLater(lt)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 100 }} />
      ))}
    </div>
  )

  const totalAlerts = expired.length + soon.length + later.length

  return (
    <div style={{ fontFamily: 'Tajawal,sans-serif' }}>

      {/* ── DETAILED ALERT STRIP (top) ── */}
      <AlertStrip expired={expired} soon={soon} later={later} />

      {/* ── HERO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 10, marginBottom: 14 }}>

        {/* Hero Main */}
        <div style={{
          background: 'white', border: '1px solid #E2EAF0', borderRadius: 14,
          padding: '20px 24px', position: 'relative', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: '#1E9CD7', borderRadius: '0 14px 14px 0' }} />
          {/* Frame corners */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: '1.5px solid rgba(30,156,215,0.3)', borderRight: '1.5px solid rgba(30,156,215,0.3)' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: '1.5px solid rgba(30,156,215,0.3)', borderLeft: '1.5px solid rgba(30,156,215,0.3)' }} />

          <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#1E9CD7', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 6 }}>
            TOTAL INVOICED · إجمالي الفواتير
          </div>
          <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 48, fontWeight: 900, color: '#1A2332', lineHeight: 1, letterSpacing: -1, marginBottom: 4 }}>
            {fmtSAR(stats.totalInv)}
          </div>
          <div style={{ fontSize: 12, color: '#6B7C93', marginBottom: 16 }}>ريال سعودي</div>

          {/* Progress bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'COLLECTED', value: fmtSAR(stats.totalPaid), pct: stats.pctPaid, color: '#27AE60' },
              { label: 'BALANCE', value: fmtSAR(stats.balance), pct: 100 - stats.pctPaid, color: '#E67E22' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#94A3B8', width: 70, fontWeight: 600, flexShrink: 0 }}>{row.label}</div>
                <div style={{ flex: 1, height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: 4, width: `${row.pct}%`, background: row.color, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 12, fontWeight: 700, color: row.color, minWidth: 40, textAlign: 'left' }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: 0, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
            {[
              { val: fmt(stats.cc || 0), lbl: 'عملاء', color: '#1E9CD7' },
              { val: fmt(stats.pc || 0), lbl: 'مشاريع', color: '#27AE60' },
              { val: fmt(stats.tc || 0), lbl: 'فنيون', color: '#E67E22' },
              { val: fmtSAR(stats.totalInv - stats.totalPaid), lbl: 'متبقي', color: '#C0392B' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Projects */}
        <div style={{
          background: 'white', border: '1px solid #E2EAF0', borderRadius: 14,
          padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#27AE60' }} />
          <div style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>مشاريع نشطة</div>
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 64, fontWeight: 900, color: '#27AE60', lineHeight: 1 }}>{stats.pc ?? 0}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>ACTIVE PROJECTS</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7C93', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
            <span>صيانة متأخرة: <strong style={{ color: stats.mo > 0 ? '#C0392B' : '#27AE60' }}>{stats.mo ?? 0}</strong></span>
            <span>مخزون منخفض: <strong style={{ color: stats.ls > 0 ? '#C0392B' : '#27AE60' }}>{stats.ls ?? 0}</strong></span>
          </div>
        </div>

        {/* Alerts summary */}
        <div style={{
          background: 'white', border: `1px solid ${totalAlerts > 0 ? '#FECACA' : '#BBF7D0'}`,
          borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: totalAlerts > 0 ? '#C0392B' : '#27AE60' }} />
          <div style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>التنبيهات الحرجة</div>
          <div style={{ textAlign: 'center', margin: '12px 0' }}>
            <div style={{ fontFamily: 'Cairo,sans-serif', fontSize: 64, fontWeight: 900, color: totalAlerts > 0 ? '#C0392B' : '#27AE60', lineHeight: 1 }}>{totalAlerts}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{totalAlerts > 0 ? 'CRITICAL ALERTS' : 'ALL CLEAR'}</div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
            background: totalAlerts > 0 ? '#FEF2F2' : '#F0FFF4',
            color: totalAlerts > 0 ? '#C0392B' : '#27AE60',
            border: `1px solid ${totalAlerts > 0 ? '#FECACA' : '#BBF7D0'}`,
          }}>
            {totalAlerts > 0 ? '⚠ إجراء مطلوب' : '✓ كل شيء سليم'}
          </div>
        </div>
      </div>

      {/* ── FINANCIAL KPIs ── */}
      <SecLabel>الملف المالي · Financial Overview</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <KpiCard label="إجمالي الفواتير" labelEn="TOTAL INVOICED" value={fmtSAR(stats.totalInv)} unit="ريال سعودي" accent="#1E9CD7" pct={100} />
        <KpiCard label="المحصّل" labelEn="COLLECTED" value={fmtSAR(stats.totalPaid)} unit="ريال سعودي" accent="#27AE60" pct={stats.pctPaid} />
        <KpiCard label="الرصيد المتبقي" labelEn="BALANCE DUE" value={fmtSAR(stats.balance)} unit="ريال سعودي" accent="#E67E22" pct={100 - stats.pctPaid} />
        <KpiCard label="فواتير متأخرة" labelEn="OVERDUE" value={stats.oc ?? 0} unit="فاتورة" accent={stats.oc > 0 ? '#C0392B' : '#27AE60'} />
      </div>

      {/* ── OPERATIONS KPIs ── */}
      <SecLabel>العمليات · Operations</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <KpiCard label="مشاريع نشطة" labelEn="ACTIVE PROJECTS" value={stats.pc ?? 0} unit="مشروع" accent="#1E9CD7" />
        <KpiCard label="صيانة متأخرة" labelEn="OVERDUE MAINT." value={stats.mo ?? 0} unit="طلب" accent={stats.mo > 0 ? '#E67E22' : '#27AE60'} />
        <KpiCard label="مخزون منخفض" labelEn="LOW STOCK" value={stats.ls ?? 0} unit="صنف" accent={stats.ls > 0 ? '#C0392B' : '#27AE60'} />
        <KpiCard label="إجمالي العملاء" labelEn="TOTAL CLIENTS" value={stats.cc ?? 0} unit="عميل" accent="#8B5CF6" />
      </div>

      {/* ── PROJECTS + QUICK ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>

        {/* Recent Projects */}
        <div>
          <SecLabel>أحدث المشاريع · Recent Projects</SecLabel>
          <div style={{ background: 'white', border: '1px solid #E2EAF0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {projs.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>لا توجد مشاريع بعد</div>
            ) : projs.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < projs.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2332', marginBottom: 4 }}>{p.project_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: 4, width: `${p.completion_pct || 0}%`, background: '#1E9CD7', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94A3B8', minWidth: 30 }}>{p.completion_pct || 0}%</span>
                  </div>
                </div>
                <span className={`badge ${p.status === 'Completed' ? 'badge-green' : p.status === 'In Progress' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Monitor */}
        <div>
          <SecLabel>مؤشرات الحالة · Status Monitor</SecLabel>
          <div style={{ background: 'white', border: '1px solid #E2EAF0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {[
              { label: 'فواتير متأخرة', value: stats.oc ?? 0, danger: stats.oc > 0 },
              { label: 'صيانة متأخرة', value: stats.mo ?? 0, danger: stats.mo > 0 },
              { label: 'وثائق منتهية', value: expired.length, danger: expired.length > 0 },
              { label: 'تنتهي خلال 30 يوم', value: soon.length, danger: soon.length > 0 },
              { label: 'تنتهي خلال 60 يوم', value: later.length, danger: false },
              { label: 'مخزون منخفض', value: stats.ls ?? 0, danger: stats.ls > 0 },
              { label: 'الفنيون النشطون', value: stats.tc ?? 0, danger: false },
              { label: 'إجمالي العملاء', value: stats.cc ?? 0, danger: false },
            ].map((row, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 14px',
                borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: 1, background: row.danger ? '#C0392B' : '#27AE60', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#6B7C93', fontWeight: 500 }}>{row.label}</span>
                </div>
                <span style={{ fontFamily: 'Cairo,sans-serif', fontSize: 18, fontWeight: 800, color: row.danger ? '#C0392B' : '#27AE60' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
