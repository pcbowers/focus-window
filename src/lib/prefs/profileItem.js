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

/** @typedef {typeof ProfileItemClass} ProfileItem */
class ProfileItemClass extends Adw.ActionRow {
  /** @type {Record<string, string>} */
  static bindings = {
    enabled: 'active',
    icon: 'icon-name'
  };

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
  }

  getId() {
    return this._id;
  }

  /**
   * @param {import('@girs/gio-2.0').Gio.Settings} settings
   */
  copyFrom(settings) {
    settings.list_keys().forEach(key => {
      if (key === 'applications') return;
      if (settings.get_default_value(key).unpack() === settings.get_value(key).unpack()) return;
      this.manager.getSettings().set_value(key, settings.get_value(key));
    });

    const newApplications = settings.get_strv('applications').map(id => {
      const newIdA = createId();
      const oldManagerA = new Manager({ id, subpath: 'applications' });
      const newManagerA = new Manager({ id: newIdA, subpath: 'applications' });
      const oldSettingsA = oldManagerA.getSettings();
      const newSettingsA = newManagerA.getSettings();
      oldSettingsA.list_keys().forEach(key => {
        if (key === 'shortcuts') return;
        if (oldSettingsA.get_default_value(key).unpack() === oldSettingsA.get_value(key).unpack()) return;
        newSettingsA.set_value(key, oldSettingsA.get_value(key));
      });

      const newShortcuts = oldSettingsA.get_strv('shortcuts').map(id => {
        const newIdS = createId();
        const oldManagerS = new Manager({ id, subpath: 'shortcuts' });
        const newManagerS = new Manager({ id: newIdS, subpath: 'shortcuts' });
        const oldSettingsS = oldManagerS.getSettings();
        const newSettingsS = newManagerS.getSettings();

        oldSettingsS.list_keys().forEach(key => {
          if (oldSettingsS.get_default_value(key).unpack() === oldSettingsS.get_value(key).unpack()) return;
          newSettingsS.set_value(key, oldSettingsS.get_value(key));
        });

        oldManagerS.cleanup();
        newManagerS.cleanup();

        return newIdS;
      });

      newSettingsA.set_strv('shortcuts', newShortcuts);

      oldManagerA.cleanup();
      newManagerA.cleanup();

      return newIdA;
    });

    this.manager.getSettings().set_strv('applications', newApplications);
  }

  deleteProfile() {
    this._parent.deleteProfile(this._id);
  }

  duplicateProfile() {
    this._parent.duplicateProfile(this._id, this.manager.getSettings());
  }

  increasePriority() {
    this._parent.changeProfilePriority(this._id, true);
  }

  decreasePriority() {
    this._parent.changeProfilePriority(this._id, false);
  }

  openPreferences() {
    this._parent.openProfilePreferences(this._id);
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
    this.manager.bindDefaultSettings(this, ProfileItemClass.bindings);
    this.manager.bindSettings('name', this, 'title', Gio.SettingsBindFlags.DEFAULT);
    this.manager.connectSettings('changed::applications', false, this._setSubtitle.bind(this));
  }

  /**
   * @param {string[]} applications
   */
  _setSubtitle(applications) {
    const count = applications.length;
    // A count of the number of applications in the profile
    const subtitle = ngettext('1 Application', '%d Applications', count).format(count);
    this.set_subtitle(subtitle);
  }

  _typeWidgets() {}
}

var profileItem = GObject.registerClass(
  {
    GTypeName: 'FWProfileItem',
    Template: Me.dir.get_child('ui/profileItem.ui').get_uri(),
    InternalChildren: [...Object.keys(ProfileItemClass.bindings)]
  },
  ProfileItemClass
);
