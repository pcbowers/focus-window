const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/prefs/prefs').Prefs} */
const Prefs = Me.imports.lib.prefs.prefs.prefs;

function init() {
  extensionUtils.initTranslations(Me.metadata.uuid);
}

/**
 * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
 */
function fillPreferencesWindow(window) {
  const prefsPage = new Prefs({}, window);
  window.add(prefsPage);
  prefsPage.init();
  window.search_enabled = true;
}
