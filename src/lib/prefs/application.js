const { GObject, Gtk, Gio, Gdk } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();
const Domain = imports.gettext.domain(Me.metadata.uuid);
const _ = Domain.gettext;

/** @type {import('$lib/common/utils').Utils} */
const { debug, createId, range, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @type {import('$lib/common/listFactory').ListFactory} */
const ListFactory = Me.imports.lib.common.listFactory.listFactory;

/** @type {import('$lib/common/gestureDrag').GestureDrag} */
const GestureDrag = Me.imports.lib.common.gestureDrag.gestureDrag;

/** @type {import('$lib/prefs/appName').AppName} */
const AppName = Me.imports.lib.prefs.appName.appName;

/** @type {import('$lib/prefs/shortcutItem').ShortcutItem} */
const ShortcutItem = Me.imports.lib.prefs.shortcutItem.shortcutItem;

/** @typedef {typeof ApplicationClass} Application */
class ApplicationClass extends Gtk.Box {
  /** @type {Record<string, string>} */
  static bindings = {
    enabled: 'active',
    launch: 'active',
    commandLineArguments: 'text',
    filterByTitle: 'active',
    titleToMatch: 'text',
    filterByWorkspace: 'active',
    filterToCurrentWorkspace: 'active',
    workspaceToMatch: 'value',
    filterByMonitor: 'active',
    filterToCurrentMonitor: 'active',
    monitorToMatch: 'value',
    moveOnFocus: 'active',
    moveToCurrentWorkspace: 'active',
    moveToCurrentMonitor: 'active',
    resizeOnFocus: 'active',
    maximize: 'active',
    restrictResize: 'active',
    usePixels: 'active',
    topLeftX: 'value',
    topLeftY: 'value',
    bottomRightX: 'value',
    bottomRightY: 'value',
    useProportions: 'active',
    gridSize: 'value',
    columnStart: 'value',
    width: 'value',
    rowStart: 'value',
    height: 'value',
    minimize: 'active',
    alwaysOnTop: 'active',
    disableAnimations: 'active'
  };

  /** @type {Map<string, InstanceType<import('$lib/prefs/shortcutItem').ShortcutItem>>} */
  shortcutItems = new Map();

  /** @type {InstanceType<import('$lib/common/listFactory').ListFactory>} */
  listFactory;

  /** @type {InstanceType<import('$lib/common/gestureDrag').GestureDrag>} */
  gestureDrag;

  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {import('@girs/adw-1').Adw.Leaflet} */
  _leaflet;

  /** @type {InstanceType<import('$lib/prefs/profile').Profile>} */
  _parent;

  /** @type {string} */
  _id;

  /**
   * @param {InstanceType<import('$lib/prefs/profile').Profile>} parent
   * @param {string} id
   */
  constructor(parent, id) {
    super({});

    this.manager = new Manager({ id, subpath: 'applications' });

    this._leaflet = parent._leaflet;
    this._parent = parent;
    this._id = id;

    this._initFromSettings();
    this._setSortFunc();
    this._setupDrawingArea();
    this._populateApplicationNames();
  }

  getId() {
    return this._id;
  }

  setApplicationName() {
    // The default application name when creating a new application
    const defaultTitle = _('No App Selected');
    const selected = this.listFactory.getItem(this._applicationName.get_selected());

    this._labelHeader.set_label(selected.title || defaultTitle);

    if (selected.metadata) {
      this._iconHeader.set_from_gicon(selected.metadata.get_icon());
    } else {
      this._iconHeader.set_from_icon_name('application-x-addon-symbolic');
    }

    this._setApplicationId(selected.value);
  }

  addShortcut(_, id = '') {
    const newId = id || createId();
    const shortcut = new ShortcutItem(this, newId);

    this.shortcutItems.set(newId, shortcut);

    if (!id) {
      const shortcutIds = this.manager.getSettings().get_strv('shortcuts');
      shortcutIds.push(newId);
      this.manager.getSettings().set_strv('shortcuts', shortcutIds);
    }

    this._shortcuts.append(shortcut);
  }

  /**
   * @param {string} id
   */
  deleteShortcut(id) {
    const shortcutIds = this.manager.getSettings().get_strv('shortcuts');
    const index = shortcutIds.findIndex(a => a === id);
    shortcutIds.splice(index, 1);
    this.manager.getSettings().set_strv('shortcuts', shortcutIds);

    const shortcut = this.shortcutItems.get(id);
    this._shortcuts.remove(shortcut);
    shortcut.cleanup(true);
    this.shortcutItems.delete(id);
  }

  deleteApplication() {
    this.goBack(null, true);
  }

  goBack(_, deleteApplication = false) {
    this.manager
      .getSettings()
      .get_strv('shortcuts')
      .forEach(id => {
        const shortcut = this.shortcutItems.get(id);
        if (shortcut && !shortcut.isBound()) this.deleteShortcut(id);
      });

    if (deleteApplication) this._parent.deleteApplication(this._id);

    const signalId = this.manager.connectSignal(
      this._leaflet,
      'notify::child-transition-running',
      true,
      (/** @type {import('@girs/adw-1').Adw.Leaflet} */ leaflet) => {
        const transitionRunning = leaflet.child_transition_running;
        if (!transitionRunning) {
          this.manager.disconnectSignal(signalId);
          this._parent.removePage();
        }
      }
    );

    this._leaflet.set_visible_child(this._parent);
  }

  cleanup(withSettings = false, subpaths = []) {
    this.shortcutItems.forEach(shortcutItem => {
      wrapCallback(() => this._shortcuts.remove(shortcutItem));
      shortcutItem.cleanup();
    });

    this.manager.cleanup(withSettings, subpaths);
    this.manager = null;

    this.listFactory.cleanup();
    this.listFactory = null;

    this.gestureDrag.destroy();
    this.gestureDrag = null;

    this.shortcutItems.clear();
    this.shortcutItems = null;

    this._leaflet = null;
    this._parent = null;
    this._id = null;

    wrapCallback(() => this.run_dispose());
  }

  _initFromSettings() {
    this.manager.bindDefaultSettings(this, ApplicationClass.bindings);

    this.manager.getSettings().get_strv('shortcuts').forEach(this.addShortcut.bind(this, null));

    this.manager.connectSettings('changed::shortcuts', false, this._changeNoShortcutsVisibility.bind(this));

    this._setApplicationId(this.manager.getSettings().get_string('id'));

    this.manager.connectSettings('changed::gridsize', false, this._enforceProportions.bind(this));
    this.manager.connectSettings('changed::columnstart', false, this._enforceProportions.bind(this));
    this.manager.connectSettings('changed::rowstart', false, this._enforceProportions.bind(this));
    this.manager.connectSettings('changed::width', false, this._enforceProportions.bind(this));
    this.manager.connectSettings('changed::height', false, this._enforceProportions.bind(this));
    this.manager.connectSettings('changed::topleftx', false, this._enforcePixels.bind(this));
    this.manager.connectSettings('changed::toplefty', false, this._enforcePixels.bind(this));
  }

  _enforcePixels() {
    const topLeftX = this.manager.getSettings().get_int('topleftx');
    const topLeftY = this.manager.getSettings().get_int('toplefty');
    const bottomRightX = this.manager.getSettings().get_int('bottomrightx');
    const bottomRightY = this.manager.getSettings().get_int('bottomrighty');

    if (bottomRightX < topLeftX) {
      this.manager.getSettings().set_int('bottomrightx', topLeftX);
    }

    if (bottomRightY < topLeftY) {
      this.manager.getSettings().set_int('bottomrighty', topLeftY);
    }
  }

  _enforceProportions() {
    const gridSize = this.manager.getSettings().get_int('gridsize');
    let columnStart = this.manager.getSettings().get_int('columnstart');
    let rowStart = this.manager.getSettings().get_int('rowstart');
    let width = this.manager.getSettings().get_int('width');
    let height = this.manager.getSettings().get_int('height');

    if (columnStart > gridSize) {
      columnStart = gridSize;
      this.manager.getSettings().set_int('columnstart', columnStart);
    }

    if (rowStart > gridSize) {
      rowStart = gridSize;
      this.manager.getSettings().set_int('rowstart', rowStart);
    }

    if (width > gridSize - columnStart + 1) {
      width = gridSize - columnStart;
      this.manager.getSettings().set_int('width', width);
    }

    if (height > gridSize - rowStart + 1) {
      height = gridSize - rowStart;
      this.manager.getSettings().set_int('height', height);
    }

    this._widthAdjustment.set_upper(gridSize - columnStart + 1);
    this._heightAdjustment.set_upper(gridSize - rowStart + 1);

    this._drawProportions();
  }

  /**
   * @param {string} id
   */
  _setApplicationId(id) {
    this.manager.getSettings().set_string('id', id);
  }

  /**
   * @param {string[]} shortcuts
   */
  _changeNoShortcutsVisibility(shortcuts) {
    this._noShortcuts.set_visible(shortcuts.length === 0);
  }

  _setSortFunc() {
    this._shortcuts.set_sort_func((a, b) => {
      const shortcutIds = this.manager.getSettings().get_strv('shortcuts');
      return (
        // @ts-ignore
        shortcutIds.findIndex(p => p === a.getId()) -
        // @ts-ignore
        shortcutIds.findIndex(p => p === b.getId())
      );
    });
  }

  _setupDrawingArea() {
    this.gestureDrag = new GestureDrag(this._drawingArea);
    this.gestureDrag.dragBegin(this._calculatePosition.bind(this));
    this.gestureDrag.dragUpdate(this._calculatePosition.bind(this));
    this.gestureDrag.dragEnd(this._calculatePosition.bind(this));
    this._enforceProportions();
    this._enforcePixels();
  }

  /**
   * @param {import('@girs/gtk-4.0').Gtk.GestureDrag} _
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  _calculatePosition(_, x, y, width, height) {
    const gridSize = this.manager.getSettings().get_int('gridsize');
    const areaWidth = this._drawingArea.get_allocated_width();
    const areaHeight = this._drawingArea.get_allocated_height();

    const cellWidth = areaWidth / gridSize;
    const cellHeight = areaHeight / gridSize;

    const x1 = Math.floor(x / cellWidth);
    const y1 = Math.floor(y / cellHeight);
    const x2 = Math.floor((x + width) / cellWidth);
    const y2 = Math.floor((y + height) / cellHeight);
    const startX = Math.max(Math.min(x1, x2), 0);
    const startY = Math.max(Math.min(y1, y2), 0);
    const endX = Math.min(Math.max(x1, x2), gridSize - 1);
    const endY = Math.min(Math.max(y1, y2), gridSize - 1);

    this.manager.getSettings().set_int('columnstart', startX + 1);
    this.manager.getSettings().set_int('rowstart', startY + 1);
    this.manager.getSettings().set_int('width', endX - startX + 1);
    this.manager.getSettings().set_int('height', endY - startY + 1);
  }

  _drawProportions() {
    const gridSize = this.manager.getSettings().get_int('gridsize');
    const columnStart = this.manager.getSettings().get_int('columnstart');
    const width = this.manager.getSettings().get_int('width');
    const rowStart = this.manager.getSettings().get_int('rowstart');
    const height = this.manager.getSettings().get_int('height');

    this._drawingArea.set_draw_func((drawingArea, context) => {
      const areaWidth = drawingArea.get_allocated_width();
      const areaHeight = drawingArea.get_allocated_height();

      const color = new Gdk.RGBA();
      color.parse('rgba(131, 131, 131, 0.8)');

      Gdk.cairo_set_source_rgba(context, color);
      context.setLineWidth(1);

      const cellWidth = areaWidth / gridSize;
      const cellHeight = areaHeight / gridSize;

      range(0, gridSize + 1).forEach(column => {
        context.moveTo(column * cellWidth, 0);
        context.lineTo(column * cellWidth, areaHeight);
        context.stroke();
      });

      range(0, gridSize + 1).forEach(row => {
        context.moveTo(0, row * cellHeight);
        context.lineTo(areaWidth, row * cellHeight);
        context.stroke();
      });

      range(columnStart, columnStart + width).forEach(column => {
        range(rowStart, rowStart + height).forEach(row => {
          context.moveTo((column - 1) * cellWidth, (row - 1) * cellHeight);
          context.lineTo(column * cellWidth, (row - 1) * cellHeight);
          context.lineTo(column * cellWidth, row * cellHeight);
          context.lineTo((column - 1) * cellWidth, row * cellHeight);
          context.lineTo((column - 1) * cellWidth, (row - 1) * cellHeight);
          context.strokePreserve();
          context.fill();
        });
      });

      context.$dispose();
    });
  }

  _populateApplicationNames() {
    const id = this.manager.getSettings().get_string('id');
    const applications = Gio.AppInfo.get_all()
      .filter(a => a.should_show())
      .sort((app1, app2) => app1.get_name().toLowerCase().localeCompare(app2.get_name().toLowerCase()))
      .map(application => ({
        title: application.get_name(),
        value: application.get_id(),
        metadata: application
      }));

    applications.unshift({
      // The default application name when creating a new application
      title: _('No App Selected'),
      value: '',
      metadata: null
    });

    this.listFactory = new ListFactory(AppName, applications);
    this._applicationName.set_factory(this.listFactory);
    this._applicationName.set_model(this.listFactory.getModel());
    this._applicationName.set_expression(this.listFactory.getExpression());
    this._applicationName.set_selected(this.listFactory.getPosition(id));
  }

  _typeWidgets() {
    /** @type {import('@girs/gtk-4.0').Gtk.ListBox} */
    this._shortcuts;

    /** @type {import('@girs/gtk-4.0').Gtk.DropDown} */
    this._applicationName;

    /** @type {import('@girs/gtk-4.0').Gtk.Image} */
    this._iconHeader;

    /** @type {import('@girs/gtk-4.0').Gtk.Label} */
    this._labelHeader;

    /** @type {import('@girs/adw-1').Adw.ActionRow} */
    this._noShortcuts;

    /** @type {import('@girs/gtk-4.0').Gtk.DrawingArea} */
    this._drawingArea;

    /** @type {import('@girs/gtk-4.0').Gtk.Adjustment} */
    this._widthAdjustment;

    /** @type {import('@girs/gtk-4.0').Gtk.Adjustment} */
    this._heightAdjustment;
  }
}

var application = GObject.registerClass(
  {
    GTypeName: 'FWApplication',
    Template: Me.dir.get_child('ui/application.ui').get_uri(),
    InternalChildren: [
      'applicationName',
      'iconHeader',
      'labelHeader',
      'shortcuts',
      'noShortcuts',
      'drawingArea',
      'widthAdjustment',
      'heightAdjustment',
      ...Object.keys(ApplicationClass.bindings)
    ]
  },
  ApplicationClass
);

/**
 * @typedef {Object} ApplicationPreferences
 * @property {import('$lib/prefs/shortcutItem').ShortcutPreferences[]} shortcuts
 * @property {boolean} enabled
 * @property {string} id
 * @property {boolean} launch
 * @property {string} commandLineArguments
 * @property {boolean} filterByTitle
 * @property {string} titleToMatch
 * @property {boolean} filterByWorkspace
 * @property {boolean} filterToCurrentWorkspace
 * @property {number} workspaceToMatch
 * @property {boolean} filterByMonitor
 * @property {boolean} filterToCurrentMonitor
 * @property {number} monitorToMatch
 * @property {boolean} moveOnFocus
 * @property {boolean} moveToCurrentWorkspace
 * @property {boolean} moveToCurrentMonitor
 * @property {boolean} resizeOnFocus
 * @property {boolean} maximize
 * @property {boolean} restrictResize
 * @property {boolean} usePixels
 * @property {number} topLeftX
 * @property {number} topLeftY
 * @property {number} bottomRightX
 * @property {number} bottomRightY
 * @property {boolean} useProportions
 * @property {number} gridSize
 * @property {number} columnStart
 * @property {number} width
 * @property {number} rowStart
 * @property {number} height
 * @property {boolean} minimize
 * @property {boolean} alwaysOnTop
 * @property {boolean} disableAnimations
 */
