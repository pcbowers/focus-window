const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;

var Extension = class Extension {
    constructor() {
        this.utils = new Utils();
        this.utils.debug('TODO: Extension');
        this.utils.debug(1);
    }

    destroy() {
        this.utils.debug('TODO: Extension.destroy()');
    }
};
