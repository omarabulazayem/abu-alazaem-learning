const ENV=import.meta.env||{};
const SUPABASE_URL=(ENV.VITE_SUPABASE_URL||"").replace(/\/+$/,"");
const SUPABASE_KEY=ENV.VITE_SUPABASE_PUBLISHABLE_KEY||ENV.VITE_SUPABASE_ANON_KEY||"";

function assertConfig(){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error("إعدادات CMS غير متاحة.");}
async function publicRest(path){
  assertConfig();
  const response=await fetch(`${SUPABASE_URL}/rest/v1${path}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  const text=await response.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!response.ok)throw new Error(data?.message||data?.error||"تعذر تحميل محتوى الموقع.");
  return data;
}

export async function getContentBySlug(contentType,slug,locale="ar"){
  if(!contentType||!slug)return null;
  const rows=await publicRest(`/cms_content?content_type=eq.${encodeURIComponent(contentType)}&slug=eq.${encodeURIComponent(slug)}&locale=eq.${encodeURIComponent(locale)}&status=eq.publish&select=*&limit=1`);
  return rows?.[0]||null;
}

export async function listContent(contentType,{locale="ar",limit=24,parentId=null}={}){
  if(!contentType)return [];
  const filters=[`content_type=eq.${encodeURIComponent(contentType)}`,`locale=eq.${encodeURIComponent(locale)}`,"status=eq.publish"];
  if(parentId)filters.push(`parent_id=eq.${encodeURIComponent(parentId)}`);
  filters.push("select=*");
  filters.push("order=menu_order.asc,published_at.desc.nullslast");
  filters.push(`limit=${Math.max(1,Math.min(100,Number(limit)||24))}`);
  return publicRest(`/cms_content?${filters.join("&")}`);
}

export async function getContentMeta(contentId){if(!contentId)return [];return publicRest(`/cms_content_meta?content_id=eq.${encodeURIComponent(contentId)}&select=meta_key,meta_value,id&order=id.asc`);}
export async function getMedia(mediaId){if(!mediaId)return null;const rows=await publicRest(`/cms_media?id=eq.${encodeURIComponent(mediaId)}&select=*&limit=1`);return rows?.[0]||null;}
export async function getNavigation(location,{locale="ar"}={}){if(!location)return [];return publicRest(`/cms_navigation?location=eq.${encodeURIComponent(location)}&locale=eq.${encodeURIComponent(locale)}&select=*&order=sort_order.asc,created_at.asc`);}
export async function getOption(key){if(!key)return null;const rows=await publicRest(`/cms_options?option_key=eq.${encodeURIComponent(key)}&is_public=eq.true&select=option_key,option_value&limit=1`);return rows?.[0]?.option_value??null;}
export async function listTaxonomy(taxonomy,{locale="ar"}={}){if(!taxonomy)return [];return publicRest(`/cms_taxonomies?taxonomy=eq.${encodeURIComponent(taxonomy)}&select=id,taxonomy,description,parent_id,sort_order,cms_terms!inner(id,name,slug,locale)&cms_terms.locale=eq.${encodeURIComponent(locale)}&order=sort_order.asc`);}
