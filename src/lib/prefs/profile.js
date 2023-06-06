const { GObject, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/prefs/application").Application} */
const Application = Me.imports.lib.prefs.application.application;

/** @typedef {typeof ProfileClass} Profile */
/** @typedef {ProfileClass} ProfileInstance */
class ProfileClass extends Adw.PreferencesGroup {
  /**
   * @param {import("$types/adw-1").Adw.PreferencesGroup.ConstructorProperties} AdwPreferencesGroupProps
   * @param {string} defaultNameSuffix
   * @param {(id: string) => void} deleteProfile
   * @param {(id: string) => void} duplicateProfile
   * @param {(id: string, increasePriority: boolean) => void} changeProfilePriority
   */
  constructor(
    AdwPreferencesGroupProps = {},
    defaultNameSuffix,
    deleteProfile,
    duplicateProfile,
    changeProfilePriority
  ) {
    super(AdwPreferencesGroupProps);
    debug('Creating Profile...');

    this.applications = [];
    this.id = Date.now().toString();
    this.deleteProfile = deleteProfile;
    this.duplicateProfile = duplicateProfile;
    this.changeProfilePriority = changeProfilePriority;

    /** @type {import("$types/gtk-4.0").Gtk.Entry} */
    this._profileName = this._profileName;

    /** @type {import("$types/adw-1").Adw.ExpanderRow}*/
    this._profile = this._profile;

    this._profileName.set_text(`Profile ${defaultNameSuffix}`);
  }

  getId() {
    return this.id;
  }

  onProfile() {
    debug('TODO: implement onProfile');
  }

  onProfileName() {
    debug('TODO: implement onProfileName');
  }

  onDeleteProfile() {
    debug('Deleting Profile...');
    this.deleteProfile(this.id);
  }

  onDuplicateProfile() {
    debug('Duplicating Profile...');
    this.duplicateProfile(this.id);
  }

  onIncreasePriority() {
    debug('Increasing Priority...');
    this.changeProfilePriority(this.id, true);
  }

  onDecreasePriority() {
    debug('Decreasing Priority...');
    this.changeProfilePriority(this.id, false);
  }

  onAddApplication() {
    debug('Adding Application...');
    const newApplication = new Application(
      {},
      this._deleteApplication.bind(this),
      this._duplicateApplication.bind(this),
      this._changeApplicationPriority.bind(this)
    );
    this.applications.push(newApplication);
    this._profile.add_row(newApplication);
    this._setSubtitle();
  }

  _deleteApplication(id) {
    const applicationIndex = this.applications.findIndex(application => application.getId() === id);
    const application = this.applications[applicationIndex];
    this._profile.remove(application);
    this.applications.splice(applicationIndex, 1);
    this._setSubtitle();
  }

  _duplicateApplication(id) {
    const applicationIndex = this.applications.findIndex(application => application.getId() === id);

    // TODO: implement duplicate application from old application
    // const application = this.applications[applicationIndex];
    const newApplication = new Application(
      {},
      this._deleteApplication.bind(this),
      this._duplicateApplication.bind(this),
      this._changeApplicationPriority.bind(this)
    );

    this.applications.forEach(application => this._profile.remove(application));
    this.applications.splice(applicationIndex + 1, 0, newApplication);
    this.applications.forEach(application => this._profile.add_row(application));
    this._setSubtitle();
  }

  _changeApplicationPriority(id, increasePriority) {
    const applicationIndex = this.applications.findIndex(application => application.getId() === id);

    if (increasePriority && applicationIndex === 0) return;
    if (!increasePriority && applicationIndex === this.applications.length - 1) return;

    const application = this.applications[applicationIndex];
    const newApplicationIndex = increasePriority ? applicationIndex - 1 : applicationIndex + 1;
    const newApplication = this.applications[newApplicationIndex];
    this.applications[applicationIndex] = newApplication;
    this.applications[newApplicationIndex] = application;

    this.applications.forEach(application => this._profile.remove(application));
    this.applications.forEach(application => this._profile.add_row(application));
  }

  _setSubtitle() {
    const subtitle = `${this.applications.length || 'No'} Application Shortcut${
      this.applications.length === 1 ? '' : 's'
    }`;
    this._profile.set_subtitle(subtitle);
    return subtitle;
  }
}

var profile = GObject.registerClass(
  {
    GTypeName: 'ProfileExpanderRow',
    Template: Me.dir.get_child('ui/profile.ui').get_uri(),
    InternalChildren: ['profileName', 'profile']
  },
  ProfileClass
);
