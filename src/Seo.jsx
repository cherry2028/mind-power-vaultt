import React from 'react';
import { SHOW_PREVIEW_BANNER } from './utils/deployTarget';

// Per-route SEO via React 19 native metadata: rendering <title>/<meta>/<link>
// anywhere hoists them into <head>. index.html carries the static homepage
// tags for crawlers/first paint; this keeps them correct on client-side nav
// and applies noindex to student-only routes.
const SITE = 'https://mindpowervaultt.com';

export default function Seo({ title, description, path = '', noindex = false }) {
  return (
    <>
      {title && <title>{SHOW_PREVIEW_BANNER ? `[PREVIEW] ${title}` : title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={`${SITE}${path}`} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
}
