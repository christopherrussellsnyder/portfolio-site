import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://korexintelligencesystems.com';
const SITE_NAME = 'Korex Intelligence Systems';

interface SeoProps {
  title: string;
  description: string;
  /** Route path starting with "/" — used for canonical + og:url */
  path: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  /** Optional JSON-LD object(s) for this route */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head metadata: unique title/description, self-referencing
 * canonical + og:url, and optional structured data.
 */
export function Seo({ title, description, path, noIndex, type = 'website', jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {blocks.map((block, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;
