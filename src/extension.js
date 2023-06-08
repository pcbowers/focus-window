const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/extension/extension").FocusExtension} */
const Extension = Me.imports.lib.extension.extension.extension;

class FocusWindow {
  /** @type {{enable: () => void, disable: () => void}[]} */
  modules = [];

  constructor() {
    debug('Initializing Focus Window...');
    extensionUtils.initTranslations(Me.metadata.uuid);
  }

  enable() {
    debug('Enabling Focus Window...');

    const extension = new Extension();
    this.modules.push(extension);

    this.modules.forEach(module => module.enable());
  }

  disable() {
    debug('Disabling Focus Window...');
    this.modules.forEach(module => module.disable());
  }
}

function init() {
  return new FocusWindow();
}
