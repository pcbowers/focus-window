const { GObject, Gtk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @type {import('$lib/prefs/profileItem').ProfileItem} */
const ProfileItem = Me.imports.lib.prefs.profileItem.profileItem;

/** @type {import('$lib/prefs/profile').Profile} */
const Profile = Me.imports.lib.prefs.profile.profile;

/** @typedef {typeof ProfilesClass} Profiles */
class ProfilesClass extends Gtk.Box {
  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {Map<string, InstanceType<import('$lib/prefs/profileItem').ProfileItem>>} */
  profileItems = new Map();

  /** @type {InstanceType<import('$lib/prefs/profile').Profile>} */
  profilePage;

  /**
   * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
   */
  constructor(window) {
    super({});

    this.manager = new Manager({});

    this._initFromSettings();
    this._setSortFunc();
    window.grab_focus();
  }

  addProfile(_, id = '') {
    const newId = id || createId();
    const profile = new ProfileItem(this, newId);

    this.profileItems.set(newId, profile);

    if (!id) {
      const profileIds = this.manager.getSettings().get_strv('profiles');
      profileIds.push(newId);
      this.manager.getSettings().set_strv('profiles', profileIds);
    }

    this._profiles.append(profile);
  }

  /**
   * @param {string} id
   * @param {import('@girs/gio-2.0').Gio.Settings} settings
   */
  duplicateProfile(id, settings) {
    const newId = createId();
    const profile = new ProfileItem(this, newId);
    profile.copyFrom(settings);

    this.profileItems.set(newId, profile);

    const profileIds = this.manager.getSettings().get_strv('profiles');
    const index = profileIds.findIndex(p => p === id);
    profileIds.splice(index + 1, 0, newId);
    this.manager.getSettings().set_strv('profiles', profileIds);

    this._profiles.append(profile);
  }

  /**
   * @param {string} id
   */
  deleteProfile(id) {
    const profileIds = this.manager.getSettings().get_strv('profiles');
    const index = profileIds.findIndex(p => p === id);
    profileIds.splice(index, 1);
    this.manager.getSettings().set_strv('profiles', profileIds);

    /** @type {InstanceType<import('$lib/prefs/profileItem').ProfileItem>} */
    const profile = this.profileItems.get(id);
    this._profiles.remove(profile);
    profile.cleanup(true, ['applications', 'shortcuts']);
    this.profileItems.delete(id);
  }

  /**
   * @param {string} id
   * @param {boolean} increase
   */
  changeProfilePriority(id, increase) {
    const profileIds = this.manager.getSettings().get_strv('profiles');
    const index = profileIds.findIndex(p => p === id);
    const newIndex = increase ? index - 1 : index + 1;

    if (newIndex < 0) return;
    if (newIndex > profileIds.length - 1) return;

    profileIds.splice(newIndex, 0, profileIds.splice(index, 1)[0]);
    this.manager.getSettings().set_strv('profiles', profileIds);

    this._profiles.invalidate_sort();
  }

  /**
   * @param {string} id
   */
  openProfilePreferences(id) {
    this.profilePage = new Profile(this, id);
    this._leaflet.append(this.profilePage);
    this._leaflet.set_visible_child(this.profilePage);
  }

  removePage() {
    this._leaflet.remove(this.profilePage);
    this.profilePage.cleanup();
    this.profilePage = null;
  }

  cleanup(withSettings = false, subpaths = []) {
    this.profileItems.forEach(profileItem => {
      wrapCallback(() => this._profiles.remove(profileItem));
      profileItem.cleanup();
    });

    this.manager.cleanup(withSettings, subpaths);
    this.manager = null;

    this.profileItems.clear();
    this.profileItems = null;

    if (this.profilePage) {
      this._leaflet.remove(this.profilePage);
      this.profilePage.cleanup();
    }
    this.profilePage = null;

    wrapCallback(() => this.run_dispose());
  }

  _setSortFunc() {
    this._profiles.set_sort_func((a, b) => {
      const profileIds = this.manager.getSettings().get_strv('profiles');
      return (
        // @ts-ignore
        profileIds.findIndex(p => p === a.getId()) - profileIds.findIndex(p => p === b.getId())
      );
    });
  }

  _initFromSettings() {
    this.manager.getSettings().get_strv('profiles').forEach(this.addProfile.bind(this, null));
    this.manager.connectSettings('changed::profiles', false, this._changeNoProfilesVisibility.bind(this));
  }

  /**
   * @param {string[]} profiles
   */
  _changeNoProfilesVisibility(profiles) {
    this._noProfiles.set_visible(profiles.length === 0);
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.ListBox} */
    this._profiles;

    /** @type {import('@girs/adw-1').Adw.ActionRow} */
    this._noProfiles;

    /** @type {import('@girs/adw-1').Adw.Leaflet} */
    this._leaflet;
  }
}

var profiles = GObject.registerClass(
  {
    GTypeName: 'FWProfiles',
    Template: Me.dir.get_child('ui/profiles.ui').get_uri(),
    InternalChildren: ['profiles', 'noProfiles', 'leaflet']
  },
  ProfilesClass
);

/**
 * @typedef {Object} ProfilesPreferences
 * @property {import('$lib/prefs/profile').ProfilePreferences[]} profiles
 */
