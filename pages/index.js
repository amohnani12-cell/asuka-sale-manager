import{useState,useEffect}from'react';
import Head from'next/head';

const fmt=n=>'₹'+parseFloat(n).toLocaleString('en-IN',{maximumFractionDigits:0});
const PAGE_SIZE=10;

const DISCOUNT_TAGS=['discount-10','discount-20','discount-30','discount-40','discount-40plus'];

function getDiscountTag(price,compareAt){
  if(!compareAt||compareAt<=price)return null;
  const pct=Math.round((1-price/compareAt)*100);
  if(pct<=10)return'discount-10';
  if(pct<=20)return'discount-20';
  if(pct<=30)return'discount-30';
  if(pct<=40)return'discount-40';
  return'discount-40plus';
}

const TAG_LABELS={
  'discount-10':'Up to 10% off',
  'discount-20':'11–20% off',
  'discount-30':'21–30% off',
  'discount-40':'31–40% off',
  'discount-40plus':'40%+ off',
};

export default function App(){
  const[products,setProducts]=useState([]);
  const[page,setPage]=useState(0);
  const[loading,setLoading]=useState(true);
  const[msg,setMsg]=useState('Loading...');
  const[filter,setFilter]=useState('all');
  const[typeFilter,setTypeFilter]=useState('all');
  const[saving,setSaving]=useState(false);
  const[status,setStatus]=useState('');
  const[updated,setUpdated]=useState([]);
  const[inputs,setInputs]=useState({});
  const[selected,setSelected]=useState({});
  const[bulkExact,setBulkExact]=useState('');
  const[collections,setCollections]=useState([]);
  const[showCollModal,setShowCollModal]=useState(false);
  const[collSearch,setCollSearch]=useState('');
  const[addingColl,setAddingColl]=useState(false);
  const[collStatus,setCollStatus]=useState('');
  const[tagging,setTagging]=useState(false);
  const[tagStatus,setTagStatus]=useState('');
  const[showTagModal,setShowTagModal]=useState(false);
  const[tagPreview,setTagPreview]=useState({});

  useEffect(()=>{
    (async()=>{
      let all=[],sid='0';
      while(true){
        const r=await fetch('/api/products?since_id='+sid);
        const d=await r.json();
        if(!d.products||!d.products.length)break;
        all=[...all,...d.products.map(p=>({
          id:p.id,
          title:p.title,
          status:p.status,
          productType:p.product_type||'Uncategorized',
          price:parseFloat(p.variants[0]?.price||0),
          compareAt:p.variants[0]?.compare_at_price?parseFloat(p.variants[0].compare_at_price):null,
          variantId:p.variants[0]?.id,
          image:p.images[0]?.src||'',
          tags:p.tags||'',
        }))];
        sid=all[all.length-1].id;
        setMsg('Loading... '+all.length);
        if(d.products.length<250)break;
      }
      setProducts(all);
      setLoading(false);
      setStatus('Loaded '+all.length+' products');
      fetch('/api/collections').then(r=>r.json()).then(d=>setCollections(d.collections||[])).catch(()=>{});
    })().catch(e=>setMsg('Error: '+e.message));
  },[]);

  useEffect(()=>{setPage(0);setSelected({});},[filter,typeFilter]);

  const filtered=products.filter(p=>{
    if(filter!=='all'&&p.status!==filter)return false;
    if(typeFilter!=='all'&&p.productType!==typeFilter)return false;
    return true;
  });

  const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  const pageProd=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const types=['all',...[...new Set(products.map(p=>p.productType))].sort()];
  const cnt={all:products.length,active:products.filter(p=>p.status==='active').length,draft:products.filter(p=>p.status==='draft').length};
  const selectedIds=Object.keys(selected).filter(id=>selected[id]);
  const allPageSelected=pageProd.length>0&&pageProd.every(p=>selected[p.id]);
  const someSelected=selectedIds.length>0;
  const targets=someSelected?pageProd.filter(p=>selected[p.id]):pageProd;

  const toggleSelect=(id)=>setSelected(prev=>({...prev,[id]:!prev[id]}));
  const toggleAll=()=>{
    if(allPageSelected){const n={...selected};pageProd.forEach(p=>delete n[p.id]);setSelected(n);}
    else{const n={...selected};pageProd.forEach(p=>{n[p.id]=true;});setSelected(n);}
  };

  const getSale=(p)=>{
    const inp=inputs[p.id]||{};
    const pct=parseFloat(inp.pct),ex=parseFloat(inp.exact);
    if(pct>0&&pct<100)return Math.round(p.price*(1-pct/100));
    if(ex>0&&ex<p.price)return Math.round(ex);
    return null;
  };

  const setInput=(id,field,val)=>setInputs(prev=>({...prev,[id]:{...(prev[id]||{}),[field]:val,...(field==='pct'?{exact:''}:{pct:''})}}));
  const applyBulkPct=(pct)=>{const n={...inputs};targets.forEach(p=>{n[p.id]={pct:String(pct),exact:''};});setInputs(n);};
  const applyBulkExact=(val)=>{const price=parseFloat(val);if(!price)return;const n={...inputs};targets.forEach(p=>{n[p.id]={exact:String(price),pct:''};});setInputs(n);setBulkExact('');};
  const clearPage=()=>{const n={...inputs};pageProd.forEach(p=>delete n[p.id]);setInputs(n);};

  const removeSaleProduct=async(p)=>{
    try{
      const r=await fetch('/api/remove-sale?productId='+p.id,{method:'PUT',headers:{'Content-Type':'application/json'}});
      const d=await r.json();
      if(d.done>0){
        setProducts(prev=>prev.map(x=>x.id===p.id?{...x,price:p.compareAt,compareAt:null}:x));
        setStatus('Removed sale from all variants: '+p.title);
      }
    }catch(e){setStatus('Error: '+e.message);}
  };

  const bulkRemove=async()=>{
    const t=targets.filter(p=>p.compareAt);
    if(!t.length){setStatus('No sale products in selection');return;}
    setSaving(true);setStatus('Removing...');let done=0;
    for(const p of t){await removeSaleProduct(p);done++;}
    setStatus('✓ Removed sale from '+done+' products (all variants)');
    setSaving(false);
  };

  const saveAll=async()=>{
    const t=targets.filter(p=>getSale(p)!==null);
    if(!t.length){setStatus('No discounts set');return;}
    setSaving(true);setStatus('Saving '+t.length+'...');let done=0;
    for(const p of t){
      const sale=getSale(p);
      try{
        const r=await fetch('/api/update-all-variants?productId='+p.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({salePrice:sale,originalPrice:p.price})});
        const d=await r.json();
        if(d.done>0){
          const old=p.price;
          setProducts(prev=>prev.map(x=>x.id===p.id?{...x,compareAt:old,price:sale}:x));
          setUpdated(u=>[{title:p.title,type:p.productType,from:old,to:sale,variants:d.total},...u]);
          done++;setStatus('Saved '+done+'/'+t.length+' ('+d.total+' variants each)...');
        }
      }catch(e){}
    }
    const n={...inputs};t.forEach(p=>delete n[p.id]);setInputs(n);
    setStatus('✓ Saved '+done+' products — all variants updated!');
    setSaving(false);
    if(!someSelected)setTimeout(()=>{if(page<totalPages-1){setPage(p=>p+1);setSelected({});}},600);
  };

  const addToCollection=async(collId,collTitle)=>{
    const pids=someSelected?selectedIds.map(Number):pageProd.map(p=>p.id);
    if(!pids.length)return;
    setAddingColl(true);setCollStatus('Adding '+pids.length+' to '+collTitle+'...');
    try{
      const r=await fetch('/api/collections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collectionId:collId,productIds:pids})});
      const d=await r.json();
      setCollStatus('✓ Added '+d.done+'/'+d.total+' products to '+collTitle);
    }catch(e){setCollStatus('Error: '+e.message);}
    setAddingColl(false);
    setTimeout(()=>setShowCollModal(false),2000);
  };

  // ── AUTO DISCOUNT TAGGING ──
  const previewTags=()=>{
    // Build preview of what tags will be applied
    const saleProducts=products.filter(p=>p.compareAt&&p.compareAt>p.price);
    const preview={};
    DISCOUNT_TAGS.forEach(t=>{preview[t]=[];});
    preview['no-sale']=[];
    saleProducts.forEach(p=>{
      const tag=getDiscountTag(p.price,p.compareAt);
      if(tag)preview[tag].push(p.title);
      else preview['no-sale'].push(p.title);
    });
    setTagPreview(preview);
    setShowTagModal(true);
  };

  const runAutoTag=async()=>{
    const saleProducts=products.filter(p=>p.compareAt&&p.compareAt>p.price);
    if(!saleProducts.length){setTagStatus('No products with active sale pricing found');return;}
    setTagging(true);
    setTagStatus('Tagging '+saleProducts.length+' products...');
    setShowTagModal(false);

    // Send in batches of 10
    const BATCH=10;let done=0;
    for(let i=0;i<saleProducts.length;i+=BATCH){
      const batch=saleProducts.slice(i,i+BATCH).map(p=>({
        id:p.id,
        price:p.price,
        compareAt:p.compareAt,
        tags:p.tags,
      }));
      try{
        const r=await fetch('/api/tag-discounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productIds:batch})});
        const d=await r.json();
        done+=d.done;
        setTagStatus('Tagged '+done+'/'+saleProducts.length+'...');
        // Update local tags
        d.results.forEach(res=>{
          if(res.success){
            setProducts(prev=>prev.map(p=>{
              if(p.id!==res.id)return p;
              const existingTags=(p.tags||'').split(',').map(t=>t.trim()).filter(t=>!DISCOUNT_TAGS.includes(t));
              const newTags=res.tag?[...existingTags,res.tag].join(', '):existingTags.join(', ');
              return{...p,tags:newTags};
            }));
          }
        });
      }catch(e){setTagStatus('Error: '+e.message);}
    }
    setTagStatus('✓ Auto-tagged '+done+' products with discount slabs');
    setTagging(false);
  };

  const filteredColls=collections.filter(c=>c.title.toLowerCase().includes(collSearch.toLowerCase()));

  const G='#006B4F',GOLD='#C9A84C',R='#B91C1C',D='#111827',M='#4B5563',B='#E5E7EB';
  const PURPLE='#4338CA';

  if(loading)return(
    <div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:D,color:'white',fontFamily:'system-ui'}}>
      <div style={{fontSize:32,fontWeight:800,letterSpacing:2}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div>
      <div style={{width:32,height:32,border:'2px solid #374151',borderTopColor:GOLD,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <div style={{fontSize:13,color:'#6B7280'}}>{msg}</div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  return(
    <>
      <Head><title>Asuka Couture — Sale Manager</title></Head>
      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F3F4F6',overflow:'hidden',fontFamily:'system-ui'}}>

        {/* ── COLLECTION MODAL ── */}
        {showCollModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowCollModal(false)}>
          <div style={{background:'white',borderRadius:16,padding:24,width:480,maxHeight:'80vh',display:'flex',flexDirection:'column',gap:14,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontSize:16,fontWeight:700,color:D}}>Add to Collection</div><div style={{fontSize:12,color:M,marginTop:2}}>Adding {someSelected?selectedIds.length+' selected':pageProd.length+' on page'} products</div></div>
              <button onClick={()=>setShowCollModal(false)} style={{background:'#F3F4F6',border:'none',borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:16,color:M}}>×</button>
            </div>
            <input type="text" value={collSearch} onChange={e=>setCollSearch(e.target.value)} placeholder="Search collections..." autoFocus style={{padding:'10px 14px',border:'1.5px solid '+B,borderRadius:10,fontSize:14,outline:'none',fontFamily:'inherit'}}/>
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:6,maxHeight:400}}>
              {filteredColls.length===0&&<div style={{textAlign:'center',color:'#9CA3AF',padding:20,fontSize:13}}>{collections.length===0?'Loading collections...':'No collections found'}</div>}
              {filteredColls.map(c=><button key={c.id} onClick={()=>addToCollection(c.id,c.title)} disabled={addingColl} style={{padding:'12px 16px',background:'#F9FAFB',border:'1px solid '+B,borderRadius:10,cursor:'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'space-between'}} onMouseEnter={e=>e.currentTarget.style.background='#EEF2FF'} onMouseLeave={e=>e.currentTarget.style.background='#F9FAFB'}>
                <div><div style={{fontSize:13,fontWeight:600,color:D}}>{c.title}</div><div style={{fontSize:10,color:'#9CA3AF',textTransform:'capitalize'}}>{c.type} collection</div></div>
                <span style={{fontSize:11,color:PURPLE,fontWeight:600}}>Add →</span>
              </button>)}
            </div>
            {collStatus&&<div style={{padding:'10px 14px',background:collStatus.includes('✓')?'#E8F5F0':'#FEF3C7',borderRadius:8,fontSize:12,color:collStatus.includes('✓')?G:'#92400E',fontWeight:500}}>{collStatus}</div>}
          </div>
        </div>}

        {/* ── TAG PREVIEW MODAL ── */}
        {showTagModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowTagModal(false)}>
          <div style={{background:'white',borderRadius:16,padding:24,width:520,maxHeight:'80vh',display:'flex',flexDirection:'column',gap:14,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:D}}>🏷️ Auto-Tag Discount Slabs</div>
                <div style={{fontSize:12,color:M,marginTop:2}}>Preview of tags that will be applied to sale products</div>
              </div>
              <button onClick={()=>setShowTagModal(false)} style={{background:'#F3F4F6',border:'none',borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:16,color:M}}>×</button>
            </div>
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:8}}>
              {DISCOUNT_TAGS.map(tag=>{
                const count=(tagPreview[tag]||[]).length;
                const colors={'discount-10':{bg:'#FEF3C7',text:'#92400E'},'discount-20':{bg:'#DBEAFE',text:'#1E40AF'},'discount-30':{bg:'#D1FAE5',text:'#065F46'},'discount-40':{bg:'#EDE9FE',text:'#5B21B6'},'discount-40plus':{bg:'#FEE2E2',text:'#991B1B'}};
                const c=colors[tag];
                return(
                  <div key={tag} style={{padding:'10px 14px',background:c.bg,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:c.text}}>{TAG_LABELS[tag]}</div>
                      <div style={{fontSize:10,color:c.text,opacity:.8,marginTop:2}}>Tag: <code>{tag}</code></div>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,color:c.text}}>{count}</div>
                  </div>
                );
              })}
              {(tagPreview['no-sale']||[]).length>0&&<div style={{padding:'10px 14px',background:'#F3F4F6',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:12,fontWeight:600,color:M}}>No discount tag (no compare price set)</div>
                <div style={{fontSize:20,fontWeight:800,color:M}}>{tagPreview['no-sale'].length}</div>
              </div>}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowTagModal(false)} style={{flex:1,padding:'12px',background:'white',border:'1px solid '+B,borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',color:M,fontFamily:'inherit'}}>Cancel</button>
              <button onClick={runAutoTag} style={{flex:2,padding:'12px',background:D,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                ✓ Apply Tags to All Sale Products
              </button>
            </div>
          </div>
        </div>}

        {/* ── HEADER ── */}
        <header style={{background:D,color:'white',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'3px solid '+GOLD}}>
          <div><div style={{fontSize:17,fontWeight:800,letterSpacing:1}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{fontSize:9,color:'#9CA3AF'}}>END OF SEASON SALE MANAGER</div></div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {tagStatus&&<span style={{fontSize:11,color:tagStatus.includes('✓')?'#6EE7B7':'#9CA3AF',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tagStatus}</span>}
            <button onClick={previewTags} disabled={tagging} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',padding:'5px 14px',borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:600,color:'white',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
              🏷️ Auto-Tag Discounts
            </button>
            <div style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',padding:'4px 12px',borderRadius:20,fontSize:11,color:'#D1D5DB'}}><strong style={{color:GOLD}}>{updated.length}</strong> updated · pg {page+1}/{totalPages}</div>
          </div>
        </header>

        {/* ── FILTER BAR ── */}
        <div style={{background:'white',borderBottom:'1px solid '+B,padding:'8px 20px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
          <span style={{fontSize:11,color:M,fontWeight:600}}>Status:</span>
          {['all','active','draft'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===f?D:B,background:filter===f?D:'white',color:filter===f?'white':M}}>{f[0].toUpperCase()+f.slice(1)} ({cnt[f]})</button>)}
          <span style={{fontSize:11,color:M,fontWeight:600,marginLeft:8}}>Type:</span>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{padding:'3px 8px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:180}}>
            {types.map(t=><option key={t} value={t}>{t==='all'?'All Types ('+products.length+')':t}</option>)}
          </select>
        </div>

        {/* ── BULK ACTION BAR ── */}
        <div style={{background:'#F9FAFB',borderBottom:'1px solid '+B,padding:'7px 20px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
          <div onClick={toggleAll} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',userSelect:'none'}}>
            <div style={{width:16,height:16,borderRadius:4,border:'2px solid '+(allPageSelected?D:'#9CA3AF'),background:allPageSelected?D:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {allPageSelected&&<span style={{color:'white',fontSize:10,lineHeight:1}}>&#10003;</span>}
              {!allPageSelected&&someSelected&&<div style={{width:8,height:2,background:'#9CA3AF',borderRadius:1}}/>}
            </div>
            <span style={{fontSize:11,color:M,fontWeight:600}}>{someSelected?selectedIds.length+' selected':'Select all'}</span>
          </div>
          <span style={{color:'#D1D5DB',fontSize:13}}>|</span>
          <span style={{fontSize:11,color:M,fontWeight:600}}>Apply to {someSelected?'selected':'all'}:</span>
          {[10,15,20,25,30,40,50].map(v=><button key={v} onClick={()=>applyBulkPct(v)} style={{padding:'3px 9px',background:'white',border:'1px solid '+B,borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',color:M}}>{v}%</button>)}
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <input type="number" value={bulkExact} placeholder="₹ exact" onChange={e=>setBulkExact(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyBulkExact(bulkExact)} style={{padding:'3px 8px',border:'1px solid '+B,borderRadius:6,fontSize:11,width:85,outline:'none',fontFamily:'inherit'}}/>
            <button onClick={()=>applyBulkExact(bulkExact)} disabled={!bulkExact} style={{padding:'3px 8px',background:G,color:'white',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>Set</button>
          </div>
          <span style={{color:'#D1D5DB',fontSize:13}}>|</span>
          <button onClick={bulkRemove} disabled={saving} style={{padding:'3px 10px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color:R}}>✕ Remove Sale</button>
          <button onClick={()=>{setCollStatus('');setCollSearch('');setShowCollModal(true);}} style={{padding:'3px 10px',background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color:PURPLE}}>📅 Add to Collection</button>
          <button onClick={clearPage} style={{padding:'3px 10px',background:'white',border:'1px solid '+B,borderRadius:6,fontSize:11,cursor:'pointer',color:M,marginLeft:'auto'}}>Clear</button>
        </div>

        {/* ── PRODUCT GRID ── */}
        <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
            {pageProd.map(p=>{
              const inp=inputs[p.id]||{};
              const sale=getSale(p);
              const isSel=!!selected[p.id];
              const currentTag=DISCOUNT_TAGS.find(t=>(p.tags||'').includes(t));
              return(
                <div key={p.id} style={{background:'white',borderRadius:10,border:'2px solid '+(isSel?D:sale?'#A7D7C5':B),boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden',display:'flex',flexDirection:'column',position:'relative'}}>
                  <div style={{position:'absolute',top:8,left:8,zIndex:2}} onClick={()=>toggleSelect(p.id)}>
                    <div style={{width:18,height:18,borderRadius:4,border:'2px solid '+(isSel?D:'rgba(255,255,255,.9)'),background:isSel?D:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}>
                      {isSel&&<span style={{color:'white',fontSize:11,lineHeight:1}}>&#10003;</span>}
                    </div>
                  </div>
                  <div style={{position:'relative',background:'#FAFAFA',height:140,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderBottom:'1px solid '+B,cursor:'pointer'}} onClick={()=>toggleSelect(p.id)}>
                    {p.compareAt&&<div style={{position:'absolute',top:6,right:6,background:R,color:'white',fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:4,zIndex:1}}>SALE</div>}
                    {sale&&!p.compareAt&&<div style={{position:'absolute',top:6,right:6,background:G,color:'white',fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:4,zIndex:1}}>-{Math.round((1-sale/p.price)*100)}%</div>}
                    {p.image?<img src={p.image} alt="" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain'}}/>:<div style={{color:'#D1D5DB',fontSize:11}}>No Image</div>}
                  </div>
                  <div style={{padding:'8px 10px',flex:1,display:'flex',flexDirection:'column',gap:3}}>
                    <span style={{fontSize:9,fontWeight:600,background:'#EEF2FF',color:PURPLE,padding:'1px 5px',borderRadius:4,display:'inline-block',maxWidth:'fit-content'}}>{p.productType}</span>
                    {currentTag&&<span style={{fontSize:8,fontWeight:600,background:'#FEF3C7',color:'#92400E',padding:'1px 5px',borderRadius:4,display:'inline-block',maxWidth:'fit-content'}}>🏷️ {TAG_LABELS[currentTag]}</span>}
                    <div style={{fontSize:11,fontWeight:700,color:D,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.title}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:800,color:sale?R:G}}>{sale?fmt(sale):fmt(p.price)}</span>
                      {(sale||p.compareAt)&&<span style={{fontSize:10,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(sale?p.price:(p.compareAt||0))}</span>}
                      {p.compareAt&&<span style={{fontSize:8,color:R,fontWeight:700}}>{Math.round((1-p.price/p.compareAt)*100)}%</span>}
                    </div>
                  </div>
                  <div style={{padding:'6px 10px 8px',borderTop:'1px solid #F3F4F6',display:'flex',flexDirection:'column',gap:5}}>
                    <div style={{display:'flex',gap:4}}>
                      <div style={{flex:1,position:'relative'}}>
                        <input type="number" value={inp.pct||''} min="1" max="90" placeholder="%" onChange={e=>setInput(p.id,'pct',e.target.value)} style={{width:'100%',padding:'5px 18px 5px 7px',border:'1.5px solid '+(inp.pct?G:B),borderRadius:6,fontSize:12,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                        <span style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',fontSize:9,color:M,pointerEvents:'none'}}>%</span>
                      </div>
                      <div style={{flex:1}}>
                        <input type="number" value={inp.exact||''} min="1" placeholder="₹" onChange={e=>setInput(p.id,'exact',e.target.value)} style={{width:'100%',padding:'5px 7px',border:'1.5px solid '+(inp.exact?G:B),borderRadius:6,fontSize:12,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                      </div>
                    </div>
                    {p.compareAt&&<button onClick={()=>removeSaleProduct(p)} style={{width:'100%',padding:'4px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',color:R,fontFamily:'inherit'}}>✕ Remove Sale (all sizes)</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{background:'white',borderTop:'1px solid '+B,padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          <button onClick={()=>{setPage(p=>Math.max(p-1,0));setSelected({});}} disabled={page===0} style={{background:'white',border:'1px solid '+B,padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>← Prev</button>
          <span style={{fontSize:12,color:M}}>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
          <button onClick={()=>{setPage(p=>Math.min(p+1,totalPages-1));setSelected({});}} disabled={page>=totalPages-1} style={{background:'white',border:'1px solid '+B,padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>Next →</button>
          <div style={{flex:1}}/>
          {status&&<span style={{fontSize:11,color:M,maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{status}</span>}
          <button onClick={saveAll} disabled={saving} style={{background:G,color:'white',border:'none',padding:'10px 28px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.6:1}}>
            {saving?'Saving...':someSelected?'✓ Save Selected ('+selectedIds.length+')':'✓ Save All & Next'}
          </button>
        </div>

        {updated.length>0&&<div style={{background:D,color:'#9CA3AF',padding:'5px 20px',fontSize:10,borderTop:'1px solid #374151',flexShrink:0}}>
          <strong style={{color:GOLD}}>{updated.length}</strong> updated · latest: {updated[0]?.title} ({fmt(updated[0]?.from)} → {fmt(updated[0]?.to)}{updated[0]?.variants?' · '+updated[0].variants+' variants':''})
        </div>}
      </div>
      <style>{'*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none!important;border-color:#006B4F!important}button:disabled{opacity:.4;cursor:not-allowed}select:focus{outline:none}'}</style>
    </>
  );
}
