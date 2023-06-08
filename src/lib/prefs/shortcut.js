const { GObject, Adw, Gtk, Gdk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/** @typedef {typeof ShortcutClass} Shortcut */
/** @typedef {ShortcutClass} ShortcutInstance */
class ShortcutClass extends Adw.ActionRow {
  /**
   * @param {import('$types/adw-1').Adw.ActionRow.ConstructorProperties} AdwActionRowProps
   * @param {(id: string) => void} deleteShortcut
   * @param {() => void} setApplicationSubtitle
   * @param {string} name
   */
  constructor(AdwActionRowProps = {}, deleteShortcut, setApplicationSubtitle, name) {
    super(AdwActionRowProps);

    /** @type {string} */
    this._id = createId();

    /** @type {typeof deleteShortcut} */
    this.deleteShortcut = deleteShortcut;

    /** @type {typeof setApplicationSubtitle} */
    this.setApplicationSubtitle = setApplicationSubtitle;

    /** @type {import('$types/gtk-4.0').Gtk.ShortcutLabel} */
    this._shortcut = this._shortcut;

    /** @type {import('$types/gtk-4.0').Gtk.EventControllerKey} */
    this._keyController = new Gtk.EventControllerKey();
    this.add_controller(this._keyController);

    /** @type {import('$types/gtk-4.0').Gtk.EventControllerFocus} */
    this._focusController = new Gtk.EventControllerFocus();
    this.add_controller(this._focusController);

    /** @type {number} */
    this._keyPressedId;

    /** @type {number} */
    this._leaveId;

    this.set_title(name);

    this._createShortcutListener();
  }

  getId() {
    return this._id;
  }

  isBound() {
    return !!this._shortcut.get_accelerator();
  }

  onShortcutRow() {
    debug('TODO: implement onShortcutRow');

    if (this.keyboardIsGrabbed) {
      this._cancelKeyboardGrab();
    } else {
      this._grabKeyboard();
    }
  }

  onDeleteShortcut() {
    debug('TODO: implement onDeleteShortcut');
    this._keyController.disconnect(this._keyPressedId);
    this._focusController.disconnect(this._leaveId);
    this.deleteShortcut(this._id);
  }

  _createShortcutListener() {
    this._keyPressedId = this._keyController.connect('key-pressed', (c, key, keycode, state) => {
      if (this.keyboardIsGrabbed) {
        const mods = state & Gtk.accelerator_get_default_mod_mask();

        // Adapted from: https://github.com/Schneegans/Fly-Pie
        if (key === Gdk.KEY_Escape) {
          this._cancelKeyboardGrab();
        } else if (key === Gdk.KEY_BackSpace) {
          this.lastAccelerator = '';
          this._cancelKeyboardGrab();
        } else if (
          Gtk.accelerator_valid(key, mods) ||
          key === Gdk.KEY_Tab ||
          key === Gdk.KEY_ISO_Left_Tab ||
          key === Gdk.KEY_KP_Tab
        ) {
          const accelerator = Gtk.accelerator_name(key, mods);
          this.lastAccelerator = accelerator;
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
    this.keyboardIsGrabbed = true;
    this.lastAccelerator = this._shortcut.get_accelerator();
    this._shortcut.set_accelerator('');
    this._shortcut.set_disabled_text(_('Listening For Shortcut...'));
    this.setApplicationSubtitle();
  }

  _cancelKeyboardGrab() {
    this.root.get_surface().restore_system_shortcuts();
    this.keyboardIsGrabbed = false;
    this._shortcut.set_accelerator(this.lastAccelerator || '');
    this._shortcut.set_disabled_text(_('Not Bound'));
    this.setApplicationSubtitle();
  }
}

var shortcut = GObject.registerClass(
  {
    GTypeName: 'ShortcutActionRow',
    Template: Me.dir.get_child('ui/shortcut.ui').get_uri(),
    InternalChildren: ['shortcut']
  },
  ShortcutClass
);
