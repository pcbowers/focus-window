const { GObject } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/** @typedef {typeof SignalClass} Signal  */
/** @typedef {SignalClass} SignalInstance  */
class SignalClass extends GObject.Object {
  /** @type {Map<string, Function>} */
  _signals;

  /**
   * @param {import('@girs/gobject-2.0').GObject.Object.ConstructorProperties} params
   */
  constructor(params = {}) {
    super(params);
    this._signals = new Map();
  }

  /**
   * @template {import('@girs/gobject-2.0').GObject.Object} GObject
   * @template {Parameters<GObject['connect']>[0]} SignalName
   * @template {Parameters<GObject['connect']>[1]} Callback
   *
   * @param {GObject} object
   * @param {SignalName} signalName
   * @param {boolean} fireOnce
   * @param {Callback} callback
   * @returns {string}
   */
  connectSignal(object, signalName, fireOnce, callback) {
debug(`Connecting Signal... Total: ${this._signals.size + 1}`);

    const id = createId();

    const connectId = object.connect(signalName, (...parameters) => {
      callback(...parameters);
      if (fireOnce && this._signals.has(id)) this._signals.get(id)();
    });

    this._signals.set(id, () => {
      object.disconnect(connectId);
      this._signals.delete(id);
    });

    return id;
  }

  /**
   * @param {string} signalId
   */
  disconnectSignal(signalId) {
debug(`Disconnecting Signal... Total: ${this._signals.size - 1}`);

    if (this._signals.has(signalId)) this._signals.get(signalId)();
  }

  disconnectAll() {
    this._signals.forEach(disconnect => disconnect());
  }

  destroy() {
    this.disconnectAll();
  }
}

var signal = GObject.registerClass({}, SignalClass);
