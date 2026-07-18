import { getSiteUrl } from './_lib/site-url.js';

const baseUrl = getSiteUrl();

function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character);
}

function sellerPath(sellerType: string | undefined, id: string) {
  if (sellerType === 'company') return `/company/${encodeURIComponent(id)}`;
  if (sellerType === 'doctor') return `/doctor/${encodeURIComponent(id)}`;
  return `/store/${encodeURIComponent(id)}`;
}

export async function GET() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
  const headers = apiKey ? { apikey: apiKey } : undefined;

  let professionalIds: string[] = [];
  let postIds: string[] = [];
  let sellers: Array<{ id: string; seller_type?: string }> = [];
  let productIds: string[] = [];
  if (supabaseUrl && headers) {
    const [professionals, posts, sellersRes, products] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/professionals?select=id&is_active=eq.true&limit=1000`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/forum_posts?select=id&limit=1000`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/marketplace_sellers?select=id,seller_type&approval_status=eq.approved&is_active=eq.true&limit=1000`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/marketplace_products?select=id&is_active=eq.true&limit=1000`, { headers }),
    ]);
    if (professionals.ok) professionalIds = (await professionals.json() as Array<{ id: string }>).map(item => item.id);
    if (posts.ok) postIds = (await posts.json() as Array<{ id: string }>).map(item => item.id);
    if (sellersRes.ok) sellers = await sellersRes.json() as Array<{ id: string; seller_type?: string }>;
    if (products.ok) productIds = (await products.json() as Array<{ id: string }>).map(item => item.id);
  }

  const urls = [
    { location: '/', frequency: 'daily', priority: '1.0' },
    { location: '/?tab=booking', frequency: 'daily', priority: '0.95' },
    { location: '/?tab=marketplace', frequency: 'daily', priority: '0.9' },
    { location: '/?tab=forum', frequency: 'daily', priority: '0.7' },
    { location: '/?tab=ai-hub', frequency: 'weekly', priority: '0.6' },
    ...professionalIds.map(id => ({ location: `/barber/${encodeURIComponent(id)}`, frequency: 'weekly', priority: '0.9' })),
    ...postIds.map(id => ({ location: `/post/${encodeURIComponent(id)}`, frequency: 'weekly', priority: '0.6' })),
    ...sellers.map(s => ({ location: sellerPath(s.seller_type, s.id), frequency: 'weekly', priority: '0.8' })),
    ...productIds.map(id => ({ location: `/product/${encodeURIComponent(id)}`, frequency: 'weekly', priority: '0.7' })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${xmlEscape(baseUrl + url.location)}</loc><changefreq>${url.frequency}</changefreq><priority>${url.priority}</priority></url>`).join('\n')}\n</urlset>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
