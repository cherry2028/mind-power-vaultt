import { useLocation } from 'react-router-dom';

// SEBI / financial-advice disclaimer. Legally required and must be clearly
// visible on every public page. Rendered once, globally, by RoutedApp so it
// shows on the homepage, the /get-journal sales page, /about, and every policy
// page. Hidden only on the full-screen /journal app — that route is a 100vh
// iframe with its own scroll, and a footer beneath it would add a second
// scrollbar. The journal is the paid product behind login, not a public page.

const C = {
  black: '#05050A',
  gold: '#C9A84C',
  cream: '#F5F2EA',
  body: '#E8E4DA',
  sans: "'DM Sans', sans-serif",
};

export default function Disclaimer() {
  const { pathname } = useLocation();
  if (pathname === '/journal') return null;

  const em = { color: C.cream, fontWeight: 800 };

  return (
    <footer
      role="contentinfo"
      aria-label="Legal disclaimer"
      style={{
        width: '100%',
        background: C.black,
        borderTop: '2px solid rgba(201,168,76,0.4)',
        padding: '30px 20px',
        fontFamily: C.sans,
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.45)',
          borderRadius: 10,
          padding: '20px 24px',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: C.body, fontWeight: 600 }}>
          <strong style={{ color: C.gold, fontWeight: 800, letterSpacing: 0.4 }}>Disclaimer:</strong>{' '}
          Mind Power Vaultt (ALR Services, GST: 37DLNPM0984C1ZU) is strictly a trading psychology &amp; discipline{' '}
          <strong style={em}>EDUCATION</strong> platform. We are <strong style={em}>NOT SEBI-registered investment
          advisors</strong>. We do <strong style={em}>NOT</strong> provide trading calls, tips, buy/sell signals, stock
          recommendations, or any financial/investment advice. We do not guarantee profits. Trading involves risk. Our
          content is purely educational — for building psychological discipline and self-awareness.
        </p>
      </div>
    </footer>
  );
}
