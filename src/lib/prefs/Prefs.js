const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {typeof import("@lib/common/utils")} */
const { debug } = Me.imports.lib.common.utils;

var Prefs = class Prefs {
    constructor() {
        debug('TODO: Prefs');
    }
};
