# Focus Window

<p align="center">
  <img width="100%" src="media/header.svg?raw=true&sanitize=true" alt="focus-window">
  <a href="https://extensions.gnome.org/extension/5571/focus-window/"><img src="https://img.shields.io/badge/Download-extensions.gnome.org-e67f4d.svg?logo=gnome&logoColor=lightgrey&labelColor=303030" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-purple.svg?labelColor=303030" /></a>
  <a href="https://github.com/pcbowers/focus-window/releases"><img src="https://img.shields.io/github/v/release/pcbowers/focus-window" /></a>
</p>

- [:tada: Installation](#tada-installation)
  - [:earth\_americas: Website](#earth_americas-website)
  - [:desktop\_computer: Desktop App](#desktop_computer-desktop-app)
  - [:hammer\_and\_wrench:	Manual](#hammer_and_wrenchmanual)
- [:gear: Preferences](#gear-preferences)
- [:construction: TODO List](#construction-todo-list)
- [:open\_book: Usage](#open_book-usage)
- [:question:	FAQ](#questionfaq)
  - [:broken\_heart: My keyboard shortcut isn't working. What do I do?](#broken_heart-my-keyboard-shortcut-isnt-working-what-do-i-do)
  - [:handshake:	How can I contribute?](#handshakehow-can-i-contribute)
- [:floppy\_disk: Development Notes](#floppy_disk-development-notes)
  - [:scroll: Viewing Logs](#scroll-viewing-logs)
  - [:heavy\_check\_mark: Working With Types and Autocompletion](#heavy_check_mark-working-with-types-and-autocompletion)
  - [:building\_construction: Using the Build Script](#building_construction-using-the-build-script)
  - [:notebook: Other Notes](#notebook-other-notes)


Do you want a pulldown mode on your terminal without having to switch to tilda or guake? Do you want to focus your Spotify app or email client with a single shortcut key? Then this extension is for you!

This extension allows one to create various shortcuts for applications, enabling the ability to have one shortcut that triggers both the launch and focus of an application window.

## :tada: Installation

### :earth_americas: Website

1. Make sure to download the appropriate browser extension and connector according to the [GNOME Shell browser integration Installation Guide](https://wiki.gnome.org/action/show/Projects/GnomeShellIntegration/Installation?action=show&redirect=Projects%2FGnomeShellIntegrationForChrome%2FInstallation)
2. Navigate to the [GNOME Extensions Website](https://extensions.gnome.org/extension/5571/focus-window/) and search for **Focus Window**
3. Install the latest version of **Focus Window**

### :desktop_computer: Desktop App

1. Make sure that the `gnome-shell-extension-manager` application is installed
2. Search for **Focus Window**
3. Install the latest version of **Focus Window**

### :hammer_and_wrench:	Manual

This step is only recommended for those that want to contribute. To build the extension, you must have the [blueprint-compiler](https://jwestman.pages.gitlab.gnome.org/blueprint-compiler/setup.html) installed.

1. Clone the repository:

    ```bash
    git clone git@github.com:pcbowers/focus-window.git
    ```

2. Run the build script to build and install the extension:

    ```bash
    npm run build:install
    ```

3. Restart GNOME:

   - in an X11 session, press `Alt`+`F2` and then run `restart`
   - in Wayland, log out and log back in

4. Enable the extension:

    ```bash
    gnome-extensions enable focus-window@chris.al
    ```

## :gear: Preferences

To open the preferences after installation, either navigate to the extension on the website or desktop app and click the preferences icon or run the following command:

```bash
gnome-extensions prefs focus-window@chris.al
```

## :construction: TODO List

- [x] Add Type Support
- [x] Add Ability to Modify Types on Demand
- [x] Implement UI
- [x] Add Translation Support
- [x] Add Support to Set and Get Settings
- [x] Bind Settings to UI
- [x] Add Duplication Support
- [x] Ensure Changing Priority also Changes Settings
- [x] Add Settings to Extension Files
- [x] Implement Extension
- [x] Show Resize Square in Preferences
- [ ] Use `set_content` in windows and implement ADW Leaflet manually
- [ ] Potentially add sidebar with applications/profiles
- [ ] Add toast with an undo button on deletions?
- [ ] Improve Info Actions & Documentation
- [ ] Improve Animations
- [ ] Add Disclaimer about pixel resizing with multiple monitors
- [ ] Add Disclaimer about always-on-top and launching new windows
- [ ] Improve npm package commands

## :open_book: Usage

TODO

## :question:	FAQ

TODO

### :broken_heart: My keyboard shortcut isn't working. What do I do?

The shortcut may already be bound by the system. Make sure you don't already have a system shortcut that is bound by it.

Also, if there are no existing windows that match your application and filters, and the `Launch Application` setting is toggled off, nothing will happen. Try editing your settings by allowing the shortcut to launch an application or changing your filter options.

### :handshake:	How can I contribute?

I am always down to receive help! There are 3 ways you can contribute to this project:

1. **Give Feedback:** I'll monitor the issues page, so if there are any bugs or features that you would like added, please create an issue!
2. **Help with Translations:** I grew up overseas and have always appreciated applications that are language accessible. I have made this project translation-friendly, so feel free to create a pull request and help with translations.
3. **Create your own Pull Requests:** For those who like to get their hands dirty, I'm also open to pull requests for bug fixes and new features. I'll help review them before making the changes live! 


## :floppy_disk: Development Notes

If you're planning on submitting a pull request, here are some helpful tips when debugging.

### :scroll: Viewing Logs

- View the log for the preferences window with the following command:

  ```bash
  npm run test:log:prefs

  # OR

  journalctl -f -o cat /usr/bin/gjs
  ```

- View the extension debug log with the following command:

  ```bash
  npm run test:log:extension

  # OR

  journalctl -f -o cat GNOME_SHELL_EXTENSION_UUID=focus-window@chris.al
  ```

- View all logs (preferences and extensions) with the following command:

  ```bash
  npm run test:log

  # OR

  journalctl -f -o cat | awk '/focus-window@chris.al:/ {gsub(/^.*focus-window@chris.al:\s/, ""); print }'
  ```

- View the extension settings with the following command:

  ```bash
  npm run settings

  # OR

  dconf dump /org/gnome/shell/extensions/focus-window/
  ```

- Clear the extension settings with the following command:

  ```bash
  npm run settings:clear

  # OR

  dconf reset -f /org/gnome/shell/extensions/focus-window/
  ```

### :heavy_check_mark: Working With Types and Autocompletion

#### **External Import Types**

Use the [`@girs`](https://github.com/gjsify/types) npm packages to add types. This will make autocomplete for the `imports` global variable possible within any `gjs` file. To use the npm package, navigate to the root of your directory and run the following:

```bash
npm install
```

#### **Internal Import Types**

The code is commented using [JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) comments. A tsconfig is set up so that types can be used across multiple files as well using the `$lib` path alias. To type an `Me.imports`, simply add the following comment above the import (this is only an example. Make sure to tailor yours to the correct input):

  ```js
  /** @type {import("$lib/common/utils").Debug} */
  const debug = Me.imports.lib.common.utils.debug;
  ```

#### **UI Autocompletion**

The extension relies on [Blueprint](https://jwestman.pages.gitlab.gnome.org/blueprint-compiler/index.html). You will need to make sure the compiler is installed. Check the documentation for Blueprint if you need help. Once installed, use the [GTK Blueprint](https://marketplace.visualstudio.com/items?itemName=bodil.blueprint-gtk) extension in VS Code to get autocompletion for your UI files.

### :building_construction: Using the Build Script

The build script makes developing much easier. Simply run `./build.sh` to compile and pack the extension. There are several flags that also allow you to build for production, install the package, generate and update translations, and more. Flags can be joined together or separated. Here are some examples:

```bash
# Prints the help statement
./build.sh -h

# builds and installs the package for production, removing zip file after completion
./build.sh -pir
# OR
./build.sh -p -i -r

# builds and installs the package with verbose logs, removing zip file after completion
./build.sh -vir
# OR
./build.sh -v -i -r

# Builds the package and generates new translations ready for production
./build.sh -tpr
# OR
./build.sh -t -p -r
```

While you can use the build script directly, 4 common ones have been provided through npm scripts:

```bash
#  installs extension, opens prefs, and shows log in terminal
npm run test:prefs

# installs extension, enables it, and opens a nested dbus session
npm run test:extension

# builds the extension
npm run build

# builds and installs the extension
npm run build:install
```

#### **`-h` Help**

Get all the possible flags that can be used with the build script.

#### **`-p` Production** 

Builds/Packs the extension in a production state by removing all the debug statements.

#### **`-i` Install**

Installs the package after building/packing the extension.

#### **`-r` Remove**

Removes the packed extension after the build script completes (useful when you only want to install the extension and don't care about the packed extension).

#### **`-t` Translation**

Generates a new translation template and updates existing translations based on the blueprint files.

#### **`-v` Verbose**

Logs each step of the build process (useful if something breaks).

### :notebook: Other Notes

- For some reason, when the preferences are launched from the extension application, the preferences don't update after closing the window and reopening it. To get around this, don't launch the preferences using the extension manager. Instead, use the command:

  ```bash
  gnome-extensions prefs focus-window@chris.al
  ```
  
  The preferences panel also won't update until after you close the preferences window. Make sure to rebuild after closing to make sure reopening it will show the changes.




