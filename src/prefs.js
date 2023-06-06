const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/prefs/prefs").Prefs} */
const Prefs = Me.imports.lib.prefs.prefs.prefs;

function init() {
  ExtensionUtils.initTranslations(Me.metadata.uuid);
}

/**
 * @param {import("$types/adw-1").Adw.PreferencesWindow} window
 */
function fillPreferencesWindow(window) {
  debug('Filling Preferences Window...');
  // const settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
  debug('TODO: use settings');
  const preferencesPage = new Prefs({});
  window.add(preferencesPage);
}
