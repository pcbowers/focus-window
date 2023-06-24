const { GObject, Gtk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug } = Me.imports.lib.common.utils.utils;

/** @typedef {typeof IconClass} Icon */
class IconClass extends Gtk.Box {
  /**
   * @param {string} [icon]
   */
  constructor(icon = 'settings-app-symbolic') {
    super({});

    this.icon = icon;

    this._content.set_icon_name(this.icon);
  }

  /**
   * @param {InstanceType<import('$lib/common/listItem').ListItem>} listItem
   */
  setup(listItem) {
    this._content.set_icon_name(listItem.value);
  }

  _typeWidgets() {
    /** @type {import('@girs/adw-1').Adw.ButtonContent} */
    this._content;
  }
}

var icon = GObject.registerClass(
  {
    GTypeName: 'IconButtonContent',
    Template: Me.dir.get_child('ui/icon.ui').get_uri(),
    InternalChildren: ['content']
  },
  IconClass
);
