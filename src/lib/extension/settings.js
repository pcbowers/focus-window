const { GObject, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/extension/signal').Signal} */
const Signal = Me.imports.lib.extension.signal.signal;

/**
 * @typedef {Object} SettingsLayout
 * @property {string} endpoint
 * @property {SettingsLayout[]} [settings]
 */

const SETTINGS_STRUCTURE = /** @type {SettingsLayout[]} */ ([
  {
    endpoint: 'profiles',
    settings: [
      {
        endpoint: 'applications',
        settings: [
          {
            endpoint: 'shortcuts'
          }
        ]
      }
    ]
  }
]);

/** @typedef {typeof SettingsClass} Settings  */
/** @typedef {SettingsClass} SettingsInstance  */
class SettingsClass extends GObject.Object {
  /** @type {Map<string, { settings: import('@girs/gio-2.0').Gio.Settings, signalId: string }>} */
  _settings;

  /** @type {import('$lib/extension/signal').SignalInstance} */
  _signalManager;

  /** @type {Function} */
  _callback;

  /**
   * @param {import('@girs/gobject-2.0').GObject.Object.ConstructorProperties} params
   * @param {(settings: import('$lib/prefs/prefs').PrefsSettings) => void} callback
   */
  constructor(params, callback) {
    debug('Creating settings...');
    super(params);

    this._settings = new Map();
    this._signalManager = new Signal();
    this._callback = callback;

    this._callback(this._getSettings(SETTINGS_STRUCTURE));
  }

  /**
   * @param {string} schema
   * @param {string} path
   * @param {string[]} endpoints
   * @return {import('@girs/gio-2.0').Gio.Settings}
   */
  _addListener(schema, path, endpoints) {
    const settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(schema, true),
      path: path
    });

    const signalId = this._signalManager.connectSignal(settings, 'changed', false, (_, key) => {
      if (endpoints.length && endpoints.includes(key)) {
        this._findAndRemoveListener(key, settings.get_strv(key));
      }

      this._callback(this._getSettings(SETTINGS_STRUCTURE));
    });

    this._settings.set(path, { settings, signalId });

    return settings;
  }

  /**
   * @param {string} endpoint
   * @param {string[]} currentIds
   */
  _findAndRemoveListener(endpoint, currentIds) {
    this._settings.forEach(({ settings, signalId }, key) => {
      if (!settings.schema.endsWith(endpoint)) return;
      if (currentIds.some(id => settings.path.endsWith(id + '/'))) return;

      this._signalManager.disconnectSignal(signalId);
      this._settings.delete(key);
    });
  }

  /**
   * @param {string[]} properties
   * @param {string} endpoint
   * @param {string} id
   * @return {import('@girs/gio-2.0').Gio.Settings}
   */
  _getRawSettings(properties, endpoint, id) {
    const { path, schema } = this._getSchemaAndPath(endpoint, id);
    if (this._settings.has(path)) return this._settings.get(path).settings;
    return this._addListener(schema, path, properties);
  }

  /**
   * @param {SettingsLayout[]} [settingsLayout]
   * @param {string} [endpoint]
   * @param {string} [id]
   * @returns {import('$lib/prefs/prefs').PrefsSettings}
   */
  _getSettings(settingsLayout = [], endpoint = '', id = '') {
    const rawSettings = this._getRawSettings(
      settingsLayout.map(layout => layout.endpoint),
      endpoint,
      id
    );
    const parsedSettings = rawSettings.list_keys().reduce((acc, key) => {
      acc[key] = rawSettings.get_value(key).recursiveUnpack();
      return acc;
    }, {});

    settingsLayout.forEach(layout => {
      parsedSettings[layout.endpoint] = parsedSettings[layout.endpoint].map(settingId => {
        return this._getSettings(layout.settings, layout.endpoint, settingId);
      });
    });

    return /** @type {any} */ (parsedSettings);
  }

  /**
   * @param {string} endpoint
   * @param {string} id
   * @returns {{ schema: string, path: string }}
   */
  _getSchemaAndPath(endpoint = '', id = '') {
    const schemaId = 'org.gnome.shell.extensions.focus-window';
    const idPrefix = endpoint ? '.' : '';
    const schemaPath = '/org/gnome/shell/extensions/focus-window';
    const pathPrefix = endpoint ? '/' : '';

    return {
      schema: schemaId + idPrefix + endpoint,
      path: schemaPath + pathPrefix + endpoint + '/' + id + (id ? '/' : '')
    };
  }

  destroy() {
    this._signalManager.destroy();
    this._settings.forEach(({ settings }, path) => {
      settings.run_dispose();
      this._settings.delete(path);
    });
  }
}

var settings = GObject.registerClass({}, SettingsClass);
