# Troubleshooting

> 📍 **Navigation**: [Home](../../README.md) → [Documentation](../README.md) → [User Guide](.) → Troubleshooting

Solutions to common issues and problems with MarkRead.

## Installation Issues

### "This app can't run on your PC"

**Cause**: Incompatible Windows version or architecture

**Solutions**:
1. Check Windows version: Press `Win+R`, type `winver`, press Enter
2. Ensure Windows 10 (1809+) or Windows 11
3. Verify 64-bit Windows (`Settings` → `System` → `About`)
4. Download correct installer (x64 vs ARM64)

### ".NET Runtime not found"

**Cause**: .NET 8 Desktop Runtime missing

**Solutions**:
1. Download from [dot net.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0)
2. Install ".NET Desktop Runtime x64"
3. Restart computer
4. Re-run MarkRead installer

### "WebView2 initialization failed"

**Cause**: WebView2 runtime missing or corrupted

**Solutions**:
```powershell
# Option 1: Download from Microsoft
# Visit: https://developer.microsoft.com/microsoft-edge/webview2/

# Option 2: Reinstall Edge (includes WebView2)
# Settings → Apps → Microsoft Edge → Modify → Repair

# Option 3: Install standalone WebView2
winget install Microsoft.EdgeWebView2Runtime
```

### Installation hangs at "Installing components"

**Solutions**:
1. Run installer as Administrator
2. Temporarily disable antivirus
3. Check disk space (need 500MB free)
4. Close all running applications
5. Restart computer and try again

## Startup Issues

### MarkRead won't start / crashes on launch

**Diagnostic steps**:

```powershell
# Run from command line to see error
"C:\Program Files\MarkRead\MarkRead.exe" --verbose

# Check Windows Event Viewer
eventvwr.msc
# Navigate to: Windows Logs → Application
# Look for MarkRead errors
```

**Common fixes**:
1. Delete settings file:
   ```powershell
   Remove-Item "$env:APPDATA\MarkRead\settings.json"
   ```
2. Clear cache:
   ```powershell
   Remove-Item "$env:APPDATA\MarkRead\cache" -Recurse
   ```
3. Reinstall MarkRead
4. Check antivirus isn't blocking MarkRead

### "Access Denied" on startup

**Cause**: Insufficient permissions

**Solutions**:
1. Run as Administrator (right-click → "Run as administrator")
2. Check folder permissions on `%APPDATA%\MarkRead`
3. Reinstall to user folder instead of Program Files
4. Use portable version

### Blank window / White screen

**Cause**: WebView2 rendering issue

**Solutions**:
```powershell
# Clear WebView2 cache
Remove-Item "$env:LOCALAPPDATA\MarkRead\WebView2" -Recurse

# Disable GPU acceleration
MarkRead.exe --disable-gpu

# Or in settings:
# Settings → Advanced → Disable Hardware Acceleration
```

## Display and Rendering Issues

### Content not rendering / blank document area

**Checks**:
1. Is the file actually Markdown (.md extension)?
2. Is the file empty?
3. Try opening a different file

**Solutions**:
1. Press `F5` to refresh
2. Close tab and reopen file
3. Check Settings → Performance → Enable Rendering
4. View browser console: `F12` → Console tab (look for errors)

### Syntax highlighting not working

**For all languages**:
```
Settings → Appearance → Syntax Theme → Reset to Default
Settings → Performance → Enable Syntax Highlighting ✓
```

**For specific language**:
```markdown
<!-- Ensure language is specified correctly -->
❌ ```Python       <!-- Capital P might not work -->
✓ ```python
```

Supported: `python`, `javascript`, `typescript`, `csharp`, `java`, `sql`, `yaml`, `json`, `bash`, `powershell`

### Mermaid diagrams not showing

**Checks**:
```markdown
<!-- Ensure proper syntax -->
✓ ```mermaid
  graph TD
    A --> B
```
```

**Solutions**:
1. Check browser console (`F12`) for mermaid errors
2. Validate syntax at [mermaid.live](https://mermaid.live)
3. Settings → Performance → Enable Mermaid Rendering
4. Try simpler diagram to test

### Images not loading

**Check file path**:
```markdown
<!-- Relative paths work best -->
✓ ![Logo](./images/logo.png)
✓ ![Logo](../assets/logo.png)
❌ ![Logo](C:\absolute\path\logo.png)  <!-- May not work -->
```

**Solutions**:
1. Verify image file exists at specified path
2. Use forward slashes `/`, not backslashes `\`
3. Check image file isn't corrupted
4. Try different image format (PNG, JPG, SVG)
5. Check file permissions on image

### Fonts look weird / wrong font displaying

**Solutions**:
1. Settings → Appearance → Reset Fonts to Default
2. Ensure font is installed on system
3. Clear font cache:
   ```powershell
   Stop-Service FontCache
   Remove-Item "$env:WINDIR\ServiceProfiles\LocalService\AppData\Local\FontCache\*"
   Start-Service FontCache
   ```
4. Restart MarkRead

## Performance Issues

### Slow startup

**Causes**: Large session restore, indexing, slow disk

**Solutions**:
```
Settings → Performance → Fast Startup Mode ✓
Settings → Behavior → Restore Tabs on Startup ✗
Settings → Performance → Enable Indexing ✗ (for large folders)
```

### Lag when scrolling

**For large documents**:
```
Settings → Performance → Large File Threshold: 500 KB
Settings → Performance → Max Rendered Elements: 5000
```

**General**:
```
Settings → Performance → Disable Animations ✓
Settings → Appearance → Reduce Motion ✓
Settings → Advanced → Disable Hardware Acceleration ✓
```

### High memory usage

**Check memory**:
```
Ctrl+Shift+P → "Show Memory Usage"
```

**Reduce usage**:
```
Settings → Performance → Aggressive Memory Saving ✓
Settings → Performance → Inactive Tab Unload Time: 5 minutes
Close unused tabs: Ctrl+W
```

**Hard reset**:
```powershell
# Close MarkRead
# Clear cache
Remove-Item "$env:APPDATA\MarkRead\cache" -Recurse
# Restart
```

### Application freezing / not responding

**Immediate**:
- Wait 30 seconds (might be large file rendering)
- Press `Escape` to cancel operations
- `Ctrl+W` to close problematic tab

**If frozen**:
```
Task Manager → MarkRead → End Task
```

**Prevent**:
```
Settings → Performance → Large File Warning ✓
Avoid opening files > 10 MB
Close tabs when not needed
```

## Search Issues

### Search not finding text I can see

**Checks**:
- Is Case Sensitive mode on? (`Alt+C` to toggle)
- Is Whole Word mode on? (`Alt+W` to toggle)
- Are you searching in right tab?

**Solutions**:
1. Try Global Search (`Ctrl+Shift+F`)
2. Refresh document (`F5`)
3. Check if text is in image or diagram

### Global search returns no results

**Solutions**:
1. Wait for indexing to complete (check status bar)
2. Settings → Performance → Enable Indexing ✓
3. Check exclude patterns in Settings → Search
4. Try rebuilding index:
   ```
   Settings → Advanced → Rebuild Search Index
   ```

## Navigation Issues

### Links not working

**Internal links**:
```markdown
<!-- Check link format -->
✓ [Guide](./guide.md)
✓ [API](../api/reference.md)
❌ [Guide](guide.md.txt)
❌ [Guide](.\guide.md)  <!-- Backslash -->
```

**Solutions**:
1. Ensure target file exists in folder tree
2. Use forward slashes `/`
3. Check relative path is correct
4. View browser console (`F12`) for errors

### Back/Forward not working

**Checks**:
- Are you at the beginning/end of history?
- Is this a new tab?

**Solutions**:
1. History only tracks navigation in current tab
2. Opening new tab starts fresh history
3. Check Settings → Behavior → Enable Navigation History

### Sidebar not showing files

**Solutions**:
```
Ctrl+B - Toggle sidebar visibility
Settings → Behavior → Show File Tree by Default ✓
```

**If still hidden**:
1. Try resizing window (might be auto-hidden due to width)
2. Settings → Appearance → Sidebar Width: Reset
3. Restart MarkRead

## File Watching Issues

### Files not auto-reloading

**Checks**:
```
Settings → Behavior → Auto-reload on File Change ✓
```

**Solutions**:
1. Try manual reload (`F5`)
2. Check file isn't locked by another program
3. Increase debounce: Settings → Behavior → Reload Debounce: 500ms
4. Restart MarkRead

### Too many reload notifications

**Cause**: File changing too frequently (build output, etc.)

**Solutions**:
```
Settings → Behavior → Auto-reload on File Change ✗
Settings → Behavior → Reload Debounce: 1000ms (1 second)
```

## Settings Issues

### Settings not saving

**Checks**:
```powershell
# Check permissions
icacls "$env:APPDATA\MarkRead"
```

**Solutions**:
1. Run as Administrator
2. Check disk isn't full
3. Antivirus might be blocking writes
4. Use portable version if issues persist

### Settings reset after update

**Cause**: Corrupted settings file or major version upgrade

**Solutions**:
1. Keep backup: Settings → Advanced → Export Settings
2. Re-import after update
3. Check `%APPDATA%\MarkRead\settings.json.bak` for backup

## Crash Reporting

### Collect crash information

```powershell
# Find crash dumps
explorer "$env:LOCALAPPDATA\MarkRead\CrashDumps"

# Find log files
explorer "$env:APPDATA\MarkRead\logs"

# Enable verbose logging
MarkRead.exe --verbose --log-level debug
```

### Submit bug report

1. Go to [GitHub Issues](https://github.com/schalkje/markread/issues)
2. Click "New Issue"
3. Use "Bug Report" template
4. Include:
   - MarkRead version (`Help` → `About`)
   - Windows version (`winver`)
   - Steps to reproduce
   - Log files
   - Screenshots if applicable

## Getting More Help

### Documentation

- [FAQ](faq.md) - Frequently asked questions
- [User Guide](../user-guide/) - Complete usage guide
- [Settings](settings.md) - Configuration reference

### Community

- [GitHub Discussions](https://github.com/schalkje/markread/discussions) - Ask questions
- [GitHub Issues](https://github.com/schalkje/markread/issues) - Report bugs

### Diagnostic Tools

**System Information**:
```
Help → About → Copy System Info
```

**Generate Support Bundle**:
```
Help → Generate Support Bundle
```

Includes:
- System information
- MarkRead version
- Settings (sanitized)
- Recent logs
- Crash dumps

## Common Error Messages

### "File path is outside the opened folder"

**Meaning**: Link points to file outside current root

**Solution**: 
- This is by design for security
- Open parent folder to access file
- Or copy file into current folder structure

### "Cannot render large file"

**Meaning**: File exceeds size threshold

**Solutions**:
- Click "Load Anyway" to force rendering
- Increase threshold: Settings → Performance → Large File Threshold
- View in text editor instead

### "Mermaid syntax error at line X"

**Meaning**: Invalid Mermaid diagram syntax

**Solutions**:
1. Check syntax at [mermaid.live](https://mermaid.live)
2. Validate diagram structure
3. Check for typos in node names
4. See [Mermaid documentation](https://mermaid.js.org)

## Still Having Issues?

If none of these solutions work:

1. **Reset MarkRead completely**:
   ```powershell
   # Uninstall MarkRead
   # Delete all settings
   Remove-Item "$env:APPDATA\MarkRead" -Recurse
   Remove-Item "$env:LOCALAPPDATA\MarkRead" -Recurse
   # Reinstall
   ```

2. **Try portable version**: May avoid some system integration issues

3. **Report bug**: [GitHub Issues](https://github.com/schalkje/markread/issues)

---

**Common questions** → [FAQ](faq.md)
