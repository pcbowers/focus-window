const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;
/** @type {typeof import("@lib/extension/Extension")} */
const { Extension } = Me.imports.lib.extension.Extension;

/** @type {Extension} */
let extension;

/**
 * Called when the extension loads. Should only include translation initiation.
 */
function init() {
    ExtensionUtils.initTranslations();
}

/**
 *  Called when the extension is enabled.
 */
function enable() {
    const { debug } = new Utils();

    debug('Enabling Extension');
    extension = new Extension();
}

/**
 * Called when the extension is disabled. Make sure to destroy all widgets here.
 */
function disable() {
    const { debug } = new Utils();

    debug('Disabling Extension');
    extension.destroy();
    extension = null;
}
