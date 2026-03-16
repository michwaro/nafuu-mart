/**
 * Social Media Configuration
 * Centralized social media links for site-wide use
 */

export const SOCIAL_PLATFORMS = {
  facebook: {
    name: "Facebook",
    icon: "f",
    url: "https://facebook.com/nafuumart",
    color: "#1877F2",
    share: (url, title) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
  },
  instagram: {
    name: "Instagram",
    icon: "📷",
    url: "https://instagram.com/nafuumart",
    color: "#E4405F",
    handle: "@nafuumart"
  },
  twitter: {
    name: "X (Twitter)",
    icon: "𝕏",
    url: "https://twitter.com/nafuumart",
    color: "#000000",
    handle: "@nafuumart",
    share: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  tiktok: {
    name: "TikTok",
    icon: "♪",
    url: "https://tiktok.com/@nafuumart",
    color: "#000000",
    handle: "@nafuumart"
  },
  linkedin: {
    name: "LinkedIn",
    icon: "in",
    url: "https://linkedin.com/company/nafuu-mart",
    color: "#0A66C2",
    share: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "💬",
    url: "https://wa.me/254712345678",
    color: "#25D366",
    phone: "+254712345678",
    share: (url, title) => `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`
  }
};

/**
 * Get all platform names and URLs for site-wide footer/header links
 */
export const getAllSocialLinks = () => {
  return Object.entries(SOCIAL_PLATFORMS).map(([key, platform]) => ({
    key,
    ...platform
  }));
};

/**
 * Get social share URLs for a specific product
 * @param {string} productName - Product name/title
 * @param {string} productUrl - Full product URL
 * @param {string} imageUrl - Product image URL (optional)
 * @returns {object} Share URLs for each platform
 */
export const generateShareLinks = (productName, productUrl) => {
  const shareText = `Check out this refurbished ${productName} on Nafuu Mart - quality electronics with warranty!`;
  
  return {
    facebook: SOCIAL_PLATFORMS.facebook.share(productUrl, shareText),
    twitter: SOCIAL_PLATFORMS.twitter.share(productUrl, shareText),
    linkedin: SOCIAL_PLATFORMS.linkedin.share(productUrl),
    whatsapp: SOCIAL_PLATFORMS.whatsapp.share(productUrl, shareText),
    // Email share
    email: `mailto:?subject=${encodeURIComponent(productName)}&body=${encodeURIComponent(shareText + "\n\n" + productUrl)}`,
    // Copy link
    copyLink: productUrl
  };
};

/**
 * Social share button styles
 */
export const SHARE_BUTTON_STYLE = {
  container: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 16,
    padding: "16px 0",
    borderTop: "1px solid #e5e5e5",
    borderBottom: "1px solid #e5e5e5"
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#5a5a5a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginRight: 8
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 6,
    border: "1px solid #e5e5e5",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    transition: "all 0.2s ease",
    fontWeight: 700
  }
};

export default {
  SOCIAL_PLATFORMS,
  getAllSocialLinks,
  generateShareLinks,
  SHARE_BUTTON_STYLE
};
