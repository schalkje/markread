import { test, expect, _electron as electron } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Screenshot automation for MarkRead WPF application
 * 
 * This test launches the actual MarkRead.exe and captures screenshots
 * for documentation purposes.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const APP_PATH = path.join(REPO_ROOT, 'src/App/bin/Debug/net8.0-windows/MarkRead.exe');
const DOCS_PATH = path.join(REPO_ROOT, 'documentation');
const SCREENSHOTS_DIR = path.join(REPO_ROOT, 'documentation/images/screenshots');

test.describe('MarkRead Documentation Screenshots', () => {
  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Verify app exists
    if (!fs.existsSync(APP_PATH)) {
      throw new Error(`App not found at ${APP_PATH}. Please build the application first.`);
    }

    // Verify documentation folder exists
    if (!fs.existsSync(DOCS_PATH)) {
      throw new Error(`Documentation folder not found at ${DOCS_PATH}`);
    }
  });

  test('capture main window screenshot', async () => {
    console.log('Launching MarkRead with documentation folder...');
    
    // Launch the WPF app with documentation folder
    const appProcess = spawn(APP_PATH, [DOCS_PATH], {
      cwd: REPO_ROOT,
      detached: false,
      stdio: 'ignore'
    });

    // Wait for app to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Use PowerShell to capture screenshot of the window
    const captureScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      # Find MarkRead window
      $proc = Get-Process -Name "MarkRead.App" -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($proc) {
        Start-Sleep -Milliseconds 500
        
        # Capture screenshot
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
        
        $outputPath = "${SCREENSHOTS_DIR.replace(/\\/g, '\\\\')}/main-window.png"
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Output "Screenshot saved to: $outputPath"
      }
    `.trim();

    try {
      execSync(`powershell -Command "${captureScript.replace(/"/g, '\\"')}"`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8'
      });
      console.log('Main window screenshot captured');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }

    // Cleanup: Close the app
    try {
      execSync('Stop-Process -Name "MarkRead.App" -Force -ErrorAction SilentlyContinue', {
        shell: 'powershell.exe'
      });
    } catch {
      // Ignore cleanup errors
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('capture open folder dialog', async () => {
    console.log('Capturing open folder dialog...');
    
    // This requires UI automation which is complex with Playwright
    // Alternative: Use Windows UI Automation directly via PowerShell
    const automationScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      Add-Type -AssemblyName UIAutomationClient
      
      # Launch app without folder
      $proc = Start-Process -FilePath "${APP_PATH}" -PassThru -WindowStyle Normal
      Start-Sleep -Seconds 2
      
      # TODO: Trigger "Open Folder" button via UI Automation
      # For now, we'll capture the start screen state
      
      # Capture screenshot
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
      
      $outputPath = "${SCREENSHOTS_DIR.replace(/\\/g, '\\\\')}/open-folder.png"
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      
      $graphics.Dispose()
      $bitmap.Dispose()
      
      # Cleanup
      Stop-Process -Id $proc.Id -Force
      
      Write-Output "Screenshot saved"
    `.trim();

    try {
      execSync(`powershell -Command "${automationScript.replace(/"/g, '\\"')}"`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        timeout: 10000
      });
      console.log('Open folder screenshot captured');
    } catch (error) {
      console.error('Failed to capture open folder screenshot:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('capture navigation basics', async () => {
    console.log('Capturing navigation basics...');
    
    // Launch with documentation and capture after interaction
    const appProcess = spawn(APP_PATH, [DOCS_PATH], {
      cwd: REPO_ROOT,
      detached: false,
      stdio: 'ignore'
    });

    // Wait for full load and some interaction
    await new Promise(resolve => setTimeout(resolve, 4000));

    const captureScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      
      Start-Sleep -Milliseconds 500
      
      # Capture screenshot
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
      
      $outputPath = "${SCREENSHOTS_DIR.replace(/\\/g, '\\\\')}/navigation-basics.png"
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      
      $graphics.Dispose()
      $bitmap.Dispose()
      
      Write-Output "Screenshot saved"
    `.trim();

    try {
      execSync(`powershell -Command "${captureScript.replace(/"/g, '\\"')}"`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8'
      });
      console.log('Navigation basics screenshot captured');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }

    // Cleanup
    try {
      execSync('Stop-Process -Name "MarkRead.App" -Force -ErrorAction SilentlyContinue', {
        shell: 'powershell.exe'
      });
    } catch {
      // Ignore cleanup errors
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});
