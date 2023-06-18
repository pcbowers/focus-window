const { GObject, Gtk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @typedef {typeof AppNameClass} AppName */
/** @typedef {AppNameClass} AppNameInstance */
class AppNameClass extends Gtk.Box {
  /**
   * @param {import('@girs/gtk-4.0').Gtk.Box.ConstructorProperties} GtkBoxProps
   */
  constructor(GtkBoxProps, icon = 'application-x-addon-symbolic') {
    super(GtkBoxProps);

    /** @type {import('@girs/gtk-4.0').Gtk.Image} */
    this._icon = this._icon;

    /** @type {import('@girs/gtk-4.0').Gtk.Label} */
    this._label = this._label;

    this.icon = icon;

    this._icon.set_from_icon_name(this.icon);
    // The default application name when creating a new application
    this._label.set_label(_('No App Selected'));
  }

  /**
   * @param {import('$lib/prefs/listitem').ListItemInstance} listItem
   */
  setup(listItem) {
    const application = Gio.AppInfo.get_all().find(app => app.get_name() === listItem.value);
    if (application) {
      this._icon.set_from_gicon(application.get_icon());
    } else {
      this._icon.set_from_icon_name('application-x-addon-symbolic');
    }

    this._label.set_label(listItem.title);
  }
}

var appname = GObject.registerClass(
  {
    GTypeName: 'AppNameButtonContent',
    Template: Me.dir.get_child('ui/appname.ui').get_uri(),
    InternalChildren: ['icon', 'label']
  },
  AppNameClass
);
