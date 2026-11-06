import { BRAND } from '../../lib/brand.ts';
import { localePath } from '../../lib/i18n/locales.ts';

export default function Chooser() {
  return (
    <main id="main">
      <h1>{BRAND.name}</h1>
      <ul className="chooser">
        <li>
          <a href={localePath('en')} hrefLang="en" lang="en">English</a>
        </li>
        <li>
          <a href={localePath('vi')} hrefLang="vi" lang="vi">Tiếng Việt</a>
        </li>
      </ul>
    </main>
  );
}
