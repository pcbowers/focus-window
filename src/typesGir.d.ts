import Gdk from '$types/gdk-4.0';

declare module '$types/gtk-4.0' {
  namespace Gtk {
    interface Native {
      get_surface: () => Gdk.Surface;
    }
  }
}

declare module '$types/gdk-4.0' {
  namespace Gdk {
    interface Surface {
      inhibit_system_shortcuts: Gdk.Toplevel['inhibit_system_shortcuts'];
      restore_system_shortcuts: Gdk.Toplevel['restore_system_shortcuts'];
    }
  }
}

declare module '@girs/gnome-shell' {
  interface Extension {
    imports: any;
    dir: any;
  }
}
