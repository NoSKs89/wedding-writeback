# Element Name Mapping Guide

## Overview
This document shows how the old element naming convention maps to the new naming convention.

## Key Changes Made

### 1. **Text Elements**
- **Old format**: `element_1_Bride_Name`
- **New format**: `element_1_text_Brooke_Chris`
- **Change**: Added `text` type and used actual content for naming

| Old Name | New Name | Content/Purpose |
|----------|----------|-----------------|
| `element_1_Bride_Name` | `element_1_text_Brooke_Chris` | Bride's name (Brooke Christenson) |
| `element_2_Groom_Name` | `element_2_text_Stephen_Eric` | Groom's name (Stephen Eric) |
| `element_3_Wedding_Date` | `element_3_text_September_5` | Wedding date (September 5) |
| `element_8_Text` | `element_8_text_Love_Laughte` | "Love, Laughter" text at position -260 |

### 2. **Photo Elements**
- **Old format**: `element_4_Intro_Couple_Image`
- **New format**: `element_4_photo_1E5A0839OPT3`
- **Change**: Added `photo` type and used filename for naming

| Old Name | New Name | Content/Purpose |
|----------|----------|-----------------|
| `element_4_Intro_Couple_Image` | `element_4_photo_1E5A0839OPT3` | Couple photo (intro image) |

### 3. **Background Image Elements**
- **Old format**: `element_5_Background_Scene_Image`
- **New format**: `element_5_background-image_IMG3085`
- **Change**: Added `background-image` type and used filename for naming

| Old Name | New Name | Content/Purpose |
|----------|----------|-----------------|
| `element_5_Background_Scene_Image` | `element_5_background-image_IMG3085` | Background scene image |

### 4. **Component Elements**
- **Old format**: `element_6_RSVP_Form` + separate `RSVP Form Style`
- **New format**: `element_6_component_RSVP_Form` (consolidated)
- **Change**: Added `component` type and merged separate style objects

| Old Name(s) | New Name | Content/Purpose |
|-------------|----------|-----------------|
| `element_6_RSVP_Form` + `RSVP Form Style` | `element_6_component_RSVP_Form` | RSVP form component (styles merged) |
| `element_7_Scrapbook` + `Scrapbook Layout (Guest)` | `element_7_component_Scrapbook` | Scrapbook component (styles merged) |

## Properties Added to All Text Elements

The following properties were added to maintain compatibility with the new schema:

- `paddingLeft`: 0
- `paddingRight`: 0  
- `enableParentContainer`: false
- `containerSize`: 400

## Properties Added to All Component Elements

Component elements now include both their element-level properties AND their component-specific properties in one object:

### RSVP Component (`element_6_component_RSVP_Form`)
- Combined opacity/animation properties from `element_6_RSVP_Form`
- Combined form styling properties from `RSVP Form Style`
- Added standard text element properties for compatibility

### Scrapbook Component (`element_7_component_Scrapbook`)  
- Combined opacity/animation properties from `element_7_Scrapbook`
- Combined layout properties from `Scrapbook Layout (Guest)`
- Added standard text element properties for compatibility

## Removed Duplicate/Legacy Elements

The following elements from the old data were not migrated as they appeared to be duplicates or legacy:

- `element_1_Text` (duplicate of Bride_Name)
- `element_2_Text` (duplicate of Groom_Name)  
- `element_3_Text` (duplicate of Wedding_Date)
- `element_4_1E5A0839-OPT3.png` (legacy photo element)
- `element_5_IMG_3085.jpg` (legacy background element)

## Usage Instructions

1. Copy the contents of `migration_payload.json`
2. Use your POST utility to update the `layoutSettingsSlot1` property
3. Test that all elements now load with their proper styling and positioning
4. Repeat for other slots if needed (slots 2-5)

## Verification Checklist

After applying this payload, verify:

- [ ] Text elements have proper fonts, colors, and positioning
- [ ] RSVP form has correct styling and dimensions
- [ ] Scrapbook has correct layout and image settings
- [ ] All elements animate properly on scroll
- [ ] No elements are stacked on top of each other
- [ ] Controls in setup mode match the applied values 