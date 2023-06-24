const { Shell, Gio, Meta } = imports.gi;
const { main } = imports.ui;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/extension/shortcut').Shortcut} */
const Shortcut = Me.imports.lib.extension.shortcut.shortcut;

/** @type {import('$lib/extension/settings').Settings} */
const Settings = Me.imports.lib.extension.settings.settings;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @typedef {typeof extension} FocusWindowExtension */
var extension = class FocusWindowExtension {
  static appSys = Shell.AppSystem.get_default();
  static appWin = Shell.WindowTracker.get_default();

  /** @type {InstanceType<import('$lib/extension/shortcut').Shortcut>} */
  shortcutManager;

  /** @type {InstanceType<import('$lib/extension/settings').Settings>} */
  settingsManager;

  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  constructor() {
    debug('Initializing Focus WIndow Extension...');
  }

  enable() {
    debug('Enabling Focus Window Extension...');

    this.shortcutManager = new Shortcut();
    this.settingsManager = new Settings({}, this.handleSettings.bind(this));
    this.manager = new Manager({ includeSettings: false });
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/shell-12').Shell.App} shellApp
   */
  handleWindowCreated(application, shellApp) {
    const windowCreatedId = this.manager.connectSignal(
      global.display,
      'window-created',
      false,
      /** @type {import('@girs/meta-12').Meta.Display.WindowCreatedSignalCallback} */ (
        (_, window) => {
          const windowActor = /** @type {import('@girs/meta-12').Meta.WindowActor} */ (window.get_compositor_private());

          if (!windowActor) return;

          this.manager.connectSignal(windowActor, 'first-frame', true, () => {
            const openedApp = FocusWindowExtension.appWin.get_window_app(window);

            if (!openedApp) return;
            if (openedApp.get_id() !== shellApp.get_id()) return;

            this.manager.disconnectSignal(windowCreatedId);
            this.handleAlwaysOnTop(application, window);
            this.handleSingleWindowFocus(application, window);
          });
        }
      )
    );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleAlwaysOnTop(application, window) {
    if (!application.alwaysOnTop) {
      if (window.is_above()) window.unmake_above();
    }

    if (application.alwaysOnTop) {
      if (!window.is_above()) window.make_above();
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/shell-12').Shell.App} shellApp
   */
  handleLaunch(application, shellApp) {
    const workspace = this.getWorkspace(application);
    const context = global.create_app_launch_context(0, workspace);
    this.handleWindowCreated(application, shellApp);

    if (!application.commandLineArguments) {
      shellApp.open_new_window(workspace);
    } else {
      const newApplication = Gio.AppInfo.create_from_commandline(
        shellApp.get_app_info().get_executable() + ' ' + application.commandLineArguments,
        null,
        Gio.AppInfoCreateFlags.NONE
      );
      newApplication.launch([], context);
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleSingleWindowFocus(application, window) {
    const workspace = this.getWorkspace(application, window);
    const monitor = this.getMonitor(application, window);

    if (window.minimized) {
      this.handleUnminimizeAnimations(application.disableAnimations);
    }

    this.handleResizeAnimations(window, application.disableAnimations);
    main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);

    this.handleResizeAnimations(window, application.disableAnimations);
    main.activateWindow(window);

    this.handleResizeWindow(application, window);
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @param {string} appId
   */
  handleSingleWindowUnfocus(application, window, appId) {
    if (application.minimize) {
      this.handleMinimizeAnimations(application.disableAnimations);
      window.minimize();
    } else {
      const windows = this.getAppWindows(
        application,
        FocusWindowExtension.appSys
          .get_running()
          .filter(app => app.get_id() !== appId)
          .flatMap(app => app.get_windows()),
        false
      );
      if (windows.length) {
        this.handleResizeAnimations(windows[0], application.disableAnimations);
        main.activateWindow(windows[0]);
      }
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window[]} windows
   * @param {number} focusedWindowId
   */
  handleMultiWindows(application, windows, focusedWindowId) {
    /** @type {import('@girs/meta-12').Meta.Window} */
    let window;

    if (focusedWindowId === windows[0].get_id()) {
      window = windows[windows.length - 1];
      const workspace = this.getWorkspace(application, window);
      const monitor = this.getMonitor(application, window);

      if (window.minimized) {
        this.handleUnminimizeAnimations(application.disableAnimations);
      }

      this.handleResizeAnimations(window, application.disableAnimations);
      main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);

      this.handleResizeAnimations(window, application.disableAnimations);
      main.activateWindow(window);

      this.handleResizeWindow(application, window);
    } else {
      window = windows[0];
      const workspace = this.getWorkspace(application, window);
      const monitor = this.getMonitor(application, window);

      if (window.minimized) {
        this.handleUnminimizeAnimations(application.disableAnimations);
      }

      this.handleResizeAnimations(window, application.disableAnimations);
      main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);

      this.handleResizeAnimations(window, application.disableAnimations);
      main.activateWindow(window);

      this.handleResizeWindow(application, window);
    }

    if (application.minimize) {
      windows
        .filter(appWindow => appWindow.get_id() !== window.get_id())
        .forEach(appWindow => {
          this.handleMinimizeAnimations(application.disableAnimations);
          appWindow.minimize();
        });
    }
  }

  /**
   * @param {import('prefs').Preferences} settings
   */
  handleSettings(settings) {
    this.shortcutManager.unbindAll();

    /** @type {import('$lib/prefs/profile').ProfilePreferences[]} */
    const activeProfiles = settings.profiles.filter(profile => profile.enabled);

    /** @type {import('$lib/prefs/application').ApplicationPreferences[]} */
    const activeApplications = activeProfiles.reduce((acc, profile) => {
      acc.push(
        ...profile.applications.filter(
          application =>
            application.enabled && application.id && application.shortcuts.some(shortcut => shortcut.accelerator)
        )
      );
      return acc;
    }, []);

    activeApplications.forEach(application => {
      application.shortcuts.forEach(shortcut => {
        debug(`Registering ${shortcut.accelerator}`);

        const shellApp = this.getShellApp(application.id);
        const appWindows = this.getAppWindows(application, shellApp.get_windows());
        appWindows.forEach(window => this.handleAlwaysOnTop(application, window));

        this.shortcutManager.bind(shortcut.accelerator, () => {
          debug(`Pressing ${shortcut.accelerator}`);
          this.handleShortcut(application);
        });
      });
    });
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   */
  handleShortcut(application) {
    try {
      const shellApp = this.getShellApp(application.id);
      const appWindows = this.getAppWindows(application, shellApp.get_windows());
      const focusedWindowId = global.display.get_focus_window() ? global.display.get_focus_window().get_id() : null;

      appWindows.forEach(window => this.handleAlwaysOnTop(application, window));

      if (!appWindows.length && application.launch) {
        this.handleLaunch(application, shellApp);
      } else if (appWindows.length > 1) {
        this.handleMultiWindows(application, appWindows, focusedWindowId);
      } else if (appWindows.length === 1 && focusedWindowId === appWindows[0].get_id()) {
        this.handleSingleWindowUnfocus(application, appWindows[0], shellApp.get_id());
      } else if (appWindows.length === 1) {
        this.handleSingleWindowFocus(application, appWindows[0]);
      } else {
        debug('No Entries Found');
      }
    } catch (error) {
      debug(error);
    }
  }

  /**
   * @param {import('@girs/meta-12').Meta.Window} window
   * @param {boolean} disableAnimations
   */
  handleResizeAnimations(window, disableAnimations) {
    if (!disableAnimations) return;

    const windowActor = /** @type {import('@girs/meta-12').Meta.WindowActor} */ (window.get_compositor_private());

    if (!windowActor) return;

    windowActor.remove_all_transitions();
  }

  /**
   * @param {boolean} disableAnimations
   */
  handleMinimizeAnimations(disableAnimations) {
    if (!disableAnimations) return;

    this.manager.connectSignal(
      global.window_manager,
      'minimize',
      true,
      /** @type {import('@girs/shell-12').Shell.WM.MinimizeSignalCallback} */ (
        (shellWindowManager, windowActor) => {
          windowActor.remove_all_transitions();
          shellWindowManager.completed_minimize(windowActor);
        }
      )
    );
  }

  /**
   * @param {boolean} disableAnimations
   */
  handleUnminimizeAnimations(disableAnimations) {
    if (!disableAnimations) return;

    this.manager.connectSignal(
      global.window_manager,
      'unminimize',
      true,
      /** @type {import('@girs/shell-12').Shell.WM.MinimizeSignalCallback} */ (
        (shellWindowManager, windowActor) => {
          windowActor.remove_all_transitions();
          shellWindowManager.completed_unminimize(windowActor);
        }
      )
    );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeWindow(application, window) {
    debug('Resizing window...');

    try {
      if (!application.resizeOnFocus) return;
      if (application.maximize) {
        this.handleResizeAnimations(window, application.disableAnimations);
        window.can_maximize() && window.maximize(Meta.MaximizeFlags.BOTH);
      } else {
        if (application.usePixels) {
          this.handleResizeByPixels(application, window);
        } else if (application.useProportions) {
          this.handleResizeByProportions(application, window);
        }
      }
    } catch (error) {
      debug(error);
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeByPixels(application, window) {
    if (window.get_maximized()) {
      this.handleResizeAnimations(window, application.disableAnimations);
      window.unmaximize(window.get_maximized());
    }

    this.handleResizeAnimations(window, application.disableAnimations);
    window.is_fullscreen() && window.unmake_fullscreen();

    this.handleResizeAnimations(window, application.disableAnimations);
    window.allows_resize() &&
      window.move_resize_frame(
        !application.restrictResize,
        application.topLeftX,
        application.topLeftY,
        application.bottomRightX - application.topLeftX,
        application.bottomRightY - application.topLeftY
      );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeByProportions(application, window) {
    if (window.get_maximized()) {
      this.handleResizeAnimations(window, application.disableAnimations);
      window.unmaximize(window.get_maximized());
    }

    this.handleResizeAnimations(window, application.disableAnimations);
    window.is_fullscreen() && window.unmake_fullscreen();

    const workArea = window.get_work_area_current_monitor();
    const columnWidth = workArea.width / application.gridSize;
    const rowHeight = workArea.height / application.gridSize;

    const x = columnWidth * (application.columnStart - 1) + workArea.x;
    const y = rowHeight * (application.rowStart - 1) + workArea.y;
    const width = columnWidth * application.width;
    const height = rowHeight * application.height;

    this.handleResizeAnimations(window, application.disableAnimations);
    window.allows_resize() &&
      window.move_resize_frame(
        !application.restrictResize,
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height)
      );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @return {number}
   */
  getWorkspace(application, window = null) {
    if (!application.filterByWorkspace) {
      if (application.moveOnFocus && application.moveToCurrentWorkspace) {
        return global.display.get_workspace_manager().get_active_workspace().index();
      }

      return window ? window.get_workspace().index() : -1;
    }

    if (application.filterToCurrentWorkspace) {
      return global.display.get_workspace_manager().get_active_workspace().index();
    }

    return application.workspaceToMatch;
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @return {number}
   */
  getMonitor(application, window = null) {
    if (!application.filterByMonitor) {
      if (application.moveOnFocus && application.moveToCurrentMonitor) {
        return global.display.get_current_monitor();
      }

      return window ? window.get_monitor() : -1;
    }

    if (application.filterToCurrentMonitor) {
      return global.display.get_current_monitor();
    }

    return application.monitorToMatch;
  }

  /**
   * @param {string} id
   * @returns {import('@girs/shell-12').Shell.App}
   */
  getShellApp(id) {
    const shellApp = FocusWindowExtension.appSys.lookup_app(id);

    if (!shellApp) {
      debug(`Could not find application ${id}`);
      return null;
    }

    return shellApp;
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationPreferences} application
   * @param {import('@girs/meta-12').Meta.Window[]} windows
   * @param {boolean} [filterByTitle]
   * @returns {import('@girs/meta-12').Meta.Window[]}
   */
  getAppWindows(application, windows, filterByTitle = true) {
    try {
      return (
        windows
          // Filter by Title
          .filter(window => {
            if (!filterByTitle) return true;
            if (!application.filterByTitle) return true;
            if (!window.title || typeof window.get_title() !== 'string') return false;
            return window.title.match(application.titleToMatch);
          })
          // Filter by Workspace
          .filter(window => {
            if (!application.filterByWorkspace) return true;
            if (application.filterToCurrentWorkspace) {
              return (
                window.get_workspace().index() === global.display.get_workspace_manager().get_active_workspace().index()
              );
            }

            return window.get_workspace().index() === application.workspaceToMatch;
          })
          // Filter by Monitor
          .filter(window => {
            if (!application.filterByMonitor) return true;
            if (application.filterToCurrentMonitor) {
              return window.get_monitor() === global.display.get_current_monitor();
            }

            return window.get_monitor() === application.monitorToMatch;
          })
      );
    } catch (error) {
      debug(error);
      return [];
    }
  }

  disable() {
    debug('Disabling Focus Window Extension...');

    this.shortcutManager.destroy();
    this.manager.cleanup();
    this.settingsManager.destroy();

    this.shortcutManager = null;
    this.manager = null;
    this.settingsManager = null;
  }
};
