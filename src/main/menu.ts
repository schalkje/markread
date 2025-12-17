/**
 * Application Menu
 * Provides native menu bar with File menu
 */

import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: 'MarkRead',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-file');
          },
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            mainWindow.webContents.send('menu:open-folder');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Close Current',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('menu:close-current');
          },
        },
        {
          label: 'Close Folder',
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => {
            mainWindow.webContents.send('menu:close-folder');
          },
        },
        {
          label: 'Close All',
          accelerator: 'CmdOrCtrl+Shift+Alt+W',
          click: () => {
            mainWindow.webContents.send('menu:close-all');
          },
        },
        { type: 'separator' as const },
        ...(isMac
          ? [{ role: 'close' as const }]
          : [{ role: 'quit' as const }]),
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' as const },
                  { role: 'stopSpeaking' as const },
                ],
              },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        // T051k-view: Document Zoom submenu
        {
          label: 'Document Zoom (Content Only)',
          submenu: [
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+=',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-in');
              },
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+-',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-out');
              },
            },
            {
              label: 'Reset to 100%',
              accelerator: 'CmdOrCtrl+Shift+0',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-reset');
              },
            },
            { type: 'separator' as const },
            {
              label: '10%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 10);
              },
            },
            {
              label: '25%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 25);
              },
            },
            {
              label: '50%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 50);
              },
            },
            {
              label: '75%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 75);
              },
            },
            {
              label: '100% (Default)',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 100);
              },
            },
            {
              label: '125%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 125);
              },
            },
            {
              label: '150%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 150);
              },
            },
            {
              label: '200%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 200);
              },
            },
            {
              label: '400%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 400);
              },
            },
            {
              label: '800%',
              click: () => {
                mainWindow.webContents.send('menu:content-zoom-preset', 800);
              },
            },
          ],
        },
        // T051k-view: Global Zoom submenu
        {
          label: 'Window Zoom (Entire UI)',
          submenu: [
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+Alt+=',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-in');
              },
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+Alt+-',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-out');
              },
            },
            {
              label: 'Reset to 100%',
              accelerator: 'CmdOrCtrl+Alt+0',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-reset');
              },
            },
            { type: 'separator' as const },
            {
              label: '50%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 50);
              },
            },
            {
              label: '75%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 75);
              },
            },
            {
              label: '100% (Default)',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 100);
              },
            },
            {
              label: '125%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 125);
              },
            },
            {
              label: '150%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 150);
              },
            },
            {
              label: '200%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 200);
              },
            },
            {
              label: '300%',
              click: () => {
                mainWindow.webContents.send('menu:global-zoom-preset', 300);
              },
            },
          ],
        },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/yourusername/markread');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
