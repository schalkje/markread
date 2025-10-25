using System;
using System.Windows;
using System.Windows.Interop;

using MarkRead.App.Services;

using FormsDialog = System.Windows.Forms.FolderBrowserDialog;
using FormsDialogResult = System.Windows.Forms.DialogResult;
using FormsWindow = System.Windows.Forms.IWin32Window;

namespace MarkRead.App.UI.Shell;

public sealed class OpenFolderCommand
{
    private readonly FolderService _folderService;

    public OpenFolderCommand(FolderService folderService)
    {
        _folderService = folderService;
    }

    public FolderOpenResult? Execute(Window owner)
    {
        var hwnd = new WindowInteropHelper(owner).Handle;

        using var dialog = new FormsDialog
        {
            Description = "Select the root folder containing your Markdown documentation.",
            UseDescriptionForTitle = true,
            ShowNewFolderButton = false
        };

        var result = dialog.ShowDialog(new Win32Window(hwnd));
        if (result != FormsDialogResult.OK || string.IsNullOrWhiteSpace(dialog.SelectedPath))
        {
            return null;
        }

        try
        {
            var root = _folderService.CreateRoot(dialog.SelectedPath);
            var defaultDocument = _folderService.ResolveDefaultDocument(root);
            return new FolderOpenResult(root, defaultDocument);
        }
        catch (InvalidOperationException ex)
        {
            System.Windows.MessageBox.Show(owner, ex.Message, "MarkRead", MessageBoxButton.OK, MessageBoxImage.Error);
            return null;
        }
    }

    private sealed class Win32Window : FormsWindow
    {
        public Win32Window(nint handle)
        {
            Handle = handle;
        }

        public nint Handle { get; }
    }
}

public readonly record struct FolderOpenResult(FolderRoot Root, DocumentInfo? DefaultDocument);
