// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

var prefs = class Prefs {
    constructor() {
        debug('TODO: Prefs');
    }
};

/**
 * Declare all types to be exported from this file
 *
 * @typedef {typeof prefs} Prefs
 */
