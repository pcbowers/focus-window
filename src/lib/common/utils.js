const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**@typedef {typeof debug} Debug */
/**
 * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
 * @param {any} message A string that should be logged to the console
 */
function debug(message) {
  log(`\n${Me.metadata.uuid}: [${new Date().toLocaleString()}] ${message}`);
}

/** @typedef {typeof htmlEntities} HtmlEntities */
/**
 * Escapes a string so that it can be used in HTML
 * @param {string} str A string that should be escaped
 * @returns {string} The escaped string
 */
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
