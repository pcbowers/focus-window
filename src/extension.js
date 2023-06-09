const { Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/extension/extension').FocusWindowExtension} */
const Extension = Me.imports.lib.extension.extension.extension;

/**
 * @typedef {Object} SettingsLayout
 * @property {string} property
 * @property {string} endpoint
 * @property {SettingsLayout[]} [settings]
 */

function init() {
  extensionUtils.initTranslations(Me.metadata.uuid);
  return new Extension();
}
