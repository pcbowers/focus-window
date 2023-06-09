const { Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/**
 * @typedef {Object} SettingsLayout
 * @property {string} property
 * @property {string} endpoint
 * @property {SettingsLayout[]} [settings]
 */

/** @typedef {typeof extension} FocusWindowExtension */
var extension = class FocusWindowExtension {
  /** @type {{enable: () => void, disable: () => void}[]} */
  modules = [];

  /** @type {import('$lib/prefs/prefs').PrefsSettings} */
  settings = undefined;

  constructor() {
    debug('Initializing Extension...');
  }

  enable() {
    debug('Enabling Extension...');
    this.settings = this._populateSettings([
      {
        property: 'profiles',
        endpoint: 'profile',
        settings: [
          {
            property: 'applications',
            endpoint: 'application',
            settings: [
              {
                property: 'shortcuts',
                endpoint: 'shortcut'
              }
            ]
          }
        ]
      }
    ]);

    debug(JSON.stringify(this.settings, null, 2));

    this.modules.forEach(module => module.enable());
  }

  disable() {
    debug('Disabling Extension...');
    this.modules.forEach(module => module.disable());
    this.settings = undefined;
  }

  /**
   * @param {SettingsLayout[]} [settingsLayout]
   * @param {string} [parentEndpoint]
   * @param {string} [id]
   * @returns {import('$lib/prefs/prefs').PrefsSettings}
   */
  _populateSettings(settingsLayout = [], parentEndpoint = '', id = '') {
    const schemaId = 'org.gnome.shell.extensions.focus-window';
    const idPrefix = parentEndpoint ? '.' : '';
    const schemaPath = '/org/gnome/shell/extensions/focus-window';
    const pathPrefix = parentEndpoint ? '/' : '';

    debug('schemaId: ' + schemaId + idPrefix + parentEndpoint);
    debug('schemaPath: ' + schemaPath + pathPrefix + parentEndpoint + '/' + id + (id ? '/' : ''));

    const rawSettings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(schemaId + idPrefix + parentEndpoint, true),
      path: schemaPath + pathPrefix + parentEndpoint + '/' + id + (id ? '/' : '')
    });

    const parsedSettings = rawSettings.list_keys().reduce((acc, key) => {
      acc[key] = rawSettings.get_value(key).recursiveUnpack();
      return acc;
    }, {});

    settingsLayout.forEach(setting => {
      parsedSettings[setting.property] = parsedSettings[setting.property].map(settingId => {
        return this._populateSettings(setting.settings, setting.endpoint, settingId);
      });
    });

    return /** @type {any} */ (parsedSettings);
  }
};
