/**
 * IPC Contract: Window Management
 *
 * Window operations, native menus, keyboard shortcuts, and OS integration.
 *
 * FR-026-029, FR-062
 * Pattern: invoke/handle + events
 */

export namespace WindowOperations {
  /** Get current window bounds (FR-062) */
  export interface GetWindowBoundsRequest {
    channel: 'window:getBounds';
    payload: {};
  }

  export interface GetWindowBoundsResponse {
    success: boolean;
    bounds?: { x: number; y: number; width: number; height: number; isMaximized: boolean };
  }

  /** Set window bounds (FR-062) */
  export interface SetWindowBoundsRequest {
    channel: 'window:setBounds';
    payload: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean };
  }

  export interface SetWindowBoundsResponse {
    success: boolean;
  }

  /** Minimize/maximize/close window (FR-027) */
  export interface WindowControlRequest {
    channel: 'window:control';
    payload: { action: 'minimize' | 'maximize' | 'unmaximize' | 'close' };
  }

  export interface WindowControlResponse {
    success: boolean;
  }

  /** Register global keyboard shortcut (FR-029) */
  export interface RegisterGlobalShortcutRequest {
    channel: 'window:registerShortcut';
    payload: { accelerator: string; commandId: string };
  }

  export interface RegisterGlobalShortcutResponse {
    success: boolean;
    error?: string;
  }

  /** Show native context menu (FR-024, FR-026) */
  export interface ShowContextMenuRequest {
    channel: 'window:showContextMenu';
    payload: { items: ContextMenuItem[]; x?: number; y?: number };
  }

  export interface ShowContextMenuResponse {
    success: boolean;
    selectedId?: string;  // ID of selected menu item
  }

  /** Update application menu (FR-026) */
  export interface UpdateMenuRequest {
    channel: 'window:updateMenu';
    payload: { menuTemplate: MenuTemplate };
  }

  export interface UpdateMenuResponse {
    success: boolean;
  }
}

export namespace WindowEvents {
  /** Window bounds changed */
  export interface WindowBoundsChangedEvent {
    channel: 'window:boundsChanged';
    payload: { x: number; y: number; width: number; height: number; isMaximized: boolean };
  }

  /** Window focus changed */
  export interface WindowFocusEvent {
    channel: 'window:focus';
    payload: { focused: boolean };
  }
}

export interface ContextMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  checked?: boolean;
  type?: 'normal' | 'separator' | 'checkbox';
  submenu?: ContextMenuItem[];
}

export interface MenuTemplate {
  file: MenuItem[];
  edit: MenuItem[];
  view: MenuItem[];
  go: MenuItem[];
  help: MenuItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  accelerator?: string;
  role?: string;  // Electron menu role
  enabled?: boolean;
  visible?: boolean;
  submenu?: MenuItem[];
  type?: 'normal' | 'separator' | 'checkbox' | 'radio';
}
