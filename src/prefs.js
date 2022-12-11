const { Adw, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;
const { debug } = new Utils();

/** @type {typeof import("@lib/prefs/Prefs")} */
const { Prefs } = Me.imports.lib.prefs.Prefs;

function init() {
  ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
  debug("Opening Preferences Window: " + new Date());
  // const prefs = new Prefs();
  // const settings = ExtensionUtils.getSettings(Me.metadata["settings-schema"]);

  const gettextDomain = Me.metadata["gettext-domain"];
  const builder = new Gtk.Builder();
  builder.set_translation_domain(gettextDomain);
  builder.add_from_file(`${Me.path}/ui/prefs.ui`);
  window.add(builder.get_object("test"));
}
