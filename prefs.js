const { Adw, Gio, Gtk, Gdk } = imports.gi;

// It's common practice to keep GNOME API and JS imports in separate blocks
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 */
function init() {}

/**
 * This function is called when the preferences window is first created to build
 * and return a GTK widget.
 *
 * As of GNOME 42, the preferences window will be a `Adw.PreferencesWindow`.
 * Intermediate `Adw.PreferencesPage` and `Adw.PreferencesGroup` widgets will be
 * used to wrap the returned widget if necessary.
 *
 * @returns {Gtk.Widget} the preferences widget
 */
function buildPrefsWidget() {
  // This could be any GtkWidget subclass, although usually you would choose
  // something like a GtkGrid, GtkBox or GtkNotebook
  const prefsWidget = new Gtk.Label({
    label: Me.metadata.name,
    visible: true,
  });

  // Add a widget to the group. This could be any GtkWidget subclass,
  // although usually you would choose preferences rows such as AdwActionRow,
  // AdwComboRow or AdwRevealerRow.
  const label = new Gtk.Label({ label: `${Me.metadata.name}` });
  group.add(label);

  window.add(page);
}

/**
 * This function is called when the preferences window is first created to fill
 * the `Adw.PreferencesWindow`.
 *
 * This function will only be called by GNOME 42 and later. If this function is
 * present, `buildPrefsWidget()` will never be called.
 *
 * @param {Adw.PreferencesWindow} window - The preferences window
 */
function fillPreferencesWindow(window) {
  const settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.focus-window"
  );

  const group = new Adw.PreferencesGroup();
  const page = new Adw.PreferencesPage();
  page.add(group);

  // Modification of function taken from flypie@schneegans.github.com
  const createShortcutLabel = (doFullGrab, onSelect) => {
    const frame = new Gtk.Frame();
    const listBox = new Gtk.ListBox();
    const row = new Gtk.ListBoxRow({ height_request: 50 });

    frame.set_child(listBox);

    listBox.append(row);

    const label = new Gtk.ShortcutLabel({
      disabled_text: "Not Bound",
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.CENTER,
    });

    row.set_child(label);

    // Whenever the widget is in the please-select-something-state, the label is cleared
    // and a text indicating that the user should press the shortcut is shown. To be able
    // to reset to the state before (e.g. when ESC is pressed), this stores the previous
    // value.
    let lastAccelerator = "";
    let isGrabbed = false;

    // This function grabs the keyboard input. If doFullGrab == true, the complete
    // keyboard input of the default Seat will be grabbed. Else only a Gtk grab is
    // performed. The text of the Gtk.ShortcutLabel is changed to indicate that the widget
    // is waiting for input.
    const grabKeyboard = () => {
      if (doFullGrab) {
        if (Gtk.get_major_version() === 4) {
          label.get_root().get_surface().inhibit_system_shortcuts(null);
        } else {
          const seat = Gdk.Display.get_default().get_default_seat();
          seat.grab(
            row.get_window(),
            Gdk.SeatCapabilities.KEYBOARD,
            false,
            null,
            null,
            null
          );
        }
      }
      isGrabbed = true;
      lastAccelerator = label.get_accelerator();
      label.set_accelerator("");
      label.set_disabled_text(
        _("Press the shortcut!\nESC to cancel, BackSpace to unbind")
      );
    };

    // This function cancels any previous grab. The label's disabled-text is reset to "Not
    // bound".
    const cancelGrab = () => {
      if (doFullGrab) {
        if (Gtk.get_major_version() === 4) {
          label.get_root().get_surface().restore_system_shortcuts();
        } else {
          const seat = Gdk.Display.get_default().get_default_seat();
          seat.ungrab();
        }
      }
      isGrabbed = false;
      label.set_accelerator(lastAccelerator);
      row.parent.unselect_all();
      label.set_disabled_text(_("Not Bound"));
    };

    // When the row is activated, the input is grabbed. If it's already grabbed, un-grab
    // it.
    row.parent.connect("row-activated", () => {
      if (isGrabbed) {
        cancelGrab();
      } else {
        grabKeyboard();
      }
    });

    // Key input events are received once the input is grabbed.
    {
      const handler = (keyval, state) => {
        if (row.is_selected()) {
          const mods = state & Gtk.accelerator_get_default_mod_mask();

          if (keyval == Gdk.KEY_Escape) {
            // Escape cancels the shortcut selection.
            cancelGrab();
          } else if (keyval == Gdk.KEY_BackSpace) {
            // BackSpace removes any bindings.
            lastAccelerator = "";
            onSelect("");
            cancelGrab();
          } else if (
            Gtk.accelerator_valid(keyval, mods) ||
            keyval == Gdk.KEY_Tab ||
            keyval == Gdk.KEY_ISO_Left_Tab ||
            keyval == Gdk.KEY_KP_Tab
          ) {
            // Else, if a valid accelerator was pressed, we store it. The tab key is for
            // some reason not considered to be a valid key for accelerators.
            const accelerator = Gtk.accelerator_name(keyval, mods);
            onSelect(accelerator);
            lastAccelerator = accelerator;
            cancelGrab();
          }

          return true;
        }
        return false;
      };

      if (Gtk.get_major_version() === 4) {
        const controller = Gtk.EventControllerKey.new();
        controller.connect("key-pressed", (c, keyval, keycode, state) =>
          handler(keyval, state)
        );
        row.add_controller(controller);
      } else {
        row.connect("key-press-event", (row, event) => {
          const keyval = event.get_keyval()[1];
          const state = event.get_state()[1];
          return handler(keyval, state);
        });
      }
    }

    // Clicking somewhere else cancels the shortcut selection.
    {
      const handler = () => {
        if (row.is_selected()) {
          label.set_accelerator(lastAccelerator);
          cancelGrab();
        }
        return true;
      };

      if (Gtk.get_major_version() === 4) {
        const controller = Gtk.EventControllerFocus.new();
        controller.connect("leave", handler);
        row.add_controller(controller);
      } else {
        row.connect("focus-out-event", handler);
      }
    }

    return [frame, label];
  };

  // Modification of function taken from flypie@schneegans.github.com
  const createConfigWidgetCaption = (name, description) => {
    const vBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 5,
      margin_top: 20,
      margin_bottom: 20,
    });
    const hBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
    });

    vBox.append(hBox);

    // This is shown on the left above the data widget.
    const nameLabel = new Gtk.Label({
      label: name,
      hexpand: true,
      halign: Gtk.Align.START,
    });

    // This is shown on the right above the data widget.
    const descriptionLabel = new Gtk.Label({ label: description });
    descriptionLabel.get_style_context().add_class("dim-label");

    hBox.append(nameLabel);
    hBox.append(descriptionLabel);

    return vBox;
  };

  // Modification of function taken from flypie@schneegans.github.com
  const createShortcutWidget = (name, description, shortcut, callback) => {
    const [container, label] = createShortcutLabel(true, callback);
    label.set_accelerator(shortcut);

    const box = createConfigWidgetCaption(name, description);
    box.append(container);

    return box;
  };

  const createApplicationWidget = (
    name,
    description,
    appName,
    appId,
    callback
  ) => {
    const modifyLabel = (label) => "<i>" + label + "</i>";
    const checkApp = (appInfo) => {
      try {
        appInfo.get_id();
      } catch (e) {
        return false;
      }
      return appInfo.should_show();
    };

    const container = new Gtk.AppChooserWidget({
      default_text: "No applications could be found",
      show_all: true,
    });

    const box = createConfigWidgetCaption(name, description);

    const hBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
    });

    const nameLabel2 = new Gtk.Label({
      label: modifyLabel(appName || "No Application Selected"),
      hexpand: true,
      halign: Gtk.Align.START,
      "use-markup": true,
    });

    const descriptionLabel2 = new Gtk.Label({
      label: modifyLabel(appId || "Please select an application"),
      "use-markup": true,
    });
    descriptionLabel2.get_style_context().add_class("dim-label");

    hBox.append(nameLabel2);
    hBox.append(descriptionLabel2);
    box.append(hBox);
    box.append(container);

    container.connect("application-selected", (__, appInfo) => {
      if (!checkApp(appInfo)) {
        nameLabel2.set_markup(modifyLabel("No Application Selected"));
        descriptionLabel2.set_markup(
          modifyLabel("Please select an application")
        );
        callback("", "");
        return;
      }

      nameLabel2.set_markup(modifyLabel(appInfo.get_display_name()));
      descriptionLabel2.set_markup(modifyLabel(appInfo.get_id()));
      callback(appInfo.get_display_name(), appInfo.get_id());
    });

    return box;
  };

  const applicationWidget = createApplicationWidget(
    "Application to Focus",
    "The application that will be opened or focused when triggered by the specified keyboard shortcut",
    settings.get_string("application-name"),
    settings.get_string("application-id"),
    (appName, appId) => {
      if (!appName || !appId) {
        settings.reset("application-name");
        settings.reset("application-id");
      } else {
        settings.set_string("application-name", appName);
        settings.set_string("application-id", appId);
      }
    }
  );
  group.add(applicationWidget);

  const shortcutWidget = createShortcutWidget(
    "Focus Keyboard Shortcut",
    "The keyboard shortcut that will either open or focus the selected application",
    settings.get_strv("focus-shortcut")[0],
    (shortcut) => {
      settings.set_strv("focus-shortcut", [shortcut]);
    }
  );
  group.add(shortcutWidget);

  window.add(page);
}
