const { Shell, Gio, Meta } = imports.gi;
const { main } = imports.ui;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/extension/shortcut').Shortcut} */
const Shortcut = Me.imports.lib.extension.shortcut.shortcut;

/** @type {import('$lib/extension/settings').Settings} */
const Settings = Me.imports.lib.extension.settings.settings;

/** @type {import('$lib/extension/signal').Signal} */
const Signal = Me.imports.lib.extension.signal.signal;

const appSys = Shell.AppSystem.get_default();
const appWin = Shell.WindowTracker.get_default();

/** @typedef {typeof extension} FocusWindowExtension */
var extension = class FocusWindowExtension {
  /** @type {import('$lib/extension/shortcut').ShortcutInstance} */
  shortcutManager;

  /** @type {import('$lib/extension/settings').SettingsInstance} */
  settingsManager;

  /**@type {import('$lib/extension/signal').SignalInstance} */
  signalManager;

  constructor() {
    debug('Initializing Extension...');
  }

  enable() {
    debug('Enabling Extension...');

    this.shortcutManager = new Shortcut();
    this.settingsManager = new Settings({}, this.handleSettings.bind(this));
    this.signalManager = new Signal();
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/shell-12').Shell.App} shellApp
   */
  handleWindowCreated(application, shellApp) {
    const windowCreatedId = this.signalManager.connectSignal(
      global.display,
      'window-created',
      false,
      /** @type {import('@girs/meta-12').Meta.Display.WindowCreatedSignalCallback} */ (
        (_, window) => {
          const windowActor = /** @type {import('@girs/meta-12').Meta.WindowActor} */ (
            window.get_compositor_private()
          );

          if (!windowActor) return;

          this.signalManager.connectSignal(windowActor, 'first-frame', true, () => {
            const openedApp = appWin.get_window_app(window);

            if (!openedApp) return;
            if (openedApp.get_id() !== shellApp.get_id()) return;

            this.signalManager.disconnectSignal(windowCreatedId);
            this.handleSingleWindowFocus(application, window);
          });
        }
      )
    );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleAlwaysOnTop(application, window) {
    if (!application['always-on-top']) {
      if (window.is_above()) window.unmake_above();
    }

    if (application['always-on-top']) {
      if (!window.is_above()) window.make_above();
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/shell-12').Shell.App} shellApp
   */
  handleLaunch(application, shellApp) {
    const workspace = this.getWorkspace(application);
    const context = global.create_app_launch_context(0, workspace);
    this.handleWindowCreated(application, shellApp);

    if (!application['command-line-arguments']) {
      shellApp.open_new_window(workspace);
    } else {
      const newApplication = Gio.AppInfo.create_from_commandline(
        shellApp.get_app_info().get_executable() + ' ' + application['command-line-arguments'],
        null,
        Gio.AppInfoCreateFlags.NONE
      );
      newApplication.launch([], context);
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleSingleWindowFocus(application, window) {
    const workspace = this.getWorkspace(application, window);
    const monitor = this.getMonitor(application, window);

    this.handleResizeAnimations(window, application['disable-animations']);
    main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);

    this.handleResizeAnimations(window, application['disable-animations']);
    main.activateWindow(window);

    this.handleResizeWindow(application, window);
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @param {string} appId
   */
  handleSingleWindowUnfocus(application, window, appId) {
    if (application.minimize) {
      this.handleMinimizeAnimations(application['disable-animations']);
      window.minimize();
    } else {
      const windows = this.getAppWindows(
        application,
        appSys
          .get_running()
          .filter(app => app.get_id() !== appId)
          .flatMap(app => app.get_windows()),
        false
      );
      if (windows.length) {
        this.handleResizeAnimations(windows[0], application['disable-animations']);
        main.activateWindow(windows[0]);
      }
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window[]} windows
   * @param {number} focusedWindowId
   */
  handleMultiWindows(application, windows, focusedWindowId) {
    if (focusedWindowId === windows[0].get_id()) {
      const window = windows[windows.length - 1];
      const workspace = this.getWorkspace(application, window);
      const monitor = this.getMonitor(application, window);
      main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);
      main.activateWindow(window);
      this.handleResizeWindow(application, window);

      if (application.minimize) {
        windows
          .filter(appWindow => appWindow.get_id() !== window.get_id())
          .forEach(appWindow => {
            this.handleMinimizeAnimations(application['disable-animations']);
            appWindow.minimize();
          });
      }
    } else {
      const window = windows[0];
      const workspace = this.getWorkspace(application, window);
      const monitor = this.getMonitor(application, window);

      if (window.minimized) this.handleUnminimizeAnimations(application['disable-animations']);

      this.handleResizeAnimations(window, application['disable-animations']);
      main.moveWindowToMonitorAndWorkspace(window, monitor, workspace, true);

      this.handleResizeAnimations(window, application['disable-animations']);
      main.activateWindow(window);

      this.handleResizeWindow(application, window);
    }
  }

  /**
   *
   * @param {import('$lib/prefs/prefs').PrefsSettings} settings
   */
  handleSettings(settings) {
    debug('Registering...');
    this.shortcutManager.unbindAll();

    /** @type {import('$lib/prefs/profile').ProfileSettings[]} */
    const activeProfiles = settings.profiles.filter(profile => profile.enabled);

    /** @type {import('$lib/prefs/application').ApplicationSettings[]} */
    const activeApplications = activeProfiles.reduce((acc, profile) => {
      acc.push(
        ...profile.applications.filter(
          application =>
            application.enabled &&
            application.name &&
            application.shortcuts.some(shortcut => shortcut.accelerator)
        )
      );
      return acc;
    }, []);

    activeApplications.forEach(application => {
      application.shortcuts.forEach(shortcut => {
        debug(`Registering ${shortcut.accelerator}`);
        this.shortcutManager.bind(shortcut.accelerator, () => {
          debug(`Pressing ${shortcut.accelerator}`);
          this.handleShortcut(application);
        });
      });
    });
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   */
  handleShortcut(application) {
    try {
      const shellApp = this.getShellApp(application.name);
      const appWindows = this.getAppWindows(application, shellApp.get_windows());
      const focusedWindowId = global.display.get_focus_window()
        ? global.display.get_focus_window().get_id()
        : null;

      appWindows.forEach(window => this.handleAlwaysOnTop(application, window));

      if (!appWindows.length && application['launch-application']) {
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

    const windowActor = /** @type {import('@girs/meta-12').Meta.WindowActor} */ (
      window.get_compositor_private()
    );

    if (windowActor) windowActor.remove_all_transitions();
  }

  /**
   * @param {boolean} disableAnimations
   */
  handleUnminimizeAnimations(disableAnimations) {
    if (!disableAnimations) return;

    this.signalManager.connectSignal(
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
   * @param {boolean} disableAnimations
   */
  handleMinimizeAnimations(disableAnimations) {
    if (!disableAnimations) return;

    this.signalManager.connectSignal(
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
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeWindow(application, window) {
    debug('Resizing window...');

    try {
      if (!application['resize-on-focus']) return;
      if (application.maximize) {
        this.handleResizeAnimations(window, application['disable-animations']);
        window.can_maximize() && window.maximize(Meta.MaximizeFlags.BOTH);
      } else {
        if (application['use-pixels']) {
          this.handleResizeByPixels(application, window);
        } else if (application['use-proportions']) {
          this.handleResizeByProportions(application, window);
        }
      }
    } catch (error) {
      debug(error);
    }
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeByPixels(application, window) {
    if (window.get_maximized()) {
      this.handleResizeAnimations(window, application['disable-animations']);
      window.unmaximize(window.get_maximized());
    }

    this.handleResizeAnimations(window, application['disable-animations']);
    window.is_fullscreen() && window.unmake_fullscreen();

    this.handleResizeAnimations(window, application['disable-animations']);
    window.allows_resize() &&
      window.move_resize_frame(
        !application['restrict-resize'],
        application['top-left-x'],
        application['top-left-y'],
        application['bottom-right-x'] - application['top-left-x'],
        application['bottom-right-y'] - application['top-left-y']
      );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   */
  handleResizeByProportions(application, window) {
    if (window.get_maximized()) {
      this.handleResizeAnimations(window, application['disable-animations']);
      window.unmaximize(window.get_maximized());
    }

    this.handleResizeAnimations(window, application['disable-animations']);
    window.is_fullscreen() && window.unmake_fullscreen();

    const workArea = window.get_work_area_current_monitor();
    const columnWidth = workArea.width / application['grid-size'];
    const rowHeight = workArea.height / application['grid-size'];

    const x = columnWidth * (application['column-start'] - 1) + workArea.x;
    const y = rowHeight * (application['row-start'] - 1) + workArea.y;
    const width = columnWidth * application['width'];
    const height = rowHeight * application['height'];

    this.handleResizeAnimations(window, application['disable-animations']);
    window.allows_resize() &&
      window.move_resize_frame(
        !application['restrict-resize'],
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height)
      );
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @return {number}
   */
  getWorkspace(application, window = null) {
    if (!application['filter-by-workspace']) {
      if (application['move-on-focus'] && application['move-to-current-workspace']) {
        return global.display.get_workspace_manager().get_active_workspace().index();
      }

      return window ? window.get_workspace().index() : -1;
    }

    if (application['filter-to-current-workspace']) {
      return global.display.get_workspace_manager().get_active_workspace().index();
    }

    return application['workspace-to-match'];
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
   * @param {import('@girs/meta-12').Meta.Window} window
   * @return {number}
   */
  getMonitor(application, window = null) {
    if (!application['filter-by-monitor']) {
      if (application['move-on-focus'] && application['move-to-current-monitor']) {
        return global.display.get_current_monitor();
      }

      return window ? window.get_monitor() : -1;
    }

    if (application['filter-to-current-monitor']) {
      return global.display.get_current_monitor();
    }

    return application['monitor-to-match'];
  }

  /**
   * @param {string} name
   * @returns {import('@girs/shell-12').Shell.App}
   */
  getShellApp(name) {
    const appInfo = Gio.AppInfo.get_all().find(app => app.get_name() === name);
    const shellApp = appSys.lookup_app(appInfo ? appInfo.get_id() : name);

    if (!shellApp) {
      debug(`Could not find application ${name}`);
      return null;
    }

    return shellApp;
  }

  /**
   * @param {import('$lib/prefs/application').ApplicationSettings} application
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
            if (!application['filter-by-title']) return true;
            if (!window.title || typeof window.get_title() !== 'string') return false;
            return window.title.match(application['title-to-match']);
          })
          // Filter by Workspace
          .filter(window => {
            if (!application['filter-by-workspace']) return true;
            if (application['filter-to-current-workspace']) {
              return (
                window.get_workspace().index() ===
                global.display.get_workspace_manager().get_active_workspace().index()
              );
            }

            return window.get_workspace().index() === application['workspace-to-match'];
          })
          // Filter by Monitor
          .filter(window => {
            if (!application['filter-by-monitor']) return true;
            if (application['filter-to-current-monitor']) {
              return window.get_monitor() === global.display.get_current_monitor();
            }

            return window.get_monitor() === application['monitor-to-match'];
          })
      );
    } catch (error) {
      debug(error);
      return [];
    }
  }

  disable() {
    debug('Disabling Extension...');

    this.shortcutManager.destroy();
    this.signalManager.destroy();
    this.settingsManager.destroy();
  }
};
