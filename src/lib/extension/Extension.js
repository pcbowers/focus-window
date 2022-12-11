const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;
const { debug } = new Utils();

var Extension = class Extension {
  constructor() {
    debug("TODO: Extension");
  }

  destroy() {
    debug("TODO: Extension.destroy()");
  }
};
