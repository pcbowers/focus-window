const { Adw, Gio, Gtk, Gdk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/prefs/profiles').Profiles} */
const Profiles = Me.imports.lib.prefs.profiles.profiles;

function init() {
  extensionUtils.initTranslations(Me.metadata.uuid);
}

/**
 * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
 */
function createActions(window) {
  const aboutUrl = Me.metadata.url + '/blob/main/README.md#about';
  const bugUrl = Me.metadata.url + '/issues';
  const licenseUrl = Me.metadata.url + '/blob/main/LICENSE';
  const guideUrl = Me.metadata.url + '/blob/main/README.md#guide';
  const contributeUrl = Me.metadata.url + '/blob/main/README.md#contribute';

  const infoGroup = new Gio.SimpleActionGroup();
  window.insert_action_group('info', infoGroup);

  infoGroup.add_action(setupAction(window, 'about', aboutUrl));
  infoGroup.add_action(setupAction(window, 'bug', bugUrl));
  infoGroup.add_action(setupAction(window, 'license', licenseUrl));
  infoGroup.add_action(setupAction(window, 'guide', guideUrl));
  infoGroup.add_action(setupAction(window, 'contribute', contributeUrl));
}

/**
 * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
 * @param {string} name
 * @param {string} url
 * @returns {import('@girs/gio-2.0').Gio.SimpleAction}
 */
function setupAction(window, name, url) {
  const action = new Gio.SimpleAction({ name });
  action.connect('activate', () => openUrl(window, url));
  return action;
}

/**
 * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
 * @param {string} url
 */
function openUrl(window, url) {
  Gtk.show_uri(window, url, Gdk.CURRENT_TIME);
}

/**
 * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
 */
function fillPreferencesWindow(window) {
  createActions(window);
  window.set_search_enabled(true);
  window.set_default_size(800, 800);
  window.add(new Adw.PreferencesPage());
  window.set_content(new Profiles(window));
}

/**
 * @typedef {import('$lib/prefs/profiles').ProfilesPreferences} Preferences
 */
