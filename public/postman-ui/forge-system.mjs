const root = document.documentElement;
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private browsing */ }
  },
};

const query = new URLSearchParams(location.search);
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const allowedThemes = new Set(['light', 'dark']);
const allowedDensities = new Set(['comfortable', 'compact']);

function initialTheme() {
  const requested = query.get('theme');
  if (allowedThemes.has(requested)) return requested;
  const saved = storage.get('forge-theme');
  if (allowedThemes.has(saved)) return saved;
  return systemDark.matches ? 'dark' : 'light';
}

function initialDensity() {
  const requested = query.get('density');
  if (allowedDensities.has(requested)) return requested;
  return 'comfortable';
}

function updatePreferenceControls() {
  const dark = root.dataset.forgeTheme === 'dark';
  const themeButton = document.querySelector('#forge-theme-toggle');
  if (themeButton) {
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.querySelector('[data-forge-theme-label]').textContent = dark ? '浅色' : '深色';
    themeButton.querySelector('[data-forge-theme-icon]').dataset.mode = dark ? 'light' : 'dark';
  }
}

function setTheme(theme, persist = true) {
  root.dataset.forgeTheme = theme;
  if (persist) storage.set('forge-theme', theme);
  updatePreferenceControls();
  dispatchEvent(new CustomEvent('forge:preference-change', { detail: { theme, density: root.dataset.forgeDensity } }));
}

/* Internal adapters for AI-native surfaces. They intentionally do not expose a
 * third-party runtime contract to Forge business pages. */
function installAIAdapters(scope = document) {
  const mappings = [
    ['.pm-item-prompts', 'forge-ai-composer'],
    ['.pm-item-prompts pre', 'forge-ai-prompt'],
    ['.pm-attempt', 'forge-ai-tool-call'],
    ['.pm-attempt pre', 'forge-ai-tool-result'],
    ['.forge-artifact-preview,.pm-artifact-workspace', 'forge-ai-artifact'],
    ['.pm-preview-loading,.forge-progress-indeterminate', 'forge-ai-thinking'],
    ['.forge-feedback-error,.forge-route-error', 'forge-ai-error'],
  ];
  for (const [selector, className] of mappings) {
    if (scope.matches?.(selector)) scope.classList.add(className);
    scope.querySelectorAll?.(selector).forEach(node => node.classList.add(className));
  }
}

root.dataset.forgeTheme = initialTheme();
root.dataset.forgeDensity = initialDensity();

function installForgePreferences() {
  updatePreferenceControls();
  installAIAdapters();

  document.querySelector('#forge-theme-toggle')?.addEventListener('click', () => {
    setTheme(root.dataset.forgeTheme === 'dark' ? 'light' : 'dark');
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) installAIAdapters(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  addEventListener('DOMContentLoaded', installForgePreferences, { once: true });
} else {
  installForgePreferences();
}

systemDark.addEventListener?.('change', event => {
  if (!storage.get('forge-theme') && !allowedThemes.has(query.get('theme'))) {
    setTheme(event.matches ? 'dark' : 'light', false);
  }
});
