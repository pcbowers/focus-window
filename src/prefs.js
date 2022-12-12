const { Gtk } = imports.gi;

// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/prefs/prefs").Prefs} */
const Prefs = Me.imports.lib.prefs.prefs.prefs;

/**
 * Initializes preferences. Should only include translation initiation.
 */
function init() {
    ExtensionUtils.initTranslations();
}

/**
 * Fills an Adw.PreferencesWindow when preferences are launched.
 *
 * @param {import("$types/Gjs/Adw-1").PreferencesWindow} window the Adw.PreferencesWindow that will contain all the extension preferences.
 */
function fillPreferencesWindow(window) {
    debug('Filling Preferences Window...');

    // const prefs = new Prefs();
    debug('TODO: use prefs');

    // const settings = ExtensionUtils.getSettings(Me.metadata['settings-schema']);
    debug('TODO: use settings');

    const gettextDomain = Me.metadata['gettext-domain'];
    const builder = new Gtk.Builder();
    builder.set_translation_domain(gettextDomain);
    builder.add_from_file(`${Me.path}/ui/prefs.ui`);

    // @ts-ignore
    window.add(builder.get_object('test'));
}
