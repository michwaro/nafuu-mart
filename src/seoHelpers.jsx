import { Helmet } from 'react-helmet-async';
import { PAGE_META } from './seoConfig';

const PRODUCT_PRICE_VALID_UNTIL = '2030-12-31';
const DEFAULT_ARTICLE_ISO_DATE = '2026-01-01T00:00:00.000Z';

/**
 * SEO Meta Component - updates head tags based on page
 */
export function PageMeta({ page = 'home', productName = null, additionalMeta = {} }) {
  const meta = PAGE_META[page] || PAGE_META.home;
  
  let title = meta.title;
  let description = meta.description;
  let canonical = meta.canonical;
  let ogType = additionalMeta.ogType || 'website';
  
  // If viewing a specific product
  if (productName) {
    title = `${productName} - Buy Refurbished | Nafuu Mart`;
    description = `Buy refurbished ${productName} at Nafuu Mart. Certified quality electronics with warranty.`;
    canonical = `https://nafuu-mart.com/products/${encodeURIComponent(productName.toLowerCase().replace(/\s+/g, '-'))}`;
  }

  if (additionalMeta.title) title = String(additionalMeta.title);
  if (additionalMeta.description) description = String(additionalMeta.description);
  if (additionalMeta.canonical) canonical = String(additionalMeta.canonical);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {(meta.ogImage || additionalMeta.ogImage) && (
        <meta property="og:image" content={meta.ogImage || additionalMeta.ogImage} />
      )}
      <meta property="og:url" content={additionalMeta.ogUrl || canonical} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {(meta.ogImage || additionalMeta.ogImage) && (
        <meta name="twitter:image" content={meta.ogImage || additionalMeta.ogImage} />
      )}
      
      {/* Additional meta tags */}
      {additionalMeta.keywords && <meta name="keywords" content={additionalMeta.keywords} />}
      {additionalMeta.author && <meta name="author" content={additionalMeta.author} />}
      
      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Nafuu Mart',
          url: 'https://nafuu-mart.com',
          logo: 'https://nafuu-mart.com/logo.png',
          description: 'Premium refurbished electronics marketplace',
          sameAs: [
            'https://www.facebook.com/nafuu-mart',
            'https://www.twitter.com/nafuu-mart',
            'https://www.linkedin.com/company/nafuu-mart',
          ],
        })}
      </script>
    </Helmet>
  );
}

/**
 * Product Structured Data (JSON-LD)
 */
export function ProductMeta({ product }) {
  if (!product) return null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${product.brand} ${product.name}`,
    description: product.spec,
    image: product.image || 'https://nafuu-mart.com/placeholder.png',
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: `https://nafuu-mart.com/products/${encodeURIComponent(product.id)}`,
      priceCurrency: 'KES',
      price: product.price.toString(),
      priceValidUntil: PRODUCT_PRICE_VALID_UNTIL,
      availability: product.inStock ? 'InStock' : 'OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Nafuu Mart',
      },
    },
  };

  if (product.grade) {
    structuredData.condition = product.grade === 'A' ? 'RefurbishedCondition' : product.grade === 'B' ? 'UsedCondition' : 'RefurbishedCondition';
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

/**
 * Breadcrumb Navigation Structured Data
 */
export function BreadcrumbMeta({ items = [] }) {
  const breadcrumbs = [
    { name: 'Home', url: 'https://nafuu-mart.com' },
    ...items,
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

/**
 * FAQ Page Structured Data
 * Shows common questions and answers in search results
 */
export function FAQMeta({ productName = null }) {
  const faqs = [
    {
      question: productName ? `Is the ${productName} new or used?` : 'Are your devices new or refurbished?',
      answer: productName 
        ? `Our ${productName} is professionally refurbished and graded by certified technicians. It passes all functionality tests and comes with a 1-year warranty.`
        : 'Our devices are certified refurbished or used electronics. All are professionally tested, graded, and come with official warranty coverage.'
    },
    {
      question: 'What warranty comes with the device?',
      answer: 'All devices come with a 1-year manufacturer\'s warranty covering hardware defects. We also offer extended protection plans.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer 7-day hassle-free returns if the device condition differs from approved photos. Free shipping for returns within Nairobi and Mombasa.'
    },
    {
      question: 'How is the condition graded?',
      answer: 'Grade A: Minimal cosmetic wear, fully functional | Grade B: Light cosmetic wear, fully functional | Grade C: Moderate cosmetic wear, fully functional. All grades are thoroughly tested.'
    },
    {
      question: 'Do you ship outside Kenya?',
      answer: 'Currently we serve Nairobi and Mombasa. Nationwide delivery is available through our logistics partners.'
    }
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

/**
 * Blog Article / Blog Post Structured Data
 * For tech journal posts or product reviews
 */
export function BlogArticleMeta({ article = {} }) {
  const {
    title = 'Tech Blog - Nafuu Mart',
    description = 'Latest news and insights from Nafuu Mart',
    author = 'Nafuu Mart Team',
    datePublished = DEFAULT_ARTICLE_ISO_DATE,
    dateModified = DEFAULT_ARTICLE_ISO_DATE,
    image = 'https://nafuu-mart.com/og-blog.png',
    url = 'https://nafuu-mart.com/blog'
  } = article;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    image: image,
    datePublished: datePublished,
    dateModified: dateModified,
    author: {
      '@type': 'Organization',
      name: author,
      url: 'https://nafuu-mart.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nafuu Mart',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nafuu-mart.com/logo.png'
      }
    },
    url: url,
    mainEntity: {
      '@type': 'Article',
      headline: title,
      image: image,
      datePublished: datePublished,
      dateModified: dateModified,
      author: author
    }
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="article:published_time" content={datePublished} />
      <meta property="article:modified_time" content={dateModified} />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}

/**
 * Local Business Structured Data
 * For company information and improved local search visibility
 */
export function LocalBusinessMeta() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://nafuu-mart.com',
    name: 'Nafuu Mart',
    image: 'https://nafuu-mart.com/logo.png',
    description: 'Trusted seller of certified refurbished electronics in Nairobi and Mombasa, Kenya. Quality devices with warranty.',
    url: 'https://nafuu-mart.com',
    telephone: '+254712345678',
    email: 'info@nafuu-mart.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Nairobi City Center',
      addressLocality: 'Nairobi',
      addressRegion: 'Nairobi',
      postalCode: '00100',
      addressCountry: 'KE'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '-1.286389',
      longitude: '36.817223'
    },
    sameAs: [
      'https://facebook.com/nafuumart',
      'https://instagram.com/nafuumart',
      'https://twitter.com/nafuumart',
      'https://tiktok.com/@nafuumart'
    ],
    priceRange: '₦₦'
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}
