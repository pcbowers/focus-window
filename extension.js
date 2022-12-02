"use strict";

const { Shell, Meta, Gio, GObject } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const SETTINGS_ID = "org.gnome.shell.extensions.focus-window";
const SETTINGS_KEY = "app-settings";
const SETTINGS_VARIANT = "aa{sv}";

const appSys = Shell.AppSystem.get_default();
const appWin = Shell.WindowTracker.get_default();

const KeyboardShortcuts = GObject.registerClass(
  {},
  class KeyboardShortcuts extends GObject.Object {
    constructor(params = {}) {
      super(params);
      this.shortcuts = {};

      this.displayConnection = global.display.connect(
        "accelerator-activated",
        (__, action) => {
          const grabber = this.shortcuts[action];
          if (grabber) grabber.callback();
        }
      );
    }

    reset() {
      for (let action in this.shortcuts) {
        this.unbind(action);
      }
    }

    destroy() {
      global.display.disconnect(this.displayConnection);

      for (let action in this.shortcuts) {
        this.unbind(action);
      }

      this.shortcuts = {};
      this.displayConnection = null;
    }

    bind(accelerator, callback) {
      const action = global.display.grab_accelerator(
        accelerator,
        Meta.KeyBindingFlags.NONE
      );

      if (action === Meta.KeyBindingAction.NONE) return;
      log("binding shortcut: " + accelerator);

      const name = Meta.external_binding_name_for_action(action);
      Main.wm.allowKeybinding(name, Shell.ActionMode.ALL);

      this.shortcuts[action] = { name, accelerator, callback };
    }

    unbind(action) {
      const grabber = this.shortcuts[action];

      if (grabber) {
        log("unbinding shortcut: " + grabber.accelerator);
        global.display.ungrab_accelerator(action);
        Main.wm.allowKeybinding(grabber.name, Shell.ActionMode.NONE);
        delete this.shortcuts[action];
      }
    }
  }
);

class Extension {
  constructor() {
    this.shortcuts = null;
    this.settingsListener = null;
    this.settings = null;
  }

  enable() {
    log(`enabling ${Me.metadata.name}`);

    this.shortcuts = new KeyboardShortcuts();

    this.settings = ExtensionUtils.getSettings(SETTINGS_ID);

    this.settingsListener = this.settings.connect(
      `changed::${SETTINGS_KEY}`,
      () => {
        this.setupShortcuts(
          this.settings.get_value(SETTINGS_KEY).recursiveUnpack()
        );
      }
    );

    this.setupShortcuts(
      this.settings.get_value(SETTINGS_KEY).recursiveUnpack()
    );
  }

  setupShortcuts(settings) {
    this.shortcuts.reset();

    settings.forEach((setting) => {
      if (setting.keyboardShortcut && setting.applicationToFocus) {
        this.shortcuts.bind(setting.keyboardShortcut, () => {
          log("setting triggered: " + JSON.stringify(setting));

          // get application
          const application = appSys.lookup_app(setting.applicationToFocus);
          if (!application) return false;

          // get application windows and filter appropriately
          const appWindows = application.get_windows().filter((window) => {
            if (!setting.titleToMatch) return true;
            if (setting.exactTitleMatch)
              return window.get_title() === setting.titleToMatch;

            return window.get_title().includes(setting.titleToMatch);
          });

          // get the currently focused window
          const focusedWindow = global.display.get_focus_window().get_id();

          // launch the application
          if (!appWindows.length && setting.launchApplication) {
            return application.open_new_window(-1);
          }

          // cycle through open windows if there are multiple
          if (appWindows.length > 1) {
            return Main.activateWindow(appWindows[appWindows.length - 1]);
          }

          // Minimize window if it is already focused and there is only 1 window
          if (
            appWindows.length === 1 &&
            focusedWindow === appWindows[0].get_id()
          ) {
            return appWindows[0].minimize();
          }

          // Draw focus to the window if it is not already focused
          if (appWindows.length === 1) {
            return Main.activateWindow(appWindows[0]);
          }

          return false;
        });
      }
    });
  }

  disable() {
    log(`disabling ${Me.metadata.name}`);

    this.shortcuts.destroy();
    this.settings.disconnect(this.settingsListener);

    this.settingsListener = null;
    this.settings = null;
    this.shortcuts = null;
  }
}

function init() {
  log(`initializing ${Me.metadata.name}`);
  return new Extension();
}
