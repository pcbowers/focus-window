const { GObject, Gtk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Domain = imports.gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type {import('$lib/common/utils').Utils} */
const { debug } = Me.imports.lib.common.utils.utils;

/** @typedef {typeof AppNameClass} AppName */
class AppNameClass extends Gtk.Box {
  /**
   * @param {string} [icon]
   */
  constructor(icon = 'application-x-addon-symbolic') {
    super({});

    this.icon = icon;

    this._icon.set_from_icon_name(this.icon);
    // The default application name when creating a new application
    this._label.set_label(_('No App Selected'));
  }

  /**
   * @param {InstanceType<import('$lib/common/listItem').ListItem>} listItem
   */
  setup(listItem) {
    if (listItem.metadata && listItem.metadata.get_icon) {
      this._icon.set_from_gicon(listItem.metadata.get_icon());
    } else {
      this._icon.set_from_icon_name('application-x-addon-symbolic');
    }

    this._label.set_label(listItem.title);
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.Image} */
    this._icon = this._icon;

    /** @type {import('@girs/gtk-4.0').Gtk.Label} */
    this._label = this._label;
  }
}

var appName = GObject.registerClass(
  {
    GTypeName: 'AppNameButtonContent',
    Template: Me.dir.get_child('ui/appName.ui').get_uri(),
    InternalChildren: ['icon', 'label']
  },
  AppNameClass
);
