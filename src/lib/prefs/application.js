const { GObject, Adw, Gio, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/** @type {import("$lib/common/utils").Debug} */
const debug = Me.imports.lib.common.utils.debug;

var application = GObject.registerClass(
  {
    GTypeName: 'ApplicationExpanderRow',
    Template: Me.dir.get_child('ui/application.ui').get_uri(),
    InternalChildren: ['applicationList', 'shortcutRow', 'shortcut']
  },
  class Application extends Adw.ExpanderRow {
    /**
     * @param {import("$types/Gjs/Adw-1").ExpanderRow_ConstructProps} AdwExpanderRowProps
     * @param {(id: string) => void} deleteApplication
     * @param {(id: string) => void} duplicateApplication
     * @param {(id: string, increasePriority: boolean) => void} changeApplicationPriority
     */
    constructor(
      AdwExpanderRowProps = {},
      deleteApplication,
      duplicateApplication,
      changeApplicationPriority
    ) {
      super(AdwExpanderRowProps);
      debug('Creating Application...');

      this.id = Date.now().toString();
      this.deleteApplication = deleteApplication;
      this.duplicateApplication = duplicateApplication;
      this.changeApplicationPriority = changeApplicationPriority;

      this.keyboardIsGrabbed = false;
      this.lastAccelerator = '';

      this._populateApplications();
      this._createShortcutListener();
    }

    getId() {
      return this.id;
    }

    onApplication() {
      debug('TODO: implement onApplication');
    }

    onDuplicateApplication() {
      debug('Duplicating Application...');
      this.duplicateApplication(this.id);
    }

    onDeleteApplication() {
      debug('Deleting Application...');
      this.deleteApplication(this.id);
    }

    onApplicationItem(element) {
      debug('TODO: implement onApplicationItem');
      let applicationName = 'No App Selected';
      if (element && element.get_model && element.get_selected) {
        applicationName = element.get_model().get_string(element.get_selected());
        applicationName ||= 'No App Selected';
      }

      this.set_title(applicationName);
      return applicationName;
    }

    onIncreasePriority() {
      debug('Increasing Priority...');
      this.changeApplicationPriority(this.id, true);
    }

    onDecreasePriority() {
      debug('Decreasing Priority...');
      this.changeApplicationPriority(this.id, false);
    }

    onShortcutRow() {
      debug('TODO: implement onShortcutRow');

      let shortcutName = this.lastAccelerator;
      if (this._shortcutRow && this._shortcut) {
        if (this.keyboardIsGrabbed) {
          this._cancelKeyboardGrab();
          shortcutName ||= 'Not Bound';
        } else {
          this._grabKeyboard();
          shortcutName ||= 'Listening For Shortcut...';
        }
      } else {
        shortcutName ||= 'Not Bound';
      }

      return this._htmlEntities(shortcutName);
    }

    onMinimize() {
      debug('TODO: implement onMinimize');
    }

    onLaunchApplication() {
      debug('TODO: implement onLaunchApplication');
    }

    onCommandLineArguments() {
      debug('TODO: implement onCommandLineArguments');
    }

    onFilterByTitle() {
      debug('TODO: implement onFilterByTitle');
    }

    onTitleToMatch() {
      debug('TODO: implement onTitleToMatch');
    }

    onFilterByWorkspace() {
      debug('TODO: implement onFilterByWorkspace');
    }

    onFilterToCurrentWorkspace() {
      debug('TODO: implement onFilterToCurrentWorkspace');
    }

    onWorkspaceToMatch() {
      debug('TODO: implement onWorkspaceToMatch');
    }

    onFilterByMonitor() {
      debug('TODO: implement onFilterByMonitor');
    }

    onFilterToCurrentMonitor() {
      debug('TODO: implement onFilterToCurrentMonitor');
    }

    onMonitorToMatch() {
      debug('TODO: implement onMonitorToMatch');
    }

    onMoveOnFocus() {
      debug('TODO: implement onMoveOnFocus');
    }

    onMoveToCurrentWorkspace() {
      debug('TODO: implement onMoveToCurrentWorkspace');
    }

    onMoveToCurrentMonitor() {
      debug('TODO: implement onMoveToCurrentMonitor');
    }

    onResizeOnFocus() {
      debug('TODO: implement onResizeOnFocus');
    }

    onMaximize() {
      debug('TODO: implement onMaximize');
    }

    onUsePixels() {
      debug('TODO: implement onUsePixels');
    }

    onApplicationX1() {
      debug('TODO: implement onApplicationX1');
    }

    onApplicationY1() {
      debug('TODO: implement onApplicationY1');
    }

    onApplicationX2() {
      debug('TODO: implement onApplicationX2');
    }

    onApplicationY2() {
      debug('TODO: implement onApplicationY2');
    }

    onUseProportions() {
      debug('TODO: implement onUseProportions');
    }

    onGridSize() {
      debug('TODO: implement onGridSize');
    }

    onApplicationColumnStart() {
      debug('TODO: implement onApplicationColumnStart');
    }

    onApplicationWidth() {
      debug('TODO: implement onApplicationWidth');
    }

    onApplicationRowStart() {
      debug('TODO: implement onApplicationRowStart');
    }

    onApplicationHeight() {
      debug('TODO: implement onApplicationHeight');
    }

    _populateApplications() {
      this.allApplications = Gio.AppInfo.get_all()
        .filter(a => a.should_show())
        .sort((a, b) =>
          a
            .get_name()
            .toLowerCase()
            .localeCompare(b.get_name().toLowerCase())
        )
        .map((a, index) => ({
          name: a.get_name(),
          id: a.get_id(),
          position: index + 1
        }));

      this.allApplications.forEach(a => this._applicationList.append(a.name));
    }

    _createShortcutListener() {
      // create controller to listen for shortcut input
      const keyController = new Gtk.EventControllerKey();
      keyController.connect('key-pressed', (c, key, keycode, state) => {
        if (this.keyboardIsGrabbed) {
          const mods = state & Gtk.accelerator_get_default_mod_mask();

          // Adapted from: https://github.com/Schneegans/Fly-Pie
          if (key === Gdk.KEY_Escape) {
            this._cancelKeyboardGrab();
          } else if (key === Gdk.KEY_BackSpace) {
            this.lastAccelerator = '';
            this._cancelKeyboardGrab();
          } else if (
            Gtk.accelerator_valid(key, mods) ||
            key === Gdk.KEY_Tab ||
            key === Gdk.KEY_ISO_Left_Tab ||
            key === Gdk.KEY_KP_Tab
          ) {
            const accelerator = Gtk.accelerator_name(key, mods);
            this.lastAccelerator = accelerator;
            this._cancelKeyboardGrab();
          }

          return true;
        }

        return false;
      });
      this._shortcutRow.add_controller(keyController);

      // create controller to listen for an unfocus event to stop listening
      const focusController = new Gtk.EventControllerFocus();
      focusController.connect('leave', () => {
        this._cancelKeyboardGrab();
      });
      this._shortcutRow.add_controller(focusController);
    }

    // ensures all key combinations are passed by the widget
    _grabKeyboard() {
      this._shortcut
        .get_root()
        .get_surface()
        .inhibit_system_shortcuts(null);
      this.keyboardIsGrabbed = true;
      this.lastAccelerator = this._shortcut.get_accelerator();
      this._shortcut.set_accelerator('');
      this._shortcut.set_disabled_text('Listening For Shortcut...');
      this.set_subtitle('Listening For Shortcut...');
    }

    // stops the widget from listening to shortcuts
    _cancelKeyboardGrab() {
      this._shortcut
        .get_root()
        .get_surface()
        .restore_system_shortcuts();
      this.keyboardIsGrabbed = false;
      this._shortcut.set_accelerator(this.lastAccelerator);
      this._shortcutRow.parent.unselect_all();
      this._shortcut.set_disabled_text('Not Bound');
      this.set_subtitle(this._htmlEntities(this.lastAccelerator || 'Not Bound'));
    }

    _htmlEntities(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }
);

/**
 * Declare all types to be exported from this file
 *
 * @typedef {typeof application} Application
 */
