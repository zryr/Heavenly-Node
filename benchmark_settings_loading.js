const { performance } = require('perf_hooks');

const sampleSettingsObj = {
  autoCloak: true,
  persistentCloak: true,
  randomizePresetEachSession: true,
  randomPool: ['classroom', 'google', 'docs'],
  selectedPreset: 'google',
  customPresets: {
    preset1: { title: "Custom Preset 1", icon: "https://example.com/icon.png" }
  },
  panicKeyEnable: true,
  panicKey: '`',
  touchPanic: false,
  panicUrl: 'https://google.com',
  showScrollLock: true,
  showMagnifier: true,
  showNavBookmark: true,
  showNavSearch: true,
  showNavHome: true,
  useWidgetDock: true,
  dockPosition: 'bottom',
  expandDirection: 'left',
  disableAllWidgets: false,
  disableAllFeatures: false
};

const sampleSettingsJSON = JSON.stringify(sampleSettingsObj);

const mockStorage = {
  getItem(key) {
    if (key === 'heavenly_settings') return sampleSettingsJSON;
    return null;
  }
};

const mockWindow = {
  localStorage: mockStorage
};

const DEFAULT_RANDOM_POOL = ['classroom', 'google', 'docs', 'drive', 'gmail', 'outlook', 'canva'];

// Baseline loadHeavenlySettings (unoptimized)
function loadHeavenlySettingsUnoptimized(window) {
  var saved = {};
  try {
    saved = JSON.parse((window.localStorage || localStorage).getItem('heavenly_settings') || '{}');
  } catch (e) {}

  return {
    autoCloak: saved.autoCloak !== undefined ? saved.autoCloak : false,
    persistentCloak: saved.persistentCloak || false,
    randomizePresetEachSession: saved.randomizePresetEachSession || false,
    randomPool: (saved.randomPool && Array.isArray(saved.randomPool)) ? saved.randomPool : DEFAULT_RANDOM_POOL.slice(),
    selectedPreset: saved.selectedPreset || 'classroom',
    customPresets: saved.customPresets || {},
    panicKeyEnable: saved.panicKeyEnable || false,
    panicKey: saved.panicKey || '`',
    touchPanic: saved.touchPanic !== undefined ? saved.touchPanic : true,
    panicUrl: saved.panicUrl || 'https://classroom.google.com',
    showScrollLock: saved.showScrollLock !== undefined ? saved.showScrollLock : true,
    showMagnifier: saved.showMagnifier !== undefined ? saved.showMagnifier : true,
    showNavBookmark: saved.showNavBookmark !== undefined ? saved.showNavBookmark : true,
    showNavSearch: saved.showNavSearch !== undefined ? saved.showNavSearch : true,
    showNavHome: saved.showNavHome !== undefined ? saved.showNavHome : true,
    useWidgetDock: saved.useWidgetDock !== undefined ? saved.useWidgetDock : true,
    dockPosition: saved.dockPosition || 'bottom',
    expandDirection: saved.expandDirection || 'left',
    disableAllWidgets: saved.disableAllWidgets || false,
    disableAllFeatures: saved.disableAllFeatures || false
  };
}

// Optimized loadHeavenlySettings with string comparison caching
var lastRawSettings = null;
var cachedSettings = null;

function loadHeavenlySettingsOptimized(window) {
  var raw = null;
  try {
    raw = (window.localStorage || localStorage).getItem('heavenly_settings');
  } catch (e) {}

  if (raw !== null && raw === lastRawSettings && cachedSettings !== null) {
    return cachedSettings;
  }

  var saved = {};
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch (e) {}
  }

  lastRawSettings = raw;
  cachedSettings = {
    autoCloak: saved.autoCloak !== undefined ? saved.autoCloak : false,
    persistentCloak: saved.persistentCloak || false,
    randomizePresetEachSession: saved.randomizePresetEachSession || false,
    randomPool: (saved.randomPool && Array.isArray(saved.randomPool)) ? saved.randomPool : DEFAULT_RANDOM_POOL.slice(),
    selectedPreset: saved.selectedPreset || 'classroom',
    customPresets: saved.customPresets || {},
    panicKeyEnable: saved.panicKeyEnable || false,
    panicKey: saved.panicKey || '`',
    touchPanic: saved.touchPanic !== undefined ? saved.touchPanic : true,
    panicUrl: saved.panicUrl || 'https://classroom.google.com',
    showScrollLock: saved.showScrollLock !== undefined ? saved.showScrollLock : true,
    showMagnifier: saved.showMagnifier !== undefined ? saved.showMagnifier : true,
    showNavBookmark: saved.showNavBookmark !== undefined ? saved.showNavBookmark : true,
    showNavSearch: saved.showNavSearch !== undefined ? saved.showNavSearch : true,
    showNavHome: saved.showNavHome !== undefined ? saved.showNavHome : true,
    useWidgetDock: saved.useWidgetDock !== undefined ? saved.useWidgetDock : true,
    dockPosition: saved.dockPosition || 'bottom',
    expandDirection: saved.expandDirection || 'left',
    disableAllWidgets: saved.disableAllWidgets || false,
    disableAllFeatures: saved.disableAllFeatures || false
  };

  return cachedSettings;
}

const ITERATIONS = 100000;

console.log(`Benchmarking loadHeavenlySettings over ${ITERATIONS} iterations...`);

const startUnopt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  loadHeavenlySettingsUnoptimized(mockWindow);
}
const endUnopt = performance.now();
const timeUnopt = endUnopt - startUnopt;

const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  loadHeavenlySettingsOptimized(mockWindow);
}
const endOpt = performance.now();
const timeOpt = endOpt - startOpt;

const speedup = (((timeUnopt - timeOpt) / timeUnopt) * 100).toFixed(2);

console.log(`Unoptimized Time: ${timeUnopt.toFixed(2)} ms`);
console.log(`Optimized Time:   ${timeOpt.toFixed(2)} ms`);
console.log(`Speedup:          ${speedup}% faster (${(timeUnopt / timeOpt).toFixed(1)}x speedup)`);
