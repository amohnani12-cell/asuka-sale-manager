import{useState,useEffect}from'react';
import Head from'next/head';
const fmt=n=>'₹'+parseFloat(n).toLocaleString('en-IN',{maximumFractionDigits:0});
const PAGE_SIZE=10;
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
// per-product discount inputs: {productId: {pct, exact}}
const[inputs,setInputs]=useState({});

useEffect(()=>{
(async()=>{
  let all=[],sid='0';
  while(true){
    const r=await fetch('/api/products?since_id='+sid);
    const d=await r.json();
    if(!d.products||!d.products.length)break;
    all=[...all,...d.products.map(p=>({id:p.id,title:p.title,status:p.status,productType:p.product_type||'Uncategorized',price:parseFloat(p.variants[0]?.price||0),compareAt:p.variants[0]?.compare_at_price?parseFloat(p.variants[0].compare_at_price):null,variantId:p.variants[0]?.id,image:p.images[0]?.src||''}))];
    sid=all[all.length-1].id;
    setMsg('Loading... '+all.length);
    if(d.products.length<250)break;
  }
  setProducts(all);setLoading(false);setStatus('Loaded '+all.length+' products');
})().catch(e=>setMsg('Error: '+e.message));
},[]);

useEffect(()=>{setPage(0);},[filter,typeFilter]);

const filtered=products.filter(p=>{
  if(filter!=='all'&&p.status!==filter)return false;
  if(typeFilter!=='all'&&p.productType!==typeFilter)return false;
  return true;
});
const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
const pageProd=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
const types=['all',...[...new Set(products.map(p=>p.productType))].sort()];
const cnt={all:products.length,active:products.filter(p=>p.status==='active').length,draft:products.filter(p=>p.status==='draft').length};

const getSale=(p)=>{
  const inp=inputs[p.id]||{};
  const pct=parseFloat(inp.pct), ex=parseFloat(inp.exact);
  if(pct>0&&pct<100)return Math.round(p.price*(1-pct/100));
  if(ex>0&&ex<p.price)return Math.round(ex);
  return null;
};

const setInput=(id,field,val)=>{
  setInputs(prev=>({...prev,[id]:{...(prev[id]||{}), [field]:val, ...(field==='pct'?{exact:''}:{pct:''})}}));
};

const setAllPct=(pct)=>{
  const newInputs={};
  pageProd.forEach(p=>{ newInputs[p.id]={pct:String(pct),exact:''}; });
  setInputs(prev=>({...prev,...newInputs}));
};

const saveAll=async()=>{
  const toSave=pageProd.filter(p=>getSale(p)!==null);
  if(!toSave.length){setStatus('No discounts set — enter % or price for products first');return;}
  setSaving(true);setStatus('Saving '+toSave.length+' products...');
  let done=0;
  for(const p of toSave){
    const sale=getSale(p);
    try{
      const r=await fetch('/api/update-variant?variantId='+p.variantId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:{id:p.variantId,price:sale.toString(),compare_at_price:p.price.toString()}})});
      const d=await r.json();
      if(d.variant){
        const old=p.price;
        setProducts(prev=>prev.map(x=>x.id===p.id?{...x,compareAt:old,price:sale}:x));
        setUpdated(u=>[{title:p.title,type:p.productType,from:old,to:sale},...u]);
        done++;
        setStatus('Saved '+done+'/'+toSave.length+'...');
      }
    }catch(e){}
  }
  // clear inputs for saved products
  setInputs(prev=>{const n={...prev};toSave.forEach(p=>delete n[p.id]);return n;});
  setStatus('✓ Saved '+done+' products! Moving to next page...');
  setSaving(false);
  // auto advance to next page
  setTimeout(()=>{if(page<totalPages-1)setPage(p=>p+1);},800);
};

const G='#006B4F',GOLD='#C9A84C',R='#B91C1C',D='#111827',M='#4B5563',B='#E5E7EB';

if(loading)return(<div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:D,color:'white',fontFamily:'system-ui'}}><div style={{fontSize:32,fontWeight:800,letterSpacing:2}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{width:32,height:32,border:'2px solid #374151',borderTopColor:GOLD,borderRadius:'50%',animation:'spin .8s linear infinite'}}/><div style={{fontSize:13,color:'#6B7280'}}>{msg}</div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>);

return(<><Head><title>Asuka Couture — Sale Manager</title></Head>
<div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F3F4F6',overflow:'hidden',fontFamily:'system-ui'}}>

{/* HEADER */}
<header style={{background:D,color:'white',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'3px solid '+GOLD}}>
<div><div style={{fontSize:17,fontWeight:800,letterSpacing:1}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{fontSize:9,color:'#9CA3AF'}}>END OF SEASON SALE MANAGER</div></div>
<div style={{display:'flex',alignItems:'center',gap:12}}>
  <div style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',padding:'4px 12px',borderRadius:20,fontSize:11,color:'#D1D5DB'}}><strong style={{color:GOLD}}>{updated.length}</strong> updated · page {page+1}/{totalPages}</div>
</div>
</header>

{/* FILTERS */}
<div style={{background:'white',borderBottom:'1px solid '+B,padding:'8px 20px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
  <span style={{fontSize:11,color:M,fontWeight:600}}>Status:</span>
  {['all','active','draft'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===f?D:B,background:filter===f?D:'white',color:filter===f?'white':M}}>{f[0].toUpperCase()+f.slice(1)} ({cnt[f]})</button>)}
  <span style={{fontSize:11,color:M,fontWeight:600,marginLeft:8}}>Type:</span>
  <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{padding:'3px 8px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:180}}>
    {types.map(t=><option key={t} value={t}>{t==='all'?'All Types ('+products.length+')':t}</option>)}
  </select>
  <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
    <span style={{fontSize:11,color:M}}>Set all on page:</span>
    {[10,15,20,25,30].map(v=><button key={v} onClick={()=>setAllPct(v)} style={{padding:'3px 9px',background:'#F9FAFB',border:'1px solid '+B,borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',color:M}}>{v}%</button>)}
  </div>
</div>

{/* GRID */}
<div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
    {pageProd.map(p=>{
      const inp=inputs[p.id]||{};
      const sale=getSale(p);
      return(<div key={p.id} style={{background:'white',borderRadius:10,border:'1px solid '+(sale?'#A7D7C5':B),boxShadow:'0 2px 8px rgba(0,0,0,.06)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {/* Image */}
        <div style={{position:'relative',background:'#FAFAFA',height:140,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderBottom:'1px solid '+B}}>
          {p.compareAt&&<div style={{position:'absolute',top:6,left:0,background:R,color:'white',fontSize:8,fontWeight:700,padding:'2px 8px 2px 5px',letterSpacing:1,clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 50%,calc(100% - 5px) 100%,0 100%)'}}>SALE</div>}
          {sale&&!p.compareAt&&<div style={{position:'absolute',top:6,right:6,background:G,color:'white',fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:4}}>-{Math.round((1-sale/p.price)*100)}%</div>}
          {p.image?<img src={p.image} alt="" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain'}}/>:<div style={{color:'#D1D5DB',fontSize:11}}>No Image</div>}
        </div>
        {/* Info */}
        <div style={{padding:'8px 10px',flex:1,display:'flex',flexDirection:'column',gap:4}}>
          <span style={{fontSize:9,fontWeight:600,background:'#EEF2FF',color:'#4338CA',padding:'1px 5px',borderRadius:4,display:'inline-block',maxWidth:'fit-content'}}>{p.productType}</span>
          <div style={{fontSize:11,fontWeight:700,color:D,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.title}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:5,flexWrap:'wrap'}}>
            <span style={{fontSize:13,fontWeight:800,color:sale?R:G}}>{sale?fmt(sale):fmt(p.price)}</span>
            {(sale||p.compareAt)&&<span style={{fontSize:10,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(sale?p.price:p.compareAt)}</span>}
          </div>
        </div>
        {/* Input */}
        <div style={{padding:'6px 10px 10px',borderTop:'1px solid #F3F4F6',display:'flex',gap:4}}>
          <div style={{flex:1,position:'relative'}}>
            <input type="number" value={inp.pct||''} min="1" max="90" placeholder="%" onChange={e=>setInput(p.id,'pct',e.target.value)} style={{width:'100%',padding:'5px 20px 5px 7px',border:'1.5px solid '+(inp.pct?G:B),borderRadius:6,fontSize:12,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            <span style={{position:'absolute',right:5,top:'50%',transform:'translateY(-50%)',fontSize:10,color:M,pointerEvents:'none'}}>%</span>
          </div>
          <div style={{flex:1,position:'relative'}}>
            <input type="number" value={inp.exact||''} min="1" placeholder="₹ price" onChange={e=>setInput(p.id,'exact',e.target.value)} style={{width:'100%',padding:'5px 7px',border:'1.5px solid '+(inp.exact?G:B),borderRadius:6,fontSize:12,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>);
    })}
  </div>
</div>

{/* BOTTOM BAR */}
<div style={{background:'white',borderTop:'1px solid '+B,padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
  <button onClick={()=>setPage(p=>Math.max(p-1,0))} disabled={page===0} style={{background:'white',border:'1px solid '+B,padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>&#8592; Prev</button>
  <span style={{fontSize:12,color:M}}>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
  <button onClick={()=>setPage(p=>Math.min(p+1,totalPages-1))} disabled={page>=totalPages-1} style={{background:'white',border:'1px solid '+B,padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>Next &#8594;</button>
  <div style={{flex:1}}/>
  {status&&<span style={{fontSize:11,color:M}}>{status}</span>}
  <button onClick={saveAll} disabled={saving} style={{background:G,color:'white',border:'none',padding:'10px 28px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.6:1}}>
    {saving?'Saving...':'✓ Save All & Next Page'}
  </button>
</div>

{/* UPDATED TABLE */}
{updated.length>0&&<div style={{background:D,color:'#9CA3AF',padding:'6px 20px',fontSize:10,borderTop:'1px solid #374151',flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
  <strong style={{color:GOLD}}>{updated.length}</strong> products updated · latest: {updated[0]?.title} ({fmt(updated[0]?.from)} → {fmt(updated[0]?.to)})
</div>}

</div>
<style>{'*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none!important;border-color:#006B4F!important}button:disabled{opacity:.4;cursor:not-allowed}select:focus{outline:none}'}</style>
</>);}