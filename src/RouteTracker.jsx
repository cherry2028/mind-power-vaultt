import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// SPA page_view tracking for GA4. react-router changes the URL without a full
// document load, so GA's automatic page_view never fires on navigation — this
// sends one manually on every route change (and on first mount). Paired with
// send_page_view:false in the gtag config so nothing is double-counted.
const GA_ID = 'G-18G4BV70GK';

export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    // rAF so the per-route <title> (set by React 19 metadata during commit) is
    // settled before we read document.title for the hit.
    const raf = requestAnimationFrame(() => {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.search]);

  return null;
}
