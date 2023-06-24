const { GObject, Adw, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Domain = imports.gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @typedef {typeof ApplicationItemClass} ApplicationItem */
class ApplicationItemClass extends Adw.ActionRow {
  /** @type {Record<string, string>} */
  static bindings = {
    enabled: 'active'
  };

  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {import('@girs/adw-1').Adw.Leaflet} */
  _leaflet;

  /** @type {InstanceType<import('$lib/prefs/profile').Profile>} */
  _parent;

  /** @type {string} */
  _id;

  /**
   * @param {InstanceType<import('$lib/prefs/profile').Profile>} parent
   * @param {string} id
   */
  constructor(parent, id) {
    super({});

    this.manager = new Manager({ id, subpath: 'applications' });

    this._leaflet = parent._leaflet;
    this._parent = parent;
    this._id = id;

    this._initFromSettings();
  }

  getId() {
    return this._id;
  }

  /**
   * @param {import('@girs/gio-2.0').Gio.Settings} settings
   */
  copyFrom(settings) {
    settings.list_keys().forEach(key => {
      if (key === 'shortcuts') return;
      if (settings.get_default_value(key).unpack() === settings.get_value(key).unpack()) return;
      this.manager.getSettings().set_value(key, settings.get_value(key));
    });

    const newShortcuts = settings.get_strv('shortcuts').map(id => {
      const newId = createId();
      const oldManager = new Manager({ id, subpath: 'shortcuts' });
      const newManager = new Manager({ id: newId, subpath: 'shortcuts' });
      const oldSettings = oldManager.getSettings();
      const newSettings = newManager.getSettings();

      oldSettings.list_keys().forEach(key => {
        if (oldSettings.get_default_value(key).unpack() === oldSettings.get_value(key).unpack()) return;
        newSettings.set_value(key, oldSettings.get_value(key));
      });

      oldManager.cleanup();
      newManager.cleanup();

      return newId;
    });

    this.manager.getSettings().set_strv('shortcuts', newShortcuts);
  }

  deleteApplication() {
    this._parent.deleteApplication(this._id);
  }

  duplicateApplication() {
    this._parent.duplicateApplication(this._id, this.manager.getSettings());
  }

  increasePriority() {
    this._parent.changeApplicationPriority(this._id, true);
  }

  decreasePriority() {
    this._parent.changeApplicationPriority(this._id, false);
  }

  openPreferences() {
    this._parent.openApplicationPreferences(this._id);
  }

  cleanup(withSettings = false, subpaths = []) {
    this.manager.cleanup(withSettings, subpaths);
    this.manager = null;

    this._leaflet = null;
    this._parent = null;
    this._id = null;

    wrapCallback(() => this.run_dispose());
  }

  _initFromSettings() {
    this.manager.bindDefaultSettings(this, ApplicationItemClass.bindings);
    this.manager.connectSettings('changed::id', false, this._setTitleAndIcon.bind(this));
    this.manager.connectSettings('changed::shortcuts', false, this._setSubtitle.bind(this));
  }

  /**
   * @param {string} id
   */
  _setTitleAndIcon(id) {
    // The default application name when creating a new application
    const defaultTitle = _('No App Selected');
    const application = Gio.AppInfo.get_all().find(app => app.get_id() === id);

    if (application) {
      this._icon.set_from_gicon(application.get_icon());
      this.set_title(application.get_name());
    } else {
      this._icon.set_from_icon_name('application-x-addon-symbolic');
      this.set_title(defaultTitle);
    }
  }

  /**
   * @param {string[]} shortcuts
   */
  _setSubtitle(shortcuts) {
    const count = shortcuts.length;
    // A count of the number of shortcuts in the application
    const subtitle = ngettext('1 Shortcut', '%d Shortcuts', count).format(count);
    this.set_subtitle(subtitle);
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.Image} */
    this._icon;
  }
}

var applicationItem = GObject.registerClass(
  {
    GTypeName: 'FWApplicationItem',
    Template: Me.dir.get_child('ui/applicationItem.ui').get_uri(),
    InternalChildren: ['icon', ...Object.keys(ApplicationItemClass.bindings)]
  },
  ApplicationItemClass
);
