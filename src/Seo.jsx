import React from 'react';

// Per-route SEO via React 19 native metadata: rendering <title>/<meta>/<link>
// anywhere hoists them into <head>. index.html carries the static homepage
// tags for crawlers/first paint; this keeps them correct on client-side nav
// and applies noindex to student-only routes.
const SITE = 'https://mindpowervaultt.com';

export default function Seo({ title, description, path = '', noindex = false }) {
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={`${SITE}${path}`} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
}
