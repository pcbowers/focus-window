const { GObject, Adw, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/** @type {import("$lib/prefs/shortcut").Shortcut} */
const Shortcut = Me.imports.lib.prefs.shortcut.shortcut;

/** @typedef {typeof ApplicationClass} Application */
/** @typedef {ApplicationClass} ApplicationInstance */
class ApplicationClass extends Adw.ExpanderRow {
  /**
   * @param {import('$types/adw-1').Adw.ExpanderRow.ConstructorProperties} AdwExpanderRowProps
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

    /** @type {string} */
    this._id = createId();

    /** @type {typeof deleteApplication} */
    this._deleteApplication = deleteApplication;

    /** @type {typeof duplicateApplication} */
    this._duplicateApplication = duplicateApplication;

    /** @type {typeof changeApplicationPriority} */
    this._changeApplicationPriority = changeApplicationPriority;

    /** @type {boolean} */
    this._keyboardIsGrabbed = false;

    /** @type {string | null} */
    this._lastAccelerator = '';

    /** @type {import('$lib/prefs/shortcut').ShortcutInstance[]} */
    this._shortcutsList = [];

    /** @type {import('$types/gtk-4.0').Gtk.StringList} */
    this._applicationList = this._applicationList;

    /** @type {import('$types/adw-1').Adw.ExpanderRow} */
    this._shortcuts = this._shortcuts;

    this._populateApplications();
  }

  getId() {
    return this._id;
  }

  onApplication() {
    debug('TODO: implement onApplication');
  }

  onDuplicateApplication() {
    debug('Duplicating Application...');
    this._duplicateApplication(this._id);
  }

  onDeleteApplication() {
    debug('Deleting Application...');
    this._deleteApplication(this._id);
  }

  onApplicationItem(element) {
    debug('TODO: implement onApplicationItem');
    this.set_title(element.get_model().get_string(element.get_selected()) || _('No App Selected'));
  }

  onIncreasePriority() {
    debug('Increasing Priority...');
    this._changeApplicationPriority(this._id, true);
  }

  onDecreasePriority() {
    debug('Decreasing Priority...');
    this._changeApplicationPriority(this._id, false);
  }

  onAddShortcut() {
    const newShortcut = new Shortcut(
      {},
      this._deleteShortcut.bind(this),
      this._setSubtitle.bind(this),
      ngettext('Shortcut %d', 'Shortcut %d', this._shortcutsList.length + 1).format(
        this._shortcutsList.length + 1
      )
    );
    this._shortcutsList.push(newShortcut);
    this._shortcuts.add_row(newShortcut);
    this._shortcuts.set_expanded(true);
    this._setSubtitle();
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
      .sort((app1, app2) =>
        app1.get_name().toLowerCase().localeCompare(app2.get_name().toLowerCase())
      )
      .map((a, index) => ({
        name: a.get_name(),
        id: a.get_id(),
        position: index + 1
      }));

    this.allApplications.forEach(a => this._applicationList.append(a.name));
  }

  _deleteShortcut(id) {
    const shortcutIndex = this._shortcutsList.findIndex(shortcut => shortcut.getId() === id);
    const shortcut = this._shortcutsList[shortcutIndex];
    this._shortcuts.remove(shortcut);
    this._shortcutsList.splice(shortcutIndex, 1);

    this._shortcutsList.forEach((shortcut, index) =>
      shortcut.set_title(ngettext('Shortcut %d', 'Shortcut %d', index + 1).format(index + 1))
    );
    this._setSubtitle();
  }

  _setSubtitle() {
    const boundShortcuts = this._shortcutsList.filter(shortcut => shortcut.isBound());
    let subtitle = _('No Keyboard Shortcuts');
    if (boundShortcuts.length > 0) {
      subtitle = ngettext(
        '%d Keyboard Shortcut',
        '%d Keyboard Shortcuts',
        boundShortcuts.length
      ).format(boundShortcuts.length);
    }
    this.set_subtitle(subtitle);
  }
}

var application = GObject.registerClass(
  {
    GTypeName: 'ApplicationExpanderRow',
    Template: Me.dir.get_child('ui/application.ui').get_uri(),
    InternalChildren: ['applicationList', 'shortcuts']
  },
  ApplicationClass
);
