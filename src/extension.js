/** @module extension */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/extension/extension").FocusExtension} */
const Extension = Me.imports.lib.extension.extension.extension;

class FocusWindow {
  _modules = [];

  constructor() {
    debug('Initializing Focus Window...');
    ExtensionUtils.initTranslations(Me.metadata.uuid);
  }

  enable() {
    debug('Enabling Focus Window...');

    const extension = new Extension();
    this._modules.push(extension);

    this._modules.forEach(module => module.enable());
  }

  disable() {
    debug('Disabling Focus Window...');
    this._modules.forEach(module => module.disable());
  }
}

function init() {
  return new FocusWindow();
}
