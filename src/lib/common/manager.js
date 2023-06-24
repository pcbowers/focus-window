const { GObject, Gio, Gtk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, wrapCallback, SETTINGS_SCHEMA, BASE_SETTINGS_PATH, BASE_SETTINGS_SCHEMA } =
  Me.imports.lib.common.utils.utils;

/** @typedef {typeof ManagerClass} Manager  */
class ManagerClass extends GObject.Object {
  /** @type {import('@girs/gio-2.0').Gio.Settings} */
  _settings;

  /** @type {Map<string, Function>} */
  _signals;

  /** @type {string} */
  _schema;

  /** @type {string} */
  _path;

  /**
   * @param {ManagerProps} props
   */
  constructor({ id = '', subpath = '', includeSettings = true }) {
    debug('ManagerClass', subpath ? `/${subpath}/${id}/` : '/');
    super({});

    this._schema = subpath ? `.${subpath}` : '';
    this._path = subpath ? `/${subpath}/${id}/` : '/';

    if (includeSettings) {
      this._settings = new Gio.Settings({
        settings_schema: SETTINGS_SCHEMA.lookup(BASE_SETTINGS_SCHEMA + this._schema, true),
        path: BASE_SETTINGS_PATH + this._path
      });
    } else {
      this._settings = null;
    }

    this._signals = new Map();
  }

  /**
   * Gets the settings object
   */
  getSettings() {
    return this._settings;
  }

  /**
   * Bind a list of settings to a list of object properties where the objects have the same name.
   * This assumes that all of your object properties are prefixed with an underscore, and that the settings keys are lowercase.
   * @param {import('@girs/gtk-4.0').Gtk.Widget} self
   * @param {Record<string, string>} bindings
   */
  bindDefaultSettings(self, bindings) {
    for (const [key, property] of Object.entries(bindings)) {
      this.bindSettings(key.toLowerCase(), self[`_${key.replace('-', '_')}`], property, Gio.SettingsBindFlags.DEFAULT);
    }
  }

  /**
   * @type {import('@girs/gio-2.0').Gio.Settings["bind"]}
   */
  bindSettings(key, object, property, flags = Gio.SettingsBindFlags.DEFAULT) {
    return this._settings.bind(key, object, property, flags);
  }

  /**
   * Binds a settings signal
   * @template {Parameters<typeof this._settings.connect>[0]} SignalName
   * @template {Parameters<typeof this._settings.connect>[1]} Callback
   * @param {SignalName} signalName The name of the signal to connect to
   * @param {boolean} fireOnce If true, the signal will be disconnected after the first time it is fired
   * @param {Callback} callback The callback to be called when the signal is fired. Will be passed the value of the setting if the signal is a changed signal
   * @param {boolean} [fireImmediately] If false, the callback will not be fired immediately with the current value of the setting
   * @returns {string} The id of the signal
   */
  connectSettings(signalName, fireOnce, callback, fireImmediately = true) {
    const id = this.connectSignal(this._settings, signalName, fireOnce, () => {
      if (signalName.startsWith('changed::')) {
        callback(this._settings.get_value(signalName.replace('changed::', '')).recursiveUnpack());
      } else {
        callback();
      }
    });

    if (fireImmediately) {
      callback(this._settings.get_value(signalName.replace('changed::', '')).recursiveUnpack());
    }

    return id;
  }

  /**
   * Binds a signal
   * @template {import('@girs/gobject-2.0').GObject.Object} GObject
   * @template {Parameters<GObject['connect']>[0]} SignalName
   * @template {Parameters<GObject['connect']>[1]} Callback
   * @param {GObject} object The object to connect to
   * @param {SignalName} signalName The name of the signal to connect to
   * @param {boolean} fireOnce If true, the signal will be disconnected after the first time it is fired
   * @param {Callback} callback The callback to be called when the signal is fired
   * @returns {string} The id of the signal
   */
  connectSignal(object, signalName, fireOnce, callback) {
    const id = createId();

    const connectId = object.connect(signalName, (...parameters) => {
      callback(...parameters);
      if (fireOnce && this._signals.has(id)) this._signals.get(id)();
    });

    this._signals.set(id, () => {
      wrapCallback(() => object.disconnect(connectId));
      this._signals.delete(id);
    });

    return id;
  }

  /**
   * Unbinds a signal
   * @param {string} signalId The id of the signal to disconnect
   */
  disconnectSignal(signalId) {
    if (this._signals.has(signalId)) this._signals.get(signalId)();
  }

  /**
   * Unbinds all signals
   */
  disconnectAll() {
    this._signals.forEach(disconnect => disconnect());
    this._signals.clear();
  }

  /**
   * Destroy the manager
   * @param {boolean} [withSettings] If true, the settings will be reset
   * @param {string[]} [subpaths] The subpaths to remove
   */
  cleanup(withSettings = false, subpaths = []) {
    debug('Destroy ManagerClass', this._path);
    this.disconnectAll();

    if (withSettings && this._settings) {
      if (subpaths.length) this.destroyNestedSettings(subpaths);
      this._settings.list_keys().forEach(key => this._settings.reset(key));
    }

    if (this._settings) {
      wrapCallback(() => this._settings.run_dispose());
    }

    this._settings = null;
    this._signals = null;

    wrapCallback(() => this.run_dispose());
  }

  /**
   * @param {string[]} subpaths
   */
  destroyNestedSettings(subpaths) {
    const [subpath, ...otherSubPaths] = subpaths;
    if (!subpath) return;
    this._settings.get_strv(subpath).forEach(id => {
      debug(`Destroying nested settings for ${id}`);
      const settings = new manager({ id, subpath });
      settings.cleanup(true, otherSubPaths);
    });
  }
}

var manager = GObject.registerClass({ GTypeName: 'FWManager' }, ManagerClass);

/**
 * @typedef {{ subpath?: string, id?: string, includeSettings?: boolean }} ManagerProps
 */
