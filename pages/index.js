import{useState,useEffect}from'react';
import Head from'next/head';
const fmt=n=>'₹'+parseFloat(n).toLocaleString('en-IN',{maximumFractionDigits:0});
export default function App(){
const[products,setProducts]=useState([]);
const[filtered,setFiltered]=useState([]);
const[idx,setIdx]=useState(0);
const[loading,setLoading]=useState(true);
const[msg,setMsg]=useState('Loading...');
const[pct,setPct]=useState('');
const[exact,setExact]=useState('');
const[status,setStatus]=useState('Ready');
const[stype,setStype]=useState('idle');
const[updated,setUpdated]=useState([]);
const[filter,setFilter]=useState('all');
const[saving,setSaving]=useState(false);
const[err,setErr]=useState('');
useEffect(()=>{(async()=>{let all=[],sid='0',pg=1;while(true){setMsg('Fetching page '+pg+'...');const r=await fetch('/api/products?since_id='+sid);const d=await r.json();if(!d.products||!d.products.length)break;all=[...all,...d.products.map(p=>({id:p.id,title:p.title,status:p.status,price:parseFloat(p.variants[0]?.price||0),compareAt:p.variants[0]?.compare_at_price?parseFloat(p.variants[0].compare_at_price):null,variantId:p.variants[0]?.id,image:p.images[0]?.src||''}))];sid=d.products[d.products.length-1].id;pg++;if(d.products.length<250)break;}setProducts(all);setFiltered(all);setLoading(false);setStatus('Loaded '+all.length+' products — Ready!');setStype('success');})().catch(e=>setMsg('Error: '+e.message));},[]);
useEffect(()=>{setFiltered(filter==='all'?products:products.filter(p=>p.status===filter));setIdx(0);},[filter,products]);
const cur=filtered[idx];
const sp=()=>{if(!cur)return null;const p=parseFloat(pct),e=parseFloat(exact);if(p>0&&p<100)return Math.round(cur.price*(1-p/100));if(e>0&&e<cur.price)return Math.round(e);return null;};
const sale=sp();
const apply=async()=>{if(!sale){setErr('Enter % or price');return;}setSaving(true);setErr('');setStype('loading');try{const r=await fetch('/api/update-variant?variantId='+cur.variantId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:{id:cur.variantId,price:sale.toString(),compare_at_price:cur.price.toString()}})});const d=await r.json();if(d.variant){const old=cur.price;setProducts(p=>p.map(x=>x.id===cur.id?{...x,compareAt:old,price:sale}:x));setUpdated(u=>[{title:cur.title,from:old,to:sale},...u]);setStatus('Updated: '+cur.title);setStype('success');setPct('');setExact('');setTimeout(()=>{if(idx<filtered.length-1)setIdx(i=>i+1);},600);}else{setErr('Failed');setStype('error');}}catch(e){setErr(e.message);setStype('error');}setSaving(false);};
const remove=async()=>{setSaving(true);try{const r=await fetch('/api/update-variant?variantId='+cur.variantId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:{id:cur.variantId,price:cur.compareAt.toString(),compare_at_price:''}})});const d=await r.json();if(d.variant){setProducts(p=>p.map(x=>x.id===cur.id?{...x,price:cur.compareAt,compareAt:null}:x));setStatus('Sale removed');setStype('success');}}catch(e){setErr(e.message);}setSaving(false);};
const cnt={all:products.length,active:products.filter(p=>p.status==='active').length,draft:products.filter(p=>p.status==='draft').length};
const G='#006B4F',GOLD='#C9A84C',R='#B91C1C',D='#111827',M='#4B5563',B='#E5E7EB';
if(loading)return(<div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:D,color:'white',fontFamily:'system-ui'}}><div style={{fontSize:32,fontWeight:800,letterSpacing:2}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{width:32,height:32,border:'2px solid #374151',borderTopColor:GOLD,borderRadius:'50%',animation:'spin .8s linear infinite'}}/><div style={{fontSize:13,color:'#6B7280'}}>{msg}</div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>);
return(<><Head><title>Asuka Couture — Sale Manager</title></Head>
<div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F3F4F6',overflow:'hidden',fontFamily:'system-ui'}}>
<header style={{background:D,color:'white',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'3px solid '+GOLD}}>
<div><div style={{fontSize:18,fontWeight:800,letterSpacing:1}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{fontSize:10,color:'#9CA3AF'}}>END OF SEASON SALE MANAGER</div></div>
<div style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',padding:'5px 14px',borderRadius:20,fontSize:11,color:'#D1D5DB'}}><strong style={{color:GOLD}}>{updated.length}</strong> updated · {products.length} products</div>
</header>
<div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 340px',overflow:'hidden'}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,gap:14,overflowY:'auto'}}>
<div style={{display:'flex',gap:6,maxWidth:420,width:'100%'}}>
{['all','active','draft'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 14px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:filter===f?D:B,background:filter===f?D:'#F9FAFB',color:filter===f?'white':M}}>{f[0].toUpperCase()+f.slice(1)} ({cnt[f]})</button>)}
</div>
{cur?(<div style={{background:'white',borderRadius:16,boxShadow:'0 8px 40px rgba(0,0,0,.12)',maxWidth:420,width:'100%',overflow:'hidden',border:'1px solid '+B}}>
<div style={{position:'relative',background:'#FAFAFA',height:280,display:'flex',alignItems:'center',justifyContent:'center',borderBottom:'1px solid '+B,overflow:'hidden'}}>
{cur.compareAt&&<div style={{position:'absolute',top:12,left:0,background:R,color:'white',fontSize:10,fontWeight:700,padding:'4px 12px 4px 8px',letterSpacing:1,clipPath:'polygon(0 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,0 100%)'}}>ON SALE</div>}
{cur.image?<img src={cur.image} alt="" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain'}}/>:<div style={{color:'#D1D5DB',fontSize:13}}>No Image</div>}
</div>
<div style={{padding:'14px 18px 12px'}}>
<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:8,display:'inline-block',marginBottom:6,background:cur.status==='active'?'#D1FAE5':'#FEF3C7',color:cur.status==='active'?'#065F46':'#92400E'}}>{cur.status}</span>
<div style={{fontSize:16,fontWeight:700,color:D,lineHeight:1.35,marginBottom:8}}>{cur.title}</div>
<div style={{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
<span style={{fontSize:22,fontWeight:800,color:G}}>{fmt(cur.price)}</span>
{cur.compareAt&&<><span style={{fontSize:12,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(cur.compareAt)}</span><span style={{fontSize:10,fontWeight:700,background:'#FEF2F2',color:R,padding:'2px 7px',borderRadius:8}}>{Math.round((1-cur.price/cur.compareAt)*100)}% OFF</span></>}
</div></div></div>):<div style={{color:'#9CA3AF'}}>No products</div>}
<div style={{display:'flex',alignItems:'center',gap:10,maxWidth:420,width:'100%'}}>
<button onClick={()=>setIdx(i=>i-1)} disabled={idx===0} style={{background:'white',border:'1px solid '+B,padding:'9px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>&#8592; Prev</button>
<span style={{flex:1,textAlign:'center',fontSize:13,color:M,fontWeight:600}}>{filtered.length?idx+1+' / '+filtered.length:'0 / 0'}</span>
<button onClick={()=>setIdx(i=>i+1)} disabled={idx>=filtered.length-1} style={{background:'white',border:'1px solid '+B,padding:'9px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>Next &#8594;</button>
</div>
</div>
<div style={{background:'white',borderLeft:'1px solid '+B,display:'flex',flexDirection:'column',overflowY:'auto'}}>
<div style={{padding:'14px 18px',borderBottom:'1px solid #F3F4F6'}}>
<div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#9CA3AF',marginBottom:10}}>Apply Discount</div>
<label style={{fontSize:12,fontWeight:600,color:D,marginBottom:6,display:'block'}}>Percentage off</label>
<div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
<input type="number" value={pct} min="1" max="90" placeholder="e.g. 20" onChange={e=>{setPct(e.target.value);setExact('');setErr('');}} style={{flex:1,padding:'9px 11px',border:'1.5px solid '+B,borderRadius:8,fontSize:14,color:D,outline:'none',fontFamily:'inherit'}}/>
<span style={{fontSize:13,fontWeight:700,color:M}}>% off</span>
</div>
<div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
{[10,15,20,25,30,40,50].map(v=><button key={v} onClick={()=>{setPct(String(v));setExact('');setErr('');}} style={{padding:'3px 10px',background:pct===String(v)?D:'#F9FAFB',border:'1px solid',borderColor:pct===String(v)?D:B,borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',color:pct===String(v)?'white':M}}>{v}%</button>)}
</div>
<div style={{display:'flex',alignItems:'center',gap:8,color:'#D1D5DB',fontSize:10,fontWeight:700,letterSpacing:1,margin:'0 0 12px'}}>
<div style={{flex:1,height:1,background:B}}/>OR<div style={{flex:1,height:1,background:B}}/>
</div>
<label style={{fontSize:12,fontWeight:600,color:D,marginBottom:6,display:'block'}}>Exact sale price (&#8377;)</label>
<input type="number" value={exact} min="1" placeholder="e.g. 12500" onChange={e=>{setExact(e.target.value);setPct('');setErr('');}} style={{width:'100%',padding:'9px 11px',border:'1.5px solid '+B,borderRadius:8,fontSize:14,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
{sale&&cur&&<div style={{background:'#E8F5F0',border:'1px solid #A7D7C5',borderRadius:10,padding:11,marginTop:10}}>
<div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:G,marginBottom:6}}>Preview</div>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div><div style={{fontSize:19,fontWeight:800,color:R}}>{fmt(sale)}</div><div style={{fontSize:10,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(cur.price)}</div></div>
<div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:700,color:G}}>{Math.round((1-sale/cur.price)*100)}% off</div><div style={{fontSize:10,color:M}}>Save {fmt(cur.price-sale)}</div></div>
</div></div>}
{err&&<div style={{background:'#FEF2F2',color:R,border:'1px solid #FECACA',borderRadius:8,padding:'9px 12px',fontSize:11,marginTop:8}}>{err}</div>}
</div>
<div style={{padding:'12px 18px',display:'flex',flexDirection:'column',gap:8}}>
<button onClick={apply} disabled={saving||!cur} style={{background:G,color:'white',border:'none',padding:12,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',width:'100%'}}>{saving?'Saving...':'✓ Apply Sale Price & Next'}</button>
<button onClick={()=>{setIdx(i=>Math.min(i+1,filtered.length-1));setPct('');setExact('');setErr('');}} disabled={!cur} style={{background:'#F9FAFB',color:M,border:'1px solid '+B,padding:10,borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:'inherit',width:'100%'}}>Skip — No Discount</button>
{cur?.compareAt&&<button onClick={remove} disabled={saving} style={{background:'#FEF2F2',color:R,border:'1px solid #FECACA',padding:10,borderRadius:10,fontSize:12,cursor:'pointer',fontFamily:'inherit',width:'100%'}}>✕ Remove Existing Sale</button>}
</div>
<div style={{padding:'12px 18px',flex:1}}>
<div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#9CA3AF',marginBottom:8}}>Updated ({updated.length})</div>
<div style={{maxHeight:180,overflowY:'auto'}}>
{updated.length===0?<div style={{fontSize:11,color:'#D1D5DB',textAlign:'center',padding:'14px 0'}}>No products updated yet</div>
:updated.map((u,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid #F3F4F6'}}><div style={{fontSize:11,fontWeight:600,color:D,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.title}</div><div style={{fontSize:10,color:R,marginTop:1}}>{fmt(u.from)} → {fmt(u.to)}</div></div>)}
</div></div>
</div></div>
<div style={{background:D,color:'#9CA3AF',padding:'6px 20px',fontSize:10,display:'flex',alignItems:'center',gap:6,flexShrink:0,borderTop:'1px solid #374151'}}>
<div style={{width:6,height:6,borderRadius:'50%',background:stype==='success'?'#34D399':stype==='error'?'#F87171':stype==='loading'?GOLD:'#6B7280',flexShrink:0}}/>
<span>{status}</span>
</div>
</div>
<style>{'*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none!important;border-color:#006B4F!important}button:disabled{opacity:.4;cursor:not-allowed}'}</style>
</>);}