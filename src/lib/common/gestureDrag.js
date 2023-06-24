const { GObject, Gtk, Gio } = imports.gi;
const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

/** @type {import('$lib/common/utils').Utils} */
const { debug, wrapCallback } = Me.imports.lib.common.utils.utils;

/** @type {import('$lib/common/manager').Manager} */
const Manager = Me.imports.lib.common.manager.manager;

/** @typedef {typeof GestureDragClass} GestureDrag */
class GestureDragClass extends Gtk.GestureDrag {
  /**@type {InstanceType<import('$lib/common/manager').Manager>} */
  manager;

  /** @type {number} */
  _x;

  /** @type {number} */
  _y;

  /**
   * @param {import('@girs/gtk-4.0').Gtk.DrawingArea} drawingArea
   */
  constructor(drawingArea) {
    super({});

    this.manager = new Manager({ includeSettings: false });

    drawingArea.add_controller(this);
  }

  /**
   * Connect to the drag-begin signal
   * @param {(gesture: import('@girs/gtk-4.0').Gtk.GestureDrag, x: number, y: number, width: 0, height: 0) => void} callback
   */
  dragBegin(callback) {
    this.manager.connectSignal(this, 'drag-begin', false, (gesture, x, y) => {
      this._x = x;
      this._y = y;
      callback(gesture, x, y, 0, 0);
    });
  }

  /**
   * Connect to the drag-update signal
   * @param {(gesture: import('@girs/gtk-4.0').Gtk.GestureDrag, x: number, y: number, width: number, height: number) => void} callback
   */
  dragUpdate(callback) {
    this.manager.connectSignal(this, 'drag-update', false, (gesture, width, height) => {
      callback(gesture, this._x, this._y, width, height);
    });
  }

  /**
   * Connect to the drag-end signal
   * @param {(gesture: import('@girs/gtk-4.0').Gtk.GestureDrag, x: number, y: number, width: number, height: number) => void} callback
   */
  dragEnd(callback) {
    this.manager.connectSignal(this, 'drag-end', false, (gesture, width, height) => {
      callback(gesture, this._x, this._y, width, height);
    });
  }

  destroy() {
    this.manager.cleanup();
    this.manager = null;

    this._x = null;
    this._y = null;

    wrapCallback(() => this.run_dispose());
  }
}

var gestureDrag = GObject.registerClass({ GTypeName: 'FWGestureDrag' }, GestureDragClass);
