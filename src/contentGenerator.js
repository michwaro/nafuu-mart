/**
 * SEO Content Generator
 * Auto-generates optimized SEO content from product data
 */

/**
 * Grade mapping for condition descriptions
 */
const GRADE_DESCRIPTIONS = {
  "A": "Excellent condition - minimal to no cosmetic wear, fully functional",
  "B": "Good condition - light cosmetic wear, fully functional",
  "C": "Fair condition - moderate cosmetic wear, fully functional",
  "Refurbished": "Professionally refurbished - tested and certified",
  "Used": "Pre-owned but functional - may show signs of use"
};

/**
 * Category keywords for better SEO
 */
const CATEGORY_KEYWORDS = {
  laptop: ["refurbished laptop", "business laptop", "ultrabook", "portable computer"],
  phone: ["refurbished phone", "smartphone", "mobile device"],
  tablet: ["refurbished tablet", "iPad", "portable device"],
  desktop: ["refurbished desktop", "computer", "workstation"],
  monitor: ["display", "monitor", "screen"]
};

/**
 * Generate an SEO-optimized product title
 * @param {object} product - Product object with brand, name, spec, grade
 * @returns {string} Optimized title for search engines
 */
export const generateProductTitle = (product) => {
  const { brand, name, grade, spec } = product;
  // Format: Brand Model - Key Spec (Grade) | Refurbished Electronics
  const keySpec = spec?.split("·")?.[0]?.trim() || "High Performance";
  const condition = GRADE_DESCRIPTIONS[grade] ? "Refurbished" : "Used";
  
  return `${brand} ${name} - ${keySpec} ${condition} Laptop | Nafuu Mart`;
};

/**
 * Generate an SEO-optimized meta description (155-160 chars ideal)
 * @param {object} product - Product object
 * @returns {string} Meta description
 */
export const generateMetaDescription = (product) => {
  const { brand, name, spec, price, market, grade } = product;
  const savings = market - price;
  const savingsPercent = Math.round((savings / market) * 100);
  const mainSpec = spec?.split("·")?.[0]?.trim() || "Power-packed";
  
  return `Buy ${brand} ${name} - ${mainSpec} refurbished laptop. Save KSh ${savings?.toLocaleString()} (${savingsPercent}%). Grade ${grade} & warranty. Trust Nafuu Mart.`;
};

/**
 * Generate SEO keywords array from product data
 * @param {object} product - Product object
 * @returns {string[]} Array of relevant keywords
 */
export const generateKeywords = (product) => {
  const { brand, name, spec, category = "laptop", tags = [] } = product;
  const keywords = new Set([
    // Brand & model
    brand?.toLowerCase(),
    name?.toLowerCase(),
    `${brand?.toLowerCase()} ${name?.toLowerCase()}`,
    
    // Category
    category || "laptop",
    "refurbished laptop",
    "used laptop",
    
    // Specs
    ...(spec?.split("·")?.map(s => s.trim()?.toLowerCase()) || []),
    
    // Custom tags
    ...tags?.map(t => t?.toLowerCase()) || [],
    
    // General
    "affordable laptop",
    "Nairobi electronics",
    "Kenya laptop deals"
  ]);
  
  return Array.from(keywords).filter(k => k && k.length > 2);
};

/**
 * Generate enhanced product description (for product detail page)
 * @param {object} product - Product object
 * @returns {string} Enhanced description with HTML formatting
 */
export const generateEnhancedDescription = (product) => {
  const { brand, name, spec, price, market, grade, category = "laptop" } = product;
  const savings = market - price;
  const savingsPercent = Math.round((savings / market) * 100);
  
  const specs = spec?.split("·")?.map(s => s.trim()) || [];
  const [processor, ram, storage, ...otherSpecs] = specs;
  
  const description = `
<div style="line-height: 1.8; color: #333;">
  <h3 style="margin: 16px 0 8px; font-size: 18px;">Product Overview</h3>
  <p>
    The ${brand} ${name} is a premium ${category === 'laptop' ? 'business-class laptop' : 'device'} 
    that combines reliability with performance. Graded ${grade} by our expert technicians, 
    this device delivers excellent value for professionals seeking quality refurbished electronics.
  </p>

  <h3 style="margin: 16px 0 8px; font-size: 18px;">Key Specifications</h3>
  <ul style="margin: 8px 0 16px 20px;">
    ${processor ? `<li>${processor}</li>` : ''}
    ${ram ? `<li>${ram} RAM</li>` : ''}
    ${storage ? `<li>${storage} Storage</li>` : ''}
    ${otherSpecs?.map(spec => `<li>${spec}</li>`)?.join('') || ''}
  </ul>

  <h3 style="margin: 16px 0 8px; font-size: 18px;">Value & Savings</h3>
  <p>
    <strong>Price:</strong> KSh ${price?.toLocaleString()} <br>
    <strong>Market Price:</strong> KSh ${market?.toLocaleString()} <br>
    <strong>You Save:</strong> KSh ${savings?.toLocaleString()} (${savingsPercent}%)
  </p>

  <h3 style="margin: 16px 0 8px; font-size: 18px;">Condition</h3>
  <p>${GRADE_DESCRIPTIONS[grade] || 'Professionally tested and certified refurbished'}</p>

  <h3 style="margin: 16px 0 8px; font-size: 18px;">Why Buy from Nafuu Mart?</h3>
  <ul style="margin: 8px 0 16px 20px;">
    <li>✓ 1-year warranty on all devices</li>
    <li>✓ Free shipping within Kenya</li>
    <li>✓ Hassle-free returns within 7 days</li>
    <li>✓ Expert quality grading system</li>
    <li>✓ Trusted by thousands of customers</li>
  </ul>
</div>
  `.trim();
  
  return description;
};

/**
 * Generate open graph image text overlay
 * Useful for generating dynamic social share images
 * @param {object} product - Product object
 * @returns {object} Image overlay data for social cards
 */
export const generateOGImageData = (product) => {
  const { brand, name, price, market } = product;
  const savings = market - price;
  const savingsPercent = Math.round((savings / market) * 100);
  
  return {
    title: `${brand} ${name}`,
    price: `KSh ${price?.toLocaleString()}`,
    originalPrice: `${savingsPercent}% off KSh ${market?.toLocaleString()}`,
    badge: "REFURBISHED"
  };
};

/**
 * Generate breadcrumb schema JSON-LD
 * @param {string[]} breadcrumbs - Array of breadcrumb labels
 * @param {string[]} breadcrumbUrls - Array of breadcrumb URLs
 * @returns {object} JSON-LD breadcrumb schema
 */
export const generateBreadcrumbSchema = (breadcrumbs, breadcrumbUrls) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb,
      "item": breadcrumbUrls[index]
    }))
  };
};

/**
 * Generate FAQPage schema JSON-LD
 * Useful for product pages
 * @param {string} productName - Product name
 * @returns {object} JSON-LD FAQ schema
 */
export const generateFAQSchema = (productName) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Is the ${productName} new or refurbished?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Our ${productName} is professionally refurbished and graded by certified technicians. It passes all functionality tests and comes with a 1-year warranty.`
        }
      },
      {
        "@type": "Question",
        "name": "What warranty does it come with?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "All devices come with a 1-year manufacturer's warranty covering hardware defects. Extended protection plans are available."
        }
      },
      {
        "@type": "Question",
        "name": "What is your return policy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer 7-day hassle-free returns if the device condition differs from approved photos. Free shipping for returns within Nairobi and Mombasa."
        }
      },
      {
        "@type": "Question",
        "name": "How is the condition graded?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Grade A: Minimal wear | Grade B: Light cosmetic wear | Grade C: Moderate wear. All grades are fully functional and tested by our experts."
        }
      }
    ]
  };
};

/**
 * Generate blog/article schema JSON-LD
 * For tech journal/blog posts about products
 */
export const generateArticleSchema = (article) => {
  const { title, description, author = "Nafuu Mart Team", datePublished, image, canonicalUrl } = article;
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "image": image,
    "datePublished": datePublished || new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": author,
      "url": "https://nafuu-mart.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Nafuu Mart",
      "logo": {
        "@type": "ImageObject",
        "url": "https://nafuu-mart.com/logo.png"
      }
    },
    "url": canonicalUrl
  };
};

/**
 * Generate LocalBusiness schema JSON-LD
 * For company information
 */
export const generateLocalBusinessSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Nafuu Mart",
    "image": "https://nafuu-mart.com/logo.png",
    "description": "Trusted seller of refurbished electronics in Nairobi and Mombasa, Kenya. Quality devices with warranty.",
    "url": "https://nafuu-mart.com",
    "telephone": "+254712345678",
    "email": "info@nafuu-mart.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Nairobi City Center",
      "addressLocality": "Nairobi",
      "addressRegion": "Nairobi",
      "postalCode": "00100",
      "addressCountry": "KE"
    },
    "sameAs": [
      "https://facebook.com/nafuumart",
      "https://instagram.com/nafuumart",
      "https://twitter.com/nafuumart",
      "https://tiktok.com/@nafuumart"
    ]
  };
};

/**
 * Generate AggregateOffer schema
 * For showing price range across product variants
 */
export const generateAggregateOfferSchema = (products) => {
  const prices = products.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    "priceCurrency": "KES",
    "lowPrice": minPrice?.toString(),
    "highPrice": maxPrice?.toString(),
    "offerCount": products.length?.toString(),
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Nafuu Mart"
    }
  };
};

/**
 * Analyze content for SEO improvements
 * Returns suggestions for better SEO
 * @param {object} product - Product object
 * @returns {object} SEO analysis and suggestions
 */
export const analyzeSEOContent = (product) => {
  const { brand, name, spec, description, tags = [] } = product;
  const suggestions = [];
  
  // Check title length
  const title = generateProductTitle(product);
  if (title.length < 30) suggestions.push("Product title is too short (aim for 50-60 chars)");
  if (title.length > 60) suggestions.push("Product title is too long (trim to 50-60 chars)");
  
  // Check description
  const metaDesc = generateMetaDescription(product);
  if (metaDesc.length < 120) suggestions.push("Meta description is too short (aim for 155-160 chars)");
  if (metaDesc.length > 160) suggestions.push("Meta description is too long (trim to 155-160 chars)");
  
  // Check tags
  if (!tags || tags.length < 3) suggestions.push("Add more product tags for better SEO");
  
  // Check for keyword variations
  const allText = `${name} ${spec} ${description}`.toLowerCase();
  if (!allText.includes(brand?.toLowerCase())) suggestions.push("Brand name should appear in description");
  
  return {
    score: 100 - (suggestions.length * 10),
    suggestions,
    generatedTitle: title,
    generatedMetaDesc: metaDesc,
    keywords: generateKeywords(product),
    readyForIndexing: suggestions.length === 0
  };
};

export default {
  generateProductTitle,
  generateMetaDescription,
  generateKeywords,
  generateEnhancedDescription,
  generateOGImageData,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateArticleSchema,
  generateLocalBusinessSchema,
  generateAggregateOfferSchema,
  analyzeSEOContent
};
