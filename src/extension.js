const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

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
