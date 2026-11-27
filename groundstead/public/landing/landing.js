(() => {
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* The page still works without storage. */ } },
  };
  const themeButton = document.getElementById('theme-toggle');
  const menuButton = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const stageNav = document.getElementById('stage-nav');
  const stageTitle = document.getElementById('stage-title');
  const stageDescription = document.getElementById('stage-description');
  const stages = [...stageNav.querySelectorAll('button[data-stage]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowedChecks = ['contact', 'water', 'light'];
  const checked = new Set((storage.get('groundstead-landing-checks') || '').split(',').filter((id) => allowedChecks.includes(id)));
  let stage = 0;

  function setTheme(value, save = true) {
    document.documentElement.dataset.theme = value;
    const label = themeButton.dataset[value === 'dark' ? 'lightLabel' : 'darkLabel'];
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
    if (save) storage.set('groundstead-landing-theme', value);
  }
  const savedTheme = storage.get('groundstead-landing-theme');
  setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
  themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

  function closeMenu(restoreFocus = false) {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', menuButton.dataset.openLabel);
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', menuButton.dataset[open ? 'closeLabel' : 'openLabel']);
    if (open) mobileNav.querySelector('a')?.focus();
  });
  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true); });
  document.addEventListener('click', (event) => { if (!mobileNav.hidden && !event.target.closest('.site-header')) closeMenu(); });

  function renderChecks() {
    document.querySelectorAll('[data-check]').forEach((button) => button.setAttribute('aria-pressed', String(checked.has(button.dataset.check))));
    document.getElementById('checklist-count').textContent = `${checked.size} / 3`;
    document.getElementById('checklist-progress').style.width = `${checked.size * 100 / 3}%`;
  }
  document.querySelectorAll('[data-check]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.check;
    if (checked.has(id)) checked.delete(id); else checked.add(id);
    storage.set('groundstead-landing-checks', [...checked].join(','));
    renderChecks();
  }));
  renderChecks();

  function renderStage(animate = false) {
    const selected = stages[stage];
    document.getElementById('stage-index').textContent = String(stage).padStart(2, '0');
    document.getElementById('stage-position').textContent = `${String(stage + 1).padStart(2, '0')} / ${String(stages.length).padStart(2, '0')}`;
    stageTitle.textContent = selected.dataset.stageTitle;
    stageDescription.textContent = selected.dataset.stageDescription;
    stages.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
    if (animate && stageNav.scrollWidth > stageNav.clientWidth) {
      const left = selected.getBoundingClientRect().left - stageNav.getBoundingClientRect().left + stageNav.scrollLeft - 20;
      stageNav.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    if (animate && !reduced.matches && stageTitle.animate) {
      for (const el of [stageTitle, stageDescription]) el.animate([
        { opacity: .38, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 350, easing: 'cubic-bezier(.2,.75,.2,1)' });
    }
  }
  stages.forEach((button, index) => button.addEventListener('click', () => { stage = index; renderStage(true); }));
  document.getElementById('stage-prev').addEventListener('click', () => { stage = (stage + stages.length - 1) % stages.length; renderStage(true); });
  document.getElementById('stage-next').addEventListener('click', () => { stage = (stage + 1) % stages.length; renderStage(true); });

  if ('IntersectionObserver' in window && !reduced.matches) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }
})();
