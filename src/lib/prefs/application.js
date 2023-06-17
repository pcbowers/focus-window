const { GObject, Adw, Gio, Gdk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Gettext = imports.gettext;
const Domain = Gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;
const ngettext = Domain.ngettext;

/** @type { import('$lib/common/utils').SETTINGS_SCHEMA} */
const SETTINGS_SCHEMA = Me.imports.lib.common.utils.SETTINGS_SCHEMA;

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/common/utils').Range} */
const range = Me.imports.lib.common.utils.range;

/** @type {import('$lib/common/utils').CreateId} */
const createId = Me.imports.lib.common.utils.createId;

/** @type {import('$lib/prefs/shortcut').Shortcut} */
const Shortcut = Me.imports.lib.prefs.shortcut.shortcut;

/**
 * @typedef {Object} ApplicationSettingsProps
 * @property {'settings'} type
 * @property {string} id
 */

/**
 * @typedef {Object} ApplicationNewProps
 * @property {'new'} type
 * @property {string} name
 */

/**
 * @typedef {Object} ApplicationCopyProps
 * @property {'copy'} type
 * @property {boolean} [duplicateShortcuts]
 * @property {import('@girs/gio-2.0').Gio.Settings} settings
 */

/**
 * @typedef {ApplicationSettingsProps | ApplicationNewProps | ApplicationCopyProps} ApplicationProps
 */

/**
 * @typedef {Object} ApplicationSettings
 * @property {boolean} enabled
 * @property {string} name
 * @property {import('$lib/prefs/shortcut').ShortcutSettings[]} shortcuts
 * @property {boolean} launch-application
 * @property {string} command-line-arguments
 * @property {boolean} filter-by-title
 * @property {string} title-to-match
 * @property {boolean} filter-by-workspace
 * @property {boolean} filter-to-current-workspace
 * @property {number} workspace-to-match
 * @property {boolean} filter-by-monitor
 * @property {boolean} filter-to-current-monitor
 * @property {number} monitor-to-match
 * @property {boolean} move-on-focus
 * @property {boolean} move-to-current-workspace
 * @property {boolean} move-to-current-monitor
 * @property {boolean} resize-on-focus
 * @property {boolean} maximize
 * @property {boolean} restrict-resize
 * @property {boolean} use-pixels
 * @property {number} top-left-x
 * @property {number} top-left-y
 * @property {number} bottom-right-x
 * @property {number} bottom-right-y
 * @property {boolean} use-proportions
 * @property {number} grid-size
 * @property {number} column-start
 * @property {number} width
 * @property {number} row-start
 * @property {number} height
 * @property {boolean} minimize
 * @property {boolean} always-on-top
 * @property {boolean} disable-animations
 */

/** @typedef {typeof ApplicationClass} Application */
/** @typedef {ApplicationClass} ApplicationInstance */
class ApplicationClass extends Adw.ExpanderRow {
  /** @type {string} */
  _id = createId();

  /** @type {import('$lib/prefs/shortcut').ShortcutInstance[]} */
  _shortcutsList = [];

  bindingProperties = {
    'launch-application': 'enable-expansion',
    'command-line-arguments': 'text',
    'filter-by-title': 'enable-expansion',
    'title-to-match': 'text',
    'filter-by-workspace': 'enable-expansion',
    'filter-to-current-workspace': 'active',
    'workspace-to-match': 'value',
    'filter-by-monitor': 'enable-expansion',
    'filter-to-current-monitor': 'active',
    'monitor-to-match': 'value',
    'move-on-focus': 'enable-expansion',
    'move-to-current-workspace': 'active',
    'move-to-current-monitor': 'active',
    'resize-on-focus': 'enable-expansion',
    maximize: 'active',
    'restrict-resize': 'active',
    'use-pixels': 'active',
    'top-left-x': 'value',
    'top-left-y': 'value',
    'bottom-right-x': 'value',
    'bottom-right-y': 'value',
    'use-proportions': 'active',
    'grid-size': 'value',
    'column-start': 'value',
    width: 'value',
    'row-start': 'value',
    height: 'value',
    minimize: 'active',
    'always-on-top': 'active',
    'disable-animations': 'active'
  };

  /**
   * @param {import('@girs/adw-1').Adw.ExpanderRow.ConstructorProperties} AdwExpanderRowProps
   * @param {(id: string) => void} deleteApplication
   * @param {(id: string) => void} duplicateApplication
   * @param {(id: string, increasePriority: boolean) => void} changeApplicationPriority
   * @param {ApplicationProps} applicationProps
   */
  constructor(
    AdwExpanderRowProps = {},
    deleteApplication,
    duplicateApplication,
    changeApplicationPriority,
    applicationProps
  ) {
    debug('Creating Application...');
    super(AdwExpanderRowProps);

    // TODO: Add these properties
    // Cycle Windows
    // Always On Top

    /** @type {typeof deleteApplication} */
    this._deleteApplication = deleteApplication;

    /** @type {typeof duplicateApplication} */
    this._duplicateApplication = duplicateApplication;

    /** @type {typeof changeApplicationPriority} */
    this._changeApplicationPriority = changeApplicationPriority;

    /** @type {import('@girs/gtk-4.0').Gtk.StringList} */
    this._application_list = this._application_list;

    /** @type {import('@girs/adw-1').Adw.ComboRow} */
    this._application_item = this._application_item;

    /** @type {import('@girs/gtk-4.0').Gtk.DrawingArea} */
    this._drawing_area_proportions = this._drawing_area_proportions;

    /** @type {import('@girs/adw-1').Adw.ExpanderRow} */
    this._shortcuts = this._shortcuts;

    /** @type {number[]} */
    this._settingsConnections = [];

    this._populateApplications();

    if (applicationProps.type === 'settings') {
      this._id = applicationProps.id;
    }

    /** @type {import('@girs/gio-2.0').Gio.Settings} */
    this.settings = new Gio.Settings({
      settings_schema: SETTINGS_SCHEMA.lookup(
        'org.gnome.shell.extensions.focus-window.applications',
        true
      ),
      path: `/org/gnome/shell/extensions/focus-window/applications/${this._id}/`
    });

    Object.entries(this.bindingProperties).forEach(([key, property]) => {
      this.settings.bind(
        key,
        this[`_${key.replaceAll('-', '_')}`],
        property,
        Gio.SettingsBindFlags.DEFAULT
      );
    });

    this.settings.bind('enabled', this, 'enable-expansion', Gio.SettingsBindFlags.DEFAULT);
    this.settings.bind('name', this, 'title', Gio.SettingsBindFlags.DEFAULT);

    if (applicationProps.type === 'settings') {
      this.settings.get_strv('shortcuts').forEach(shortcutId => {
        const application = this._createShortcut({
          type: 'settings',
          id: shortcutId,
          name: this._getNextShortcutName()
        });
        this._shortcutsList.push(application);
        this._shortcuts.add_row(application);
        this._setSubtitle();
      });
    } else if (applicationProps.type === 'new') {
      this.set_title(applicationProps.name);
    } else if (applicationProps.type === 'copy') {
      applicationProps.settings.list_keys().forEach(key => {
        if (key === 'shortcuts') return;
        this.settings.set_value(key, applicationProps.settings.get_value(key));
      });

      if (applicationProps.duplicateShortcuts) {
        applicationProps.settings.get_strv('shortcuts').forEach(shortcutId => {
          const shortcutSettings = new Gio.Settings({
            settings_schema: SETTINGS_SCHEMA.lookup(
              'org.gnome.shell.extensions.focus-window.shortcuts',
              true
            ),
            path: `/org/gnome/shell/extensions/focus-window/shortcuts/${shortcutId}/`
          });
          const shortcut = this._createShortcut({
            type: 'copy',
            name: this._getNextShortcutName(),
            settings: shortcutSettings
          });
          this._shortcutsList.push(shortcut);
          this._shortcuts.add_row(shortcut);
          this._setSubtitle();
          this._setShortcuts();
        });
      }
    }

    this._application_item.set_selected(this._getApplicationPositionByString(this.title));

    this._addSettingsListeners();

    this._drawProportions();
  }

  getId() {
    return this._id;
  }

  _drawProportions() {
    const gridSize = this.settings.get_int('grid-size');
    const columnStart = this.settings.get_int('column-start');
    const width = this.settings.get_int('width');
    const rowStart = this.settings.get_int('row-start');
    const height = this.settings.get_int('height');

    this._drawing_area_proportions.set_draw_func((drawingArea, context) => {
      const areaWidth = drawingArea.get_allocated_width();
      const areaHeight = drawingArea.get_allocated_height();

      const color = new Gdk.RGBA();
      color.parse('rgba(131, 131, 131, 0.8)');

      Gdk.cairo_set_source_rgba(context, color);
      context.setLineWidth(1);

      const gap = 10;
      const cellWidth = (areaWidth - gap * 2) / gridSize;
      const cellHeight = (areaHeight - gap * 2) / gridSize;

      range(0, gridSize + 1).forEach(column => {
        context.moveTo(column * cellWidth + gap, gap);
        context.lineTo(column * cellWidth + gap, areaHeight - gap);
        context.stroke();
      });

      range(0, gridSize + 1).forEach(row => {
        context.moveTo(gap, row * cellHeight + gap);
        context.lineTo(areaWidth - gap, row * cellHeight + gap);
        context.stroke();
      });

      range(columnStart, columnStart + width).forEach(column => {
        range(rowStart, rowStart + height).forEach(row => {
          context.moveTo((column - 1) * cellWidth + gap, (row - 1) * cellHeight + gap);
          context.lineTo(column * cellWidth + gap, (row - 1) * cellHeight + gap);
          context.lineTo(column * cellWidth + gap, row * cellHeight + gap);
          context.lineTo((column - 1) * cellWidth + gap, row * cellHeight + gap);
          context.lineTo((column - 1) * cellWidth + gap, (row - 1) * cellHeight + gap);
          context.strokePreserve();
          context.fill();
        });
      });
    });
  }

  _addSettingsListeners() {
    this._settingsConnections.push(
      this.settings.connect('changed::grid-size', () => {
        const gridSize = this.settings.get_int('grid-size');
        if (this.settings.get_int('column-start') > gridSize) {
          this.settings.set_int('column-start', gridSize);
        }

        if (this.settings.get_int('row-start') > gridSize) {
          this.settings.set_int('row-start', gridSize);
        }

        if (this.settings.get_int('width') > gridSize) {
          this.settings.set_int('width', gridSize);
        }

        if (this.settings.get_int('height') > gridSize) {
          this.settings.set_int('height', gridSize);
        }

        this._drawProportions();
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::column-start', () => {
        const gridSize = this.settings.get_int('grid-size');
        const columnStart = this.settings.get_int('column-start') - 1;

        if (this.settings.get_int('width') > gridSize - columnStart) {
          this.settings.set_int('width', gridSize - columnStart);
        }

        this._drawProportions();
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::row-start', () => {
        const gridSize = this.settings.get_int('grid-size');
        const rowStart = this.settings.get_int('row-start') - 1;

        if (this.settings.get_int('height') > gridSize - rowStart) {
          this.settings.set_int('height', gridSize - rowStart);
        }

        this._drawProportions();
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::width', () => {
        this._drawProportions();
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::height', () => {
        this._drawProportions();
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::top-left-x', () => {
        const topLeftX = this.settings.get_int('top-left-x');
        if (this.settings.get_int('bottom-right-x') < topLeftX) {
          this.settings.set_int('bottom-right-x', topLeftX);
        }
      })
    );

    this._settingsConnections.push(
      this.settings.connect('changed::top-left-y', () => {
        const topLeftY = this.settings.get_int('top-left-y');
        if (this.settings.get_int('bottom-right-y') < topLeftY) {
          this.settings.set_int('bottom-right-y', topLeftY);
        }
      })
    );
  }

  onDuplicateApplication() {
    this._duplicateApplication(this._id);
  }

  onDeleteApplication() {
    debug('Deleting Application...');
    [...this._shortcutsList].forEach(shortcut => shortcut.onDeleteShortcut());
    this._settingsConnections.forEach(connection => this.settings.disconnect(connection));
    this.settings.list_keys().forEach(key => this.settings.reset(key));
    this.settings.run_dispose();
    this._deleteApplication(this._id);
  }

  onIncreasePriority() {
    this._changeApplicationPriority(this._id, true);
  }

  onDecreasePriority() {
    this._changeApplicationPriority(this._id, false);
  }

  onApplicationItem() {
    const stringList = /** @type {import('@girs/gtk-4.0').Gtk.StringList} **/ (
      this._application_item.get_model()
    );

    this.set_title(
      stringList.get_string(this._application_item.get_selected()) || _('No App Selected')
    );
  }

  onAddShortcut() {
    const newShortcut = this._createShortcut({
      type: 'new',
      name: this._getNextShortcutName()
    });
    this._shortcutsList.push(newShortcut);
    this._shortcuts.add_row(newShortcut);
    this._shortcuts.set_expanded(true);
    this._setSubtitle();
    this._setShortcuts();
  }

  _getNextShortcutName() {
    return ngettext('Shortcut %d', 'Shortcut %d', this._shortcutsList.length + 1).format(
      this._shortcutsList.length + 1
    );
  }

  /**
   * @param {string} string
   */
  _getApplicationPositionByString(string) {
    const indexPosition = Array.from(Array(this._application_list.get_n_items()).keys()).findIndex(
      position => this._application_list.get_string(position) === string
    );

    return indexPosition === -1 ? 0 : indexPosition;
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

    this.allApplications.forEach(a => this._application_list.append(a.name));
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
    this._setShortcuts();
  }

  /**
   * @param {import('$lib/prefs/shortcut').ShortcutProps} shortcutProps
   */
  _createShortcut(shortcutProps) {
    return new Shortcut(
      {},
      this._deleteShortcut.bind(this),
      this._setSubtitle.bind(this),
      shortcutProps
    );
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

  _setShortcuts() {
    this.settings.set_strv(
      'shortcuts',
      this._shortcutsList.map(shortcut => shortcut.getId())
    );
  }
}

var application = GObject.registerClass(
  {
    GTypeName: 'ApplicationExpanderRow',
    Template: Me.dir.get_child('ui/application.ui').get_uri(),
    InternalChildren: [
      'application-list',
      'application-item',
      'shortcuts',
      'launch-application',
      'command-line-arguments',
      'filter-by-title',
      'title-to-match',
      'filter-by-workspace',
      'filter-to-current-workspace',
      'workspace-to-match',
      'filter-by-monitor',
      'filter-to-current-monitor',
      'monitor-to-match',
      'move-on-focus',
      'move-to-current-workspace',
      'move-to-current-monitor',
      'resize-on-focus',
      'maximize',
      'restrict-resize',
      'use-pixels',
      'top-left-x',
      'top-left-y',
      'bottom-right-x',
      'bottom-right-y',
      'use-proportions',
      'grid-size',
      'column-start',
      'width',
      'row-start',
      'height',
      'minimize',
      'always-on-top',
      'disable-animations',
      'drawing-area-proportions'
    ]
  },
  ApplicationClass
);
