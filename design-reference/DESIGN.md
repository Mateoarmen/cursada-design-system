---
name: Pro Edition
colors:
  surface: '#10131b'
  surface-dim: '#10131b'
  surface-bright: '#363942'
  surface-container-lowest: '#0b0e16'
  surface-container-low: '#181c23'
  surface-container: '#1c2028'
  surface-container-high: '#272a32'
  surface-container-highest: '#31353d'
  on-surface: '#e0e2ed'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e0e2ed'
  inverse-on-surface: '#2d3039'
  outline: '#8b90a0'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#4b8eff'
  on-primary-container: '#00285c'
  inverse-primary: '#005bc1'
  secondary: '#c8c6c8'
  on-secondary: '#303032'
  secondary-container: '#474649'
  on-secondary-container: '#b6b4b7'
  tertiary: '#ffb595'
  on-tertiary: '#571e00'
  tertiary-container: '#ef6719'
  on-tertiary-container: '#4c1a00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#10131b'
  on-background: '#e0e2ed'
  surface-variant: '#31353d'
  surface-base: '#0A0A0C'
  surface-elevated: '#1C1C1E'
  surface-glass: rgba(28, 28, 30, 0.7)
  text-primary: '#FFFFFF'
  text-secondary: '#8E8E93'
  accent-vibrant: '#0A84FF'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 19px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 20px
  margin-page: 40px
  container-padding: 24px
  section-gap: 80px
---

## Brand & Style

The brand identity transitions from a technical academic aesthetic to a premium, human-centric "Pro" experience. It is designed for users who value focus, clarity, and the effortless sophistication associated with high-end hardware. The emotional response should be one of "quiet power"—an interface that feels immensely capable but remains visually silent.

The design style is a refined mix of **Minimalism** and **Glassmorphism**.
- **Minimalism:** Aggressive use of whitespace to group information naturally rather than using lines or boxes.
- **Glassmorphism:** Strategic use of backdrop blurs to create a sense of depth and material hierarchy.
- **Apple-Inspired:** Utilizing high-fidelity blurs, organic dark tones, and soft but structured geometry to create a tactile, premium feel.

## Colors

The color palette shifts from harsh blacks to "Organic Darks"—deep, desaturated navies and charcoals that feel softer on the eyes. 

- **Primary Action:** A single, vibrant "SF Blue" (#007AFF) is used exclusively for primary calls to action, active states, and interactive links.
- **Backgrounds:** The base layer is a deep charcoal-navy (#0A0A0C). Elevated surfaces move toward softer greys (#1C1C1E) rather than increasing blue saturation.
- **Typography:** Primary text is pure white or near-white. Secondary text uses a "Label Color" approach (mid-grey with a hint of the background hue) to maintain a soft hierarchy.

## Typography

The "Robotic" monospaced and geometric fonts have been replaced with a systematic, humanistic Grotesk (Inter) to emulate the SF Pro aesthetic.

- **Scale:** Use a slightly larger base body size (17px) to improve legibility on retina displays.
- **Tracking:** Headlines should use tighter tracking (-0.02em) to feel cohesive and "heavy," while small labels use slightly increased tracking to ensure clarity at small scales.
- **Weight:** Avoid weights below 400. Use 600 (Semibold) for emphasis rather than Bold to maintain an elegant, modern profile.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. While the content max-width is capped for readability, the internal spacing is generous.

- **The 8px Grid:** All margins and paddings must be multiples of 8px to ensure a consistent rhythmic flow.
- **High Whitespace:** Increase padding within containers (minimum 24px) to allow elements to breathe. Section headers should be significantly separated from content to act as clear anchors.
- **Mobile Adaptivity:** On mobile, margins reduce to 20px, and the 8px grid remains the standard for vertical rhythm.

## Elevation & Depth

Depth is no longer communicated through hard borders, but through **Glassmorphism and Tonal Layering**.

- **Glass Surfaces:** Modal windows and sidebars use a 70% opacity background with a heavy backdrop-blur (minimum 30px). 
- **Shadows:** Use "Ambient Shadows"—extremely soft, large-radius shadows with low opacity (rgba(0, 0, 0, 0.4)) and 0px offset to simulate a natural lift.
- **Edge Definition:** Instead of dark borders, use a 1px "inner-glow" or "highlight border" (white at 10% opacity) to define the edges of glass elements against the dark background.

## Shapes

The shape language adopts the **Continuous Curve** (Squircle) philosophy.

- **Main Containers:** Use `rounded-xl` (20px) for all primary cards, modals, and main content areas to create a friendly, premium feel.
- **Interactive Elements:** Buttons and input fields use a consistent 12px radius (`rounded-lg`).
- **Nesting:** When nesting elements (e.g., a button inside a card), ensure the inner radius is smaller than the outer radius to maintain geometric harmony.

## Components

### Buttons
- **Primary:** High-vibrancy Blue (#007AFF) with white text. Use a subtle gradient (top-to-bottom) for a slightly tactile feel.
- **Secondary:** Use the elevated surface color (#1C1C1E) or a semi-transparent white (10% opacity) for a "ghost" effect that doesn't feel empty.

### Cards
- Avoid solid borders. Use the glassmorphism treatment with a 1px hairline highlight.
- Padding should be generous (24px - 32px) to emphasize the "Premium" feel.

### Input Fields
- Use a slightly darker, recessed background than the surrounding card.
- Corner radius must be 10px-12px.
- Focus state is indicated by a subtle blue outer glow (blur-based) rather than a thick border.

### Chips
- Use fully pill-shaped (rounded-full) geometry.
- Backgrounds should be low-saturation greys with white text for a "Pro" utility look.

### Checkboxes & Radios
- Follow the system standard: Blue fill for active states, soft grey outlines for inactive states. Use the 12px rounding even for these smaller elements where possible.