const { GObject, GLib, Gio, Adw, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const SETTINGS_ID = "org.gnome.shell.extensions.focus-window";
const SETTINGS_KEY = "app-settings";
const SETTINGS_VARIANT = "aa{sv}";

// Helper Functions

// creates a simple unique ID based on date
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// converts to GVariant
function convertToVariant(arr) {
  return arr.map((obj) =>
    Object.keys(obj).reduce((acc, key) => {
      if (typeof obj[key] === "string")
        acc[key] = new GLib.Variant("s", obj[key]);
      if (typeof obj[key] === "boolean")
        acc[key] = new GLib.Variant("b", obj[key]);
      if (typeof obj[key] === "number")
        acc[key] = new GLib.Variant("u", obj[key]);
      return acc;
    }, {})
  );
}

function generateSettings(settings) {
  // gets all the settings
  const getAllSettings = () =>
    settings.get_value(SETTINGS_KEY).recursiveUnpack();

  // sets all the settings
  const setAllSettings = (data) => {
    settings.set_value(SETTINGS_KEY, new GLib.Variant(SETTINGS_VARIANT, data));
    settings.apply();
  };

  // gets a specific setting based on its id
  const getSettings = (id) => () => getAllSettings().find((s) => s.id === id);

  // sets a setting based on its id
  const setSettings = (id) => (data) => {
    const oldSettings = getAllSettings();
    const curSettings = getSettings(id)();

    let newSettings;

    // if it already exists, replace it
    if (curSettings !== undefined && data) {
      newSettings = oldSettings.map((item) => (item.id === id ? data : item));
    }

    // if it already exists but is empty, remove it
    if (curSettings !== undefined && !data) {
      newSettings = oldSettings.filter((item) => item.id !== id);
    }

    // if it doesn't exist, add it
    if (!curSettings && data) {
      newSettings = [...oldSettings, data];
    }

    // if it doesn't exist and is empty, use the previous settings
    if (!curSettings && !data) {
      newSettings = oldSettings;
    }

    // should never run but just in case, set it to something
    if (newSettings === undefined) newSettings = oldSettings;

    // if it is empty, reset the settings
    if (newSettings.length === 0) return settings.reset(SETTINGS_KEY);

    // convert to appropriate variants prior to applying new settings
    return setAllSettings(convertToVariant(newSettings));
  };

  return {
    getAllSettings,
    setAllSettings,
    getSettings,
    setSettings,
  };
}

// Begin Preference Creation

function init() {}

const FocusWidget = GObject.registerClass(
  {
    GTypeName: "FocusWidget",
    Template: Me.dir.get_child("prefs.ui").get_uri(),
    InternalChildren: [
      "application_row",
      "application_to_focus",
      "application_list",
      "title_to_match",
      "exact_title_match",
      "launch_application",
      "command_line_arguments",
      "keyboard_shortcut_row",
      "keyboard_shortcut",
    ],
  },
  class FocusWidget extends Adw.PreferencesGroup {
    constructor(
      adwPreferences = {},
      setSettings = () => {},
      onDelete = () => {},
      id = createId(),
      settings = {
        id,
        applicationToFocus: "",
        titleToMatch: "",
        exactTitleMatch: false,
        launchApplication: true,
        commandLineArguments: "",
        keyboardShortcut: "",
      },
      setOnNew = true
    ) {
      super(adwPreferences);

      this.setSettings = setSettings;
      this.onDelete = onDelete;
      this.settings = settings;

      // remap all widgets
      this.applicationRow = this._application_row;
      this.applicationList = this._application_list;
      this.applicationToFocus = this._application_to_focus;
      this.titleToMatch = this._title_to_match;
      this.exactTitleMatch = this._exact_title_match;
      this.launchApplication = this._launch_application;
      this.commandLineArguments = this._command_line_arguments;
      this.keyboardShortcutRow = this._keyboard_shortcut_row;
      this.keyboardShortcut = this._keyboard_shortcut;

      // used for shortcuts
      this.keyboardIsGrabbed = false;
      this.lastAccelerator = "";

      if (setOnNew) setSettings(this.settings);

      this.populateApplications();
      this.addDeleteButton();
      this.createShortcutListener();

      // set all values based on the widget settings
      this.applicationRow.set_title(
        this.getAppNameFromId(this.settings.applicationToFocus)
      );
      this.applicationRow.set_subtitle(
        this.htmlEntities(this.settings.keyboardShortcut || "Not Bound")
      );
      this.applicationToFocus.set_selected(
        this.getAppPositionFromId(this.settings.applicationToFocus)
      );
      this.titleToMatch.set_text(this.settings.titleToMatch);
      this.exactTitleMatch.set_active(this.settings.exactTitleMatch);
      this.launchApplication.set_active(this.settings.launchApplication);
      this.commandLineArguments.set_text(this.settings.commandLineArguments);
      this.keyboardShortcut.set_accelerator(this.settings.keyboardShortcut);
    }

    populateApplications() {
      // get all possible applications to choose from
      this.allApplications = Gio.AppInfo.get_all()
        .filter((a) => a.should_show())
        .sort((a, b) => a.get_name().localeCompare(b.get_name()))
        .map((a, index) => ({
          name: a.get_name(),
          id: a.get_id(),
          position: index + 1,
        }));

      // make them choosable
      this.allApplications.forEach((a) => this.applicationList.append(a.name));
    }

    addDeleteButton() {
      const button = new Gtk.Button({
        has_frame: false,
        valign: Gtk.Align.CENTER,
      });
      const buttonContent = new Adw.ButtonContent({
        "icon-name": "app-remove-symbolic",
        label: "",
      });
      buttonContent.add_css_class("error");
      button.set_child(buttonContent);
      this.applicationRow.add_action(button);

      button.connect("clicked", () => this.onApplicationDelete());
      /*
<property name="action">
          <object class="GtkButton">
            <signal name="clicked" handler="onApplicationDelete" swapped="no"/>
            <property name="child">
              <object class="AdwButtonContent">
                <property name="icon-name">app-remove-symbolic</property>
                <property name="label">Delete Shortcut</property>
              </object>
            </property>
            <style>
              <class name="flat"/>
            </style>
          </object>
        </property>
      */
    }

    // get the position of the app in the list based on its ID
    getAppPositionFromId(id) {
      const search = this.allApplications.find((a) => a.id === id);
      if (search && search.position) return search.position;
      return 0;
    }

    // get the name of the app in the list based on its ID
    getAppNameFromId(id) {
      const search = this.allApplications.find((a) => a.id === id);
      if (search && search.name) return search.name;
      return "Application Not Selected";
    }

    // get the app ID based on its position in the list
    getAppIdFromPosition(position) {
      const search = this.allApplications.find((a) => a.position === position);
      if (search && search.id) return search.id;
      return "";
    }

    createShortcutListener() {
      // create controller to listen for shortcut input
      const keyController = new Gtk.EventControllerKey();
      keyController.connect("key-pressed", (c, key, keycode, state) => {
        if (this.keyboardIsGrabbed) {
          const mods = state & Gtk.accelerator_get_default_mod_mask();

          // Adapted from: https://github.com/Schneegans/Fly-Pie
          if (key === Gdk.KEY_Escape) {
            this.cancelKeyboardGrab();
          } else if (key === Gdk.KEY_BackSpace) {
            this.lastAccelerator = "";
            this.onKeyboardShortcutSelect("");
            this.cancelKeyboardGrab();
          } else if (
            Gtk.accelerator_valid(key, mods) ||
            key === Gdk.KEY_Tab ||
            key === Gdk.KEY_ISO_Left_Tab ||
            key === Gdk.KEY_KP_Tab
          ) {
            const accelerator = Gtk.accelerator_name(key, mods);
            this.onKeyboardShortcutSelect(accelerator);
            this.lastAccelerator = accelerator;
            this.cancelKeyboardGrab();
          }

          return true;
        }

        return false;
      });
      this.keyboardShortcutRow.add_controller(keyController);

      // create controller to listen for an unfocus event to stop listening
      const focusController = new Gtk.EventControllerFocus();
      focusController.connect("leave", () => {
        this.cancelKeyboardGrab();
      });
      this.keyboardShortcutRow.add_controller(focusController);
    }

    // ensures all key combinations are passed by the widget
    grabKeyboard() {
      this.keyboardShortcut
        .get_root()
        .get_surface()
        .inhibit_system_shortcuts(null);
      this.keyboardIsGrabbed = true;
      this.lastAccelerator = this.keyboardShortcut.get_accelerator();
      this.keyboardShortcut.set_accelerator("");
      this.keyboardShortcut.set_disabled_text("Listening For Shortcut...");
    }

    // stops the widget from listening to shortcuts
    cancelKeyboardGrab() {
      this.keyboardShortcut.get_root().get_surface().restore_system_shortcuts();
      this.keyboardIsGrabbed = false;
      this.keyboardShortcut.set_accelerator(this.lastAccelerator);
      this.keyboardShortcutRow.parent.unselect_all();
      this.keyboardShortcut.set_disabled_text("Not Bound");
    }

    // begins listen for keyboard shortcut
    // bound by signal in UI
    onKeyboardShortcutClicked() {
      if (this.keyboardIsGrabbed) {
        this.cancelKeyboardGrab();
      } else {
        this.grabKeyboard();
      }
    }

    // saves keyboard shortcut
    onKeyboardShortcutSelect(accelerator) {
      this.settings.keyboardShortcut = accelerator;
      this.saveSettings();
    }

    // saves selected application
    // bound by signal in UI
    onApplicationSelected(row) {
      const position = row.get_selected();
      this.settings.applicationToFocus = this.getAppIdFromPosition(position);
      this.saveSettings();
    }

    // saves written title
    // bound by signal in UI
    onTitleChanged(entry) {
      const text = entry.get_text();
      this.settings.titleToMatch = text || "";
      this.saveSettings();
    }

    // saves exact title state
    // bound by signal in UI
    onExactTitleToggled(swtch) {
      const active = swtch.get_active();
      this.settings.exactTitleMatch = !!active;
      this.saveSettings();
    }

    // saves launch application state
    // bound by signal in UI
    onLaunchApplicationToggled(swtch) {
      const active = swtch.get_active();
      this.settings.launchApplication = !!active;
      this.saveSettings();
    }

    // saves written command lines
    // bound by signal in UI
    onCommandLineArgumentsChanged(entry) {
      const text = entry.get_text();
      this.settings.commandLineArguments = text || "";
      this.saveSettings();
    }

    // escape string
    htmlEntities(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // saves the widget settings and make updates where need be
    saveSettings() {
      this.setSettings(this.settings);

      this.applicationRow.set_title(
        this.getAppNameFromId(this.settings.applicationToFocus)
      );
      this.applicationRow.set_subtitle(
        this.htmlEntities(this.settings.keyboardShortcut || "Not Bound")
      );
    }

    // will remove widget and call the onDelete callback when deleted
    // bound by signal in UI
    onApplicationDelete() {
      this.setSettings();
      this.onDelete();
    }
  }
);

function fillPreferencesWindow(window) {
  // stores all focusWidgets
  const focusWidgets = [];

  // get settings
  const extensionSettings = ExtensionUtils.getSettings(SETTINGS_ID);
  const { getAllSettings, setSettings } = generateSettings(extensionSettings);

  // create preference pages
  const page = new Adw.PreferencesPage();
  const group = new Adw.PreferencesGroup();
  page.add(group);
  window.add(page);
  window.set_margin_bottom(10);
  window.set_margin_top(10);
  window.set_margin_start(5);
  window.set_margin_end(5);

  // generate 'Add Application' button
  const button = new Gtk.Button({ valign: Gtk.Align.CENTER });
  const buttonContent = new Adw.ButtonContent({
    "icon-name": "list-add-symbolic",
    label: "Add Application",
  });
  button.add_css_class("suggested-action");
  group.set_header_suffix(button);
  group.set_title("Focus Window");
  button.set_child(buttonContent);

  // generate row that tracks application count
  const count = new Adw.ActionRow({
    title: "Total Shorcuts",
    subtitle: "The Total Number of Shortcuts",
  });
  const countLabel = new Gtk.Label();
  count.add_suffix(countLabel);
  group.add(count);

  // sets the lable application count label
  const setCountLabel = () =>
    countLabel.set_label(
      `${focusWidgets.length} Shortcut${focusWidgets.length === 1 ? "" : "s"}`
    );

  // removes focus widget from page and memory, updates count label
  const onDelete = (id) => () => {
    const index = focusWidgets.findIndex((i) => i.id === id);
    if (index < 0) return;

    page.remove(focusWidgets[index].widget);
    focusWidgets.splice(index, 1);
    setCountLabel();
  };

  // add focus widgets from settings
  getAllSettings().forEach((settings) => {
    const newWidget = new FocusWidget(
      { "margin-top": 0 },
      setSettings(settings.id),
      onDelete(settings.id),
      settings.id,
      settings,
      false
    );
    focusWidgets.push({ id: settings.id, widget: newWidget });
    page.add(newWidget);
  });

  setCountLabel();

  // add focus widgets when 'Add Application' button is clicked
  button.connect("clicked", () => {
    const id = createId();
    const newWidget = new FocusWidget({}, setSettings(id), onDelete(id), id);
    focusWidgets.push({ id, widget: newWidget });
    page.add(newWidget);
    setCountLabel();
  });
}
