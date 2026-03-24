<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useCalcStore } from '@/stores/useCalcStore';
import { useI18n } from 'vue-i18n';
import { Share2, Check, Settings, Sun, Moon, Monitor, BookOpen } from 'lucide-vue-next';
import AppModal from '@/components/ui/AppModal.vue';
import guideRu from '@/data/mortgage-guide.ru.md?raw';
import guideEn from '@/data/mortgage-guide.en.md?raw';
import guideSr from '@/data/mortgage-guide.sr.md?raw';

const guideByLang: Record<string, string> = { ru: guideRu, en: guideEn, sr: guideSr };

const store = useCalcStore();
const { t, locale } = useI18n();

// ── Language ──
const langs = ['ru', 'en', 'sr'] as const;
function setLang(l: string) {
  locale.value = l;
  localStorage.setItem('calc-locale', l);
}

// ── Share ──
const copied = ref(false);
function share() {
  const url = store.getShareUrl();
  navigator.clipboard.writeText(url).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
}

// ── Settings panel ──
const showSettings = ref(false);
const settingsEl = ref<HTMLDivElement | null>(null);

// Theme mode: auto / light / dark
const themeMode = ref<'auto' | 'light' | 'dark'>(
  (localStorage.getItem('calc-theme-mode') as 'auto' | 'light' | 'dark') || 'auto',
);

function resolveTheme(mode: 'auto' | 'light' | 'dark'): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

function applyThemeMode(mode: 'auto' | 'light' | 'dark') {
  themeMode.value = mode;
  localStorage.setItem('calc-theme-mode', mode);
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  store.theme = resolved;
  localStorage.setItem('calc-theme', resolved);
  const themeColor = resolved === 'light' ? '#f1f5fb' : '#070d1a';
  document.querySelector('meta[name="theme-color"][media*="dark"]')?.setAttribute('content', themeColor);
  document.querySelector('meta[name="theme-color"][media*="light"]')?.setAttribute('content', themeColor);
}

// Color schemes
interface SchemeOption { key: string; name: string; color: string }

const darkSchemes: SchemeOption[] = [
  { key: 'default', name: 'Default', color: '#f0b429' },
  { key: 'dracula', name: 'Dracula', color: '#bd93f9' },
  { key: 'nord', name: 'Nord', color: '#88c0d0' },
  { key: 'solarized', name: 'Solarized', color: '#b58900' },
  { key: 'monokai', name: 'Monokai', color: '#a6e22e' },
  { key: 'github-dark', name: 'GitHub', color: '#58a6ff' },
  { key: 'catppuccin', name: 'Catppuccin', color: '#89b4fa' },
  { key: 'tokyo-night', name: 'Tokyo', color: '#7aa2f7' },
  { key: 'one-dark', name: 'One Dark', color: '#61afef' },
  { key: 'gruvbox', name: 'Gruvbox', color: '#fabd2f' },
  { key: 'rose-pine', name: 'Rosé Pine', color: '#eb6f92' },
  { key: 'ayu', name: 'Ayu', color: '#e6b450' },
];

const lightSchemes: SchemeOption[] = [
  { key: 'default', name: 'Default', color: '#b06e00' },
  { key: 'solarized-light', name: 'Solarized', color: '#b58900' },
  { key: 'nord-light', name: 'Nord', color: '#5e81ac' },
  { key: 'github-light', name: 'GitHub', color: '#0969da' },
  { key: 'catppuccin-light', name: 'Catppuccin', color: '#1e66f5' },
  { key: 'gruvbox-light', name: 'Gruvbox', color: '#b57614' },
  { key: 'ayu-light', name: 'Ayu', color: '#f2ae49' },
];

const currentScheme = ref(localStorage.getItem('calc-scheme') || 'default');
const activeSchemes = computed(() => store.theme === 'light' ? lightSchemes : darkSchemes);

function setScheme(s: string) {
  currentScheme.value = s;
  document.documentElement.setAttribute('data-scheme', s);
  localStorage.setItem('calc-scheme', s);
}

watch(() => store.theme, () => {
  const keys = activeSchemes.value.map((s) => s.key);
  if (!keys.includes(currentScheme.value)) setScheme('default');
});

function onClickOutside(e: MouseEvent) {
  if (settingsEl.value && !settingsEl.value.contains(e.target as Node)) {
    showSettings.value = false;
  }
}

let mql: MediaQueryList | null = null;
function onSystemThemeChange() {
  if (themeMode.value === 'auto') applyThemeMode('auto');
}

// Info modal
const showInfo = ref(false);
function inlineFmt(line: string): string {
  return line
    .replace(/~~(.+?)~~/g, '<s style="opacity:.5">$1</s>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\w)__(.+?)__(?!\w)/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--surface2);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--blue)">$1</a>');
}
function md2html(md: string): string {
  let html = '';
  let inTable = false;
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Skip table separator rows
    if (/^\|[\s\-:|]+\|$/.test(raw)) continue;
    // Table rows
    if (/^\|(.+)\|$/.test(raw)) {
      const cells = raw.slice(1, -1).split('|').map(c => inlineFmt(c.trim()));
      if (!inTable) { html += '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px">'; inTable = true; }
      html += '<tr>' + cells.map(c => `<td style="padding:5px 8px;border-bottom:1px solid var(--border)">${c}</td>`).join('') + '</tr>';
      continue;
    }
    if (inTable) { html += '</table>'; inTable = false; }
    // Headings
    const h3 = raw.match(/^### (.+)$/);
    if (h3) { html += `<h3 style="margin:14px 0 6px;font-size:14px;color:var(--text)">${inlineFmt(h3[1])}</h3>`; continue; }
    const h2 = raw.match(/^## (.+)$/);
    if (h2) { html += `<h2 style="margin:18px 0 8px;font-size:16px;color:var(--text)">${inlineFmt(h2[1])}</h2>`; continue; }
    const h1 = raw.match(/^# (.+)$/);
    if (h1) { html += `<h1 style="margin:0 0 12px;font-size:18px;color:var(--text)">${inlineFmt(h1[1])}</h1>`; continue; }
    if (/^---$/.test(raw)) { html += '<hr style="margin:14px 0">'; continue; }
    // Lists (apply inline formatting to content)
    const ul = raw.match(/^- (.+)$/);
    if (ul) { html += `<div style="margin-left:12px;margin-bottom:3px">• ${inlineFmt(ul[1])}</div>`; continue; }
    const ol = raw.match(/^(\d+)\. (.+)$/);
    if (ol) { html += `<div style="margin-left:12px;margin-bottom:3px">${ol[1]}. ${inlineFmt(ol[2])}</div>`; continue; }
    // Empty line
    if (raw.trim() === '') { html += '<div style="height:8px"></div>'; continue; }
    // Regular text
    html += `<p style="margin:0 0 4px;line-height:1.6">${inlineFmt(raw)}</p>`;
  }
  if (inTable) html += '</table>';
  return html;
}
const guideHtml = computed(() => md2html(guideByLang[locale.value] || guideByLang.en));

onMounted(() => {
  setScheme(currentScheme.value);
  applyThemeMode(themeMode.value);
  document.addEventListener('click', onClickOutside);
  mql = window.matchMedia('(prefers-color-scheme: light)');
  mql.addEventListener('change', onSystemThemeChange);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  mql?.removeEventListener('change', onSystemThemeChange);
});
</script>

<template>
  <div class="hero">
    <div class="hero-inner">
      <div>
        <h1 class="hero-title">{{ t('title') }}</h1>
        <p class="hero-sub">{{ t('subtitle') }}</p>
      </div>
      <div class="hero-actions">
        <div v-if="store.fxRates.RSD !== 117" class="fx-bar">
          <span>EUR/RSD <b>{{ store.fxRates.RSD.toFixed(2) }}</b></span>
          <span>EUR/RUB <b>{{ store.fxRates.RUB.toFixed(2) }}</b></span>
          <span>RUB/RSD <b>{{ (store.fxRates.RSD / store.fxRates.RUB).toFixed(4) }}</b></span>
        </div>
        <div style="display: flex; gap: 5px">
          <span class="badge badge-gold">EURIBOR</span>
          <span class="badge badge-blue">SOFR</span>
          <span class="badge badge-green">ПСК/EAR</span>
        </div>
        <!-- Info -->
        <button class="theme-btn" @click="showInfo = true"><BookOpen :size="16" /></button>
        <!-- Share -->
        <button class="theme-btn" :title="copied ? t('share.copied') : t('share.button')" @click="share">
          <Check v-if="copied" :size="16" />
          <Share2 v-else :size="16" />
        </button>
        <!-- Settings -->
        <div ref="settingsEl" style="position: relative">
          <button class="theme-btn" @click.stop="showSettings = !showSettings"><Settings :size="18" /></button>
          <div v-if="showSettings" class="settings-panel" @click.stop>
            <div class="settings-section">
              <div class="settings-label">{{ t('settings.language') }}</div>
              <div class="lang-bar">
                <button
                  v-for="l in langs" :key="l"
                  class="lang-btn" :class="{ active: locale === l }"
                  @click="setLang(l)"
                >{{ l.toUpperCase() }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-label">{{ t('settings.theme') }}</div>
              <div class="theme-mode-bar">
                <button class="theme-mode-btn" :class="{ active: themeMode === 'light' }" @click="applyThemeMode('light')"><Sun :size="13" style="margin-right:3px" /> {{ t('settings.light') }}</button>
                <button class="theme-mode-btn" :class="{ active: themeMode === 'auto' }" @click="applyThemeMode('auto')"><Monitor :size="13" style="margin-right:3px" /> Auto</button>
                <button class="theme-mode-btn" :class="{ active: themeMode === 'dark' }" @click="applyThemeMode('dark')"><Moon :size="13" style="margin-right:3px" /> {{ t('settings.dark') }}</button>
              </div>
            </div>
            <div class="settings-section">
              <div class="settings-label">{{ t('settings.colorScheme') }}</div>
              <div class="scheme-grid">
                <button
                  v-for="s in activeSchemes" :key="s.key"
                  class="scheme-btn" :class="{ active: currentScheme === s.key }"
                  @click="setScheme(s.key)"
                >
                  <span class="scheme-dot" :style="{ background: s.color }" />
                  <span class="scheme-name">{{ s.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppModal :open="showInfo" :title="t('info.title')" :body-html="guideHtml" wide @close="showInfo = false" />
</template>
