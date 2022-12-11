const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;
const { debug } = new Utils();

/** @type {typeof import("@lib/extension/Extension")} */
const { Extension } = Me.imports.lib.extension.Extension;

/** @type {Extension} */
let extension;

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  debug("Enabling Extension");
  extension = new Extension();
}

function disable() {
  debug("Disabling Extension");
  extension.destroy();
  extension = null;
}
