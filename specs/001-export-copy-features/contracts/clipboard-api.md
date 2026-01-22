# Clipboard API Contract

**Version**: 1.0.0  
**Date**: 2026-01-22

## Overview

All clipboard operations occur in the renderer process using the Web Clipboard API. No IPC communication required.

## ClipboardService Interface

```typescript
class ClipboardService {
  /**
   * Copy text in multiple formats to clipboard
   * @param content Text content with format variants
   * @returns Promise that resolves when copy succeeds
   * @throws ClipboardError if copy fails
   */
  async copyText(content: TextClipboardContent): Promise<void>;

  /**
   * Copy image to clipboard
   * @param content Image blob with metadata
   * @returns Promise that resolves when copy succeeds
   * @throws ClipboardError if copy fails
   */
  async copyImage(content: ImageClipboardContent): Promise<void>;

  /**
   * Copy content in multiple custom formats
   * @param formats Array of MIME type → data mappings
   * @returns Promise that resolves when copy succeeds
   * @throws ClipboardError if copy fails
   */
  async copyMultiFormat(formats: ClipboardFormat[]): Promise<void>;

  /**
   * Check if clipboard API is available
   * @returns true if clipboard operations are supported
   */
  canCopy(): boolean;

  /**
   * Check if clipboard permissions are granted
   * @returns Promise resolving to permission state
   */
  async checkPermission(): Promise<PermissionState>;
}
```

---

## Data Types

### TextClipboardContent

```typescript
interface TextClipboardContent {
  plainText: string;      // Always included
  markdownText?: string;  // Optional markdown format
  htmlText?: string;      // Optional rich text format
}
```

**Rules**:
- `plainText` is required and must not be empty
- At least one optional format should be provided
- If `htmlText` is provided, it should be valid HTML fragment
- HTML should include inline CSS for cross-app compatibility

**Example**:
```typescript
{
  plainText: "Hello World",
  markdownText: "**Hello** World",
  htmlText: "<span style=\"font-weight: bold\">Hello</span> World"
}
```

---

### ImageClipboardContent

```typescript
interface ImageClipboardContent {
  imageBlob: Blob;        // Image data
  format: 'png' | 'svg';  // Image format
  dimensions?: {
    width: number;
    height: number;
  };
}
```

**Rules**:
- `imageBlob` must have correct MIME type (`image/png` or `image/svg+xml`)
- `imageBlob` must not be empty
- `dimensions` should be provided when known

**Example**:
```typescript
{
  imageBlob: new Blob([pngData], { type: 'image/png' }),
  format: 'png',
  dimensions: { width: 800, height: 600 }
}
```

---

### ClipboardFormat

```typescript
interface ClipboardFormat {
  mimeType: string;       // MIME type (e.g., 'text/plain')
  data: Blob;             // Binary data
}
```

**Supported MIME Types**:
- `text/plain` - Plain text
- `text/html` - HTML content
- `text/markdown` - Markdown syntax (non-standard but supported by some apps)
- `image/png` - PNG image
- `image/svg+xml` - SVG image

---

### ClipboardError

```typescript
class ClipboardError extends Error {
  code: ClipboardErrorCode;
  retryable: boolean;
  
  constructor(code: ClipboardErrorCode, message: string, retryable: boolean);
}

enum ClipboardErrorCode {
  PERMISSION_DENIED = 'CLIPBOARD_PERMISSION_DENIED',
  NOT_SUPPORTED = 'CLIPBOARD_NOT_SUPPORTED',
  CAPTURE_FAILED = 'CLIPBOARD_CAPTURE_FAILED',
  WRITE_FAILED = 'CLIPBOARD_WRITE_FAILED',
  INVALID_DATA = 'CLIPBOARD_INVALID_DATA'
}
```

---

## Operations

### Copy Text (Multi-Format)

**Method**: `copyText(content: TextClipboardContent): Promise<void>`

**Behavior**:
1. Validate `content.plainText` is not empty
2. Create `ClipboardItem` with all provided formats
3. Write to clipboard using `navigator.clipboard.write()`
4. If write fails, throw `ClipboardError`

**Clipboard Formats Written**:
- Always: `text/plain` (plainText)
- If provided: `text/html` (htmlText)
- If provided: `text/markdown` (markdownText)

**Example Usage**:
```typescript
await clipboardService.copyText({
  plainText: "Code example",
  markdownText: "`Code example`",
  htmlText: "<code>Code example</code>"
});
```

**Error Scenarios**:
| Scenario | Error Code | Message |
|----------|-----------|---------|
| Empty plain text | `INVALID_DATA` | "Plain text cannot be empty" |
| Permission denied | `PERMISSION_DENIED` | "Clipboard access denied" |
| Write fails | `WRITE_FAILED` | "Failed to write to clipboard" |
| API not available | `NOT_SUPPORTED` | "Clipboard API not supported" |

---

### Copy Image

**Method**: `copyImage(content: ImageClipboardContent): Promise<void>`

**Behavior**:
1. Validate `imageBlob` is not empty
2. Verify MIME type matches format
3. Create `ClipboardItem` with image data
4. Write to clipboard
5. If write fails, throw `ClipboardError`

**Example Usage**:
```typescript
const blob = await html2canvas(element).toBlob();
await clipboardService.copyImage({
  imageBlob: blob,
  format: 'png',
  dimensions: { width: 800, height: 600 }
});
```

**Error Scenarios**:
| Scenario | Error Code | Message |
|----------|-----------|---------|
| Empty blob | `INVALID_DATA` | "Image data cannot be empty" |
| Wrong MIME type | `INVALID_DATA` | "MIME type doesn't match format" |
| Permission denied | `PERMISSION_DENIED` | "Clipboard access denied" |
| Write fails | `WRITE_FAILED` | "Failed to write image to clipboard" |

---

### Copy Multi-Format

**Method**: `copyMultiFormat(formats: ClipboardFormat[]): Promise<void>`

**Behavior**:
1. Validate at least one format provided
2. Validate each format has valid MIME type and non-empty data
3. Create `ClipboardItem` with all formats
4. Write to clipboard
5. If write fails, throw `ClipboardError`

**Example Usage**:
```typescript
await clipboardService.copyMultiFormat([
  {
    mimeType: 'text/plain',
    data: new Blob(['Plain text'], { type: 'text/plain' })
  },
  {
    mimeType: 'text/html',
    data: new Blob(['<b>HTML</b>'], { type: 'text/html' })
  }
]);
```

---

### Check Availability

**Method**: `canCopy(): boolean`

**Behavior**:
- Returns `true` if `navigator.clipboard` exists
- Returns `false` otherwise (e.g., insecure context)

**Example Usage**:
```typescript
if (!clipboardService.canCopy()) {
  showError("Clipboard not available");
}
```

---

### Check Permission

**Method**: `checkPermission(): Promise<PermissionState>`

**Behavior**:
1. Query clipboard-write permission
2. Return permission state: `'granted'`, `'denied'`, or `'prompt'`

**Example Usage**:
```typescript
const permission = await clipboardService.checkPermission();
if (permission === 'denied') {
  showError("Clipboard permission denied");
}
```

---

## Implementation Details

### Web Clipboard API Usage

```typescript
// Modern API (preferred)
const clipboardItem = new ClipboardItem({
  'text/plain': new Blob([plainText], { type: 'text/plain' }),
  'text/html': new Blob([htmlText], { type: 'text/html' })
});

await navigator.clipboard.write([clipboardItem]);
```

### Format Priority

When multiple formats are available, paste targets select in this order:
1. Rich text (`text/html`) - for Word, Teams, email clients
2. Markdown (`text/markdown`) - for markdown editors
3. Plain text (`text/plain`) - fallback for all apps

### Cross-Application Compatibility

**Tested Paste Targets**:
- ✅ Microsoft Word (rich text with basic formatting)
- ✅ Microsoft Teams (rich text)
- ✅ Outlook (rich text)
- ✅ Visual Studio Code (plain text, markdown)
- ✅ Notepad (plain text)
- ✅ Chrome/Edge (all formats)

**Known Limitations**:
- SVG clipboard support is limited (convert to PNG for wider compatibility)
- Markdown MIME type is non-standard (not all apps recognize it)
- Complex CSS may not transfer correctly (keep styles simple)

---

## Error Handling Strategy

### User-Facing Messages

| Error Code | User Message | Action |
|-----------|--------------|--------|
| `PERMISSION_DENIED` | "Cannot access clipboard. Please check browser permissions." | Show dialog with instructions |
| `NOT_SUPPORTED` | "Clipboard operations not supported in this environment." | Disable copy features |
| `WRITE_FAILED` | "Failed to copy to clipboard. Please try again." | Show retry button |
| `INVALID_DATA` | "Invalid content. Cannot copy." | Log details, show generic error |

### Retry Logic

- `PERMISSION_DENIED`: No automatic retry, prompt user
- `WRITE_FAILED`: Allow manual retry (user clicks copy again)
- `NOT_SUPPORTED`: No retry, disable feature
- `INVALID_DATA`: No retry, fix data source

---

## Performance Considerations

### Image Capture Optimization

```typescript
// High quality for single captures
const blob = await html2canvas(element, {
  scale: 2,              // Retina display support
  useCORS: true,         // Handle external images
  backgroundColor: null  // Transparent background
});
```

### Debouncing

For rapid copy operations (e.g., keyboard shortcuts):
- Debounce copy requests within 100ms
- Show single success notification after debounce period

### Memory Management

- Dispose of blobs after clipboard write
- Limit cached clipboard content to most recent operation
- Clear cache on navigation or app close

---

## Testing Contract

### Unit Tests

```typescript
describe('ClipboardService', () => {
  it('should copy plain text', async () => {
    await clipboardService.copyText({ plainText: 'test' });
    // Assert clipboard contains 'test'
  });

  it('should copy multi-format text', async () => {
    await clipboardService.copyText({
      plainText: 'test',
      htmlText: '<b>test</b>'
    });
    // Assert clipboard has both formats
  });

  it('should throw on empty plain text', async () => {
    await expect(
      clipboardService.copyText({ plainText: '' })
    ).rejects.toThrow(ClipboardError);
  });
});
```

### Integration Tests

- Copy text and paste into external app (automated via Playwright)
- Copy image and verify paste in image editor
- Test permission denied scenarios

---

## Security Considerations

1. **User Gesture Required**: Clipboard write must be triggered by user action (click, keypress)
2. **HTTPS Required**: Clipboard API only available in secure contexts
3. **No Clipboard Read**: Service does not read clipboard contents (privacy)
4. **Sanitize HTML**: Always sanitize user-generated HTML before copying
5. **Content Validation**: Validate all data before writing to clipboard

---

## Accessibility

- Provide keyboard shortcuts for copy operations
- Announce copy success/failure to screen readers
- Ensure hover buttons are keyboard-navigable
- Provide alternative text for copied images (as plain text format)
