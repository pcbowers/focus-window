const { GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @typedef {typeof SETTINGS_ID} SETTINGS_ID */
var SETTINGS_ID = /** @type {const} */ ('org.gnome.shell.extensions.focus-window');

/** @typedef {typeof SETTINGS_KEY} SETTINGS_KEY */
var SETTINGS_KEY = /** @type {const} */ ('app-settings');

/** @typedef {typeof SETTINGS_VARIANT} SETTINGS_VARIANT */
var SETTINGS_VARIANT = /** @type {const} */ ('aa{sv}');

/**@typedef {typeof debug} Debug */
/**
 * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
 * @param {any} message A string that should be logged to the console
 */
function debug(message) {
  log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message}`);
}

/** @typedef {typeof htmlEntities} HtmlEntities */
/**
 * Escapes a string so that it can be used in HTML
 * @param {string} str A string that should be escaped
 * @returns {string} The escaped string
 */
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @typedef {typeof createId} CreateId */
/**
 * Creates a unique id
 * @returns {string}
 */
function createId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2)
  );
}

/** @typedef {typeof convertToVariant} ConvertToVariant */
/**
 *
 * @param {Record<string, unknown>[]} array
 * @returns {Record<string, import('$types/glib-2.0').GLib.Variant>[]}
 */
function convertToVariant(array) {
  return array.map(obj =>
    Object.keys(obj).reduce((acc, key) => {
      const value = obj[key];
      if (typeof value === 'string') acc[key] = new GLib.Variant('s', value);
      if (typeof value === 'boolean') acc[key] = new GLib.Variant('b', value);
      if (typeof value === 'number') acc[key] = new GLib.Variant('u', value);
      return acc;
    }, {})
  );
}

/**
 * @typedef {typeof generateSettings} GenerateSettings
 */
/**
 * Generates a settings object
 * @param {import('$types/gio-2.0').Gio.Settings} settings
 */
function generateSettings(settings) {
  /**
   * @returns {Record<string, unknown>[]}
   */
  const getAllSettings = () => settings.get_value(SETTINGS_KEY).recursiveUnpack();

  const setAllSettings = data => {
    settings.set_value(SETTINGS_KEY, new GLib.Variant(SETTINGS_VARIANT, data));
    settings.apply();
  };

  const getSettings = id => () => getAllSettings().find(s => s.id === id);

  const setSettings = id => data => {
    const oldSettings = getAllSettings();
    const curSettings = getSettings(id)();

    let newSettings;

    if (curSettings !== undefined && data) {
      newSettings = oldSettings.map(item => (item.id === id ? data : item));
    }

    if (curSettings !== undefined && !data) {
      newSettings = oldSettings.filter(item => item.id !== id);
    }

    if (!curSettings && data) {
      newSettings = [...oldSettings, data];
    }

    if (!curSettings && !data) {
      newSettings = oldSettings;
    }

    if (newSettings === undefined) newSettings = oldSettings;

    if (newSettings.length === 0) return settings.reset(SETTINGS_KEY);

    return setAllSettings(convertToVariant(newSettings));
  };

  return {
    getAllSettings,
    setAllSettings,
    getSettings,
    setSettings
  };
}
