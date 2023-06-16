const { GObject, Meta, Shell } = imports.gi;
const { main } = imports.ui;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @typedef {typeof ShortcutClass} Shortcut  */
/** @typedef {ShortcutClass} ShortcutInstance  */
class ShortcutClass extends GObject.Object {
  /** @type {Map<number, { name: string, accelerator: string, callback: Function}>} */
  _shortcuts;

  /** @type {number} */
  _displayConnection;

  /**
   * @param {import('@girs/gobject-2.0').GObject.Object.ConstructorProperties} params
   */
  constructor(params = {}) {
    super(params);

    this._shortcuts = new Map();
    this._displayConnection = global.display.connect('accelerator-activated', (_, action) => {
      if (this._shortcuts.has(action)) this._shortcuts.get(action).callback();
    });
  }

  /**
   * @param {string} accelerator
   * @param {Function} callback
   * @returns {number}
   */
  bind(accelerator, callback) {
debug(`Binding ${accelerator}...`);

    try {
      // try to take ownership of the shortcut
      const action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.NONE);

      // if it is owned, stop here
      if (action === Meta.KeyBindingAction.NONE) return;

      // bind the shortcut to the action
      const name = Meta.external_binding_name_for_action(action);
      main.wm.allowKeybinding(name, Shell.ActionMode.ALL);

      this._shortcuts.set(action, { name, accelerator, callback });

      return action;
    } catch (error) {
debug(error);
      return null;
    }
  }

  /**
   * @param {number} action
   */
  unbind(action) {
    if (this._shortcuts.has(action)) {
debug(`Unbinding ${this._shortcuts.get(action).accelerator}...`);

      // unbind the shortcut from the action
      global.display.ungrab_accelerator(action);

      // allow the shortcut to be used by other applications
      main.wm.allowKeybinding(this._shortcuts.get(action).name, Shell.ActionMode.NONE);
      this._shortcuts.delete(action);
    }
  }

  unbindAll() {
    this._shortcuts.forEach((_, action) => this.unbind(action));
  }

  destroy() {
    global.display.disconnect(this._displayConnection);
    this.unbindAll();
  }
}

var shortcut = GObject.registerClass({}, ShortcutClass);
