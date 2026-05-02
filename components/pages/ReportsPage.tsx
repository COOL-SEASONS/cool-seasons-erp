'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart2, TrendingUp, DollarSign, Wrench, Users, Package, FileText, Award, Printer} from 'lucide-react'

export default function ReportsPage() {
  const [data,setData] = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [activeTab,setActiveTab] = useState('financial')

  useEffect(()=>{
    async function load() {
      const [
        {data:inv},{data:exp},{data:proj},{data:maint},
        {data:techs},{data:inv_items},{data:contracts},{data:clients}
      ] = await Promise.all([
        supabase.from('invoices').select('amount,total_amount,paid_amount,balance,status,invoice_date,invoice_type'),
        supabase.from('expenses').select('amount,transaction_type,category,expense_date'),
        supabase.from('projects').select('status,budget,actual_cost,completion_pct,project_type'),
        supabase.from('maintenance').select('status,cost,tech_id,technicians(full_name)'),
        supabase.from('technicians').select('id,full_name,specialty,level').eq('status','Active'),
        supabase.from('inventory').select('quantity,min_quantity,status,unit_cost'),
        supabase.from('contracts_amc').select('status,annual_value,paid_amount'),
        supabase.from('clients').select('id,status,city'),
      ])

      const totalInvoiced = (inv||[]).reduce((s,r)=>s+(r.total_amount||0),0)
      const totalCollected = (inv||[]).reduce((s,r)=>s+(r.paid_amount||0),0)
      const totalBalance = (inv||[]).reduce((s,r)=>s+(r.balance||0),0)
      const totalVAT = (inv||[]).reduce((s,r)=>s+((r.total_amount||0)-(r.amount||0)),0)
      const totalExpenses = (exp||[]).reduce((s,r)=>s+(r.amount||0),0)
      const totalSarf = (exp||[]).filter(e=>e.transaction_type==='صرف').reduce((s,r)=>s+(r.amount||0),0)
      const totalOhda = (exp||[]).filter(e=>e.transaction_type==='عهدة').reduce((s,r)=>s+(r.amount||0),0)
      const netProfit = totalCollected - totalSarf

      // By invoice type
      const invByType: Record<string,number> = {}
      ;(inv||[]).forEach(i=>{ invByType[i.invoice_type||'أخرى'] = (invByType[i.invoice_type||'أخرى']||0)+(i.total_amount||0) })

      // By expense category
      const expByCat: Record<string,number> = {}
      ;(exp||[]).forEach(e=>{ expByCat[e.category||'أخرى'] = (expByCat[e.category||'أخرى']||0)+(e.amount||0) })

      // Project stats
      const projByStatus: Record<string,number> = {}
      ;(proj||[]).forEach(p=>{ projByStatus[p.status||'Unknown'] = (projByStatus[p.status||'Unknown']||0)+1 })
      const totalBudget = (proj||[]).reduce((s,r)=>s+(r.budget||0),0)
      const totalActual = (proj||[]).reduce((s,r)=>s+(r.actual_cost||0),0)
      const avgCompletion = (proj||[]).length>0 ? Math.round((proj||[]).reduce((s,r)=>s+(r.completion_pct||0),0)/(proj||[]).length) : 0

      // Maint stats
      const maintByStatus: Record<string,number> = {}
      ;(maint||[]).forEach(m=>{ maintByStatus[m.status||'Unknown'] = (maintByStatus[m.status||'Unknown']||0)+1 })
      const totalMaintCost = (maint||[]).reduce((s,r)=>s+(r.cost||0),0)

      // Inventory
      const lowStockCount = (inv_items||[]).filter(i=>i.status==='Low Stock').length
      const totalInventoryValue = (inv_items||[]).reduce((s,r)=>s+(r.unit_cost||0)*(r.quantity||0),0)

      // AMC
      const activeAMC = (contracts||[]).filter(c=>c.status==='Active')
      const totalAMCValue = activeAMC.reduce((s,r)=>s+(r.annual_value||0),0)

      setData({
        totalInvoiced,totalCollected,totalBalance,totalVAT,totalExpenses,totalSarf,totalOhda,netProfit,
        invByType,expByCat,projByStatus,totalBudget,totalActual,avgCompletion,
        maintByStatus,totalMaintCost,lowStockCount,totalInventoryValue,
        totalAMCValue,activeAMCCount:activeAMC.length,
        totalClients:(clients||[]).length,activeClients:(clients||[]).filter(c=>c.status==='Active').length,
        totalTechs:techs?.length||0,
        invoiceCount:(inv||[]).length,paidInvoices:(inv||[]).filter(i=>i.status==='Paid').length,
        overdueInvoices:(inv||[]).filter(i=>i.status==='Overdue').length,
      })
      setLoading(false)
    }
    load()
  },[])

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)

  const TABS = [
    {k:'financial',l:'المالية',icon:DollarSign},
    {k:'projects',l:'المشاريع',icon:BarChart2},
    {k:'operations',l:'العمليات',icon:Wrench},
    {k:'inventory',l:'المخزون',icon:Package},
    {k:'hr',l:'الموارد البشرية',icon:Users},
  ]

  if(loading) return <div style={{padding:60,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري تحميل التقارير...</div>
  if(!data) return null

  const BarItem = ({label,value,max,color}:{label:string,value:number,max:number,color:string}) => (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
        <span style={{fontWeight:600}}>{label}</span>
        <span style={{color,fontWeight:700}}>{fmt(value)} ر.س</span>
      </div>
      <div style={{background:'var(--cs-border)',borderRadius:6,height:10}}>
        <div style={{width:`${max>0?Math.min(100,value/max*100):0}%`,background:color,height:10,borderRadius:6,transition:'width 0.5s'}}/>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{gap:8}}>
        <div><div className="page-title">التقارير والإحصاءات</div><div className="page-subtitle">لمحة شاملة عن أداء الشركة</div></div>
        <button onClick={()=>window.print()} style={{display:"flex",alignItems:"center",gap:6,background:"var(--cs-blue)",color:"white",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"Tajawal,sans-serif",fontWeight:600}}><Printer size={15}/>طباعة</button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,borderBottom:'2px solid var(--cs-border)',paddingBottom:0}}>
        {TABS.map(tab=>(
          <button key={tab.k} onClick={()=>setActiveTab(tab.k)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',border:'none',cursor:'pointer',fontFamily:'Tajawal,sans-serif',fontWeight:600,fontSize:13,borderRadius:'8px 8px 0 0',
              background:activeTab===tab.k?'var(--cs-blue)':'var(--cs-gray-light)',
              color:activeTab===tab.k?'white':'var(--cs-text-muted)',
              marginBottom:activeTab===tab.k?-2:0,borderBottom:activeTab===tab.k?'2px solid var(--cs-blue)':'none'}}>
            <tab.icon size={15}/>{tab.l}
          </button>
        ))}
      </div>

      {activeTab==='financial'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>💰 ملخص الإيرادات</div>
            {[
              {l:'إجمالي الفواتير الصادرة',v:data.totalInvoiced,c:'var(--cs-blue)'},
              {l:'VAT المحصّل',v:data.totalVAT,c:'var(--cs-orange)'},
              {l:'المبالغ المحصّلة',v:data.totalCollected,c:'var(--cs-green)'},
              {l:'الرصيد المستحق',v:data.totalBalance,c:'var(--cs-red)'},
              {l:'صافي الربح التقديري',v:data.netProfit,c:data.netProfit>=0?'var(--cs-green)':'var(--cs-red)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<4?'1px solid var(--cs-border)':'none'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{s.l}</span>
                <span style={{fontSize:15,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{fmt(s.v)} ر.س</span>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📊 الفواتير حسب النوع</div>
            {Object.entries(data.invByType).sort(([,a],[,b])=>(b as number)-(a as number)).map(([type,val])=>(
              <BarItem key={type} label={type} value={val as number} max={data.totalInvoiced} color="var(--cs-blue)"/>
            ))}
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📤 المصروفات حسب الفئة</div>
            {Object.entries(data.expByCat).sort(([,a],[,b])=>(b as number)-(a as number)).slice(0,6).map(([cat,val])=>(
              <BarItem key={cat} label={cat} value={val as number} max={data.totalExpenses} color="var(--cs-red)"/>
            ))}
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📋 حالة الفواتير</div>
            {[
              {l:`عدد الفواتير`,v:data.invoiceCount+' فاتورة',c:'var(--cs-blue)'},
              {l:`مدفوعة`,v:data.paidInvoices+' فاتورة',c:'var(--cs-green)'},
              {l:`متأخرة`,v:data.overdueInvoices+' فاتورة',c:'var(--cs-red)'},
              {l:`عقود AMC نشطة`,v:data.activeAMCCount+' عقد',c:'var(--cs-blue)'},
              {l:`قيمة عقود AMC`,v:fmt(data.totalAMCValue)+' ر.س',c:'var(--cs-green)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<4?'1px solid var(--cs-border)':'none'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{s.l}</span>
                <span style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='projects'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>🏗 المشاريع حسب الحالة</div>
            {Object.entries(data.projByStatus).map(([status,count])=>(
              <div key={status} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{fontSize:13,fontWeight:600}}>{status}</span>
                <span className={`badge ${status==='Completed'?'badge-green':status==='In Progress'?'badge-blue':status==='On Hold'?'badge-amber':'badge-gray'}`}>{count as number} مشروع</span>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>💵 الميزانية والتكاليف</div>
            {[
              {l:'إجمالي الميزانيات',v:fmt(data.totalBudget)+' ر.س',c:'var(--cs-blue)'},
              {l:'إجمالي التكاليف الفعلية',v:fmt(data.totalActual)+' ر.س',c:'var(--cs-orange)'},
              {l:'الفرق',v:fmt(data.totalBudget-data.totalActual)+' ر.س',c:(data.totalBudget-data.totalActual)>=0?'var(--cs-green)':'var(--cs-red)'},
              {l:'متوسط نسبة الإنجاز',v:data.avgCompletion+'%',c:'var(--cs-blue)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<3?'1px solid var(--cs-border)':'none'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{s.l}</span>
                <span style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='operations'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>🔧 الصيانة حسب الحالة</div>
            {Object.entries(data.maintByStatus).map(([status,count])=>(
              <div key={status} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--cs-border)'}}>
                <span style={{fontSize:13,fontWeight:600}}>{status}</span>
                <span className={`badge ${status==='Completed'?'badge-green':status==='Open'?'badge-blue':status==='Overdue'?'badge-red':'badge-gray'}`}>{count as number} طلب</span>
              </div>
            ))}
            <div style={{marginTop:12,padding:'10px 0',borderTop:'2px solid var(--cs-border)'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>إجمالي تكاليف الصيانة</span>
                <span style={{fontSize:15,fontWeight:800,color:'var(--cs-orange)'}}>{fmt(data.totalMaintCost)} ر.س</span>
              </div>
            </div>
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>👥 العملاء</div>
            {[
              {l:'إجمالي العملاء',v:data.totalClients,c:'var(--cs-blue)'},
              {l:'عملاء نشطون',v:data.activeClients,c:'var(--cs-green)'},
              {l:'معدل النشاط',v:data.totalClients>0?Math.round(data.activeClients/data.totalClients*100)+'%':'0%',c:'var(--cs-orange)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:i<2?'1px solid var(--cs-border)':'none'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{s.l}</span>
                <span style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='inventory'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>📦 ملخص المخزون</div>
            {[
              {l:'قيمة المخزون الكلية',v:fmt(data.totalInventoryValue)+' ر.س',c:'var(--cs-blue)'},
              {l:'أصناف منخفضة المخزون',v:data.lowStockCount+' صنف',c:'var(--cs-red)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:i<1?'1px solid var(--cs-border)':'none'}}>
                <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>{s.l}</span>
                <span style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='hr'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:15,marginBottom:16}}>👷 الفنيون</div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0'}}>
              <span style={{fontSize:13,color:'var(--cs-text-muted)'}}>إجمالي الفنيين النشطين</span>
              <span style={{fontSize:22,fontWeight:800,color:'var(--cs-blue)'}}>{data.totalTechs}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
