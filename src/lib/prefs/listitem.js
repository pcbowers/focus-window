const { GObject } = imports.gi;

/** @typedef {typeof ListItemClass} ListItem */
/** @typedef {ListItemClass} ListItemInstance */
class ListItemClass extends GObject.Object {
  /**
   * @param {{ value: string, title: string }} ListItemProps
   */
  constructor(ListItemProps) {
    super(ListItemProps);
    this.value = ListItemProps.value;
    this.title = ListItemProps.title;
  }
}

var listitem = GObject.registerClass(
  {
    GTypeName: 'ListItemObject',
    Properties: {
      value: GObject.ParamSpec.string(
        'value',
        'Value',
        'The value that should be returned',
        GObject.ParamFlags.READWRITE,
        null
      ),
      title: GObject.ParamSpec.string(
        'title',
        'Title',
        'The title that should be displayed',
        GObject.ParamFlags.READWRITE,
        null
      )
    }
  },
  ListItemClass
);
