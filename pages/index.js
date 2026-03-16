import{useState,useEffect,useCallback}from'react';
import Head from'next/head';
const fmt=n=>'₹'+parseFloat(n).toLocaleString('en-IN',{maximumFractionDigits:0});
const PAGE_SIZE=10;
export default function App(){
const[products,setProducts]=useState([]);
const[collections,setCollections]=useState([]);
const[page,setPage]=useState(0);
const[loading,setLoading]=useState(true);
const[msg,setMsg]=useState('Loading...');
const[statusFilter,setStatusFilter]=useState('all');
const[typeFilter,setTypeFilter]=useState('all');
const[collectionFilter,setCollectionFilter]=useState('all');
const[vendorFilter,setVendorFilter]=useState('all');
const[saving,setSaving]=useState(false);
const[status,setStatus]=useState('');
const[updated,setUpdated]=useState([]);
const[selected,setSelected]=useState({});// {id: true}
const[bulkPct,setBulkPct]=useState('');
const[inputs,setInputs]=useState({});// {id: {pct,exact}}
const[collectionLoading,setCollectionLoading]=useState(false);

// Load collections once
useEffect(()=>{
  fetch('/api/collections').then(r=>r.json()).then(d=>setCollections(d.collections||[])).catch(()=>{});
},[]);

// Load products - refetch when collection filter changes
const loadProducts=useCallback(async(colId)=>{
  setLoading(true);setMsg('Loading products...');setProducts([]);setPage(0);setSelected({});setInputs({});
  let all=[],sid='0';
  while(true){
    const url='/api/products?since_id='+sid+(colId&&colId!=='all'?'&collection_id='+colId:'');
    const r=await fetch(url);
    const d=await r.json();
    if(!d.products||!d.products.length)break;
    all=[...all,...d.products.map(p=>({id:p.id,title:p.title,status:p.status,productType:p.product_type||'Uncategorized',vendor:p.vendor||'',price:parseFloat(p.variants[0]?.price||0),compareAt:p.variants[0]?.compare_at_price?parseFloat(p.variants[0].compare_at_price):null,variantId:p.variants[0]?.id,image:p.images[0]?.src||'',createdAt:p.created_at}))];
    sid=all[all.length-1].id;
    setMsg('Loading... '+all.length);
    if(d.products.length<250)break;
  }
  setProducts(all);setLoading(false);setStatus('Loaded '+all.length+' products');
},[]);

useEffect(()=>{loadProducts('all');},[]);

const handleCollectionFilter=async(colId)=>{
  setCollectionFilter(colId);
  await loadProducts(colId);
};

useEffect(()=>{setPage(0);setSelected({});},[statusFilter,typeFilter,vendorFilter]);

const filtered=products.filter(p=>{
  if(statusFilter!=='all'&&p.status!==statusFilter)return false;
  if(typeFilter!=='all'&&p.productType!==typeFilter)return false;
  if(vendorFilter!=='all'&&p.vendor!==vendorFilter)return false;
  return true;
});
const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
const pageProd=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
const types=['all',...[...new Set(products.map(p=>p.productType))].filter(Boolean).sort()];
const vendors=['all',...[...new Set(products.map(p=>p.vendor))].filter(Boolean).sort()];
const cnt={all:products.length,active:products.filter(p=>p.status==='active').length,draft:products.filter(p=>p.status==='draft').length};
const selectedIds=Object.keys(selected).filter(id=>selected[id]);
const allPageSelected=pageProd.length>0&&pageProd.every(p=>selected[p.id]);

const toggleSelect=(id)=>setSelected(prev=>({...prev,[id]:!prev[id]}));
const toggleSelectAll=()=>{
  if(allPageSelected){const n={...selected};pageProd.forEach(p=>delete n[p.id]);setSelected(n);}
  else{const n={...selected};pageProd.forEach(p=>{n[p.id]=true;});setSelected(n);}
};

const applyBulkPct=()=>{
  if(!bulkPct)return;
  const n={...inputs};
  const targets=selectedIds.length>0?pageProd.filter(p=>selected[p.id]):pageProd;
  targets.forEach(p=>{n[p.id]={pct:bulkPct,exact:''};});
  setInputs(n);
};

const getSale=(p)=>{
  const inp=inputs[p.id]||{};
  const pct=parseFloat(inp.pct),ex=parseFloat(inp.exact);
  if(pct>0&&pct<100)return Math.round(p.price*(1-pct/100));
  if(ex>0&&ex<p.price)return Math.round(ex);
  return null;
};

const setInput=(id,field,val)=>setInputs(prev=>({...prev,[id]:{...(prev[id]||{}),[field]:val,...(field==='pct'?{exact:''}:{pct:''})}}));

const saveAll=async()=>{
  const toSave=pageProd.filter(p=>getSale(p)!==null);
  if(!toSave.length){setStatus('No discounts set on this page');return;}
  setSaving(true);setStatus('Saving '+toSave.length+'...');
  let done=0;
  for(const p of toSave){
    const sale=getSale(p);
    try{
      const r=await fetch('/api/update-variant?variantId='+p.variantId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:{id:p.variantId,price:sale.toString(),compare_at_price:p.price.toString()}})});
      const d=await r.json();
      if(d.variant){const old=p.price;setProducts(prev=>prev.map(x=>x.id===p.id?{...x,compareAt:old,price:sale}:x));setUpdated(u=>[{title:p.title,type:p.productType,from:old,to:sale},...u]);done++;}
    }catch(e){}
    setStatus('Saved '+done+'/'+toSave.length+'...');
  }
  setInputs(prev=>{const n={...prev};toSave.forEach(p=>delete n[p.id]);return n;});
  setSelected({});
  setStatus('✓ Saved '+done+' products!');
  setSaving(false);
  setTimeout(()=>{if(page<totalPages-1)setPage(p=>p+1);},600);
};

const G='#006B4F',GOLD='#C9A84C',R='#B91C1C',D='#111827',M='#4B5563',B='#E5E7EB';

if(loading)return(<div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:D,color:'white',fontFamily:'system-ui'}}><div style={{fontSize:32,fontWeight:800,letterSpacing:2}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{width:32,height:32,border:'2px solid #374151',borderTopColor:GOLD,borderRadius:'50%',animation:'spin .8s linear infinite'}}/><div style={{fontSize:13,color:'#6B7280'}}>{msg}</div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>);

return(<><Head><title>Asuka Couture — Sale Manager</title></Head>
<div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F3F4F6',overflow:'hidden',fontFamily:'system-ui'}}>

{/* HEADER */}
<header style={{background:D,color:'white',padding:'9px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'3px solid '+GOLD}}>
<div><div style={{fontSize:16,fontWeight:800,letterSpacing:1}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{fontSize:9,color:'#9CA3AF'}}>END OF SEASON SALE MANAGER</div></div>
<div style={{display:'flex',alignItems:'center',gap:10}}>
  {selectedIds.length>0&&<span style={{fontSize:11,color:GOLD,fontWeight:600}}>{selectedIds.length} selected</span>}
  <div style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',padding:'3px 12px',borderRadius:20,fontSize:11,color:'#D1D5DB'}}><strong style={{color:GOLD}}>{updated.length}</strong> updated · pg {page+1}/{totalPages}</div>
</div>
</header>

{/* FILTERS */}
<div style={{background:'white',borderBottom:'1px solid '+B,padding:'8px 16px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
  {/* Status */}
  <div style={{display:'flex',gap:4,alignItems:'center'}}>
    <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Status</span>
    {['all','active','draft'].map(f=><button key={f} onClick={()=>setStatusFilter(f)} style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:statusFilter===f?D:B,background:statusFilter===f?D:'white',color:statusFilter===f?'white':M}}>{f==='all'?'All':f[0].toUpperCase()+f.slice(1)}</button>)}
  </div>
  <div style={{width:1,height:20,background:B}}/>
  {/* Collection */}
  <div style={{display:'flex',gap:4,alignItems:'center'}}>
    <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Collection</span>
    <select value={collectionFilter} onChange={e=>handleCollectionFilter(e.target.value)} style={{padding:'3px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:160}}>
      <option value="all">All ({products.length})</option>
      {collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
  </div>
  <div style={{width:1,height:20,background:B}}/>
  {/* Type */}
  <div style={{display:'flex',gap:4,alignItems:'center'}}>
    <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Type</span>
    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{padding:'3px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:150}}>
      {types.map(t=><option key={t} value={t}>{t==='all'?'All Types':t}</option>)}
    </select>
  </div>
  <div style={{width:1,height:20,background:B}}/>
  {/* Vendor */}
  <div style={{display:'flex',gap:4,alignItems:'center'}}>
    <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Vendor</span>
    <select value={vendorFilter} onChange={e=>setVendorFilter(e.target.value)} style={{padding:'3px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:140}}>
      {vendors.map(v=><option key={v} value={v}>{v==='all'?'All Vendors':v}</option>)}
    </select>
  </div>
</div>

{/* BULK TOOLBAR */}
<div style={{background:'#F0FDF4',borderBottom:'1px solid #BBF7D0',padding:'6px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} style={{width:15,height:15,cursor:'pointer',accentColor:G}}/>
  <span style={{fontSize:11,color:M,fontWeight:600}}>{allPageSelected?'Deselect all':'Select all on page'}</span>
  {selectedIds.length>0&&<span style={{fontSize:11,color:G,fontWeight:700}}>{selectedIds.length} selected</span>}
  <div style={{width:1,height:16,background:'#BBF7D0',marginLeft:4}}/>
  <span style={{fontSize:11,color:M,fontWeight:600}}>Apply to {selectedIds.length>0?selectedIds.length+' selected':'all on page'}:</span>
  <div style={{display:'flex',gap:4'}}>
    {[10,15,20,25,30,40,50].map(v=><button key={v} onClick={()=>{setBulkPct(String(v));const n={...inputs};const targets=selectedIds.length>0?pageProd.filter(p=>selected[p.id]):pageProd;targets.forEach(p=>{n[p.id]={pct:String(v),exact:''};});setInputs(n);}} style={{padding:'3px 9px',background:bulkPct===String(v)?G:'white',border:'1px solid',borderColor:bulkPct===String(v)?G:'#BBF7D0',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',color:bulkPct===String(v)?'white':G}}>{v}%</button>)}
  </div>
  <div style={{marginLeft:4,display:'flex',alignItems:'center',gap:5}}>
    <span style={{fontSize:11,color:M}}>or</span>
    <input type="number" placeholder="₹ price" style={{width:80,padding:'3px 7px',border:'1px solid '+B,borderRadius:6,fontSize:11,outline:'none',fontFamily:'inherit'}}
      onChange={e=>{if(!e.target.value)return;const n={...inputs};const targets=selectedIds.length>0?pageProd.filter(p=>selected[p.id]):pageProd;targets.forEach(p=>{n[p.id]={exact:e.target.value,pct:''};});setInputs(n);}}/>
    <span style={{fontSize:11,color:M}}>to {selectedIds.length>0?'selected':'all'}</span>
  </div>
  <button onClick={()=>{const n={...inputs};const targets=selectedIds.length>0?pageProd.filter(p=>selected[p.id]):pageProd;targets.forEach(p=>delete n[p.id]);setInputs(n);setBulkPct('');}} style={{marginLeft:'auto',background:'#FEF2F2',color:R,border:'1px solid #FECACA',padding:'3px 10px',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Clear</button>
</div>

{/* GRID */}
<div style={{flex:1,overflowY:'auto',padding:'10px 16px'}}>
  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
    {pageProd.map(p=>{
      const inp=inputs[p.id]||{};
      const sale=getSale(p);
      const isSel=!!selected[p.id];
      return(<div key={p.id} onClick={()=>toggleSelect(p.id)} style={{background:'white',borderRadius:10,border:'2px solid '+(isSel?G:sale?'#A7D7C5':B),boxShadow:isSel?'0 0 0 3px rgba(0,107,79,.15)':'0 2px 6px rgba(0,0,0,.05)',overflow:'hidden',display:'flex',flexDirection:'column',cursor:'pointer',transition:'border-color .15s'}}>
        {/* Image */}
        <div style={{position:'relative',background:'#FAFAFA',height:130,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderBottom:'1px solid '+B}}>
          <input type="checkbox" checked={isSel} onChange={e=>{e.stopPropagation();toggleSelect(p.id);}} onClick={e=>e.stopPropagation()} style={{position:'absolute',top:6,left:6,width:14,height:14,cursor:'pointer',accentColor:G,zIndex:2}}/>
          {p.compareAt&&<div style={{position:'absolute',top:6,right:0,background:R,color:'white',fontSize:8,fontWeight:700,padding:'2px 8px 2px 5px',letterSpacing:1,clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 50%,calc(100% - 5px) 100%,0 100%)'}}>SALE</div>}
          {sale&&!p.compareAt&&<div style={{position:'absolute',top:6,right:6,background:G,color:'white',fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:4}}>-{Math.round((1-sale/p.price)*100)}%</div>}
          {p.image?<img src={p.image} alt="" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain'}}/>:<div style={{color:'#D1D5DB',fontSize:11}}>No Image</div>}
        </div>
        {/* Info */}
        <div style={{padding:'7px 9px',flex:1,display:'flex',flexDirection:'column',gap:3}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
            <span style={{fontSize:9,fontWeight:600,background:'#EEF2FF',color:'#4338CA',padding:'1px 5px',borderRadius:4}}>{p.productType}</span>
            {p.vendor&&<span style={{fontSize:9,fontWeight:600,background:'#F3F4F6',color:M,padding:'1px 5px',borderRadius:4}}>{p.vendor}</span>}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:D,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.title}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}>
            <span style={{fontSize:13,fontWeight:800,color:sale?R:G}}>{sale?fmt(sale):fmt(p.price)}</span>
            {(sale||p.compareAt)&&<span style={{fontSize:10,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(sale?p.price:(p.compareAt||0))}</span>}
          </div>
        </div>
        {/* Input row */}
        <div style={{padding:'5px 8px 8px',borderTop:'1px solid #F3F4F6',display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
          <div style={{flex:1,position:'relative'}}>
            <input type="number" value={inp.pct||''} min="1" max="90" placeholder="%" onChange={e=>setInput(p.id,'pct',e.target.value)} onClick={e=>e.stopPropagation()} style={{width:'100%',padding:'4px 18px 4px 6px',border:'1.5px solid '+(inp.pct?G:B),borderRadius:6,fontSize:11,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            <span style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',fontSize:9,color:M,pointerEvents:'none'}}>%</span>
          </div>
          <div style={{flex:1}}>
            <input type="number" value={inp.exact||''} min="1" placeholder="₹" onChange={e=>setInput(p.id,'exact',e.target.value)} onClick={e=>e.stopPropagation()} style={{width:'100%',padding:'4px 6px',border:'1.5px solid '+(inp.exact?G:B),borderRadius:6,fontSize:11,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>);
    })}
  </div>
</div>

{/* BOTTOM BAR */}
<div style={{background:'white',borderTop:'1px solid '+B,padding:'8px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
  <button onClick={()=>setPage(p=>Math.max(p-1,0))} disabled={page===0} style={{background:'white',border:'1px solid '+B,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>&#8592; Prev</button>
  <span style={{fontSize:11,color:M}}>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
  <button onClick={()=>setPage(p=>Math.min(p+1,totalPages-1))} disabled={page>=totalPages-1} style={{background:'white',border:'1px solid '+B,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>Next &#8594;</button>
  <div style={{flex:1,fontSize:11,color:M,textAlign:'center'}}>{status}</div>
  <span style={{fontSize:11,color:'#9CA3AF'}}>{pageProd.filter(p=>getSale(p)).length} of {pageProd.length} have discounts</span>
  <button onClick={saveAll} disabled={saving||pageProd.filter(p=>getSale(p)).length===0} style={{background:G,color:'white',border:'none',padding:'9px 24px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
    {saving?'Saving...':'✓ Save & Next Page'}
  </button>
</div>

</div>
<style>{'*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none!important}button:disabled{opacity:.4;cursor:not-allowed}select:focus{outline:none}'}</style>
</>);}