const { GObject, Adw } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/prefs/profile').Profile} */
const Profile = Me.imports.lib.prefs.profile.profile;

/** @typedef {typeof PrefsClass} Prefs */
/** @typedef {PrefsClass} PrefsInstance */
class PrefsClass extends Adw.PreferencesPage {
  /**
   * @param {import('$types/adw-1').Adw.PreferencesPage.ConstructorProperties} AdwPreferencesPageProps
   */
  constructor(AdwPreferencesPageProps = {}) {
    super(AdwPreferencesPageProps);
    debug('Creating Preferences Page...');

    /** @type {import('$lib/prefs/profile').ProfileInstance[]} */
    this._profilesList = [];
  }

  onAddProfile() {
    debug('Adding Profile...');
    const newProfile = new Profile(
      {},
      this._deleteProfile.bind(this),
      this._duplicateProfile.bind(this),
      this._changeProfilePriority.bind(this),
      ngettext('Profile %d', 'Profile %d', this._profilesList.length + 1).format(
        this._profilesList.length + 1
      )
    );
    this._profilesList.push(newProfile);
    this.add(newProfile);
  }

  /**
   * @param {string} id
   */
  _deleteProfile(id) {
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);
    const profile = this._profilesList[profileIndex];
    this.remove(profile);
    this._profilesList.splice(profileIndex, 1);
  }

  /**
   * @param {string} id
   */
  _duplicateProfile(id) {
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);

    // TODO: implement duplicate profile from old profile
    const profile = this._profilesList[profileIndex];
    const newProfile = new Profile(
      {},
      this._deleteProfile.bind(this),
      this._duplicateProfile.bind(this),
      this._changeProfilePriority.bind(this),
      profile.getName() + ' ' + _('Copy')
    );

    this._profilesList.forEach(application => this.remove(application));
    this._profilesList.splice(profileIndex + 1, 0, newProfile);
    this._profilesList.forEach(application => this.add(application));
  }

  /**
   * @param {string} id
   * @param {boolean} increasePriority
   */
  _changeProfilePriority(id, increasePriority) {
    const profileIndex = this._profilesList.findIndex(profile => profile.getId() === id);

    if (increasePriority && profileIndex === 0) return;
    if (!increasePriority && profileIndex === this._profilesList.length - 1) return;

    const application = this._profilesList[profileIndex];
    const newProfileIndex = increasePriority ? profileIndex - 1 : profileIndex + 1;
    const newApplication = this._profilesList[newProfileIndex];
    this._profilesList[profileIndex] = newApplication;
    this._profilesList[newProfileIndex] = application;

    this._profilesList.forEach(application => this.remove(application));
    this._profilesList.forEach(application => this.add(application));
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
