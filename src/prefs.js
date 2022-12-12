const { Adw, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;

/** @type {typeof import("@lib/prefs/Prefs")} */
const { Prefs } = Me.imports.lib.prefs.Prefs;

/**
 * Called when the extension loads. Should only include translation initiation.
 */
function init() {
    ExtensionUtils.initTranslations();
}

/**
 * Called when the preferences window is opened.
 *
 * @param {import("@types/Gjs/Adw-1").PreferencesWindow} window the Adw.PreferencesWindow that will contain all the extension preferences.
 */
function fillPreferencesWindow(window) {
    const { debug } = new Utils();

    debug(`Opening Preferences Window: ${new Date()}`);
    // const prefs = new Prefs();
    // const settings = ExtensionUtils.getSettings(Me.metadata["settings-schema"]);

    const gettextDomain = Me.metadata['gettext-domain'];
    const builder = new Gtk.Builder();
    builder.set_translation_domain(gettextDomain);
    builder.add_from_file(`${Me.path}/ui/prefs.ui`);
    window.add(builder.get_object('test'));
}
