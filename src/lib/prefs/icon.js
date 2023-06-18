const { GObject, Gtk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @typedef {typeof IconClass} Icon */
/** @typedef {IconClass} IconInstance */
class IconClass extends Gtk.Box {
  /**
   * @param {import('@girs/gtk-4.0').Gtk.Box.ConstructorProperties} GtkBoxProps
   */
  constructor(GtkBoxProps, icon = 'settings-app-symbolic') {
    super(GtkBoxProps);

    /** @type {import('@girs/adw-1').Adw.ButtonContent} */
    this._content = this._content;

    this.icon = icon;

    this._content.set_icon_name(this.icon);
  }

  /**
   * @param {import('$lib/prefs/listitem').ListItemInstance} listItem
   */
  setup(listItem) {
    this._content.set_icon_name(listItem.value);
  }
}

var icon = GObject.registerClass(
  {
    GTypeName: 'IconButtonContent',
    Template: Me.dir.get_child('ui/icon.ui').get_uri(),
    InternalChildren: ['content'],
    Properties: {
      icon: GObject.ParamSpec.string(
        'icon',
        'Icon',
        'The icon name',
        GObject.ParamFlags.READWRITE,
        null
      )
    }
  },
  IconClass
);
