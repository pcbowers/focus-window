const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/prefs/prefs').Prefs} */
const Prefs = Me.imports.lib.prefs.prefs.prefs;

function init() {
  extensionUtils.initTranslations(Me.metadata.uuid);
}

/**
 * @param {import('$types/adw-1').Adw.PreferencesWindow} window
 */
function fillPreferencesWindow(window) {
  window.add(new Prefs({}));
  window.search_enabled = true;
}
