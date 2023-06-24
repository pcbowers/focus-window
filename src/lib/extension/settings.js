const { GObject, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, SETTINGS_SCHEMA, BASE_SETTINGS_PATH, BASE_SETTINGS_SCHEMA } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

const SETTINGS_STRUCTURE = /** @type {SettingsLayout} */ ({
  endpoint: '',
  keyMap: {
    profiles: 'profiles'
  },
  settings: [
    {
      endpoint: 'profiles',
      keyMap: /** @type {Record<string, keyof import('$lib/prefs/profile').ProfilePreferences>} */ ({
        applications: 'applications',
        enabled: 'enabled',
        name: 'name',
        icon: 'icon'
      }),
      settings: [
        {
          endpoint: 'applications',
          keyMap: /** @type {Record<string, keyof import('$lib/prefs/application').ApplicationPreferences>} */ ({
            shortcuts: 'shortcuts',
            enabled: 'enabled',
            id: 'id',
            launch: 'launch',
            commandlinearguments: 'commandLineArguments',
            filterbytitle: 'filterByTitle',
            titletomatch: 'titleToMatch',
            filterbyworkspace: 'filterByWorkspace',
            filtertocurrentworkspace: 'filterToCurrentWorkspace',
            workspacetomatch: 'workspaceToMatch',
            filterbymonitor: 'filterByMonitor',
            filtertocurrentmonitor: 'filterToCurrentMonitor',
            monitortomatch: 'monitorToMatch',
            moveonfocus: 'moveOnFocus',
            movetocurrentworkspace: 'moveToCurrentWorkspace',
            movetocurrentmonitor: 'moveToCurrentMonitor',
            resizeonfocus: 'resizeOnFocus',
            maximize: 'maximize',
            restrictresize: 'restrictResize',
            usepixels: 'usePixels',
            topleftx: 'topLeftX',
            toplefty: 'topLeftY',
            bottomrightx: 'bottomRightX',
            bottomrighty: 'bottomRightY',
            useproportions: 'useProportions',
            gridsize: 'gridSize',
            columnstart: 'columnStart',
            width: 'width',
            rowstart: 'rowStart',
            height: 'height',
            minimize: 'minimize',
            alwaysontop: 'alwaysOnTop',
            disableanimations: 'disableAnimations'
          }),
          settings: [
            {
              endpoint: 'shortcuts',
              keyMap: /** @type {Record<string, keyof import('$lib/prefs/shortcutItem').ShortcutPreferences>} */ ({
                accelerator: 'accelerator'
              }),
              settings: []
            }
          ]
        }
      ]
    }
  ]
});

/** @typedef {typeof SettingsClass} Settings  */
class SettingsClass extends GObject.Object {
  /** @type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {Map<string, { settings: import('@girs/gio-2.0').Gio.Settings, signalId: string }>} */
  _settings = new Map();

  /** @type {Function} */
  _callback;

  /**
   * @param {import('@girs/gobject-2.0').GObject.Object.ConstructorProperties} params
   * @param {(settings: import('prefs').Preferences) => void} callback
   */
  constructor(params, callback) {
    debug('Creating settings...');
    super(params);

    this.manager = new Manager({ includeSettings: false });
    this._callback = callback;

    this._callback(this._getSettings(SETTINGS_STRUCTURE));
  }

  /**
   * Add a listener for the given endpoint, making sure the callback is called when updated
   * and the listener is removed when the id is no longer present
   * @param {string} schema
   * @param {string} path
   * @param {string[]} endpoints
   * @return {import('@girs/gio-2.0').Gio.Settings}
   */
  _addListener(schema, path, endpoints) {
    // Create the settings object
    const settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(schema, true),
      path: path
    });

    const signalId = this.manager.connectSignal(settings, 'changed', false, (_, key) => {
      // If the key is in the endpoints, we need to remove and re-add the listener so that we can
      // get the new settings for the new id, or remove the listener if an id is no longer present
      if (endpoints.length && endpoints.includes(key)) {
        this._findAndRemoveListener(key, settings.get_strv(key));
      }

      // Call the callback with the new settings
      this._callback(this._getSettings(SETTINGS_STRUCTURE));
    });

    // Add the settings to the map
    this._settings.set(path, { settings, signalId });

    return settings;
  }

  /**
   * Remove the listener for the given endpoint if the id is no longer present
   * @param {string} endpoint
   * @param {string[]} currentIds
   */
  _findAndRemoveListener(endpoint, currentIds) {
    this._settings.forEach(({ settings, signalId }, key) => {
      if (!settings.schema.endsWith(endpoint)) return;
      if (currentIds.some(id => settings.path.endsWith(id + '/'))) return;

      this.manager.disconnectSignal(signalId);
      this._settings.delete(key);
    });
  }

  /**
   * Get the raw settings object for the given endpoint and id. If the settings object already
   * exists, it will be returned, otherwise it will be created and added to the map. This also
   * adds listeners for the settings object so that the callback is called when the settings
   * change, and listeners are removed when the id is no longer present.
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
   * @param {SettingsLayout} settingsLayout
   * @param {string} [id]
   * @returns {import('prefs').Preferences}
   */
  _getSettings(settingsLayout, id = '') {
    const rawSettings = this._getRawSettings(
      settingsLayout.settings.map(layout => layout.endpoint),
      settingsLayout.endpoint,
      id
    );

    // Get the raw settings and unpack them into a JS object
    const parsedSettings = rawSettings.list_keys().reduce((acc, key) => {
      // If the key is in the keyMap, use the new key, otherwise use the old key
      // Useful for overcoming the fact that Gio.Settings doesn't allow for case-sensitive keys
      const newKey = settingsLayout.keyMap[key] || key;
      acc[newKey] = rawSettings.get_value(key).recursiveUnpack();
      return acc;
    }, {});

    // If there are additional nested layouts, recursively get the settings and replace the
    // array of ids with the settings for each id
    settingsLayout.settings.forEach(layout => {
      if (!parsedSettings[layout.endpoint]) return;
      if (!Array.isArray(parsedSettings[layout.endpoint])) return;

      // Replace the array of ids with the settings for each id
      parsedSettings[layout.endpoint] = parsedSettings[layout.endpoint].map(settingId => {
        // Recursively get the settings for the nested layout
        return this._getSettings(layout, settingId);
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
    const schema = endpoint ? `.${endpoint}` : '';
    const path = endpoint ? `/${endpoint}/${id}/` : '/';

    return {
      schema: BASE_SETTINGS_SCHEMA + schema,
      path: BASE_SETTINGS_PATH + path
    };
  }

  destroy() {
    this.manager.cleanup();
    this.manager = null;

    this._settings.forEach((item, path) => {
      item.settings.run_dispose();
      this._settings.delete(path);
    });

    this._settings.clear();
    this._settings = null;
    this._callback = null;
  }
}

var settings = GObject.registerClass({}, SettingsClass);

/**
 * @typedef {Object} SettingsLayout
 * @property {string} endpoint
 * @property {Record<string, string>} keyMap
 * @property {SettingsLayout[]} settings
 */
