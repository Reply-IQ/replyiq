import { useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Button, Tabs, Stars, Tag, Spinner, Alert, SectionHeader } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { useLang } from '../lib/lang.jsx'
import { classifyReview, draftResponse } from '../lib/api.js'
import { saveAiClassification, saveResponse } from '../lib/supabase.js'

export default function Reviews() {
  const { reviews, showToast, updateReviewInState } = useApp()
  const { t } = useLang()
  const tr = t.reviews
  const [filter, setFilter]   = useState('all')
  const [loadingMap, setLM]   = useState({})
  const [tone, setTone]       = useState('professional')

  const filtered = { all:reviews, negative:reviews.filter(r=>r.rating<=2), neutral:reviews.filter(r=>r.rating===3), positive:reviews.filter(r=>r.rating>=4) }[filter]||reviews
  function setLoading(id,val) { setLM(p=>({...p,[id]:val})) }

  async function classify(review) {
    setLoading(review.id,'classify')
    const result = await classifyReview(review)
    if (result.error) { showToast(t.dashboard.brief.aiError,'error'); setLoading(review.id,null); return }
    const { data:updated } = await saveAiClassification(review.id, result)
    if (updated) updateReviewInState(updated)
    setLoading(review.id,null)
  }

  async function classifyAll() {
    const unclassified = reviews.filter(r=>!r.ai_sentiment)
    for (const r of unclassified) await classify(r)
    showToast(`Classified ${unclassified.length} reviews`,'success')
  }

  async function respond(review) {
    setLoading(review.id,'respond')
    const result = await draftResponse(review, tone)
    if (result.error) { showToast(t.dashboard.brief.aiError,'error'); setLoading(review.id,null); return }
    const { data:updated } = await saveResponse(review.id, result.response||result.raw||'')
    if (updated) updateReviewInState(updated)
    setLoading(review.id,null)
  }

  function copyResponse(review) {
    if (review.response_text) navigator.clipboard?.writeText(review.response_text)
    showToast('✓ Copied','success')
  }

  const unanswered = reviews.filter(r=>!r.responded&&r.rating<=2).length

  return (
    <Layout title={tr.title} subtitle={`${reviews.length} ${tr.total} · ${unanswered} ${tr.unanswered}`}
      topbarRight={
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{display:'flex',gap:4}}>
            {Object.entries(tr.tones).map(([key,label])=>(
              <Button key={key} variant={tone===key?'secondary':'ghost'} size="sm" onClick={()=>setTone(key)}>{label}</Button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={classifyAll}>{tr.classifyAll}</Button>
        </div>
      }
    >
      {reviews.some(r=>r.ai_risk_flag)&&<Alert type="danger" title={tr.complianceAlert}>{tr.complianceSub}</Alert>}
      <Tabs active={filter} onChange={setFilter} tabs={[
        {id:'all',      label:tr.tabs.all,      count:reviews.length},
        {id:'negative', label:tr.tabs.negative, count:reviews.filter(r=>r.rating<=2).length},
        {id:'neutral',  label:tr.tabs.neutral,  count:reviews.filter(r=>r.rating===3).length},
        {id:'positive', label:tr.tabs.positive, count:reviews.filter(r=>r.rating>=4).length},
      ]}/>
      {filtered.map(review=>{
        const loading=loadingMap[review.id]
        const hasClass=!!review.ai_sentiment
        const hasResp=!!review.response_text
        const initials=review.author.split(' ').map(w=>w[0]).join('').slice(0,2)
        const avatarBg=review.rating>=4?'rgba(2,195,154,.15)':review.rating<=2?'rgba(232,72,85,.15)':'rgba(90,122,135,.15)'
        const avatarFg=review.rating>=4?'var(--mint)':review.rating<=2?'var(--rose)':'var(--mid)'
        return (
          <div key={review.id} className="fade-up" style={{background:'var(--card2)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:16,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,background:avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:avatarFg,fontSize:'0.78rem',fontWeight:600}}>{initials}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:'0.88rem'}}>{review.author}</div>
                  <div style={{fontSize:'0.7rem',color:'var(--mid)',marginTop:1}}>{review.review_date} · {review.platform}{review.responded&&<span style={{marginLeft:8,color:'var(--mint)'}}>{tr.responded}</span>}</div>
                </div>
              </div>
              <Stars n={review.rating}/>
            </div>
            <p style={{fontSize:'0.85rem',color:'var(--silver)',lineHeight:1.65,marginBottom:10}}>{review.text}</p>
            {hasClass&&<>
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                {(review.ai_categories||[]).map(cat=><Tag key={cat} type={cat}>{cat.replace(/_/g,' ')}</Tag>)}
                {review.ai_severity&&<Tag type={review.ai_severity}>{review.ai_severity}</Tag>}
                {review.ai_risk_flag&&<Tag type="compliance_risk">⚠ Risk</Tag>}
              </div>
              {review.ai_risk_flag&&review.ai_risk_reason&&<div style={{padding:'8px 12px',background:'rgba(232,72,85,.08)',border:'1px solid rgba(232,72,85,.2)',borderRadius:7,fontSize:'0.8rem',color:'var(--rose)',marginBottom:8}}>{tr.compliance} {review.ai_risk_reason}</div>}
              {review.ai_action&&<div style={{padding:'8px 12px',background:'rgba(2,131,144,.06)',border:'1px solid var(--border)',borderRadius:7,fontSize:'0.8rem',color:'var(--silver)',marginBottom:8}}>{tr.suggested} {review.ai_action}</div>}
            </>}
            {hasResp&&<div style={{background:'var(--ink)',border:'1px solid rgba(2,195,154,.2)',borderRadius:8,padding:'13px 15px',fontSize:'0.85rem',color:'var(--silver)',lineHeight:1.7,fontStyle:'italic',marginBottom:8}}>"{review.response_text}"</div>}
            <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:8}}>
              {!hasClass&&loading!=='classify'&&<Button variant="ghost" size="sm" onClick={()=>classify(review)}>{tr.classify}</Button>}
              {loading==='classify'&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.77rem',color:'var(--mint)'}}><Spinner size={12}/>{tr.classifying}</div>}
              {hasClass&&!hasResp&&loading!=='respond'&&review.rating<=3&&<Button variant="secondary" size="sm" onClick={()=>respond(review)}>{tr.draft}</Button>}
              {loading==='respond'&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.77rem',color:'var(--mint)'}}><Spinner size={12}/>{tr.drafting}</div>}
              {hasResp&&<><Button variant="primary" size="sm" onClick={()=>copyResponse(review)}>{tr.copy}</Button><Button variant="ghost" size="sm" onClick={()=>respond(review)}>{tr.regen}</Button></>}
            </div>
          </div>
        )
      })}
    </Layout>
  )
}
