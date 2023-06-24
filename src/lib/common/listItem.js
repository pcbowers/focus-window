const { GObject } = imports.gi;

/** @typedef {typeof ListItemClass} ListItem */
class ListItemClass extends GObject.Object {
  /**
   * @param {{ value: string, title: string, metadata?: Object }} ListItemProps
   */
  constructor(ListItemProps) {
    super({});
    this.value = ListItemProps.value;
    this.title = ListItemProps.title;
    this.metadata = ListItemProps.metadata || {};
  }
}

var listItem = GObject.registerClass(
  {
    GTypeName: 'FWListItem',
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
      ),
      metadata: GObject.ParamSpec.jsobject(
        'metadata',
        'Metadata',
        'The metadata that should be returned',
        GObject.ParamFlags.READWRITE
      )
    }
  },
  ListItemClass
);
