"use strict";

const { Shell, Meta, Gio } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const appSys = Shell.AppSystem.get_default();
const appWin = Shell.WindowTracker.get_default();

class FocusWindow {
  constructor() {
    this._lastUnselectedApp = null;
    this._lastUnselectedWindow = null;
  }

  enable() {
    let mode = Shell.ActionMode.ALL;
    let flag = Meta.KeyBindingFlags.NONE;

    const settings = ExtensionUtils.getSettings(
      "org.gnome.shell.extensions.focus-window"
    );

    Main.wm.addKeybinding("focus-shortcut", settings, flag, mode, () => {
      // get the application that should be activated
      const appId = settings.get_string("application-id");

      // ensure the app exists
      const application = appSys.lookup_app(appId);

      // exit if it doesn't
      if (!application) return false;

      // get the currently focused app
      const currentlyFocused = appWin.get_app_from_pid(
        global.display.get_focus_window().get_pid()
      );

      // if there is another app that is focused but it is not our app, save it
      if (currentlyFocused && currentlyFocused.get_id() !== appId) {
        this._lastUnselectedApp = currentlyFocused;
        this._lastUnselectedWindow = global.display.get_focus_window();
      }

      // get any open applications
      const appWindows = application.get_windows();

      // if there are no open applications, create a new one
      if (!appWindows.length) {
        application.activate();
        // if there is one application and it's already selected, go back to the unselected app
      } else if (
        appWindows.length === 1 &&
        global.display.get_focus_window().get_id() === appWindows[0].get_id()
      ) {
        this._lastUnselectedApp.activate_window(
          this._lastUnselectedWindow,
          global.get_current_time()
        );
        // if there are multiple applications, cycle through them
      } else if (appWindows.length === 1) {
        application.activate();
      } else if (appWindows.length > 1) {
        application.activate_window(
          appWindows[appWindows.length - 1],
          global.get_current_time()
        );
        // this should never happen, but if it does, simply activate the application
      } else {
        application.activate();
      }

      return true;
    });
  }

  disable() {
    Main.wm.removeKeybinding("focus-shortcut");
    this._windowTracker = null;
    this._lastUnselectedApp = null;
    this._lastUnselectedWindow = null;
  }
}

function init() {
  return new FocusWindow();
}
