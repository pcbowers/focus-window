const { GObject, Adw, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/prefs/profile').Profile} */
const Profile = Me.imports.lib.prefs.profile.profile;

/**
 * @typedef {Object} PrefsSettings
 * @property {import('$lib/prefs/profile').ProfileSettings[]} profiles
 */

/** @typedef {typeof PrefsClass} Prefs */
/** @typedef {PrefsClass} PrefsInstance */
class PrefsClass extends Adw.PreferencesPage {
  /**
   * @param {import('@girs/adw-1').Adw.PreferencesPage.ConstructorProperties} AdwPreferencesPageProps
   * @param {import('@girs/adw-1').Adw.PreferencesWindow} window
   */
  constructor(AdwPreferencesPageProps, window) {
    debug('Creating Preferences Page...');
    super(AdwPreferencesPageProps);

    /** @type {import('$lib/prefs/profile').ProfileInstance[]} */
    this._profilesList = [];

    /** @type {import('@girs/adw-1').Adw.PreferencesWindow} */
    this.window = window;

    this.settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup('org.gnome.shell.extensions.focus-window', true),
      path: '/org/gnome/shell/extensions/focus-window/'
    });
  }

  init() {
    this.settings.get_strv('profiles').forEach(profileId => {
      const profile = this._createProfile({ type: 'settings', id: profileId });
      this._profilesList.push(profile);
      this.window.add(profile);
    });

    this.window.set_visible_page(this);
  }

  onAddProfile() {
    const profile = this._createProfile({
      type: 'new',
      // The default name of a new profile, suffixed with the number of profiles
      name: ngettext('Profile %d', 'Profile %d', this._profilesList.length + 1).format(
        this._profilesList.length + 1
      )
    });

    this._profilesList.push(profile);
    this.window.add(profile);
    this.window.set_visible_page(profile);
    this._setProfiles();
  }

  /**
   * @param {string} id
   */
  _deleteProfile(id) {
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);
    const profile = this._profilesList[profileIndex];

    this.window.remove(profile);
    this._profilesList.splice(profileIndex, 1);
    this.window.set_visible_page(this);
    this._setProfiles();
  }

  /**
   * @param {string} id
   */
  _duplicateProfile(id) {
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);
    const profile = this._profilesList[profileIndex];
    const newProfile = this._createProfile({
      type: 'copy',
      settings: profile.settings
    });

    this._profilesList.forEach(profile => this.window.remove(profile));
    this._profilesList.splice(profileIndex + 1, 0, newProfile);
    this._profilesList.forEach(profile => this.window.add(profile));
    this.window.set_visible_page(newProfile);
    this._setProfiles();
  }

  /**
   * @param {string} id
   * @param {boolean} increasePriority
   */
  _changeProfilePriority(id, increasePriority) {
    const profile = this._profilesList.find(profile => profile.getId() === id);
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);

    if (increasePriority && profileIndex === 0) return;
    if (!increasePriority && profileIndex === this._profilesList.length - 1) return;

    const application = this._profilesList[profileIndex];
    const newProfileIndex = increasePriority ? profileIndex - 1 : profileIndex + 1;
    const newApplication = this._profilesList[newProfileIndex];
    this._profilesList[profileIndex] = newApplication;
    this._profilesList[newProfileIndex] = application;

    this._profilesList.forEach(profile => this.window.remove(profile));
    this._profilesList.forEach(profile => this.window.add(profile));
    this.window.set_visible_page(profile);
    this._setProfiles();
  }

  /**
   * @param {import('$lib/prefs/profile').ProfileProps} profileProps
   */
  _createProfile(profileProps) {
    return new Profile(
      {},
      this._deleteProfile.bind(this),
      this._duplicateProfile.bind(this),
      this._changeProfilePriority.bind(this),
      profileProps
    );
  }

  _setProfiles() {
    this.settings.set_strv(
      'profiles',
      this._profilesList.map(profile => profile.getId())
    );
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
