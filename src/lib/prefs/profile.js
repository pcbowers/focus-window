const { GObject, Gtk, Gio, Gdk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @type {import('$lib/common/listFactory').ListFactory} */
const ListFactory = Me.imports.lib.common.listFactory.listFactory;

/** @type {import('$lib/prefs/icon').Icon} */
const Icon = Me.imports.lib.prefs.icon.icon;

/** @type {import('$lib/prefs/applicationItem').ApplicationItem} */
const ApplicationItem = Me.imports.lib.prefs.applicationItem.applicationItem;

/** @type {import('$lib/prefs/application').Application} */
const Application = Me.imports.lib.prefs.application.application;

/** @typedef {typeof ProfileClass} Profile */
class ProfileClass extends Gtk.Box {
  /** @type {Record<string, string>} */
  static bindings = {
    enabled: 'active',
    name: 'text'
  };

  /** @type {Map<string, InstanceType<import('$lib/prefs/applicationItem').ApplicationItem>>} */
  applicationItems = new Map();

  /** @type {InstanceType<import('$lib/prefs/application').Application>} */
  applicationPage;

  /** @type {InstanceType<import('$lib/common/listFactory').ListFactory>} */
  listFactory;

  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {import('@girs/adw-1').Adw.Leaflet} */
  _leaflet;

  /** @type {InstanceType<import('$lib/prefs/profiles').Profiles>} */
  _parent;

  /** @type {string} */
  _id;

  /**
   * @param {InstanceType<import('$lib/prefs/profiles').Profiles>} parent
   * @param {string} id
   */
  constructor(parent, id) {
    super({});

    this.manager = new Manager({ id, subpath: 'profiles' });

    this._leaflet = parent._leaflet;
    this._parent = parent;
    this._id = id;

    this._initFromSettings();
    this._setSortFunc();
    this._populateIcons();
  }

  getId() {
    return this._id;
  }

  setProfileIcon() {
    const icon = this.listFactory.getItem(this._icon.get_selected()).value;
    this._iconHeader.set_from_icon_name(icon);
  }

  addApplication(_, id = '') {
    const newId = id || createId();
    const application = new ApplicationItem(this, newId);

    this.applicationItems.set(newId, application);

    if (!id) {
      const applicationIds = this.manager.getSettings().get_strv('applications');
      applicationIds.push(newId);
      this.manager.getSettings().set_strv('applications', applicationIds);
    }

    this._applications.append(application);
  }

  /**
   * @param {string} id
   */
  deleteApplication(id) {
    const applicationIds = this.manager.getSettings().get_strv('applications');
    const index = applicationIds.findIndex(a => a === id);
    applicationIds.splice(index, 1);
    this.manager.getSettings().set_strv('applications', applicationIds);

    /** @type {InstanceType<import('$lib/prefs/applicationItem').ApplicationItem>} */
    const application = this.applicationItems.get(id);
    this._applications.remove(application);
    application.cleanup(true, ['shortcuts']);
    this.applicationItems.delete(id);
  }

  /**
   * @param {string} id
   * @param {import('@girs/gio-2.0').Gio.Settings} settings
   */
  duplicateApplication(id, settings) {
    const newId = createId();
    const application = new ApplicationItem(this, newId);
    application.copyFrom(settings);

    this.applicationItems.set(newId, application);

    const applicationIds = this.manager.getSettings().get_strv('applications');
    const index = applicationIds.findIndex(a => a === id);
    applicationIds.splice(index + 1, 0, newId);
    this.manager.getSettings().set_strv('applications', applicationIds);

    this._applications.append(application);
  }

  deleteProfile() {
    this.goBack(null, true);
  }

  /**
   * @param {string} id
   * @param {boolean} increase
   */
  changeApplicationPriority(id, increase) {
    const applicationIds = this.manager.getSettings().get_strv('applications');
    const index = applicationIds.findIndex(a => a === id);
    const newIndex = increase ? index - 1 : index + 1;

    if (newIndex < 0) return;
    if (newIndex > applicationIds.length - 1) return;

    applicationIds.splice(newIndex, 0, applicationIds.splice(index, 1)[0]);
    this.manager.getSettings().set_strv('applications', applicationIds);

    this._applications.invalidate_sort();
  }

  openApplicationPreferences(id) {
    this.applicationPage = new Application(this, id);
    this._leaflet.append(this.applicationPage);
    this._leaflet.set_visible_child(this.applicationPage);
  }

  removePage() {
    /** @type {InstanceType<import('$lib/prefs/application').Application>} */
    this._leaflet.remove(this.applicationPage);
    this.applicationPage.cleanup();
    this.applicationPage = null;
  }

  goBack(_, deleteProfile = false) {
    if (deleteProfile) this._parent.deleteProfile(this._id);

    const signalId = this.manager.connectSignal(
      this._leaflet,
      'notify::child-transition-running',
      false,
      (/** @type {import('@girs/adw-1').Adw.Leaflet} */ leaflet) => {
        const transitionRunning = leaflet.child_transition_running;
        if (!transitionRunning) {
          this.manager.disconnectSignal(signalId);
          this._parent.removePage();
        }
      }
    );

    this._leaflet.set_visible_child_name('mainPage');
  }

  cleanup(withSettings = false, subpaths = []) {
    this.applicationItems.forEach(applicationItem => {
      wrapCallback(() => this._applications.remove(applicationItem));
      applicationItem.cleanup();
    });

    this.manager.cleanup(withSettings, subpaths);
    this.manager = null;

    this.listFactory.cleanup();
    this.listFactory = null;

    this.applicationItems.clear();
    this.applicationItems = null;

    if (this.applicationPage) {
      this._leaflet.remove(this.applicationPage);
      this.applicationPage.cleanup();
    }
    this.applicationPage = null;

    this._leaflet = null;
    this._parent = null;
    this._id = null;

    wrapCallback(() => this.run_dispose());
  }

  _initFromSettings() {
    this.manager.bindDefaultSettings(this, ProfileClass.bindings);

    this.manager.getSettings().get_strv('applications').forEach(this.addApplication.bind(this, null));

    this.manager.connectSettings('changed::applications', false, this._changeNoApplicationsVisibility.bind(this));

    this.manager.bindSettings('icon', this._iconHeader, 'icon-name', Gio.SettingsBindFlags.DEFAULT);
  }

  /**
   * @param {string[]} applications
   */
  _changeNoApplicationsVisibility(applications) {
    this._noApplications.set_visible(applications.length === 0);
  }

  _setSortFunc() {
    this._applications.set_sort_func((a, b) => {
      const applicationIds = this.manager.getSettings().get_strv('applications');
      return (
        // @ts-ignore
        applicationIds.findIndex(p => p === a.getId()) -
        // @ts-ignore
        applicationIds.findIndex(p => p === b.getId())
      );
    });
  }

  _populateIcons() {
    const originalIcon = this.manager.getSettings().get_string('icon');
    const icons = Gtk.IconTheme.get_for_display(Gdk.Display.get_default())
      .get_icon_names()
      .sort()
      .map(icon => ({ value: icon, title: icon }));

    this.listFactory = new ListFactory(Icon, icons);
    this._icon.set_factory(this.listFactory);
    this._icon.set_model(this.listFactory.getModel());
    this._icon.set_expression(this.listFactory.getExpression());
    this._icon.set_selected(this.listFactory.getPosition(originalIcon));
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.DropDown} */
    this._icon;

    /** @type {import('@girs/gtk-4.0').Gtk.Image} */
    this._iconHeader;

    /** @type {import('@girs/gtk-4.0').Gtk.ListBox} */
    this._applications;

    /** @type {import('@girs/adw-1').Adw.ActionRow} */
    this._noApplications;
  }
}

var profile = GObject.registerClass(
  {
    GTypeName: 'FWProfile',
    Template: Me.dir.get_child('ui/profile.ui').get_uri(),
    InternalChildren: ['icon', 'iconHeader', 'applications', 'noApplications', ...Object.keys(ProfileClass.bindings)]
  },
  ProfileClass
);

/**
 * @typedef {Object} ProfilePreferences
 * @property {import('$lib/prefs/application').ApplicationPreferences[]} applications
 * @property {boolean} enabled
 * @property {string} name
 * @property {string} icon
 */
