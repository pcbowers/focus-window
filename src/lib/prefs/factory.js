const { GObject, Gtk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Debug} */
const debug = Me.imports.lib.common.utils.debug;

/** @type {import('$lib/prefs/listitem').ListItem} */
const ListItem = Me.imports.lib.prefs.listitem.listitem;

/** @typedef {typeof FactoryClass} Factory */
/** @typedef {FactoryClass} FactoryInstance */
class FactoryClass extends Gtk.SignalListItemFactory {
  /** @type {number} */
  _setupId;

  /** @type {number} */
  _bindId;

  /**
   * @param {import('@girs/gtk-4.0').Gtk.SignalListItemFactory.ConstructorProperties} GtkSignalListItemFactoryProps
   * @param {typeof import('@girs/gtk-4.0').Gtk.Widget} GtkWidget
   * @param {{ value: string, title: string }[]} items
   */
  constructor(GtkSignalListItemFactoryProps, GtkWidget, items) {
    super(GtkSignalListItemFactoryProps);
    this._renderObject = GtkWidget;
    this._items = items;
    this._model = Gio.ListStore.new(ListItem.$gtype);
    this._expression = Gtk.PropertyExpression.new(ListItem.$gtype, null, 'value');
    this._items.forEach(item => this._model.append(new ListItem(item)));
    this._setupId = this.connect('setup', this._setup.bind(this));
    this._bindId = this.connect('bind', this._bind.bind(this));
  }

  /**
   * @param {import('@girs/gtk-4.0').Gtk.ListItemFactory} factory
   * @param {import('@girs/gtk-4.0').Gtk.ListItem} listItem
   */
  _setup(factory, listItem) {
    listItem.set_child(new this._renderObject());
  }

  /**
   * @param {import('@girs/gtk-4.0').Gtk.ListItemFactory} factory
   * @param {import('@girs/gtk-4.0').Gtk.ListItem} listItem
   */
  _bind(factory, listItem) {
    const child = listItem.get_child();
    const item = listItem.get_item();

    // @ts-ignore
    child.setup(item);
  }

  /**
   * @param {string} value
   */
  getPosition(value) {
    const position = this._items.findIndex(item => item.value === value);
    return position === -1 ? 0 : position;
  }

  /**
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

  destroy() {
    this.disconnect(this._setupId);
    this.disconnect(this._bindId);
  }
}

var factory = GObject.registerClass(
  {
    GTypeName: 'FactoryObject',
    Properties: {
      icon: GObject.ParamSpec.string(
        'icon',
        'Icon',
        'The icon name',
        GObject.ParamFlags.READWRITE,
        null
      )
    }
  },
  FactoryClass
);
