/** @module prefs */

const { GObject, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/prefs/profile").Profile} */
const Profile = Me.imports.lib.prefs.profile.profile;

/** @typedef {typeof PrefsClass} Prefs */
/** @typedef {PrefsClass} PrefsInstance */
class PrefsClass extends Adw.PreferencesPage {
  /**
   * @param {import("$types/adw-1").Adw.PreferencesPage.ConstructorProperties} AdwPreferencesPageProps
   */
  constructor(AdwPreferencesPageProps = {}) {
    super(AdwPreferencesPageProps);
    debug('Creating Preferences Page...');

    /** @type {import('$lib/prefs/profile').ProfileInstance[]} */
    this.profiles = [];
  }

  onAddProfile() {
    debug('Adding Profile...');
    const newProfile = new Profile(
      {},
      `${this.profiles.length + 1}`,
      this._deleteProfile.bind(this),
      this._duplicateProfile.bind(this),
      this._changeProfilePriority.bind(this)
    );
    this.profiles.push(newProfile);
    this.add(newProfile);
  }

  /**
   * @param {string} id
   */
  _deleteProfile(id) {
    const profileIndex = this.profiles.findIndex(profile => profile.getId() === id);
    const profile = this.profiles[profileIndex];
    this.remove(profile);
    this.profiles.splice(profileIndex, 1);
  }

  /**
   * @param {string} id
   */
  _duplicateProfile(id) {
    const profileIndex = this.profiles.findIndex(profile => profile.getId() === id);

    // TODO: implement duplicate profile from old profile
    // const profile = this.profiles[profileIndex];
    const newProfile = new Profile(
      {},
      'Copy',
      this._deleteProfile.bind(this),
      this._duplicateProfile.bind(this),
      this._changeProfilePriority.bind(this)
    );

    this.profiles.forEach(application => this.remove(application));
    this.profiles.splice(profileIndex + 1, 0, newProfile);
    this.profiles.forEach(application => this.add(application));
  }

  /**
   * @param {string} id
   * @param {boolean} increasePriority
   */
  _changeProfilePriority(id, increasePriority) {
    const profileIndex = this.profiles.findIndex(profile => profile.getId() === id);

    if (increasePriority && profileIndex === 0) return;
    if (!increasePriority && profileIndex === this.profiles.length - 1) return;

    const application = this.profiles[profileIndex];
    const newProfileIndex = increasePriority ? profileIndex - 1 : profileIndex + 1;
    const newApplication = this.profiles[newProfileIndex];
    this.profiles[profileIndex] = newApplication;
    this.profiles[newProfileIndex] = application;

    this.profiles.forEach(application => this.remove(application));
    this.profiles.forEach(application => this.add(application));
  }
}

var prefs = GObject.registerClass(
  {
    GTypeName: 'FocusWindowPreferencesPage',
    Template: Me.dir.get_child('ui/prefs.ui').get_uri(),
    InternalChildren: ['focusWindowPreferencesGroup']
  },
  PrefsClass
);
