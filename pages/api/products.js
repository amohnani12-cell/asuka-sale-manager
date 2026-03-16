export default async function handler(req,res){
const{since_id='0',collection_id}=req.query;
const S=process.env.SHOPIFY_STORE,T=process.env.SHOPIFY_TOKEN;
let url;
if(collection_id&&collection_id!=='all'){
  url='https://'+S+'/admin/api/2024-01/products.json?limit=250&fields=id,title,product_type,vendor,variants,images,status&collection_id='+collection_id+'&since_id='+since_id;
}else{
  url='https://'+S+'/admin/api/2024-01/products.json?limit=250&fields=id,title,product_type,vendor,variants,images,status&since_id='+since_id;
}
const r=await fetch(url,{headers:{'X-Shopify-Access-Token':T}});
res.status(200).json(await r.json());
}