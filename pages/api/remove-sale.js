export default async function handler(req,res){
if(req.method!=='PUT')return res.status(405).end();
const{productId}=req.query;
const S=process.env.SHOPIFY_STORE,T=process.env.SHOPIFY_TOKEN;
try{
const pr=await fetch('https://'+S+'/admin/api/2024-01/products/'+productId+'/variants.json',{headers:{'X-Shopify-Access-Token':T}});
const variants=(await pr.json()).variants||[];
const results=[];
for(const v of variants){
const origPrice=v.compare_at_price?parseFloat(v.compare_at_price):parseFloat(v.price);
const r=await fetch('https://'+S+'/admin/api/2024-01/variants/'+v.id+'.json',{method:'PUT',headers:{'X-Shopify-Access-Token':T,'Content-Type':'application/json'},body:JSON.stringify({variant:{id:v.id,price:origPrice.toString(),compare_at_price:''}})});
const d=await r.json();results.push({id:v.id,success:!!d.variant});
}
return res.json({results,done:results.filter(r=>r.success).length});
}catch(e){return res.status(500).json({error:e.message});}
}