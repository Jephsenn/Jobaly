# Font Preservation in AI-Enhanced Resumes

## How It Works

The system uses **direct XML modification** to preserve 100% of your original resume formatting, including:
- ✅ Font family (Calibri, Arial, Times New Roman, etc.)
- ✅ Font size
- ✅ Font color
- ✅ Bold, italic, underline
- ✅ Spacing and indentation
- ✅ Line height
- ✅ All other formatting

## Technical Details

### DOCX Structure
A `.docx` file is actually a ZIP file containing:
- `word/document.xml` - Main document content
- `word/styles.xml` - Style definitions
- `word/fontTable.xml` - Font information
- Other resources (images, headers, footers, etc.)

### Our Approach
We **ONLY** modify `word/document.xml` and **ONLY** replace the text within `<w:t>` tags:

```xml
<!-- BEFORE: -->
<w:r>
  <w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
    <w:sz w:val="22"/>
    <w:color w:val="1F4E78"/>
  </w:rPr>
  <w:t>Managed team of 5 developers</w:t>
</w:r>

<!-- AFTER (AI enhanced): -->
<w:r>
  <w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
    <w:sz w:val="22"/>
    <w:color w:val="1F4E78"/>
  </w:rPr>
  <w:t>Led cross-functional team of 5 developers, delivering projects 20% faster</w:t>
</w:r>
```

**Notice:** The `<w:rPr>` (run properties) containing font, size, and color are **completely untouched**.

## Why Fonts Might Look Different

If you notice fonts appear different in the enhanced resume, it could be due to:

### 1. **Font Substitution by Word**
   - If your original resume uses a font not installed on your computer
   - Word automatically substitutes a similar font
   - This happens when **opening** the file, not during our enhancement

### 2. **Display vs. Embedded Fonts**
   - Some resumes embed fonts in the DOCX file
   - Others rely on system fonts
   - If you view the file on a different computer, embedded fonts should work correctly

### 3. **Style Inheritance**
   - DOCX files have a hierarchy: Document defaults → Styles → Direct formatting
   - If your original resume uses styles (like "Normal" or "Heading 1"), those are preserved
   - Direct formatting (applied via toolbar) is also preserved

### 4. **Zoom/View Settings**
   - Different zoom levels in Word can make fonts appear different
   - Print Layout vs. Web Layout views render differently

## Debugging Font Issues

### Check Console Logs
When you generate a resume, check the browser console for:

```
📌 Bullet 1:
   BEFORE: "Managed team of 5 developers"
   AFTER:  "Led cross-functional team of 5 developers"
   📝 Format: Font=Calibri Size=11pt
   Changed: ✅ Yes
```

This shows the font information **was detected** and **should be preserved**.

### Compare Original vs. Enhanced in Word

1. **Open your original resume** in Word
2. Select a bullet point
3. Note the font family and size in the toolbar
4. **Open the enhanced resume** in Word
5. Select the same bullet point (now enhanced)
6. Compare font family and size

**They should be identical.**

### Check XML Directly (Advanced)

1. Rename `Resume.docx` to `Resume.zip`
2. Extract the ZIP
3. Open `word/document.xml` in a text editor
4. Search for your bullet text
5. Look at the surrounding `<w:rPr>` tag for font info

Example:
```xml
<w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
<w:sz w:val="22"/>  <!-- Size in half-points, so 22 = 11pt -->
```

## Common Font Issues & Solutions

### Issue: "My headers changed font!"
**Likely Cause:** Headers might be defined in styles, not direct formatting.

**Solution:** 
- Our system preserves the style references
- Check if the style definition in your original resume is correct
- If you manually changed the header font without updating the style, that's the issue

### Issue: "Everything looks slightly smaller/larger"
**Likely Cause:** Zoom level or page size settings.

**Solution:**
- Check View → Zoom in Word (should be 100%)
- Check Layout → Size (should match original)
- Compare side-by-side at same zoom

### Issue: "Bold/italic formatting is missing"
**Likely Cause:** Bold/italic might be applied as character formatting.

**Solution:**
- Our system preserves ALL `<w:rPr>` properties including `<w:b/>` (bold) and `<w:i/>` (italic)
- If missing, the original resume might not have had them in the DOCX XML (display artifact)

## Test Scenarios

### ✅ Fonts That Should Work Perfectly
- Calibri (default Word font)
- Arial
- Times New Roman
- Cambria
- Georgia
- Any standard Windows/Mac font

### ⚠️ Fonts That Might Have Issues
- Custom fonts (downloaded from web)
- Rare/uncommon fonts
- Fonts not installed on your system

### 💡 Best Practice
**Always use standard, widely-available fonts in your resume** to ensure compatibility across systems.

## Verification Checklist

After generating an enhanced resume:

- [ ] Console shows font information for each bullet
- [ ] No warnings about "Text not found in XML"
- [ ] Downloaded file opens in Word without errors
- [ ] Font family matches original (check toolbar)
- [ ] Font size matches original (check toolbar)
- [ ] Bold/italic preserved on section headers
- [ ] Bullet point indentation looks correct
- [ ] Line spacing looks consistent
- [ ] Colors match (if your resume uses custom colors)

## Still Having Issues?

1. **Re-upload your resume** - Ensures latest parsing
2. **Check console logs** - Look for warnings/errors
3. **Try a test job** - Generate resume for any job to see if issue is consistent
4. **Open GitHub issue** - Include console logs and sample DOCX if possible

## Technical Notes

The font preservation happens at line ~77-95 in `resumeGenerator.ts`:

```typescript
// Replace in XML (preserve all formatting tags)
xmlContent = xmlContent.replace(
  new RegExp(`(<w:t[^>]*>)${escapeRegex(escapedOriginal)}(</w:t>)`, 'g'),
  `$1${escapedEnhanced}$2`
);
```

The regex captures **everything before** and **everything after** the text, including all `<w:rPr>` formatting tags, and only replaces the text content itself.
