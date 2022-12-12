// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

var extension = class Extension {
    constructor() {
        debug('Initializing Extension...');
    }

    /**
     * Enables the extension
     */
    enable() {
        debug('TODO: Extension.enable()');
    }

    /**
     * Disables the extension
     */
    disable() {
        debug('TODO: Extension.disable()');
    }
};

/**
 * Declare all types to be exported from this file
 *
 * @typedef {typeof extension} Extension
 */
