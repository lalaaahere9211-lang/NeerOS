# NeerOS Design System
## Material Design 3-inspired UI specification

**Product:** NeerOS  
**Tagline:** Every Drop. Every Delivery. Every Detail.  
**Platform:** Android-first React Native with Expo and TypeScript  
**Languages:** English and Hindi  
**Currency:** Indian Rupee (₹)  
**Reference:** https://m3.material.io/  
**Status:** Canonical design specification.

---

## 1. Purpose and design principles

This document is the design source of truth for NeerOS. Screens and reusable components must follow these tokens and interaction rules rather than inventing styles independently.

NeerOS is operational software for a water-distribution business. Its interface communicates reliability, clarity, speed, and accountability.

### Principles

1. **Operations first:** make frequent actions such as recording a delivery, finding a customer, and entering a payment fast.
2. **Clear hierarchy:** emphasize the most important task, amount, balance, or status on each screen.
3. **Consistent patterns:** reuse components, spacing, colors, and interaction behavior.
4. **Financial clarity:** distinguish sales, collections, credits, and outstanding balances.
5. **Useful feedback:** show loading, empty, success, error, and offline states where relevant.
6. **Accessible by default:** support TalkBack, text scaling, adequate contrast, and non-color status cues.
7. **Native behavior:** follow Android conventions and React Native capabilities.
8. **Honest states:** never imply that an external payment or WhatsApp message succeeded unless it has actually been confirmed.

## 2. Brand identity

### Visual direction

Use deep navy for stable structure, water blue for primary actions, cool neutral surfaces for content, and restrained semantic colors for status. Avoid heavy gradients, decorative glass effects, oversized illustrations, and shadows on every surface.

### Logo direction

Use a simple, distinctive water-inspired mark (geometric droplet with subtle flow motif) paired with the **NeerOS** wordmark.

## 3. Color system

### 3.1 Light theme

| Token | Hex | Purpose |
|---|---|---|
| `primary` | `#176B87` | Main actions, selected controls |
| `onPrimary` | `#FFFFFF` | Content on primary |
| `primaryContainer` | `#C7EAF5` | Soft primary emphasis |
| `onPrimaryContainer` | `#073746` | Text/icons on primary container |
| `secondary` | `#45636D` | Secondary actions |
| `onSecondary` | `#FFFFFF` | Content on secondary |
| `secondaryContainer` | `#D8E8ED` | Secondary emphasis surfaces |
| `onSecondaryContainer` | `#102F38` | Content on secondary container |
| `tertiary` | `#53649A` | Supporting emphasis |
| `onTertiary` | `#FFFFFF` | Content on tertiary |
| `tertiaryContainer` | `#E0E4FF` | Tertiary container |
| `onTertiaryContainer` | `#101B4B` | Content on tertiary container |
| `background` | `#F7F9FA` | App background |
| `onBackground` | `#191C1D` | Main background text |
| `surface` | `#FFFFFF` | Cards, sheets, dialogs |
| `onSurface` | `#191C1D` | Primary surface text |
| `surfaceVariant` | `#DDE4E7` | Muted surfaces |
| `onSurfaceVariant` | `#41484B` | Secondary surface text |
| `surfaceContainerLow` | `#F2F5F6` | Subtle grouped surfaces |
| `surfaceContainer` | `#ECEFF1` | Standard grouped surfaces |
| `surfaceContainerHigh` | `#E5EAEC` | Higher-emphasis grouped surfaces |
| `outline` | `#70797D` | Borders and clear outlines |
| `outlineVariant` | `#C1C9CC` | Subtle dividers |
| `inverseSurface` | `#2E3233` | Inverse surfaces |
| `inverseOnSurface` | `#EFF1F2` | Content on inverse surfaces |
| `inversePrimary` | `#8DD4E9` | Primary accent on inverse surfaces |
| `error` | `#BA1A1A` | Errors and destructive actions |
| `onError` | `#FFFFFF` | Content on error |
| `errorContainer` | `#FFDAD6` | Error background |
| `onErrorContainer` | `#410002` | Content on error background |
| `success` | `#216B43` | Successful and completed states |
| `onSuccess` | `#FFFFFF` | Content on success |
| `successContainer` | `#CDEFD8` | Success background |
| `onSuccessContainer` | `#0B3B22` | Content on success background |
| `warning` | `#805600` | Warnings and pending states |
| `onWarning` | `#FFFFFF` | Content on warning |
| `warningContainer` | `#FFDF9E` | Warning background |
| `onWarningContainer` | `#281900` | Content on warning background |
| `info` | `#245B9E` | Informational states |
| `onInfo` | `#FFFFFF` | Content on info |
| `infoContainer` | `#D7E6FF` | Information background |
| `onInfoContainer` | `#001B3D` | Content on info background |

### 3.2 Dark theme

| Token | Hex | Purpose |
|---|---|---|
| `primary` | `#8DD4E9` | Main actions and selected controls |
| `onPrimary` | `#003544` | Content on primary |
| `primaryContainer` | `#064E63` | Primary emphasis surfaces |
| `onPrimaryContainer` | `#C7EAF5` | Content on primary container |
| `secondary` | `#B9CAD0` | Secondary actions |
| `onSecondary` | `#24363C` | Content on secondary |
| `secondaryContainer` | `#344A51` | Secondary container |
| `onSecondaryContainer` | `#D8E8ED` | Content on secondary container |
| `tertiary` | `#BEC7FF` | Supporting emphasis |
| `onTertiary` | `#263467` | Content on tertiary |
| `tertiaryContainer` | `#3B477D` | Tertiary container |
| `onTertiaryContainer` | `#E0E4FF` | Content on tertiary container |
| `background` | `#101416` | App background |
| `onBackground` | `#E1E3E4` | Main background text |
| `surface` | `#171C1E` | Cards, sheets, dialogs |
| `onSurface` | `#E1E3E4` | Primary surface text |
| `surfaceVariant` | `#41484B` | Muted surfaces |
| `onSurfaceVariant` | `#C1C9CC` | Secondary surface text |
| `surfaceContainerLow` | `#1B2123` | Subtle grouped surfaces |
| `surfaceContainer` | `#202729` | Standard grouped surfaces |
| `surfaceContainerHigh` | `#293134` | Higher-emphasis grouped surfaces |
| `outline` | `#8B9498` | Borders and clear outlines |
| `outlineVariant` | `#41484B` | Subtle dividers |
| `inverseSurface` | `#E1E3E4` | Inverse surfaces |
| `inverseOnSurface` | `#2E3233` | Content on inverse surfaces |
| `inversePrimary` | `#176B87` | Primary accent on inverse surfaces |
| `error` | `#FFB4AB` | Errors and destructive actions |
| `onError` | `#690005` | Content on error |
| `errorContainer` | `#93000A` | Error background |
| `onErrorContainer` | `#FFDAD6` | Content on error background |
| `success` | `#8DD8A8` | Successful and completed states |
| `onSuccess` | `#103B24` | Content on success |
| `successContainer` | `#1B5234` | Success background |
| `onSuccessContainer` | `#CDEFD8` | Content on success background |
| `warning` | `#F4C66A` | Warnings and pending states |
| `onWarning` | `#402D00` | Content on warning |
| `warningContainer` | `#5B4100` | Warning background |
| `onWarningContainer` | `#FFDF9E` | Content on warning background |
| `info` | `#A9C7FF` | Informational states |
| `onInfo` | `#153D72` | Content on info |
| `infoContainer` | `#214A80` | Information background |
| `onInfoContainer` | `#D7E6FF` | Content on info background |

### 3.3 Status mapping

| Business state | Token | Additional cue |
|---|---|---|
| Paid | `success` | Check icon and “Paid” label |
| Partially paid | `info` | Partial-payment label and amount remaining |
| Unpaid | `warning` | “Unpaid” label |
| Overdue | `error` | “Overdue” label and due date |
| Delivery completed | `success` | Check icon and completed label |
| Delivery pending | `warning` | Pending label |
| Delivery cancelled | `onSurfaceVariant` | Cancelled label and neutral icon |
| Low stock | `warning` | Low-stock label and quantity |
| Out of stock | `error` | Out-of-stock label and zero quantity |
| Offline | `onSurfaceVariant` | Offline icon and text |
| Sync pending | `info` | Pending-sync icon and text |

## 4. Typography

| Token | Size | Weight | Line height | Usage |
|---|---:|---|---:|---|
| `displayLarge` | 57 | 400 | 64 | Rare, large summary figures |
| `displayMedium` | 45 | 400 | 52 | Exceptional hero figures |
| `headlineLarge` | 32 | 400 | 40 | Major page emphasis |
| `headlineMedium` | 28 | 400 | 36 | Major section headings |
| `headlineSmall` | 24 | 400 | 32 | Screen titles where appropriate |
| `titleLarge` | 22 | 500 | 28 | Primary card or page titles |
| `titleMedium` | 16 | 500 | 24 | List and section titles |
| `titleSmall` | 14 | 500 | 20 | Compact headings |
| `bodyLarge` | 16 | 400 | 24 | Main body text |
| `bodyMedium` | 14 | 400 | 20 | Standard supporting content |
| `bodySmall` | 12 | 400 | 16 | Secondary metadata |
| `labelLarge` | 14 | 500 | 20 | Buttons and important labels |
| `labelMedium` | 12 | 500 | 16 | Chips and compact labels |
| `labelSmall` | 11 | 500 | 16 | Dense metadata only |

## 5. Spacing and layout

Base spacing unit: 4 dp.
`space0` (0), `space1` (4), `space2` (8), `space3` (12), `space4` (16), `space5` (20), `space6` (24), `space8` (32), `space10` (40), `space12` (48), `space16` (64).

## 6. Shape and Elevation

- `shapeExtraSmall`: 4
- `shapeSmall`: 8
- `shapeMedium`: 12
- `shapeLarge`: 16
- `shapeExtraLarge`: 28
- `shapeFull`: 999
