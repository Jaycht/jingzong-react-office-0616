---
name: Institutional Clarity
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#424753'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#727785'
  outline-variant: '#c2c6d5'
  surface-tint: '#005ac1'
  primary: '#0058bd'
  on-primary: '#ffffff'
  primary-container: '#2771df'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#3b5aaf'
  on-secondary: '#ffffff'
  secondary-container: '#88a5ff'
  on-secondary-container: '#11378c'
  tertiary: '#765700'
  on-tertiary: '#ffffff'
  tertiary-container: '#956e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174c'
  on-secondary-fixed-variant: '#1f4195'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#fbbc05'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  container-max-width: 1440px
---

## Brand & Style

The design system is engineered for high-stakes administrative environments where precision, trust, and efficiency are paramount. The aesthetic follows a **Corporate / Modern** movement, prioritizing functional clarity over decorative elements. It aims to evoke a sense of digital sovereignty and reliability, ensuring that government officials can navigate complex record hierarchies without cognitive fatigue.

The visual language is rooted in "Institutional Modernism"—combining the stability of traditional government structures with the speed and openness of modern SaaS. The UI utilizes ample whitespace to reduce density, ensuring that every data point is legible and every action is intentional.

## Colors

The palette is anchored by a command-oriented **Google Blue** primary and a deep **Indigo-Navy** secondary. This choice ensures immediate recognition of interactive elements while providing a more sophisticated and authoritative secondary accent than standard green.

- **Primary**: Used for "Create," "Submit," and "Login" actions. 
- **Secondary**: A deep navy (`#3453A8`) used for secondary buttons, navigation accents, and structural elements to provide a professional, grounded feel.
- **Surfaces**: A layered approach using `#F8F9FA` for the base background and pure white (`#FFFFFF`) for cards and content containers to create a distinct visual hierarchy.
- **Contrast**: Text is set in a deep slate to ensure AAA accessibility ratings against light grey backgrounds, facilitating long-form reading of digital records.
- **Semantic Colors**: Green for "Approved," Amber (the Tertiary color) for "Pending," and Red for "Flagged" or "Deleted" records follow standard international conventions for intuitive processing.

## Typography

This design system utilizes **Inter** for its exceptional legibility and neutral character. Given the platform's focus on record management, typography is scaled slightly larger than standard web applications to accommodate administrative review workflows.

For **Simplified Chinese** implementation, Inter should be paired with a high-quality system sans-serif fallback (such as *PingFang SC* or *Noto Sans SC*). The line height is intentionally generous (1.5x for body text) to accommodate the higher visual density of Chinese characters. Bold weights are used sparingly for section headers and critical metadata labels to maintain a clean, organized look.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main content area utilizes a 12-column grid with a maximum width of 1440px to prevent line lengths from becoming unreadable on ultra-wide monitors.

- **Rhythm**: A strict 4px/8px baseline grid governs all spacing.
- **Density**: The system defaults to "Generous" spacing. Navigation sidebars have 24px of internal padding, and dashboard cards utilize 32px of padding to separate data visualizations from text content.
- **Breakpoints**:
  - **Desktop (1024px+)**: 12 columns, 24px gutters, fixed sidebar.
  - **Tablet (768px - 1023px)**: 8 columns, 16px gutters, collapsible sidebar.
  - **Mobile (<767px)**: 4 columns, 16px margins, top navigation bar.

## Elevation & Depth

To maintain a "Professional Tech" feel, this design system avoids heavy shadows and skeuomorphism. Instead, it uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background)**: `#F8F9FA` – The foundation.
- **Level 1 (Cards/Content)**: `#FFFFFF` – Pure white surfaces with a 1px solid border in `#E9ECEF`.
- **Level 2 (Dropdowns/Modals)**: White surfaces with a soft ambient shadow (0px 4px 12px, 5% opacity black) to suggest hovering without feeling "heavy."
- **Focus States**: When an element is active or focused, it receives a 2px outer glow using the Primary Blue at 20% opacity.

## Shapes

The design system uses **Soft** geometry (Level 1). A standard 4px (`0.25rem`) corner radius is applied to primary UI elements like input fields, buttons, and small tags. Larger containers like cards and modals utilize an 8px (`0.5rem`) radius.

This subtle rounding balances the professional "grid-based" nature of government software with a modern, approachable feel. It avoids the playfulness of pill-shapes while moving away from the aggressive sharpness of legacy 90s enterprise software.

## Components

### Buttons
- **Primary**: Solid Google Blue with white text. 4px roundedness.
- **Secondary**: Solid deep navy or ghost style with 1px border in `#3453A8`.
- **States**: Hover states should be a slightly darker shade; transitions should be a smooth 200ms ease-in-out.

### Data Tables
- The core of the platform. Use a zebra-stripe pattern with `#F8F9FA` on alternate rows. Headers must be "sticky" and use the `label-lg` typography style in dark slate.

### Cards
- Standard containers for record summaries. Cards must include a header section with a 1px bottom divider. Internal padding is a consistent 24px or 32px depending on content complexity.

### Inputs
- Form fields utilize a light grey background (`#F1F3F4`) that shifts to white with a Blue border on focus. Labels are always positioned above the field for maximum legibility in Chinese.

### Charts & Visuals
- For record analytics, use a refined palette: Primary Blue, Secondary Navy, and Amber. Avoid high-vibrancy "neon" colors. Grid lines within charts should be light grey (`#F1F3F4`) to remain unobtrusive.

### Dark Mode Toggle
- A subtle switch located in the top-right utility bar. In Dark Mode, the background shifts to `#121212` and cards to `#1E1E1E`, maintaining consistent branding via the primary Blue.