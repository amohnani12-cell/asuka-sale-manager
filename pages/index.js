import{useState,useEffect,useCallback}from'react';
import Head from'next/head';
const fmt=n=>'₹'+parseFloat(n).toLocaleString('en-IN',{maximumFractionDigits:0});
const PS=10;
export default function App(){
const[prods,setProds]=useState([]);
const[cols,setCols]=useState([]);
const[pg,setPg]=useState(0);
const[loading,setLoading]=useState(true);
const[msg,setMsg]=useState('Loading...');
const[sf,setSf]=useState('all');
const[tf,setTf]=useState('all');
const[cf,setCf]=useState('all');
const[vf,setVf]=useState('all');
const[saving,setSaving]=useState(false);
const[stat,setStat]=useState('');
const[updated,setUpdated]=useState([]);
const[sel,setSel]=useState({});
const[inputs,setInputs]=useState({});
const G='#006B4F',GOLD='#C9A84C',R='#B91C1C',D='#111827',M='#4B5563',B='#E5E7EB';

useEffect(()=>{fetch('/api/collections').then(r=>r.json()).then(d=>setCols(d.collections||[])).catch(()=>{});},[]);

const loadProds=useCallback(async(colId)=>{
  setLoading(true);setMsg('Loading...');setProds([]);setPg(0);setSel({});setInputs({});
  let all=[],sid='0';
  while(true){
    const url='/api/products?since_id='+sid+(colId&&colId!=='all'?'&collection_id='+colId:'');
    const r=await fetch(url);const d=await r.json();
    if(!d.products||!d.products.length)break;
    all=[...all,...d.products.map(p=>({id:p.id,title:p.title,status:p.status,pt:p.product_type||'Uncategorized',vendor:p.vendor||'',price:parseFloat(p.variants[0]?.price||0),ca:p.variants[0]?.compare_at_price?parseFloat(p.variants[0].compare_at_price):null,vid:p.variants[0]?.id,img:p.images[0]?.src||''}))];
    sid=all[all.length-1].id;setMsg('Loading... '+all.length);
    if(d.products.length<250)break;
  }
  setProds(all);setLoading(false);setStat('Loaded '+all.length+' products');
},[]);

useEffect(()=>{loadProds('all');},[]);
useEffect(()=>{setPg(0);setSel({});},[sf,tf,vf]);

const filt=prods.filter(p=>{
  if(sf!=='all'&&p.status!==sf)return false;
  if(tf!=='all'&&p.pt!==tf)return false;
  if(vf!=='all'&&p.vendor!==vf)return false;
  return true;
});
const tp=Math.ceil(filt.length/PS);
const pp=filt.slice(pg*PS,(pg+1)*PS);
const types=['all',...[...new Set(prods.map(p=>p.pt))].filter(Boolean).sort()];
const vendors=['all',...[...new Set(prods.map(p=>p.vendor))].filter(Boolean).sort()];
const cnt={all:prods.length,active:prods.filter(p=>p.status==='active').length,draft:prods.filter(p=>p.status==='draft').length};
const selIds=Object.keys(sel).filter(id=>sel[id]);
const allSel=pp.length>0&&pp.every(p=>sel[p.id]);

const toggleSel=id=>setSel(prev=>({...prev,[id]:!prev[id]}));
const toggleAll=()=>{if(allSel){const n={...sel};pp.forEach(p=>delete n[p.id]);setSel(n);}else{const n={...sel};pp.forEach(p=>{n[p.id]=true;});setSel(n);}};

const getSale=p=>{const i=inputs[p.id]||{};const pc=parseFloat(i.pct),ex=parseFloat(i.exact);if(pc>0&&pc<100)return Math.round(p.price*(1-pc/100));if(ex>0&&ex<p.price)return Math.round(ex);return null;};
const setInput=(id,f,v)=>setInputs(prev=>({...prev,[id]:{...(prev[id]||{}),[f]:v,...(f==='pct'?{exact:''}:{pct:''})}}));

const applyBulk=(val,isExact)=>{
  const n={...inputs};
  const targets=selIds.length>0?pp.filter(p=>sel[p.id]):pp;
  targets.forEach(p=>{n[p.id]=isExact?{exact:val,pct:''}:{pct:val,exact:''};});
  setInputs(n);
};

const saveAll=async()=>{
  const toSave=pp.filter(p=>getSale(p)!==null);
  if(!toSave.length){setStat('No discounts set');return;}
  setSaving(true);let done=0;setStat('Saving '+toSave.length+'...');
  for(const p of toSave){
    const sale=getSale(p);
    try{const r=await fetch('/api/update-variant?variantId='+p.vid,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:{id:p.vid,price:sale.toString(),compare_at_price:p.price.toString()}})});const d=await r.json();
    if(d.variant){const old=p.price;setProds(prev=>prev.map(x=>x.id===p.id?{...x,ca:old,price:sale}:x));setUpdated(u=>[{title:p.title,type:p.pt,from:old,to:sale},...u]);done++;}}catch(e){}
    setStat('Saved '+done+'/'+toSave.length+'...');
  }
  setInputs(prev=>{const n={...prev};toSave.forEach(p=>delete n[p.id]);return n;});
  setSel({});setSaving(false);setStat('✓ Saved '+done+'!');
  setTimeout(()=>{if(pg<tp-1)setPg(p=>p+1);},600);
};

if(loading)return(<div style={{height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,background:D,color:'white',fontFamily:'system-ui'}}><div style={{fontSize:32,fontWeight:800,letterSpacing:2}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{width:32,height:32,border:'2px solid #374151',borderTopColor:GOLD,borderRadius:'50%',animation:'spin .8s linear infinite'}}/><div style={{fontSize:13,color:'#6B7280'}}>{msg}</div><style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style></div>);

return(<><Head><title>Asuka Couture Sale Manager</title></Head>
<div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#F3F4F6',overflow:'hidden',fontFamily:'system-ui'}}>

<header style={{background:D,color:'white',padding:'9px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'3px solid '+GOLD}}>
<div><div style={{fontSize:16,fontWeight:800,letterSpacing:1}}>ASUKA <span style={{color:GOLD}}>COUTURE</span></div><div style={{fontSize:9,color:'#9CA3AF'}}>END OF SEASON SALE MANAGER</div></div>
<div style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',padding:'3px 12px',borderRadius:20,fontSize:11,color:'#D1D5DB'}}><strong style={{color:GOLD}}>{updated.length}</strong> updated &nbsp;&middot;&nbsp; pg {pg+1}/{tp}</div>
</header>

<div style={{background:'white',borderBottom:'1px solid '+B,padding:'7px 16px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',flexShrink:0}}>
  <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,letterSpacing:.5}}>STATUS</span>
  {['all','active','draft'].map(f=><button key={f} onClick={()=>setSf(f)} style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:sf===f?D:B,background:sf===f?D:'#F9FAFB',color:sf===f?'white':M}}>{f==='all'?'All ('+cnt.all+')':f[0].toUpperCase()+f.slice(1)+' ('+cnt[f]+')'}</button>)}
  <div style={{width:1,height:18,background:B}}/>
  <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,letterSpacing:.5}}>COLLECTION</span>
  <select value={cf} onChange={e=>{setCf(e.target.value);loadProds(e.target.value);}} style={{padding:'2px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:160}}>
    <option value="all">All ({prods.length})</option>
    {cols.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
  </select>
  <div style={{width:1,height:18,background:B}}/>
  <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,letterSpacing:.5}}>TYPE</span>
  <select value={tf} onChange={e=>setTf(e.target.value)} style={{padding:'2px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:140}}>
    {types.map(t=><option key={t} value={t}>{t==='all'?'All Types':t}</option>)}
  </select>
  <div style={{width:1,height:18,background:B}}/>
  <span style={{fontSize:10,color:'#9CA3AF',fontWeight:700,letterSpacing:.5}}>VENDOR</span>
  <select value={vf} onChange={e=>setVf(e.target.value)} style={{padding:'2px 7px',borderRadius:6,fontSize:11,border:'1px solid '+B,background:'white',color:M,cursor:'pointer',maxWidth:130}}>
    {vendors.map(v=><option key={v} value={v}>{v==='all'?'All Vendors':v}</option>)}
  </select>
</div>

<div style={{background:'#F0FDF4',borderBottom:'1px solid #BBF7D0',padding:'6px 16px',display:'flex',alignItems:'center',gap:8,flexShrink:0,flexWrap:'wrap'}}>
  <input type="checkbox" checked={allSel} onChange={toggleAll} style={{width:14,height:14,cursor:'pointer',accentColor:G}}/>
  <span style={{fontSize:11,color:M,fontWeight:600}}>{selIds.length>0?selIds.length+' selected':'Select all on page'}</span>
  <div style={{width:1,height:16,background:'#BBF7D0'}}/>
  <span style={{fontSize:11,color:G,fontWeight:600}}>Apply to {selIds.length>0?'selected':pp.length+' on page'}:</span>
  {[10,15,20,25,30,40,50].map(v=><button key={v} onClick={()=>applyBulk(String(v),false)} style={{padding:'2px 8px',background:'white',border:'1px solid #BBF7D0',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',color:G}}>{v}%</button>)}
  <span style={{fontSize:11,color:M}}>or</span>
  <input type="number" placeholder="₹ exact" onChange={e=>e.target.value&&applyBulk(e.target.value,true)} style={{width:80,padding:'3px 7px',border:'1px solid '+B,borderRadius:6,fontSize:11,outline:'none',fontFamily:'inherit'}}/>
  <button onClick={()=>{const n={...inputs};pp.forEach(p=>delete n[p.id]);setInputs(n);}} style={{marginLeft:'auto',background:'#FEF2F2',color:R,border:'1px solid #FECACA',padding:'2px 9px',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Clear page</button>
</div>

<div style={{flex:1,overflowY:'auto',padding:'10px 16px'}}>
  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
    {pp.map(p=>{
      const inp=inputs[p.id]||{};const sale=getSale(p);const isSel=!!sel[p.id];
      return(<div key={p.id} style={{background:'white',borderRadius:10,border:'2px solid '+(isSel?G:sale?'#A7D7C5':B),boxShadow:isSel?'0 0 0 3px rgba(0,107,79,.12)':'0 2px 6px rgba(0,0,0,.05)',overflow:'hidden',display:'flex',flexDirection:'column',transition:'border-color .15s',cursor:'pointer'}} onClick={()=>toggleSel(p.id)}>
        <div style={{position:'relative',background:'#FAFAFA',height:130,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderBottom:'1px solid '+B}}>
          <input type="checkbox" checked={isSel} onChange={e=>{e.stopPropagation();toggleSel(p.id);}} onClick={e=>e.stopPropagation()} style={{position:'absolute',top:6,left:6,width:14,height:14,cursor:'pointer',accentColor:G,zIndex:2}}/>
          {p.ca&&<div style={{position:'absolute',top:6,right:0,background:R,color:'white',fontSize:8,fontWeight:700,padding:'2px 8px 2px 5px',clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 50%,calc(100% - 5px) 100%,0 100%)'}}>SALE</div>}
          {sale&&!p.ca&&<div style={{position:'absolute',top:6,right:6,background:G,color:'white',fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:4}}>-{Math.round((1-sale/p.price)*100)}%</div>}
          {p.img?<img src={p.img} alt="" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain'}}/>:<div style={{color:'#D1D5DB',fontSize:11}}>No Image</div>}
        </div>
        <div style={{padding:'7px 9px',flex:1}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',gap:3,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:9,fontWeight:600,background:'#EEF2FF',color:'#4338CA',padding:'1px 5px',borderRadius:4}}>{p.pt}</span>
            {p.vendor&&<span style={{fontSize:9,background:'#F3F4F6',color:M,padding:'1px 5px',borderRadius:4,fontWeight:500}}>{p.vendor}</span>}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:D,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',marginBottom:4}}>{p.title}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}>
            <span style={{fontSize:13,fontWeight:800,color:sale?R:G}}>{sale?fmt(sale):fmt(p.price)}</span>
            {(sale||p.ca)&&<span style={{fontSize:10,color:'#9CA3AF',textDecoration:'line-through'}}>{fmt(sale?p.price:(p.ca||0))}</span>}
          </div>
        </div>
        <div style={{padding:'5px 8px 8px',borderTop:'1px solid #F3F4F6',display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
          <div style={{flex:1,position:'relative'}}>
            <input type="number" value={inp.pct||''} min="1" max="90" placeholder="%" onChange={e=>setInput(p.id,'pct',e.target.value)} style={{width:'100%',padding:'4px 16px 4px 6px',border:'1.5px solid '+(inp.pct?G:B),borderRadius:6,fontSize:11,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            <span style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',fontSize:9,color:M,pointerEvents:'none'}}>%</span>
          </div>
          <div style={{flex:1}}>
            <input type="number" value={inp.exact||''} placeholder="₹" onChange={e=>setInput(p.id,'exact',e.target.value)} style={{width:'100%',padding:'4px 6px',border:'1.5px solid '+(inp.exact?G:B),borderRadius:6,fontSize:11,color:D,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>);
    })}
  </div>
</div>

<div style={{background:'white',borderTop:'1px solid '+B,padding:'8px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
  <button onClick={()=>setPg(p=>Math.max(p-1,0))} disabled={pg===0} style={{background:'white',border:'1px solid '+B,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>&#8592; Prev</button>
  <span style={{fontSize:11,color:M}}>{pg*PS+1}&#8211;{Math.min((pg+1)*PS,filt.length)} of {filt.length}</span>
  <button onClick={()=>setPg(p=>Math.min(p+1,tp-1))} disabled={pg>=tp-1} style={{background:'white',border:'1px solid '+B,padding:'7px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,color:M}}>Next &#8594;</button>
  <div style={{flex:1,fontSize:11,color:M,textAlign:'center'}}>{stat}</div>
  <span style={{fontSize:11,color:'#9CA3AF'}}>{pp.filter(p=>getSale(p)).length}/{pp.length} have discounts</span>
  <button onClick={saveAll} disabled={saving||pp.filter(p=>getSale(p)).length===0} style={{background:G,color:'white',border:'none',padding:'9px 22px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
    {saving?'Saving...':'✓ Save & Next'}
  </button>
</div>

</div>
<style>{'*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none!important}button:disabled{opacity:.4;cursor:not-allowed}'}</style>
</>);}