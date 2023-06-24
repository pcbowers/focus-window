const { GObject, Meta, Shell } = imports.gi;
const { main } = imports.ui;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @typedef {typeof ShortcutClass} Shortcut  */
class ShortcutClass extends GObject.Object {
  /** @type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {Map<number, { name: string, accelerator: string, callback: Function}>} */
  _shortcuts;

  constructor() {
    super({});

    this.manager = new Manager({ includeSettings: false });

    this._shortcuts = new Map();

    this.manager.connectSignal(global.display, 'accelerator-activated', false, (_, action) => {
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

    return wrapCallback(() => {
      // try to take ownership of the shortcut
      const action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.NONE);

      // if it is owned, stop here
      if (action === Meta.KeyBindingAction.NONE) return;

      // bind the shortcut to the action
      const name = Meta.external_binding_name_for_action(action);
      main.wm.allowKeybinding(name, Shell.ActionMode.ALL);

      this._shortcuts.set(action, { name, accelerator, callback });

      return action;
    });
  }

  /**
   * @param {number} action
   */
  unbind(action) {
    debug(`Unbinding ${this._shortcuts.get(action).accelerator}...`);

    wrapCallback(() => {
      if (this._shortcuts.has(action)) {
        // unbind the shortcut from the action
        global.display.ungrab_accelerator(action);

        // allow the shortcut to be used by other applications
        main.wm.allowKeybinding(this._shortcuts.get(action).name, Shell.ActionMode.NONE);

        this._shortcuts.delete(action);
      }
    });
  }

  unbindAll() {
    this._shortcuts.forEach((_, action) => this.unbind(action));
    this._shortcuts.clear();
  }

  destroy() {
    this.manager.cleanup();
    this.unbindAll();

    this.manager = null;
    this._shortcuts = null;

    wrapCallback(() => this.run_dispose());
  }
}

var shortcut = GObject.registerClass({ GTypeName: 'FWShortcut' }, ShortcutClass);
