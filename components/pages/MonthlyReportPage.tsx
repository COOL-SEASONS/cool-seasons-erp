'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart3, TrendingUp, DollarSign, Wrench, Users, Package, Printer} from 'lucide-react'

export default function MonthlyReportPage() {
  const [data,setData] = useState<any>({})
  const [loading,setLoading] = useState(true)
  const [selectedMonth,setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(()=>{ loadReport() },[selectedMonth])

  const loadReport = async () => {
    setLoading(true)
    const [year,month] = selectedMonth.split('-').map(Number)
    const startDate = `${year}-${String(month).padStart(2,'0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [
      {data:invoices}, {data:expenses}, {data:projects},
      {data:maint}, {data:attendance}, {data:newClients}, {data:inventory}
    ] = await Promise.all([
      supabase.from('invoices').select('amount,total_amount,paid_amount,status').gte('invoice_date',startDate).lte('invoice_date',endDate),
      supabase.from('expenses').select('amount,transaction_type').gte('expense_date',startDate).lte('expense_date',endDate),
      supabase.from('projects').select('status,budget,actual_cost').gte('created_at',startDate).lte('created_at',endDate),
      supabase.from('maintenance').select('status,cost').gte('created_at',startDate).lte('created_at',endDate),
      supabase.from('hr_attendance').select('status').gte('att_date',startDate).lte('att_date',endDate),
      supabase.from('clients').select('id').gte('created_at',startDate).lte('created_at',endDate),
      supabase.from('inventory').select('quantity,min_quantity').lte('quantity','min_quantity'),
    ])

    const totalInvoiced = (invoices||[]).reduce((s,r)=>s+(r.total_amount||0),0)
    const totalCollected = (invoices||[]).reduce((s,r)=>s+(r.paid_amount||0),0)
    const totalExpenses = (expenses||[]).reduce((s,r)=>s+(r.amount||0),0)
    const totalSarf = (expenses||[]).filter(e=>e.transaction_type==='صرف').reduce((s,r)=>s+(r.amount||0),0)
    const totalOhda = (expenses||[]).filter(e=>e.transaction_type==='عهدة').reduce((s,r)=>s+(r.amount||0),0)
    const netProfit = totalCollected - totalSarf
    const maintDone = (maint||[]).filter(m=>m.status==='Completed').length
    const maintTotal = (maint||[]).length
    const presentDays = (attendance||[]).filter(a=>a.status==='Present').length
    const totalDays = (attendance||[]).length
    const attendanceRate = totalDays>0 ? Math.round(presentDays/totalDays*100) : 0

    setData({
      totalInvoiced, totalCollected, totalExpenses, totalSarf, totalOhda, netProfit,
      invoiceCount: (invoices||[]).length,
      paidInvoices: (invoices||[]).filter(i=>i.status==='Paid').length,
      newProjects: (projects||[]).length,
      maintDone, maintTotal, attendanceRate,
      newClients: (newClients||[]).length,
      lowStock: (inventory||[]).length,
    })
    setLoading(false)
  }

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const months = Array.from({length:12},(_,i)=>{
    const d = new Date()
    d.setMonth(d.getMonth()-i)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const monthNames: Record<string,string> = {'01':'يناير','02':'فبراير','03':'مارس','04':'أبريل','05':'مايو','06':'يونيو','07':'يوليو','08':'أغسطس','09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر'}
  const displayMonth = () => {
    const [y,m] = selectedMonth.split('-')
    return `${monthNames[m]} ${y}`
  }

  const KPI = ({label,value,sub,icon:Icon,color,bg}:any) => (
    <div className="card" style={{padding:20}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
        <div style={{background:bg||color+'20',borderRadius:10,padding:10}}><Icon size={22} color={color}/></div>
        {sub&&<span style={{fontSize:11,background:color+'15',color:color,padding:'2px 8px',borderRadius:20,fontWeight:600}}>{sub}</span>}
      </div>
      <div style={{fontSize:22,fontWeight:800,color:color,fontFamily:'Cairo,sans-serif',marginBottom:4}}>{value}</div>
      <div style={{fontSize:12,color:'var(--cs-text-muted)',fontWeight:600}}>{label}</div>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{gap:8}}>
        <div>
          <div className="page-title">التقرير الشهري</div>
          <div className="page-subtitle">{displayMonth()}</div>
        </div>
        <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,background:'white',color:'var(--cs-blue)',border:'1px solid var(--cs-blue)',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:600,marginBottom:12}}><Printer size={15}/>طباعة</button>
        <select className="form-input" style={{width:180}} value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
          {months.map(m=>{
            const [y,mo] = m.split('-')
            return <option key={m} value={m}>{monthNames[mo]} {y}</option>
          })}
        </select>
      </div>

      {loading ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>
          {[...Array(8)].map((_,i)=><div key={i} className="skeleton" style={{height:100}}/>)}
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16,marginBottom:24}}>
            <KPI label="إجمالي الفواتير الصادرة" value={fmt(data.totalInvoiced)+' ر.س'} icon={DollarSign} color="var(--cs-blue)" sub={`${data.invoiceCount} فاتورة`}/>
            <KPI label="المبالغ المحصّلة" value={fmt(data.totalCollected)+' ر.س'} icon={TrendingUp} color="var(--cs-green)" sub={`${data.paidInvoices} مدفوعة`}/>
            <KPI label="إجمالي المصروفات" value={fmt(data.totalExpenses)+' ر.س'} icon={DollarSign} color="var(--cs-red)"/>
            <KPI label="صافي الربح" value={fmt(data.netProfit)+' ر.س'} icon={BarChart3} color={data.netProfit>=0?'var(--cs-green)':'var(--cs-red)'}/>
            <KPI label="مشاريع جديدة" value={data.newProjects} icon={Package} color="var(--cs-orange)"/>
            <KPI label="صيانة مكتملة" value={`${data.maintDone}/${data.maintTotal}`} icon={Wrench} color="var(--cs-blue)"/>
            <KPI label="معدل الحضور" value={`${data.attendanceRate}%`} icon={Users} color={data.attendanceRate>=90?'var(--cs-green)':data.attendanceRate>=70?'var(--cs-orange)':'var(--cs-red)'}/>
            <KPI label="عملاء جدد" value={data.newClients} icon={Users} color="var(--cs-blue)"/>
          </div>

          {/* Breakdown cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div className="card" style={{padding:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>💰 تفاصيل الإيرادات</div>
              {[
                {l:'إجمالي الفواتير الصادرة',v:data.totalInvoiced,c:'var(--cs-blue)'},
                {l:'المحصّل فعلياً',v:data.totalCollected,c:'var(--cs-green)'},
                {l:'المتبقي غير محصّل',v:data.totalInvoiced-data.totalCollected,c:'var(--cs-red)'},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'1px solid var(--cs-border)':'none'}}>
                  <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{item.l}</span>
                  <span style={{fontSize:15,fontWeight:800,color:item.c,fontFamily:'Cairo,sans-serif'}}>{fmt(item.v)} ر.س</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📤 تفاصيل المصروفات</div>
              {[
                {l:'إجمالي الصرف',v:data.totalSarf,c:'var(--cs-red)'},
                {l:'إجمالي العهد',v:data.totalOhda,c:'var(--cs-orange)'},
                {l:'صافي الربح التقديري',v:data.netProfit,c:data.netProfit>=0?'var(--cs-green)':'var(--cs-red)'},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<2?'1px solid var(--cs-border)':'none'}}>
                  <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{item.l}</span>
                  <span style={{fontSize:15,fontWeight:800,color:item.c,fontFamily:'Cairo,sans-serif'}}>{fmt(item.v)} ر.س</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profit margin bar */}
          {data.totalInvoiced > 0 && (
            <div className="card" style={{padding:20}}>
              <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📊 هامش الربح الشهري</div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{flex:1,background:'var(--cs-border)',borderRadius:8,height:24,overflow:'hidden'}}>
                  <div style={{width:`${Math.min(100,Math.max(0,data.totalCollected/data.totalInvoiced*100))}%`,background:'var(--cs-green)',height:24,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{color:'white',fontSize:12,fontWeight:700}}>{Math.round(data.totalCollected/data.totalInvoiced*100)}% محصّل</span>
                  </div>
                </div>
                <span style={{fontWeight:800,fontSize:18,color:data.netProfit>=0?'var(--cs-green)':'var(--cs-red)',minWidth:120}}>
                  {data.totalInvoiced>0?Math.round(data.netProfit/data.totalInvoiced*100):0}% هامش
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
