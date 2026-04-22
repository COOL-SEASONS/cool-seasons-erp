'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Building2, DollarSign, Bell, Shield, Database } from 'lucide-react'

const DEFAULTS: Record<string,string> = {
  company_name: 'COOL SEASONS',
  company_name_ar: 'كول سيزونز',
  company_tagline: 'DARAJA.STORE',
  phone: '',
  email: '',
  address: '',
  city: 'الرياض',
  vat_number: '',
  cr_number: '',
  vat_rate: '15',
  currency: 'SAR',
  currency_ar: 'ريال سعودي',
  invoice_prefix: 'INV',
  quote_prefix: 'QT',
  project_prefix: 'PR',
  maintenance_prefix: 'M',
  default_payment_terms: '30/30/40',
  default_warranty_months: '12',
  hourly_rate: '25',
  overtime_rate: '37.5',
  alert_days_expiry: '30',
  alert_days_maintenance: '7',
  low_stock_threshold: '5',
  primary_color: '#1E9CD7',
  secondary_color: '#C0392B',
}

export default function SettingsPage() {
  const [settings,setSettings] = useState<Record<string,string>>(DEFAULTS)
  const [saving,setSaving] = useState(false)
  const [saved,setSaved] = useState(false)
  const [activeTab,setActiveTab] = useState('company')

  useEffect(()=>{
    supabase.from('settings').select('*').then(({data})=>{
      if(data&&data.length>0) {
        const merged = {...DEFAULTS}
        data.forEach((row:any) => { if(row.key) merged[row.key] = row.value||'' })
        setSettings(merged)
      }
    })
  },[])

  const save = async () => {
    setSaving(true)
    const rows = Object.entries(settings).map(([key,value])=>({key,value}))
    await supabase.from('settings').upsert(rows,{onConflict:'key'})
    setSaving(false); setSaved(true)
    setTimeout(()=>setSaved(false),2000)
  }

  const Field = ({label,k,type='text',placeholder=''}:{label:string,k:string,type?:string,placeholder?:string}) => (
    <div>
      <label className="form-label">{label}</label>
      <input type={type} className="form-input" placeholder={placeholder} value={settings[k]||''}
        onChange={e=>setSettings({...settings,[k]:e.target.value})}/>
    </div>
  )

  const TABS = [
    {k:'company',l:'الشركة',icon:Building2},
    {k:'financial',l:'المالية',icon:DollarSign},
    {k:'numbering',l:'الترقيم',icon:Database},
    {k:'alerts',l:'التنبيهات',icon:Bell},
  ]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">الإعدادات</div><div className="page-subtitle">إعدادات النظام</div></div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={15}/>{saving?'جاري الحفظ...':saved?'✅ تم الحفظ':'حفظ الإعدادات'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,borderBottom:'2px solid var(--cs-border)'}}>
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

      {activeTab==='company'&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:20}}>🏢 بيانات الشركة</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <Field label="اسم الشركة (إنجليزي)" k="company_name" placeholder="COOL SEASONS"/>
            <Field label="اسم الشركة (عربي)" k="company_name_ar" placeholder="كول سيزونز"/>
            <Field label="الشعار / Tagline" k="company_tagline" placeholder="DARAJA.STORE"/>
            <Field label="الهاتف" k="phone" placeholder="966-1-XXXXXXX"/>
            <Field label="البريد الإلكتروني" k="email" type="email"/>
            <Field label="المدينة" k="city"/>
            <div style={{gridColumn:'1/-1'}}><Field label="العنوان" k="address"/></div>
            <Field label="رقم السجل التجاري" k="cr_number"/>
            <Field label="رقم ضريبة القيمة المضافة" k="vat_number"/>
          </div>
        </div>
      )}

      {activeTab==='financial'&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:20}}>💰 الإعدادات المالية</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label className="form-label">نسبة الضريبة (VAT %)</label>
              <input type="number" className="form-input" value={settings.vat_rate||'15'}
                onChange={e=>setSettings({...settings,vat_rate:e.target.value})}/>
              <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:4}}>الافتراضي: 15% للمملكة العربية السعودية</div>
            </div>
            <div>
              <label className="form-label">العملة</label>
              <select className="form-input" value={settings.currency||'SAR'}
                onChange={e=>setSettings({...settings,currency:e.target.value})}>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
            <Field label="معدل الساعة الافتراضي (ر.س)" k="hourly_rate" type="number"/>
            <Field label="معدل ساعة الإضافي (ر.س)" k="overtime_rate" type="number"/>
            <div style={{gridColumn:'1/-1'}}>
              <label className="form-label">شروط الدفع الافتراضية</label>
              <select className="form-input" value={settings.default_payment_terms||'30/30/40'}
                onChange={e=>setSettings({...settings,default_payment_terms:e.target.value})}>
                {['مقدم','50/50','30/30/40','25/50/25','25/75','على الإنجاز'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* VAT preview */}
          <div style={{marginTop:20,background:'#E8F6FC',borderRadius:10,padding:16}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'var(--cs-blue)'}}>معاينة حساب الفاتورة</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,textAlign:'center'}}>
              {[
                {l:'مبلغ 1,000 ر.س',v:`VAT: ${Math.round(1000*(parseFloat(settings.vat_rate||'15')/100))} ر.س`,c:'var(--cs-orange)'},
                {l:'الإجمالي',v:`${Math.round(1000*(1+parseFloat(settings.vat_rate||'15')/100))} ر.س`,c:'var(--cs-blue)'},
                {l:'نسبة VAT',v:`${settings.vat_rate||15}%`,c:'var(--cs-green)'},
              ].map((s,i)=>(
                <div key={i} style={{background:'white',borderRadius:8,padding:10}}>
                  <div style={{fontSize:11,color:'var(--cs-text-muted)',marginBottom:4}}>{s.l}</div>
                  <div style={{fontWeight:800,color:s.c,fontSize:15}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab==='numbering'&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:8}}>🔢 بادئات الترقيم التلقائي</div>
          <div style={{fontSize:12,color:'var(--cs-text-muted)',marginBottom:20}}>تُستخدم كقيم افتراضية عند إنشاء سجلات جديدة</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[
              {l:'بادئة رقم الفاتورة',k:'invoice_prefix',ex:'INV-001'},
              {l:'بادئة رقم عرض السعر',k:'quote_prefix',ex:'QT-001'},
              {l:'بادئة رقم المشروع',k:'project_prefix',ex:'PR-001'},
              {l:'بادئة رقم الصيانة',k:'maintenance_prefix',ex:'M-001'},
            ].map(({l,k,ex})=>(
              <div key={k}>
                <label className="form-label">{l}</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input className="form-input" style={{flex:1}} value={settings[k]||''} onChange={e=>setSettings({...settings,[k]:e.target.value})}/>
                  <span style={{fontSize:12,color:'var(--cs-text-muted)',whiteSpace:'nowrap'}}>{(settings[k]||ex.split('-')[0])}-001</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='alerts'&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:16,marginBottom:20}}>🔔 إعدادات التنبيهات</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label className="form-label">التنبيه قبل انتهاء الوثائق (يوم)</label>
              <input type="number" min="1" max="365" className="form-input" value={settings.alert_days_expiry||'30'}
                onChange={e=>setSettings({...settings,alert_days_expiry:e.target.value})}/>
              <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:4}}>الحالي: تنبيه قبل {settings.alert_days_expiry||30} يوم</div>
            </div>
            <div>
              <label className="form-label">التنبيه قبل موعد الصيانة (يوم)</label>
              <input type="number" min="1" max="30" className="form-input" value={settings.alert_days_maintenance||'7'}
                onChange={e=>setSettings({...settings,alert_days_maintenance:e.target.value})}/>
            </div>
            <div>
              <label className="form-label">حد تنبيه المخزون المنخفض</label>
              <input type="number" min="1" className="form-input" value={settings.low_stock_threshold||'5'}
                onChange={e=>setSettings({...settings,low_stock_threshold:e.target.value})}/>
              <div style={{fontSize:11,color:'var(--cs-text-muted)',marginTop:4}}>تنبيه عند الوصول لـ {settings.low_stock_threshold||5} وحدات أو أقل</div>
            </div>
            <div>
              <label className="form-label">مدة الضمان الافتراضية (شهر)</label>
              <input type="number" min="1" max="120" className="form-input" value={settings.default_warranty_months||'12'}
                onChange={e=>setSettings({...settings,default_warranty_months:e.target.value})}/>
            </div>
          </div>
          <div style={{marginTop:20,background:'#E8F8EF',borderRadius:10,padding:14,fontSize:13,color:'var(--cs-green)',fontWeight:600}}>
            ✅ التنبيهات النشطة: إقامات الفنيين، تأمين المركبات، وثائق الشركة، عقود AMC — جميعها تظهر في لوحة التحكم
          </div>
        </div>
      )}
    </div>
  )
}
