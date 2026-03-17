export default async function handler(req,res){
const S=process.env.SHOPIFY_STORE,T=process.env.SHOPIFY_TOKEN;
const[r1,r2]=await Promise.all([
  fetch('https://'+S+'/admin/api/2024-01/custom_collections.json?limit=250&fields=id,title',{headers:{'X-Shopify-Access-Token':T}}),
  fetch('https://'+S+'/admin/api/2024-01/smart_collections.json?limit=250&fields=id,title',{headers:{'X-Shopify-Access-Token':T}})
]);
const[d1,d2]=await Promise.all([r1.json(),r2.json()]);
const all=[...(d1.custom_collections||[]),...(d2.smart_collections||[])].sort((a,b)=>a.title.localeCompare(b.title));
res.status(200).json({collections:all});
}