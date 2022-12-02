# Focus Window

This extension allows one to create various shortcuts for applications, enabling the ability to have one shortcut that triggers both the launch and focus of an application window.

<p align="center">
  <img width="80%" src="https://user-images.githubusercontent.com/41601975/205367034-93b4b9f4-da23-4376-bfb5-02f6d8f03273.gif" alt="focus-window">
</p>

## Installation

### Website

1. Make sure to download the appropriate browser extension and connector according to the [GNOME Shell browser integration Installation Guide](https://wiki.gnome.org/action/show/Projects/GnomeShellIntegration/Installation?action=show&redirect=Projects%2FGnomeShellIntegrationForChrome%2FInstallation)
2. Navigate to the [GNOME Extensions Website](https://extensions.gnome.org/extension/4627/focus-changer/)
3. Install the latest version of **Focus Window**

### Desktop App

1. Make sure that the `gnome-shell-extension-manager` application is installed
2. Search for **Focus Window** and install the latest version

### Manual

1. Clone the repository:

```bash
git clone git@github.com:pcbowers/focus-window.git $HOME/.local/share/gnome-shell/extensions/focus-window@chris.al
```

2. Restart GNOME:

- in an X11 session, press `Alt`+`F2` and then run `restart`
- in Wayland, log out and log back in

3. Enable the extension:

```bash
gnome-extensions enable focus-window@chris.al
```

## Preferences

To open the prefrences after installation, either navigate to the extension on the website or desktop app and click the preferences icon or run the following command:

```bash
gnome-extensions prefs focus-window@chris.al
```

### Application to Focus

Use this setting to choose the application that should be focused (or launched) when the keyboard shortcut is pressed. This is required for the extension to bind the keyboard shortcut.

### Title to Match

An optional title that will filter any open windows of the application by its title. If the title of the window matches this, it will focus it. If this is left empty, then no windows will be filtered.

### Exact Title Match

By default, the specified title does not need to be an exact match. Toggling this on will ensure that the windows will be filtered by an exact match to the specified title.

### Launch Application

By default, a new window will be launched if there are no windows that already exist (or no windows that match the title). Toggling this off will ensure that no new windows will be launched.

### Keyboard Shortcut

This is the keyboard shortcut that focuses (and potentially launches) the application. If multiple windows are found, repeat presses of the keyboard shortcut will cycle through the various windows. If only one window is found, repeate presses of the keyboard shortcut when the window is already focused will minimize it.

Click on the row to set the keyboard shortcut. After clicking, press your shortcut and it will be automatically saved. Press the Escape key to cancel entry. Press Backspace to unbind the shortcut.

## FAQ

### Can I create multiple shortcuts to launch the same application?

Sure! Just add the application twice!

### My keyboard shortcut isn't working. What do I do?

The shortcut may already be bound by the system. Make sure you don't already have a system shortcut that is bound by it!

Also, if there are no existing windows for your application (or no windows that match the desired title) and the `Launch Application` setting is toggled off, nothing will happen. Try editing your settings by allowing the shortcut to launch an application or changing your title.

### If I add a new application but don't configure it, will this break the extension?

It shouldn't! The extension requires an application and keyboard shortcut to be set before binding. Using the `Delete Application` button exists simply for a better user experience. If the application is not set and/or there is no shortcut, nothing will happen.

### How can I contribute?

Create issues and create pull requests. I'm always happy to receive feedback.

If you're planning on submitting a pull request, here are some helpful tips when debugging:

- View the log for the preferences window with the following command:

```bash
journalctl -f -o cat /usr/bin/gjs
```

- View the extension debug log with the following command:

```bash
journalctl -f -o cat GNOME_SHELL_EXTENSION_UUID=focus-window@chris.al
```

- View the extension settings with the following command:

```bash
dconf dump /org/gnome/shell/extensions/focus-window/
```

- Clear the extension settings with the following command:

```bash
dconf reset -f /org/gnome/shell/extensions/focus-window/
```

- If you make edits to the schema, use this command to compile it before testing or it won't work (and this gives the added benefit of ensuring the schema is formatted properly):

```bash
glib-compile-schemas $HOME/.local/share/gnome-shell/extensions/focus-window@chris.al/schemas/
```

- For some reason, when the preferences are launched from the extension application, the preferences don't update after closing the window and reopening it. To get around this, don't launch the preferences using the extension manager. Instead, use the command:

```bash
gnome-extensions prefs focus-window@chris.al
```

- The preferences panel won't update after closing the window and reopening it if you saved your changes before closing. Make sure to save something in the file after closing to make sure reopening it will show the changes.
