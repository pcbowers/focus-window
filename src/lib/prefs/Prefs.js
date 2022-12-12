const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { Utils } = Me.imports.lib.common.utils;

var Prefs = class Prefs {
    constructor() {
        this.utils = new Utils();
        this.utils.debug('TODO: Prefs');
    }
};
