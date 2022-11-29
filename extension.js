"use strict";

const { Shell, Meta, Gio } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const appSys = Shell.AppSystem.get_default();

class FocusWindow {
  constructor() {
    this._activeWindow = null;
  }

  enable() {
    let mode = Shell.ActionMode.ALL;
    let flag = Meta.KeyBindingFlags.NONE;

    const settings = ExtensionUtils.getSettings(
      "org.gnome.shell.extensions.focus-window"
    );

    Main.wm.addKeybinding("focus-shortcut", settings, flag, mode, () => {
      const appId = settings.get_string("application-id");
      const application = appSys.lookup_app(appId);
      if (!application) return false;

      application.activate_full(-1, global.get_current_time());
      return true;
    });
  }

  disable() {
    Main.wm.removeKeybinding("focus-shortcut");
  }
}

function init() {
  return new FocusWindow();
}
