export default async function handler(req,res){
if(req.method!=='POST')return res.status(405).end();
const{collectionId,productIds}=req.body;
const S=process.env.SHOPIFY_STORE,T=process.env.SHOPIFY_TOKEN;
const results=[];
for(const productId of productIds){
  try{
    const r=await fetch('https://'+S+'/admin/api/2024-01/collects.json',{method:'POST',headers:{'X-Shopify-Access-Token':T,'Content-Type':'application/json'},body:JSON.stringify({collect:{collection_id:collectionId,product_id:productId}})});
    const d=await r.json();
    results.push({productId,success:!!d.collect,error:d.errors});
  }catch(e){results.push({productId,success:false,error:e.message});}
}
res.status(200).json({results,done:results.filter(r=>r.success).length});
}