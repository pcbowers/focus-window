const { GObject, Gtk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @type {import('$lib/common/listItem').ListItem} */
const ListItem = Me.imports.lib.common.listItem.listItem;

/** @typedef {typeof ListFactoryClass} ListFactory */
class ListFactoryClass extends Gtk.SignalListItemFactory {
  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /**
   * @param {GtkWidgetWithSetup} widgetToRender
   * @param {{ value: string, title: string, metadata?: Object }[]} items
   */
  constructor(widgetToRender, items) {
    super({});

    // set class properties
    this._widgetToRender = widgetToRender;
    this._items = items;

    // create the model
    this._model = new Gio.ListStore({ item_type: ListItem.$gtype });
    this._items.forEach(item => this._model.append(new ListItem(item)));

    // create the expression
    this._expression = new Gtk.PropertyExpression(ListItem.$gtype, null, 'title');

    // create the manager
    this.manager = new Manager({ includeSettings: false });
    this.manager.connectSignal(this, 'setup', false, this._setup.bind(this));
    this.manager.connectSignal(this, 'bind', false, this._bind.bind(this));
  }

  /**
   * Set the child of the list item to the widget
   * @param {import('@girs/gtk-4.0').Gtk.ListItemFactory} _
   * @param {import('@girs/gtk-4.0').Gtk.ListItem} listItem
   */
  _setup(_, listItem) {
    listItem.set_child(new this._widgetToRender());
  }

  /**
   * Call the setup method of the child widget
   * @param {import('@girs/gtk-4.0').Gtk.ListItemFactory} _
   * @param {import('@girs/gtk-4.0').Gtk.ListItem} listItem
   */
  _bind(_, listItem) {
    const child = /** @type {InstanceType<GtkWidgetWithSetup>} */ (listItem.get_child());
    const item = /** @type {InstanceType<import('$lib/common/listItem').ListItem>} */ (listItem.get_item());

    child.setup(item);
  }

  /**
   * Get the position of the item in the list by value
   * @param {string} value
   */
  getPosition(value) {
    const position = this._items.findIndex(item => item.value === value);
    return position === -1 ? 0 : position;
  }

  /**
   * Get the item at a position in the list
   * @param {number} position
   */
  getItem(position) {
    return this._items[position];
  }

  getModel() {
    return this._model;
  }

  getExpression() {
    return this._expression;
  }

  cleanup() {
    this.manager.cleanup();
    this.manager = null;

    this._model.run_dispose();
    this._model = null;

    this._expression = null;

    wrapCallback(() => this.run_dispose());
  }
}

var listFactory = GObject.registerClass({ GTypeName: 'FWListFactory' }, ListFactoryClass);

/**
 * @typedef {{ new(): import('@girs/gtk-4.0').Gtk.Widget & { setup: (listItem: InstanceType<import('$lib/common/listItem').ListItem>) => void } }} GtkWidgetWithSetup
 */
