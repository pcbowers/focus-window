import Shell from '@girs/shell-12';

// All these types help extend the existing types from GJS and Gnome Shell.
// Check GJS types here: https://gitlab.gnome.org/GNOME/gjs
// Check Gnome Shell types here: https://gitlab.gnome.org/GNOME/gnome-shell

declare module '@girs/cairo-1.0' {
  namespace cairo {
    interface Context {
      setLineWidth: (width: number) => void;
      moveTo: (x: number, y: number) => void;
      lineTo: (x: number, y: number) => void;
      stroke: () => void;
      strokePreserve: () => void;
      fill: () => void;
      $dispose: () => void;
    }
  }
}

declare module '@girs/gdk-4.0' {
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

declare module '@girs/gnome-shell/src/ui/main' {
  const wm: {
    allowKeybinding: (name: string, modes: Shell.ActionMode) => void;
  };
}

declare module '@girs/gjs/gettext' {
  export function domain(domainName: string): {
    gettext: (msgid: string) => string;
    ngettext: (
      msgid: string,
      msgid_plural: string,
      n: number
    ) => {
      format: (n: number) => string;
    };
    pgettext: (context: string, msgid: string) => string;
  };
}

declare global {
  interface GjsImports {
    ui: typeof import('@girs/gnome-shell').ui;
    misc: typeof import('@girs/gnome-shell').misc;
  }

  const global: Shell.Global;
}
