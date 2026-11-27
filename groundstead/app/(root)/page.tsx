import { BRAND } from '../../lib/brand.ts';
import { localePath } from '../../lib/i18n/locales.ts';
import '../landing.css';

// The root remains a noindex language chooser. The full landing lives at /en/ and /vi/.
export default function Chooser() {
  return <div className="groundstead-landing chooser-landing">
    <a className="skip skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner shell"><span className="wordmark"><span className="wordmark-main">GROUNDSTEAD</span><span className="wordmark-sub">ĐẤT LÀNH</span></span></div></header>
    <main id="main"><section className="hero" aria-labelledby="chooser-title"><img className="hero-image" src="/landing/groundstead-valley.jpg" alt="A green highland valley at sunrise" width="1672" height="941" fetchPriority="high" /><div className="hero-shade" aria-hidden="true" /><div className="hero-content shell"><div className="hero-copy"><p className="hero-kicker">{BRAND.name} / {BRAND.nameVi}</p><h1 id="chooser-title">Good land.<br />Steady life.</h1><p className="hero-lede">Choose your language · Chọn ngôn ngữ</p><div className="hero-actions"><a className="button button-light" href={localePath('en')} hrefLang="en" lang="en"><span>English</span><span aria-hidden="true">↗</span></a><a className="button button-ghost" href={localePath('vi')} hrefLang="vi" lang="vi"><span>Tiếng Việt</span><span aria-hidden="true">↗</span></a></div></div></div></section></main>
  </div>;
}
