import { BRAND } from '../../lib/brand.ts';
import { currentChannel } from '../../lib/channel.ts';
import { cardsFor } from '../../lib/emergency/cards.ts';
import { isLocale, localePath, type Locale } from '../../lib/i18n/locales.ts';
import { LANDING, MESSAGES } from '../../lib/i18n/messages.ts';
import showcase from '../../lib/i18n/landing-showcase.json';
import { jsonLd, organizationLd } from '../../lib/seo/jsonld.ts';
import '../landing.css';

type Params = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = { ...MESSAGES[locale], ...LANDING[locale] };
  const c = showcase[locale];
  const firstStage = c.stages[0];
  if (!firstStage) throw new Error('The Groundstead journey needs a first stage');
  const hasGuides = cardsFor(locale).length > 0;
  const heroLines = c.heroTitle.split(/<br\s*\/?\s*>/i);
  const closingLines = c.closingTitle.split(/<br\s*\/?\s*>/i);

  return <div className="groundstead-landing">
    <a className="skip skip-link" href="#main">{m.skipToContent}</a>
    <header className="site-header" id="top">
      <div className="header-inner shell">
        <a className="wordmark" href={localePath(locale)} aria-label={`${BRAND.name} · ${BRAND.nameVi}`}><span className="wordmark-main">GROUNDSTEAD</span><span className="wordmark-sub">ĐẤT LÀNH</span></a>
        <nav className="desktop-nav" aria-label={c.navLabel}><a href="#approach">{c.navApproach}</a><a href="#hours">{c.nav72}</a><a href="#journey">{c.navJourney}</a></nav>
        <div className="header-actions">
          <a className="text-control lang-control" href={localePath(other)} hrefLang={other} lang={other} aria-label={m.otherLanguageLabel}>{other.toUpperCase()}</a>
          <button className="theme-control" type="button" id="theme-toggle" aria-label={c.darkTheme} title={c.darkTheme} data-dark-label={c.darkTheme} data-light-label={c.lightTheme}><span className="theme-glyph" aria-hidden="true" /></button>
          <a className="header-cta" href="#hours"><span>{c.navStart}</span><span aria-hidden="true"> ↗</span></a>
          <button className="menu-toggle" type="button" id="menu-toggle" aria-label={c.openMenu} aria-controls="mobile-nav" aria-expanded="false" data-open-label={c.openMenu} data-close-label={c.closeMenu}><span /><span /></button>
        </div>
      </div>
      <nav className="mobile-nav" id="mobile-nav" aria-label={c.navLabel} hidden><a href="#approach">{c.navApproach}</a><a href="#hours">{c.nav72}</a><a href="#journey">{c.navJourney}</a></nav>
    </header>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-image" src="/landing/groundstead-valley.jpg" alt={c.heroAlt} width="1672" height="941" fetchPriority="high" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-content shell"><div className="hero-copy"><p className="hero-kicker">{c.heroKicker}</p><h1 id="hero-title">{heroLines[0]}<br />{heroLines[1]}</h1><p className="hero-lede">{c.heroLede}</p><div className="hero-actions"><a className="button button-light" href="#hours"><span>{c.heroPrimary}</span><span aria-hidden="true">↗</span></a><a className="button button-ghost" href="#journey"><span>{c.heroSecondary}</span><span aria-hidden="true">→</span></a></div></div></div>
      </section>
      <section className="landing-status" aria-labelledby="status-title"><div className="shell status-inner"><strong id="status-title">{m.statusTitle}</strong><p>{hasGuides ? m.statusBody : m.statusBodyNoGuides}</p></div></section>
      <section className="approach section-space" id="approach" aria-labelledby="approach-title"><div className="shell approach-grid"><div className="approach-number reveal" aria-hidden="true">G<span>.</span></div><div className="approach-copy reveal"><h2 id="approach-title">{c.approachTitle}</h2><p>{c.approachBody}</p><p className="positioning-copy">{m.positioning}</p><a className="underlined-link" href="#principles"><span>{c.approachLink}</span><span aria-hidden="true">↗</span></a></div></div></section>
      <section className="hours section-space" id="hours" aria-labelledby="hours-title"><div className="shell hours-grid">
        <div className="hours-image-wrap reveal"><img src="/landing/groundstead-essentials.jpg" width="1122" height="1402" loading="lazy" alt={c.essentialsAlt} /><span className="image-caption">{c.imageCaption}</span></div>
        <div className="hours-content reveal"><p className="section-overline">72<span>H</span></p><h2 id="hours-title">{c.hoursTitle}</h2><p className="section-copy">{c.hoursBody}</p>
          <div className="checklist" aria-labelledby="checklist-title"><div className="checklist-topline"><h3 id="checklist-title">{c.checklistTitle}</h3><span id="checklist-count" aria-live="polite">0 / 3</span></div><div className="checklist-progress" aria-hidden="true"><span id="checklist-progress" /></div>
            {([['contact', c.checkContact, c.checkContactSub], ['water', c.checkWater, c.checkWaterSub], ['light', c.checkLight, c.checkLightSub]] as const).map(([id, title, subtitle]) => <button className="check-item" type="button" data-check={id} aria-pressed="false" key={id}><span className="check-circle" aria-hidden="true" /><span><strong>{title}</strong><small>{subtitle}</small></span><span className="check-arrow" aria-hidden="true">↗</span></button>)}
            <p className="checklist-note">{c.checklistNote}</p></div>
          <div className="landing-resources"><a href={localePath(locale, 'emergency/')}>{m.homeEmergencyLink} ↗</a><a href={localePath(locale, 'help/')}>{m.homeHelpLink} ↗</a></div>
          <details className="availability-details"><summary>{m.startTitle} · {m.modeStatus}</summary><p>{hasGuides ? m.startBody : m.startBodyNoGuides}</p></details>
        </div>
      </div></section>
      <section className="journey section-space" id="journey" aria-labelledby="journey-title"><div className="journey-orbit" aria-hidden="true" /><div className="shell journey-shell"><div className="journey-heading reveal"><h2 id="journey-title">{c.journeyTitle}</h2><p>{c.journeyBody}</p></div><div className="journey-stage reveal">
        <div className="stage-nav" id="stage-nav" role="group" aria-label={c.stageNav}>{c.stages.map(([name, description], index) => <button type="button" key={name} data-stage={index} data-stage-title={name} data-stage-description={description} aria-label={`${String(index).padStart(2, '0')} · ${name}`} aria-pressed={index === 0}><span>{String(index).padStart(2, '0')}</span><span>{name}</span><span aria-hidden="true">↗</span></button>)}</div>
        <div className="stage-detail" aria-live="polite"><div className="stage-detail-top"><span id="stage-index">00</span><span className="stage-line" /><span>{c.stageLabel}</span></div><h3 id="stage-title">{firstStage[0]}</h3><p id="stage-description">{firstStage[1]}</p><div className="stage-controls"><button type="button" id="stage-prev" aria-label={c.prevStage}>←</button><button type="button" id="stage-next" aria-label={c.nextStage}>→</button><span id="stage-position">01 / 09</span></div></div>
      </div><details className="journey-details"><summary>{m.pathTitle}</summary><p>{m.pathIntro}</p><ol className="path" start={0}>{m.path.map((step) => <li key={step.name}><strong>{step.name}.</strong> {step.text}</li>)}</ol></details></div></section>
      <section className="pillars-section section-space" aria-labelledby="pillars-title"><div className="shell"><div className="pillars-heading reveal"><h2 id="pillars-title">{m.pillarsTitle}</h2><p>{m.pillarsIntro}</p></div><ul className="pillars">{m.pillars.map((pillar, index) => <li className="reveal" key={pillar.name}><span>{String(index + 1).padStart(2, '0')}</span><strong>{pillar.name}</strong><p>{pillar.text}</p></li>)}</ul></div></section>
      <section className="principles section-space" id="principles" aria-labelledby="principles-title"><div className="shell"><div className="principles-intro reveal"><h2 id="principles-title">{c.principlesTitle}</h2><p>{c.principlesBody}</p></div><div className="principles-list"><article className="principle reveal"><span>01</span><div><h3>{c.p1Title}</h3><p>{c.p1Body}</p></div></article><article className="principle reveal"><span>02</span><div><h3>{c.p2Title}</h3><p>{c.p2Body}</p></div></article><article className="principle reveal"><span>03</span><div><h3>{c.p3Title}</h3><p>{c.p3Body}</p></div></article></div><details className="commitments-details"><summary>{m.dontTitle}</summary><ul>{m.dont.map((item) => <li key={item}>{item}</li>)}</ul></details></div></section>
      <section className="closing" aria-labelledby="closing-title"><div className="shell closing-inner reveal"><h2 id="closing-title">{closingLines[0]}<br />{closingLines[1]}</h2><p>{c.closingBody}</p><a className="button button-dark" href="#hours"><span>{c.closingCta}</span><span aria-hidden="true">↗</span></a></div></section>
    </main>
    <footer className="site-footer"><div className="shell footer-grid"><div><div className="footer-brand">GROUNDSTEAD<span> / ĐẤT LÀNH</span></div><p>{c.footerTagline}</p></div><nav aria-label={c.footerNav}><a href="#approach">{c.navApproach}</a><a href="#hours">{c.nav72}</a><a href="#journey">{c.navJourney}</a></nav></div><div className="shell footer-bottom"><p>{m.signupBody} {m.footerNotice}</p><a href="#top">{c.backTop}</a></div></footer>
    <script src="/landing/landing.js" defer />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationLd(BRAND.siteUrl, locale, currentChannel())) }} />
  </div>;
}
