const { Gio } = imports.gi;
const { extensionUtils } = imports.misc;

const Me = extensionUtils.getCurrentExtension();

/** @typedef {import('@girs/gio-2.0').Gio.SettingsSchemaSource} SETTINGS_SCHEMA */
var SETTINGS_SCHEMA = Gio.SettingsSchemaSource.new_from_directory(
  Me.dir.get_child('schemas').get_path(),
  Gio.SettingsSchemaSource.get_default(),
  false
);

/**@typedef {typeof debug} Debug */
/**
 * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
 * @param {any[]} message A string that should be logged to the console
 */
function debug(...message) {
  log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message.join(' ')}`);
}

/** @typedef {typeof createId} CreateId */
/**
 * Creates a unique id
 * @returns {string}
 */
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** @typedef {typeof range} Range */
/**
 * A function that returns an array of numbers from a start to an end
 * @param {number} start A number that should be the start of the range
 * @param {*} end A number that should be the end of the range
 * @returns {number[]} An array of numbers
 */
function range(start, end) {
  return Array.from({ length: end - start }, (_, i) => i + start);
}
