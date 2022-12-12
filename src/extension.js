// @ts-ignore
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import("$lib/extension/extension").Extension} */
const Extension = Me.imports.lib.extension.extension.extension;

class FocusWindow {
    _modules = [];

    constructor() {
        debug('Initializing Focus Window...');
        ExtensionUtils.initTranslations();
    }

    /**
     * Enables extension
     */
    enable() {
        debug('Enabling Focus Window...');

        const extension = new Extension();
        this._modules.push(extension);

        this._modules.forEach(module => module.enable());
    }

    /**
     * Disables extension
     */
    disable() {
        debug('Disabling Focus Window...');
        this._modules.forEach(module => module.disable());
    }
}

/**
 * Initializes extension
 */
function init() {
    return new FocusWindow();
}
