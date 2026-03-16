/**
 * Sitemap generator for Nafuu Mart
 * Generates XML sitemaps for main pages and products
 */

export const generateMainSitemap = () => {
  const baseUrl = process.env.SITE_URL || 'https://nafuu-mart.com';
  const pages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/products', priority: 0.9, changefreq: 'daily' },
    { url: '/blog', priority: 0.8, changefreq: 'weekly' },
    { url: '/track', priority: 0.5, changefreq: 'monthly' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  pages.forEach((page) => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

export const generateProductsSitemap = async (products = []) => {
  const baseUrl = process.env.SITE_URL || 'https://nafuu-mart.com';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  products.forEach((product) => {
    const productUrl = `${baseUrl}/products/${encodeURIComponent(product.id)}`;
    xml += '  <url>\n';
    xml += `    <loc>${productUrl}</loc>\n`;
    xml += `    <lastmod>${product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>${product.inStock ? 'weekly' : 'monthly'}</changefreq>\n`;
    xml += `    <priority>${product.inStock ? 0.8 : 0.5}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

export const generateBlogSitemap = async (articles = []) => {
  const baseUrl = process.env.SITE_URL || 'https://nafuu-mart.com';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  articles.forEach((article) => {
    const slug = encodeURIComponent(String(article.slug || ''));
    if (!slug) return;
    const articleUrl = `${baseUrl}/blog/${slug}`;
    const lastmod = article.updatedAt
      ? new Date(article.updatedAt).toISOString().split('T')[0]
      : article.publishedAt
        ? new Date(article.publishedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    xml += '  <url>\n';
    xml += `    <loc>${articleUrl}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

export const generateSitemapIndex = () => {
  const baseUrl = process.env.SITE_URL || 'https://nafuu-mart.com';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap.xml</loc>\n`;
  xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap-products.xml</loc>\n`;
  xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap-blog.xml</loc>\n`;
  xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '</sitemapindex>';
  return xml;
};
