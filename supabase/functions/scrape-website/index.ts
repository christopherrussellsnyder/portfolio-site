import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PageData {
  url: string;
  pageType: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  headings: { h1s: string[]; h2s: string[]; h3s: string[] };
  paragraphs: string[];
  textContent: string;
  images: { src: string; alt: string; title: string }[];
  links: { internal: string[]; external: string[] };
  colors: string[];
  fonts: string[];
  ctas: { text: string; href: string; type: string }[];
  socialLinks: { platform: string; url: string }[];
  priceElements: string[];
  testimonials: string[];
  forms: { action: string; fields: string[] }[];
}

interface ScrapeResult {
  baseUrl: string;
  pages: PageData[];
  scrapedAt: string;
  totalPages: number;
  pagesByType: Record<string, number>;
  analysisDepth: string;
}

// Normalize URL to ensure https://
function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized.replace(/\/$/, '');
}

// Get base domain from URL
function getBaseDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}

// Extract colors from CSS content
function extractColors(html: string): string[] {
  const colorPatterns = [
    /#[0-9a-fA-F]{6}\b/g,
    /#[0-9a-fA-F]{3}\b/g,
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi,
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/gi,
    /hsl\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)/gi,
  ];
  
  const colors = new Set<string>();
  for (const pattern of colorPatterns) {
    const matches = html.match(pattern) || [];
    matches.forEach(color => colors.add(color.toLowerCase()));
  }
  return Array.from(colors).slice(0, 30);
}

// Extract font families from CSS content
function extractFonts(html: string): string[] {
  const fontPattern = /font-family:\s*([^;}"]+)/gi;
  const fonts = new Set<string>();
  
  let match;
  while ((match = fontPattern.exec(html)) !== null) {
    const fontFamily = match[1]
      .split(',')
      .map(f => f.trim().replace(/['"]/g, ''))
      .filter(f => f && !['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace', 'system-ui'].includes(f.toLowerCase()));
    
    fontFamily.forEach(f => fonts.add(f));
  }
  
  return Array.from(fonts).slice(0, 15);
}

// Scrape a single page with comprehensive data extraction
async function scrapePage(url: string, baseDomain: string, pageType: string = 'unknown'): Promise<PageData | null> {
  try {
    console.log(`Scraping page: ${url} (type: ${pageType})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Korex/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Page ${url} returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc) {
      console.log(`Failed to parse HTML for ${url}`);
      return null;
    }
    
    // Extract title
    const titleEl = doc.querySelector('title');
    const title = titleEl?.textContent?.trim() || '';
    
    // Extract meta description and keywords
    const metaDesc = doc.querySelector('meta[name="description"]');
    const metaDescription = metaDesc?.getAttribute('content') || '';
    
    const metaKw = doc.querySelector('meta[name="keywords"]');
    const metaKeywords = metaKw?.getAttribute('content') || '';
    
    // Extract headings by level
    const h1s: string[] = [];
    const h2s: string[] = [];
    const h3s: string[] = [];
    
    doc.querySelectorAll('h1').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) h1s.push(text);
    });
    
    doc.querySelectorAll('h2').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) h2s.push(text);
    });
    
    doc.querySelectorAll('h3').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) h3s.push(text);
    });
    
    // Extract paragraphs
    const paragraphs: string[] = [];
    doc.querySelectorAll('p').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length > 20 && text.length < 2000) {
        paragraphs.push(text);
      }
    });
    
    // Extract text content from main areas
    const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main', '#main', 'body'];
    let textContent = '';
    
    for (const selector of contentSelectors) {
      const el = doc.querySelector(selector);
      if (el) {
        const clone = el.cloneNode(true) as any;
        clone.querySelectorAll?.('script, style, nav, header, footer, aside').forEach((s: any) => s.remove?.());
        textContent = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (textContent.length > 100) break;
      }
    }
    textContent = textContent.slice(0, 8000);
    
    // Extract images with alt text
    const images: { src: string; alt: string; title: string }[] = [];
    doc.querySelectorAll('img').forEach((img: any) => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.includes('tracking') && !src.includes('pixel')) {
        try {
          const imgUrl = new URL(src, url).href;
          images.push({
            src: imgUrl,
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
          });
        } catch {}
      }
    });
    
    // Extract links
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    
    doc.querySelectorAll('a[href]').forEach((a: any) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      
      try {
        const linkUrl = new URL(href, url).href;
        if (linkUrl.startsWith(baseDomain)) {
          if (!internalLinks.includes(linkUrl)) internalLinks.push(linkUrl);
        } else {
          if (!externalLinks.includes(linkUrl)) externalLinks.push(linkUrl);
        }
      } catch {}
    });
    
    // Extract CTAs (buttons and action links)
    const ctas: { text: string; href: string; type: string }[] = [];
    doc.querySelectorAll('button, a.btn, a[class*="button"], a[class*="cta"], [class*="call-to-action"]').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) {
        ctas.push({
          text,
          href: el.getAttribute('href') || '',
          type: el.tagName?.toLowerCase() || 'button',
        });
      }
    });
    
    // Extract social media links
    const socialLinks: { platform: string; url: string }[] = [];
    const socialPatterns = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'threads'];
    
    doc.querySelectorAll('a[href]').forEach((a: any) => {
      const href = a.getAttribute('href') || '';
      for (const platform of socialPatterns) {
        if (href.includes(platform + '.com') || href.includes(platform + '.')) {
          if (!socialLinks.find(s => s.platform === platform)) {
            socialLinks.push({ platform, url: href });
          }
          break;
        }
      }
    });
    
    // Extract price elements
    const priceElements: string[] = [];
    doc.querySelectorAll('[class*="price"], [id*="price"], [class*="cost"], [class*="amount"]').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length < 100 && /[$€£¥₹]|\d/.test(text)) {
        priceElements.push(text);
      }
    });
    
    // Also look for common price patterns in text
    const pricePattern = /(?:[$€£¥₹])\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|per\s+month|\/mo|\/month)/gi;
    const textPrices = textContent.match(pricePattern) || [];
    textPrices.slice(0, 10).forEach(p => {
      if (!priceElements.includes(p)) priceElements.push(p);
    });
    
    // Extract testimonials
    const testimonials: string[] = [];
    doc.querySelectorAll('[class*="testimonial"], [class*="review"], [class*="quote"], blockquote').forEach((el: any) => {
      const text = el.textContent?.trim();
      if (text && text.length > 50 && text.length < 1000) {
        testimonials.push(text);
      }
    });
    
    // Extract forms
    const forms: { action: string; fields: string[] }[] = [];
    doc.querySelectorAll('form').forEach((form: any) => {
      const fields: string[] = [];
      form.querySelectorAll('input, textarea, select').forEach((field: any) => {
        const name = field.getAttribute('name') || field.getAttribute('placeholder') || field.getAttribute('type');
        if (name && !['hidden', 'submit', 'button'].includes(name)) {
          fields.push(name);
        }
      });
      if (fields.length > 0) {
        forms.push({
          action: form.getAttribute('action') || '',
          fields: fields.slice(0, 10),
        });
      }
    });
    
    // Extract colors and fonts
    const colors = extractColors(html);
    const fonts = extractFonts(html);
    
    return {
      url,
      pageType,
      title,
      metaDescription,
      metaKeywords,
      headings: { h1s: h1s.slice(0, 10), h2s: h2s.slice(0, 20), h3s: h3s.slice(0, 20) },
      paragraphs: paragraphs.slice(0, 30),
      textContent,
      images: images.slice(0, 30),
      links: {
        internal: internalLinks.slice(0, 100),
        external: externalLinks.slice(0, 30),
      },
      colors,
      fonts,
      ctas: ctas.slice(0, 20),
      socialLinks,
      priceElements: priceElements.slice(0, 20),
      testimonials: testimonials.slice(0, 10),
      forms: forms.slice(0, 5),
    };
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Find priority pages by URL patterns
function findPageByPatterns(urls: Set<string>, patterns: string[]): string | null {
  for (const pattern of patterns) {
    for (const url of urls) {
      try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (pathname === pattern || pathname === pattern + '/' || pathname.startsWith(pattern + '/')) {
          return url;
        }
      } catch {}
    }
  }
  return null;
}

// Discover blog posts from a blog page
async function discoverBlogPosts(blogUrl: string, baseDomain: string): Promise<string[]> {
  try {
    const response = await fetch(blogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Korex/1.0',
      },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (!doc) return [];
    
    const posts: string[] = [];
    
    // Look for article links
    doc.querySelectorAll('article a[href], .post a[href], .blog-post a[href], [class*="article"] a[href]').forEach((a: any) => {
      const href = a.getAttribute('href');
      if (href) {
        try {
          const linkUrl = new URL(href, blogUrl).href;
          if (linkUrl.startsWith(baseDomain) && !posts.includes(linkUrl) && linkUrl !== blogUrl) {
            posts.push(linkUrl);
          }
        } catch {}
      }
    });
    
    return posts.slice(0, 5);
  } catch {
    return [];
  }
}

// Discover product/service pages
async function discoverProductPages(productsUrl: string, baseDomain: string): Promise<string[]> {
  try {
    const response = await fetch(productsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Korex/1.0',
      },
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (!doc) return [];
    
    const products: string[] = [];
    
    // Look for product links
    doc.querySelectorAll('.product a[href], [class*="product"] a[href], [class*="service"] a[href], .card a[href]').forEach((a: any) => {
      const href = a.getAttribute('href');
      if (href) {
        try {
          const linkUrl = new URL(href, productsUrl).href;
          if (linkUrl.startsWith(baseDomain) && !products.includes(linkUrl) && linkUrl !== productsUrl) {
            products.push(linkUrl);
          }
        } catch {}
      }
    });
    
    return products.slice(0, 3);
  } catch {
    return [];
  }
}

// Count pages by type
function countByType(pages: PageData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const page of pages) {
    counts[page.pageType] = (counts[page.pageType] || 0) + 1;
  }
  return counts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rl = await checkRateLimit(clientKey(req, "scrape-website"), { limit: 20, windowMs: 60000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { websiteUrl, userId, analysisDepth = 'standard' } = await req.json();
    
    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting intelligent scrape for: ${websiteUrl} (depth: ${analysisDepth})`);
    
    const normalizedUrl = normalizeUrl(websiteUrl);
    const baseDomain = getBaseDomain(normalizedUrl);
    const discoveredUrls = new Set<string>();
    const pages: PageData[] = [];
    
    // PHASE 1: Scrape Homepage
    console.log('Phase 1: Scraping homepage...');
    const homepage = await scrapePage(normalizedUrl, baseDomain, 'homepage');
    
    if (!homepage) {
      return new Response(
        JSON.stringify({ error: 'Failed to scrape homepage. Please check the URL and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    pages.push(homepage);
    
    // Add internal links to discovered URLs
    homepage.links.internal.forEach(link => discoveredUrls.add(link));
    
    // PHASE 2: Priority Pages Discovery
    console.log('Phase 2: Discovering priority pages...');
    const priorityPages = {
      about: findPageByPatterns(discoveredUrls, ['/about', '/about-us', '/company', '/our-story', '/who-we-are']),
      products: findPageByPatterns(discoveredUrls, ['/products', '/services', '/shop', '/store', '/solutions', '/offerings', '/what-we-do']),
      pricing: findPageByPatterns(discoveredUrls, ['/pricing', '/plans', '/packages', '/cost', '/subscribe']),
      blog: findPageByPatterns(discoveredUrls, ['/blog', '/news', '/resources', '/insights', '/articles', '/learn']),
      contact: findPageByPatterns(discoveredUrls, ['/contact', '/contact-us', '/get-in-touch', '/reach-out']),
      testimonials: findPageByPatterns(discoveredUrls, ['/testimonials', '/reviews', '/case-studies', '/success-stories', '/customers', '/clients']),
      team: findPageByPatterns(discoveredUrls, ['/team', '/about/team', '/our-team', '/people', '/leadership']),
      careers: findPageByPatterns(discoveredUrls, ['/careers', '/jobs', '/join-us', '/work-with-us', '/hiring']),
      faq: findPageByPatterns(discoveredUrls, ['/faq', '/faqs', '/help', '/support', '/questions']),
      features: findPageByPatterns(discoveredUrls, ['/features', '/how-it-works', '/why-us', '/benefits']),
    };
    
    // PHASE 3: Scrape Priority Pages
    console.log('Phase 3: Scraping priority pages...');
    for (const [pageType, pageUrl] of Object.entries(priorityPages)) {
      if (pageUrl && pages.length < 15) {
        const page = await scrapePage(pageUrl, baseDomain, pageType);
        if (page) {
          pages.push(page);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // PHASE 4: Scrape Blog Posts (Sample) if not quick mode
    if (priorityPages.blog && analysisDepth !== 'quick' && pages.length < 15) {
      console.log('Phase 4: Discovering blog posts...');
      const blogPosts = await discoverBlogPosts(priorityPages.blog, baseDomain);
      
      for (const postUrl of blogPosts.slice(0, 3)) {
        if (pages.length < 15) {
          const post = await scrapePage(postUrl, baseDomain, 'blog_post');
          if (post) {
            pages.push(post);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    // PHASE 5: Scrape Product Pages if comprehensive mode
    if (priorityPages.products && analysisDepth === 'comprehensive' && pages.length < 15) {
      console.log('Phase 5: Discovering product pages...');
      const productPages = await discoverProductPages(priorityPages.products, baseDomain);
      
      for (const productUrl of productPages.slice(0, 3)) {
        if (pages.length < 15) {
          const product = await scrapePage(productUrl, baseDomain, 'product');
          if (product) {
            pages.push(product);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    const result: ScrapeResult = {
      baseUrl: normalizedUrl,
      pages,
      scrapedAt: new Date().toISOString(),
      totalPages: pages.length,
      pagesByType: countByType(pages),
      analysisDepth,
    };
    
    console.log(`Successfully scraped ${pages.length} pages: ${JSON.stringify(result.pagesByType)}`);
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Scraping failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
