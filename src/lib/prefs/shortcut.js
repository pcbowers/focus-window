const { GObject, Adw, Gtk, Gdk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/**
 * @typedef {Object} ShortcutSettingsProps
 * @property {'settings'} type
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} ShortcutNewProps
 * @property {'new'} type
 * @property {string} name
 */

/**
 * @typedef {Object} ShortcutCopyProps
 * @property {'copy'} type
 * @property {string} name
 * @property {import('@girs/gio-2.0').Gio.Settings} settings
 */

/**
 * @typedef {ShortcutSettingsProps | ShortcutNewProps | ShortcutCopyProps} ShortcutProps
 */

/**
 * @typedef {Object} ShortcutSettings
 * @property {string} accelerator
 */

/** @typedef {typeof ShortcutClass} Shortcut */
/** @typedef {ShortcutClass} ShortcutInstance */
class ShortcutClass extends Adw.ActionRow {
  /** @type {string} */
  _id = createId();

  /** @type {boolean} */
  _keyboardIsGrabbed = false;

  /** @type {string | null} */
  _lastAccelerator = '';

  /** @type {number} */
  _keyPressedId;

  /** @type {number} */
  _leaveId;

  bindingProperties = {
    accelerator: 'accelerator'
  };

  /**
   * @param {import('@girs/adw-1').Adw.ActionRow.ConstructorProperties} AdwActionRowProps
   * @param {(id: string) => void} deleteShortcut
   * @param {() => void} setApplicationSubtitle
   * @param {ShortcutProps} shortcutProps
   */
  constructor(AdwActionRowProps = {}, deleteShortcut, setApplicationSubtitle, shortcutProps) {
    debug('Creating Shortcut...');
    super(AdwActionRowProps);

    /** @type {typeof deleteShortcut} */
    this._deleteShortcut = deleteShortcut;

    /** @type {typeof setApplicationSubtitle} */
    this.setApplicationSubtitle = setApplicationSubtitle;

    /** @type {import('@girs/gtk-4.0').Gtk.ShortcutLabel} */
    this._accelerator = this._accelerator;

    /** @type {import('@girs/gtk-4.0').Gtk.EventControllerKey} */
    this._keyController = new Gtk.EventControllerKey();
    this.add_controller(this._keyController);

    /** @type {import('@girs/gtk-4.0').Gtk.EventControllerFocus} */
    this._focusController = new Gtk.EventControllerFocus();
    this.add_controller(this._focusController);

    this._createShortcutListener();

    if (shortcutProps.type === 'settings') {
      this._id = shortcutProps.id;
    }

    /** @type {import('@girs/gio-2.0').Gio.Settings} */
    this.settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(
        'org.gnome.shell.extensions.focus-window.shortcuts',
        true
      ),
      path: `/org/gnome/shell/extensions/focus-window/shortcuts/${this._id}/`
    });

    Object.entries(this.bindingProperties).forEach(([key, property]) => {
      this.settings.bind(
        key,
        this[`_${key.replaceAll('-', '_')}`],
        property,
        Gio.SettingsBindFlags.DEFAULT
      );
    });

    if (shortcutProps.type === 'copy') {
      shortcutProps.settings.list_keys().forEach(key => {
        this.settings.set_value(key, shortcutProps.settings.get_value(key));
      });
    }

    this.set_title(shortcutProps.name);
  }

  getId() {
    return this._id;
  }

  isBound() {
    return !!this._accelerator.get_accelerator();
  }

  onAccelerator() {
    if (this._keyboardIsGrabbed) {
      this._cancelKeyboardGrab();
    } else {
      this._grabKeyboard();
    }
  }

  onDeleteShortcut() {
    debug('Deleting Shortcut...');
    this.settings.list_keys().forEach(key => this.settings.reset(key));
    this.settings.run_dispose();
    this._keyController.disconnect(this._keyPressedId);
    this._focusController.disconnect(this._leaveId);
    this._deleteShortcut(this._id);
  }

  _createShortcutListener() {
    this._keyPressedId = this._keyController.connect('key-pressed', (c, key, keycode, state) => {
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
    });

    this._leaveId = this._focusController.connect('leave', () => {
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
    this.setApplicationSubtitle();
  }

  _cancelKeyboardGrab() {
    this.root.get_surface().restore_system_shortcuts();
    this._keyboardIsGrabbed = false;
    this._accelerator.set_accelerator(this._lastAccelerator || '');
    // The disabled text that is shown when no shortcut is bound
    this._accelerator.set_disabled_text(_('Not Bound'));
    this.setApplicationSubtitle();
  }
}

var shortcut = GObject.registerClass(
  {
    GTypeName: 'ShortcutActionRow',
    Template: Me.dir.get_child('ui/shortcut.ui').get_uri(),
    InternalChildren: ['accelerator']
  },
  ShortcutClass
);
