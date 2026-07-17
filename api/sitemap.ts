const baseUrl = 'https://www.hallaqi.app';

function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character);
}

export async function GET() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
  const headers = apiKey ? { apikey: apiKey } : undefined;

  let professionalIds: string[] = [];
  let postIds: string[] = [];
  if (supabaseUrl && headers) {
    const [professionals, posts] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/professionals?select=id&is_active=eq.true&limit=1000`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/forum_posts?select=id&limit=1000`, { headers }),
    ]);
    if (professionals.ok) professionalIds = (await professionals.json() as Array<{ id: string }>).map(item => item.id);
    if (posts.ok) postIds = (await posts.json() as Array<{ id: string }>).map(item => item.id);
  }

  const urls = [
    { location: '/', frequency: 'daily', priority: '1.0' },
    ...professionalIds.map(id => ({ location: `/barber/${encodeURIComponent(id)}`, frequency: 'weekly', priority: '0.9' })),
    ...postIds.map(id => ({ location: `/post/${encodeURIComponent(id)}`, frequency: 'weekly', priority: '0.6' })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${xmlEscape(baseUrl + url.location)}</loc><changefreq>${url.frequency}</changefreq><priority>${url.priority}</priority></url>`).join('\n')}\n</urlset>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
