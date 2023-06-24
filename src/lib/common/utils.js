const { Gio } = imports.gi;
const { extensionUtils } = imports.misc;

const Me = extensionUtils.getCurrentExtension();

/** @typedef {typeof UtilsClass} Utils */
class UtilsClass {
  static BASE_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.focus-window';
  static BASE_SETTINGS_PATH = '/org/gnome/shell/extensions/focus-window';
  /**
   * The schema for the extension's settings
   * @type {import('@girs/gio-2.0').Gio.SettingsSchemaSource}
   */
  static SETTINGS_SCHEMA = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_child('schemas').get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );

  /**
   * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
   * @param {any[]} message A string that should be logged to the console
   */
  static debug(...message) {
    log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message.join(' ')}`);
  }

  /**
   * Creates a unique id
   * @returns {string}
   */
  static createId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * A function that returns an array of numbers from a start to an end
   * @param {number} start A number that should be the start of the range
   * @param {*} end A number that should be the end of the range
   * @returns {number[]} An array of numbers
   */
  static range(start, end) {
    return Array.from({ length: end - start }, (_, i) => i + start);
  }

  /**
   * @template T
   * @param {() => T} callback
   */
  static wrapCallback(callback) {
    try {
      return callback();
    } catch (error) {
      UtilsClass.debug('Caught Error: ', error);
      console.trace();
      return null;
    }
  }
}

var utils = UtilsClass;
