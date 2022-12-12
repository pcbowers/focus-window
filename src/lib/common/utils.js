// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
 *
 * @param {any} message A string that should be logged to the console
 */
function debug(message) {
    log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message}`);
}

/**
 * Declare all types to be exported from this file
 *
 * @typedef {typeof debug} Debug
 */
