export default async function handler(req,res){
const S=process.env.SHOPIFY_STORE,T=process.env.SHOPIFY_TOKEN;
if(req.method==='GET'){
  const[r1,r2]=await Promise.all([
    fetch('https://'+S+'/admin/api/2024-01/custom_collections.json?limit=250',{headers:{'X-Shopify-Access-Token':T}}),
    fetch('https://'+S+'/admin/api/2024-01/smart_collections.json?limit=250',{headers:{'X-Shopify-Access-Token':T}})
  ]);
  const[d1,d2]=await Promise.all([r1.json(),r2.json()]);
  return res.json({collections:[...(d1.custom_collections||[]).map(c=>({id:c.id,title:c.title,type:'custom'})),...(d2.smart_collections||[]).map(c=>({id:c.id,title:c.title,type:'smart'}))]});
}
if(req.method==='POST'){
  const{collectionId,productIds}=req.body;
  let done=0;
  for(const pid of productIds){
    try{
      const r=await fetch('https://'+S+'/admin/api/2024-01/collects.json',{method:'POST',headers:{'X-Shopify-Access-Token':T,'Content-Type':'application/json'},body:JSON.stringify({collect:{collection_id:collectionId,product_id:pid}})});
      const d=await r.json();if(d.collect)done++;
    }catch(e){}
  }
  return res.json({done,total:productIds.length});
}
res.status(405).end();
}