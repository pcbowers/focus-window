const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var Utils = class Utils {
  constructor() {}

  /**
   * A replacement for GJS's `log` function so that every statement is prefixed with the uuid
   * @param {string} message A string that should be logged to the console
   */
  debug(message) {
    log(Me.metadata.uuid + ": " + message);
  }
};
