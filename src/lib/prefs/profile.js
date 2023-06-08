const { GObject, Adw } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/prefs/application').Application} */
const Application = Me.imports.lib.prefs.application.application;

/** @typedef {typeof ProfileClass} Profile */
/** @typedef {ProfileClass} ProfileInstance */
class ProfileClass extends Adw.PreferencesGroup {
  /**
   * @param {import('$types/adw-1').Adw.PreferencesGroup.ConstructorProperties} AdwPreferencesGroupProps
   * @param {(id: string) => void} deleteProfile
   * @param {(id: string) => void} duplicateProfile
   * @param {(id: string, increasePriority: boolean) => void} changeProfilePriority
   * @param {string} name
   */
  constructor(
    AdwPreferencesGroupProps = {},
    deleteProfile,
    duplicateProfile,
    changeProfilePriority,
    name
  ) {
    super(AdwPreferencesGroupProps);
    debug('Creating Profile...');

    /** @type {string} */
    this._id = Date.now().toString();

    /** @type {typeof deleteProfile} */
    this._deleteProfile = deleteProfile;

    /** @type {typeof duplicateProfile} */
    this._duplicateProfile = duplicateProfile;

    /** @type {typeof changeProfilePriority} */
    this._changeProfilePriority = changeProfilePriority;

    /** @type {import('$lib/prefs/application').ApplicationInstance[]} */
    this._applicationsList = [];

    /** @type {import('$types/gtk-4.0').Gtk.Entry} */
    this._profileName = this._profileName;

    /** @type {import('$types/adw-1').Adw.ExpanderRow}*/
    this._profile = this._profile;

    /** @type {import('$types/adw-1').Adw.ExpanderRow}*/
    this._applications = this._applications;

    this._profileName.set_text(name);
  }

  getId() {
    return this._id;
  }

  getName() {
    return this._profileName.get_text();
  }

  onProfile() {
    debug('TODO: implement onProfile');
  }

  onProfileName() {
    debug('TODO: implement onProfileName');
  }

  onDeleteProfile() {
    debug('Deleting Profile...');
    this._deleteProfile(this._id);
  }

  onDuplicateProfile() {
    debug('Duplicating Profile...');
    this._duplicateProfile(this._id);
  }

  onIncreasePriority() {
    debug('Increasing Priority...');
    this._changeProfilePriority(this._id, true);
  }

  onDecreasePriority() {
    debug('Decreasing Priority...');
    this._changeProfilePriority(this._id, false);
  }

  onAddApplication() {
    debug('Adding Application...');
    const newApplication = new Application(
      {},
      this._deleteApplication.bind(this),
      this._duplicateApplication.bind(this),
      this._changeApplicationPriority.bind(this)
    );
    this._applicationsList.push(newApplication);
    this._applications.add_row(newApplication);
    this._setSubtitle();

    this._applications.set_expanded(true);
  }

  _deleteApplication(id) {
    const applicationIndex = this._applicationsList.findIndex(
      application => application.getId() === id
    );
    const application = this._applicationsList[applicationIndex];
    this._applications.remove(application);
    this._applicationsList.splice(applicationIndex, 1);
    this._setSubtitle();
  }

  _duplicateApplication(id) {
    const applicationIndex = this._applicationsList.findIndex(
      application => application.getId() === id
    );

    // TODO: implement duplicate application from old application
    // const application = this.applications[applicationIndex];
    const newApplication = new Application(
      {},
      this._deleteApplication.bind(this),
      this._duplicateApplication.bind(this),
      this._changeApplicationPriority.bind(this)
    );

    this._applicationsList.forEach(application => this._applications.remove(application));
    this._applicationsList.splice(applicationIndex + 1, 0, newApplication);
    this._applicationsList.forEach(application => this._applications.add_row(application));
    this._setSubtitle();
  }

  _changeApplicationPriority(id, increasePriority) {
    const applicationIndex = this._applicationsList.findIndex(
      application => application.getId() === id
    );

    if (increasePriority && applicationIndex === 0) return;
    if (!increasePriority && applicationIndex === this._applicationsList.length - 1) return;

    const application = this._applicationsList[applicationIndex];
    const newApplicationIndex = increasePriority ? applicationIndex - 1 : applicationIndex + 1;
    const newApplication = this._applicationsList[newApplicationIndex];
    this._applicationsList[applicationIndex] = newApplication;
    this._applicationsList[newApplicationIndex] = application;

    this._applicationsList.forEach(application => this._applications.remove(application));
    this._applicationsList.forEach(application => this._applications.add_row(application));
  }

  _setSubtitle() {
    let subtitle = _('No Application Shortcuts');
    if (this._applicationsList.length > 0) {
      subtitle = ngettext(
        '%d Application Shortcut',
        '%d Application Shortcuts',
        this._applicationsList.length
      ).format(this._applicationsList.length);
    }
    this._profile.set_subtitle(subtitle);
    return subtitle;
  }
}

var profile = GObject.registerClass(
  {
    GTypeName: 'ProfileExpanderRow',
    Template: Me.dir.get_child('ui/profile.ui').get_uri(),
    InternalChildren: ['profileName', 'profile', 'applications']
  },
  ProfileClass
);
