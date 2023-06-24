const { GObject, Adw, Gtk, Gdk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @typedef {typeof ShortcutItemClass} ShortcutItem */
class ShortcutItemClass extends Adw.ActionRow {
  /** @type {Record<string, string>} */
  static bindings = {
    accelerator: 'accelerator'
  };

  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {import('@girs/gtk-4.0').Gtk.EventControllerKey} */
  keyController;

  /** @type {import('@girs/gtk-4.0').Gtk.EventControllerFocus} */
  focusController;

  /** @type {import('@girs/adw-1').Adw.Leaflet} */
  _leaflet;

  /** @type {InstanceType<import('$lib/prefs/application').Application>} */
  _parent;

  /** @type {string} */
  _id;

  /** @type {boolean} */
  _keyboardIsGrabbed = false;

  /** @type {string | null} */
  _lastAccelerator = '';

  /** @type {string} */
  _keyController;

  /** @type {string} */
  _focusController;

  /**
   * @param {import('@girs/gtk-4.0').Gtk.Widget} parent
   * @param {string} id
   */
  constructor(parent, id) {
    super({});

    this.manager = new Manager({ id, subpath: 'shortcuts' });

    this._leaflet = /** @type {any} */ (parent['_leaflet']);
    this._parent = /** @type {any} */ (parent);
    this._id = id;

    this.keyController = new Gtk.EventControllerKey();
    this.add_controller(this.keyController);

    this.focusController = new Gtk.EventControllerFocus();
    this.add_controller(this.focusController);

    this._initFromSettings();
    this._createShortcutListener();
  }

  getId() {
    return this._id;
  }

  isBound() {
    return !!this._accelerator.get_accelerator();
  }

  deleteShortcut() {
    this._parent.deleteShortcut(this._id);
  }

  setAccelerator() {
    if (this._keyboardIsGrabbed) {
      this._cancelKeyboardGrab();
    } else {
      this._grabKeyboard();
    }
  }

  cleanup(withSettings = false, subpaths = []) {
    this.manager.cleanup(withSettings, subpaths);
    this.manager = null;

    wrapCallback(() => this.keyController.run_dispose());
    this.keyController = null;

    wrapCallback(() => this.focusController.run_dispose());
    this.focusController = null;

    this._leaflet = null;
    this._parent = null;
    this._id = null;
    this._keyboardIsGrabbed = null;
    this._lastAccelerator = null;

    wrapCallback(() => this.run_dispose());
  }

  _createShortcutListener() {
    this._keyPressedId = this.manager.connectSignal(
      this.keyController,
      'key-pressed',
      false,
      (c, key, keycode, state) => {
        if (this._keyboardIsGrabbed) {
          const mods = state & Gtk.accelerator_get_default_mod_mask();

          // Adapted from: https://github.com/Schneegans/Fly-Pie
          if (key === Gdk.KEY_Escape) {
            this._cancelKeyboardGrab();
          } else if (key === Gdk.KEY_BackSpace) {
            this._lastAccelerator = '';
            this._cancelKeyboardGrab();
          } else if (
            Gtk.accelerator_valid(key, mods) ||
            key === Gdk.KEY_Tab ||
            key === Gdk.KEY_ISO_Left_Tab ||
            key === Gdk.KEY_KP_Tab
          ) {
            const accelerator = Gtk.accelerator_name(key, mods);
            this._lastAccelerator = accelerator;
            this._cancelKeyboardGrab();
          }

          return true;
        }

        return false;
      }
    );

    this._leaveId = this.manager.connectSignal(this.focusController, 'leave', false, () => {
      this._cancelKeyboardGrab();
    });
  }

  _grabKeyboard() {
    this.root.get_surface().inhibit_system_shortcuts(null);
    this._keyboardIsGrabbed = true;
    this._lastAccelerator = this._accelerator.get_accelerator();
    this._accelerator.set_accelerator('');
    // The disabled text that is shown when no shortcut is bound but the keyboard is grabbed
    this._accelerator.set_disabled_text(_('Listening For Shortcut...'));
  }

  _cancelKeyboardGrab() {
    this.root.get_surface().restore_system_shortcuts();
    this._keyboardIsGrabbed = false;
    this._accelerator.set_accelerator(this._lastAccelerator || '');
    // The disabled text that is shown when no shortcut is bound
    this._accelerator.set_disabled_text(_('Not Bound'));
  }

  _initFromSettings() {
    this.manager.bindDefaultSettings(this, ShortcutItemClass.bindings);
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.ShortcutLabel} */
    this._accelerator;
  }
}

var shortcutItem = GObject.registerClass(
  {
    GTypeName: 'FWShortcutItem',
    Template: Me.dir.get_child('ui/shortcutItem.ui').get_uri(),
    InternalChildren: [...Object.keys(ShortcutItemClass.bindings)]
  },
  ShortcutItemClass
);

/**
 * @typedef {Object} ShortcutPreferences
 * @property {string} accelerator
 */
