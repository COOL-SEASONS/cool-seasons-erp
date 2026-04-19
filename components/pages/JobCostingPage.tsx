'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react'

const EMPTY = { job_code:'', project_id:'', tech_id:'', contract_value:0, labor_cost:0, material_cost:0, other_costs:0, notes:'' }

export default function JobCostingPage() {
  const [rows, setRows] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [techs, setTechs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: jc }, { data: p }, { data: t }] = await Promise.all([
        supabase.from('wip_report').select('*, projects(project_name, budget, actual_cost, completion_pct, clients(company_name)), technicians(full_name)').order('created_at',{ascending:false}),
        supabase.from('projects').select('id,project_name,budget,actual_cost,client_id,tech_id'),
        supabase.from('technicians').select('id,full_name').eq('status','Active'),
      ])
      setRows(jc||[]); setProjects(p||[]); setTechs(t||[])
      setLoading(false)
    }
    load()
  }, [])

  // Calculate from projects directly
  const [projData, setProjData] = useState<any[]>([])
  useEffect(() => {
    async function loadProj() {
      const { data } = await supabase.from('projects').select('*, clients(company_name), technicians(full_name)').order('created_at',{ascending:false})
      setProjData(data||[])
    }
    loadProj()
  }, [])

  const fmt = (n:number) => new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(n||0)
  const filtered = projData.filter(r => r.project_name?.toLowerCase().includes(search.toLowerCase()))

  const totalRevenue = projData.reduce((s,r)=>s+(r.budget||0),0)
  const totalCost = projData.reduce((s,r)=>s+(r.actual_cost||0),0)
  const totalProfit = totalRevenue - totalCost
  const overBudget = projData.filter(r=>(r.actual_cost||0)>(r.budget||0)).length

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">تكاليف المشاريع</div><div className="page-subtitle">Job Costing</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {l:'إجمالي الإيرادات',v:fmt(totalRevenue)+' ر.س',c:'var(--cs-blue)'},
          {l:'إجمالي التكاليف',v:fmt(totalCost)+' ر.س',c:'var(--cs-orange)'},
          {l:'صافي الربح',v:fmt(totalProfit)+' ر.س',c:totalProfit>=0?'var(--cs-green)':'var(--cs-red)'},
          {l:'هامش الربح',v:totalRevenue?Math.round(totalProfit/totalRevenue*100)+'%':'0%',c:'var(--cs-blue)'},
          {l:'تجاوزت الميزانية',v:overBudget+' مشروع',c:'var(--cs-red)'},
        ].map((s,i)=>(
          <div key={i} className="stat-card"><div style={{fontSize:11,color:'var(--cs-text-muted)',fontWeight:600,marginBottom:4}}>{s.l}</div><div style={{fontSize:17,fontWeight:800,color:s.c,fontFamily:'Cairo,sans-serif'}}>{s.v}</div></div>
        ))}
      </div>

      <div className="card" style={{marginBottom:16,padding:'12px 16px'}}>
        <div style={{position:'relative'}}><Search size={16} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--cs-text-muted)'}}/><input className="form-input" style={{paddingRight:34}} placeholder="بحث بالمشروع..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      <div className="card">
        {loading ? <div style={{padding:40,textAlign:'center',color:'var(--cs-text-muted)'}}>جاري التحميل...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>المشروع</th><th>العميل</th><th>الفني</th><th>الميزانية</th>
                <th>التكلفة الفعلية</th><th>الربح/الخسارة</th><th>هامش %</th><th>الإنجاز</th><th>الحالة</th>
              </tr></thead>
              <tbody>
                {filtered.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--cs-text-muted)'}}>لا توجد مشاريع</td></tr>
                : filtered.map(r=>{
                  const budget = r.budget||0
                  const cost = r.actual_cost||0
                  const profit = budget - cost
                  const margin = budget>0 ? Math.round(profit/budget*100) : 0
                  const overB = cost > budget && budget > 0
                  return (
                    <tr key={r.id} style={{background:overB?'#FFF5F5':'inherit'}}>
                      <td style={{fontWeight:600}}>{r.project_name}</td>
                      <td>{r.clients?.company_name}</td>
                      <td>{r.technicians?.full_name}</td>
                      <td>{fmt(budget)} ر.س</td>
                      <td style={{color:overB?'var(--cs-red)':'inherit',fontWeight:overB?700:400}}>{fmt(cost)} ر.س</td>
                      <td style={{color:profit>=0?'var(--cs-green)':'var(--cs-red)',fontWeight:700}}>{profit>=0?'+':''}{fmt(profit)} ر.س</td>
                      <td>
                        <span style={{fontWeight:700,color:margin>=20?'var(--cs-green)':margin>=0?'var(--cs-orange)':'var(--cs-red)'}}>{margin}%</span>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:50,background:'var(--cs-border)',borderRadius:4,height:6}}>
                            <div style={{width:`${r.completion_pct||0}%`,background:'var(--cs-blue)',height:6,borderRadius:4}}/>
                          </div>
                          <span style={{fontSize:11}}>{r.completion_pct||0}%</span>
                        </div>
                      </td>
                      <td>
                        {overB ? <span className="badge badge-red">تجاوز</span>
                         : budget>0 ? <span className="badge badge-green">ضمن الميزانية</span>
                         : <span className="badge badge-gray">غير محدد</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
