export async function api(path,options={}) {
 const csrf=document.cookie.split('; ').find(x=>x.startsWith('nexus_csrf='))?.slice('nexus_csrf='.length)||'';
 const response=await fetch(`/api${path}`,{...options,credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':decodeURIComponent(csrf),...options.headers},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
 if(response.status===204)return null;
 const result=await response.json().catch(()=>({error:{message:'Service unavailable.'}}));
 if(!response.ok){const error=new Error(result.error?.message||'Request failed.');error.code=result.error?.code;error.status=response.status;throw error;}
 return result.data;
}
