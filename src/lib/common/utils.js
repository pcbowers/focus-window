const { GLib, Gio } = imports.gi;
const { extensionUtils } = imports.misc;

const Me = extensionUtils.getCurrentExtension();

/** @typedef {import('$types/gio-2.0').Gio.SettingsSchemaSource} SETTINGS_SCHEMA */
var SETTINGS_SCHEMA = Gio.SettingsSchemaSource.new_from_directory(
  Me.dir.get_child('schemas').get_path(),
  Gio.SettingsSchemaSource.get_default(),
  false
);

/**@typedef {typeof debug} Debug */
/**
 * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
 * @param {any} message A string that should be logged to the console
 */
function debug(message) {
  log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message}`);
}

/** @typedef {typeof createId} CreateId */
/**
 * Creates a unique id
 * @returns {string}
 */
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
