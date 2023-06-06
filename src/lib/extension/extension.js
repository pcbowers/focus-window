const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @typedef {typeof extension} FocusExtension */
var extension = class FocusExtension {
  constructor() {
    debug('Initializing Extension...');
  }

  enable() {
    debug('TODO: Extension.enable()');
  }

  disable() {
    debug('TODO: Extension.disable()');
  }
};
