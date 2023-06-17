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

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/** @type {import('$lib/prefs/application').Application} */
const Application = Me.imports.lib.prefs.application.application;

/**
 * @typedef {Object} ProfileSettingsProps
 * @property {'settings'} type
 * @property {string} id
 */

/**
 * @typedef {Object} ProfileNewProps
 * @property {'new'} type
 * @property {string} name
 */

/**
 * @typedef {Object} ProfileCopyProps
 * @property {'copy'} type
 * @property {import('@girs/gio-2.0').Gio.Settings} settings
 */

/**
 * @typedef {ProfileSettingsProps | ProfileNewProps | ProfileCopyProps} ProfileProps
 */

/**
 * @typedef {Object} ProfileSettings
 * @property {boolean} enabled
 * @property {string} name
 * @property {import('$lib/prefs/application').ApplicationSettings[]} applications
 */

/** @typedef {typeof ProfileClass} Profile */
/** @typedef {ProfileClass} ProfileInstance */
class ProfileClass extends Adw.PreferencesGroup {
  /** @type {string} */
  _id = createId();

  /** @type {import('$lib/prefs/application').ApplicationInstance[]} */
  _applicationsList = [];

  /**
   * @param {import('@girs/adw-1').Adw.PreferencesGroup.ConstructorProperties} AdwPreferencesGroupProps
   * @param {(id: string) => void} deleteProfile
   * @param {(id: string) => void} duplicateProfile
   * @param {(id: string, increasePriority: boolean) => void} changeProfilePriority
   * @param {ProfileSettingsProps | ProfileNewProps | ProfileCopyProps} profileProps
   */
  constructor(
    AdwPreferencesGroupProps = {},
    deleteProfile,
    duplicateProfile,
    changeProfilePriority,
    profileProps
  ) {
    debug('Creating Profile...');
    super(AdwPreferencesGroupProps);

    /** @type {typeof deleteProfile} */
    this._deleteProfile = deleteProfile;

    /** @type {typeof duplicateProfile} */
    this._duplicateProfile = duplicateProfile;

    /** @type {typeof changeProfilePriority} */
    this._changeProfilePriority = changeProfilePriority;

    /** @type {import('@girs/gtk-4.0').Gtk.Entry} */
    this._profile_name = this._profile_name;

    /** @type {import('@girs/adw-1').Adw.ExpanderRow}*/
    this._profile = this._profile;

    /** @type {import('@girs/adw-1').Adw.ExpanderRow}*/
    this._applications = this._applications;

    if (profileProps.type === 'settings') {
      this._id = profileProps.id;
    }

    /** @type {import('@girs/gio-2.0').Gio.Settings} */
    this.settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(
        'org.gnome.shell.extensions.focus-window.profiles',
        true
      ),
      path: `/org/gnome/shell/extensions/focus-window/profiles/${this._id}/`
    });

    this.settings.bind('enabled', this._profile, 'enable-expansion', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('name', this._profile_name, 'text', Gio.SettingsBindFlags.DEFAULT);

    if (profileProps.type === 'settings') {
      this.settings.get_strv('applications').forEach(applicationId => {
        const application = this._createApplication({ type: 'settings', id: applicationId });
        this._applicationsList.push(application);
        this._applications.add_row(application);
        this._setSubtitle();
      });
    } else if (profileProps.type === 'new') {
      this._profile_name.set_text(profileProps.name);
    } else if (profileProps.type === 'copy') {
      profileProps.settings.list_keys().forEach(key => {
        if (key === 'applications') return;
        this.settings.set_value(key, profileProps.settings.get_value(key));
      });
      // The prefix that is added to the name of the copied profile
      this._profile_name.set_text(this._profile_name.get_text() + ' ' + _('Copy'));

      profileProps.settings.get_strv('applications').forEach(applicationId => {
        const appSettings = new Gio.Settings({
          settings_schema: SETTINGS_SCHEMA.lookup(
            'org.gnome.shell.extensions.focus-window.applications',
            true
          ),
          path: `/org/gnome/shell/extensions/focus-window/applications/${applicationId}/`
        });
        const application = this._createApplication({
          type: 'copy',
          settings: appSettings,
          duplicateShortcuts: true
        });
        this._applicationsList.push(application);
        this._applications.add_row(application);
        this._setSubtitle();
        this._setApplications();
      });
    }
  }

  getId() {
    return this._id;
  }

  onDeleteProfile() {
    debug('Deleting Profile...');
    [...this._applicationsList].forEach(application => application.onDeleteApplication());
    this.settings.list_keys().forEach(key => this.settings.reset(key));
    this.settings.run_dispose();
    this._deleteProfile(this._id);
  }

  onDuplicateProfile() {
    this._duplicateProfile(this._id);
  }

  onIncreasePriority() {
    this._changeProfilePriority(this._id, true);
  }

  onDecreasePriority() {
    this._changeProfilePriority(this._id, false);
  }

  onAddApplication() {
    // The default application name when creating a new application
    const application = this._createApplication({ type: 'new', name: _('No App Selected') });
    this._applicationsList.push(application);
    this._applications.add_row(application);

    this._setSubtitle();
    this._applications.set_expanded(true);
    this._setApplications();
  }

  _deleteApplication(id) {
    const applicationIndex = this._applicationsList.findIndex(
      application => application.getId() === id
    );
    const application = this._applicationsList[applicationIndex];
    this._applications.remove(application);
    this._applicationsList.splice(applicationIndex, 1);
    this._setSubtitle();
    this._setApplications();
  }

  _duplicateApplication(id) {
    const applicationIndex = this._applicationsList.findIndex(
      application => application.getId() === id
    );

    // TODO: implement duplicate application from old application
    const application = this._applicationsList[applicationIndex];
    const newApplication = this._createApplication({
      type: 'copy',
      settings: application.settings
    });

    this._applicationsList.forEach(application => this._applications.remove(application));
    this._applicationsList.splice(applicationIndex + 1, 0, newApplication);
    this._applicationsList.forEach(application => this._applications.add_row(application));
    this._setSubtitle();
    this._setApplications();
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
    this._setApplications();
  }

  _setSubtitle() {
    // The default subtitle when no application shortcuts are present on the profile
    let subtitle = _('No Application Shortcuts');
    if (this._applicationsList.length > 0) {
      subtitle = ngettext(
        // The subtitle when there are application shortcuts present on the profile, prefixed with the number of application shortcuts
        '%d Application Shortcut',
        '%d Application Shortcuts',
        this._applicationsList.length
      ).format(this._applicationsList.length);
    }
    this._profile.set_subtitle(subtitle);
    return subtitle;
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationProps} applicationProps
   */
  _createApplication(applicationProps) {
    return new Application(
      {},
      this._deleteApplication.bind(this),
      this._duplicateApplication.bind(this),
      this._changeApplicationPriority.bind(this),
      applicationProps
    );
  }

  _setApplications() {
    this.settings.set_strv(
      'applications',
      this._applicationsList.map(application => application.getId())
    );
  }
}

var profile = GObject.registerClass(
  {
    GTypeName: 'ProfileExpanderRow',
    Template: Me.dir.get_child('ui/profile.ui').get_uri(),
    InternalChildren: ['profile', 'profile-name', 'applications']
  },
  ProfileClass
);
