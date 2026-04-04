# Design System Strategy: The Emerald Ledger

## 1. Overview & Creative North Star
This design system is built upon a Creative North Star we call **"The Digital Architect."** It moves away from the flat, uninspired grids of traditional fintech and instead embraces an editorial, architectural approach to financial data. 

The goal is to evoke a sense of deep, focused calm through a monochromatic "Obsidian" environment punctuated by vibrant, intentional "Emerald" light. By utilizing intentional asymmetry—such as varying card widths for different data complexities—and overlapping depth, the system feels less like a template and more like a bespoke, high-end professional tool. We prioritize breathing room (negative space) over structural lines to ensure the user’s focus remains on the intelligence of the data.

## 2. Colors: Tonal Depth & The Emerald Pulse
The color palette is rooted in a deep, atmospheric green-black to reduce eye strain and provide a premium "pro-tools" aesthetic.

### Surface Hierarchy & Nesting
Instead of using lines to separate content, we use a "Layering Principle" based on the Material Design surface tiers:
*   **Base Layer:** `surface` (#0e1511). The foundation of the application.
*   **Secondary Sections:** `surface_container_low` (#161d19). Used for large background groupings.
*   **Interactive Cards:** `surface_container` (#1a211d) or `surface_container_high` (#242c27). These provide a subtle lift that signals interactability.

### The Rules of Engagement
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Contrast between `surface_container` variants must be the sole driver of spatial definition. 
*   **The "Glass & Gradient" Rule:** Floating elements (like navigation rails or modals) should use a semi-transparent `surface_variant` with a 20px backdrop-blur. This creates an "Emerald Glass" effect that maintains context.
*   **Signature Textures:** Hero metrics and primary CTAs should utilize a subtle linear gradient from `primary` (#4edea3) to `primary_container` (#10b981) at a 135-degree angle to provide visual "soul."

## 3. Typography: Editorial Authority
We use **Inter** as our typographic backbone. It is chosen for its exceptional legibility in dense data environments and its neutral, modern tone.

*   **Display & Headlines:** Use `display-md` (2.75rem) for primary portfolio balances. The tight tracking and substantial weight convey authority.
*   **Contextual Titles:** Use `title-md` (1.125rem) with a medium weight for card headers.
*   **Functional Labels:** Use `label-sm` (0.6875rem) in all-caps with increased letter spacing for category tags or table headers to create a "technical" aesthetic.
*   **The Narrative Scale:** By pairing a large `headline-lg` with a much smaller, muted `body-sm` (`on_surface_variant`), we create an editorial hierarchy that guides the eye to the most critical data first.

## 4. Elevation & Depth: Tonal Stacking
In this system, elevation is a feeling, not a structure. 

*   **Tonal Layering:** To create a card, place a `surface_container_highest` (#2f3632) element onto a `surface` background. The delta in luminance provides all the separation required.
*   **Ambient Shadows:** For "floating" components like dropdowns or popovers, use a shadow with a 32px blur, 0px offset, and 6% opacity. The shadow color should be derived from `on_primary_fixed_variant` (#005236) to ensure the shadow feels like a natural extension of the dark-green environment.
*   **Ghost Borders:** In high-density data tables where visual separation is mandatory, use the `outline_variant` (#3c4a42) at 15% opacity. This creates a "Ghost Border" that is felt rather than seen.

## 5. Components

### Buttons
*   **Primary:** High-contrast `primary` (#4edea3) background with `on_primary` (#003824) text. Apply a `md` (0.75rem) corner radius.
*   **Secondary:** `secondary_container` (#21523c) with `on_secondary_container` (#91c4a8). Use these for auxiliary actions to keep the primary CTA prominent.
*   **Tertiary (Ghost):** No background. Use `primary` text. Upon hover, add a 4% `surface_tint` overlay.

### Data Visualization (The Financial Focus)
*   **Trend Lines:** Use `primary` for positive growth and `tertiary` (#ffb3af) for negative trends.
*   **Progress Donut:** The background track should be `surface_container_highest`. The active track should be a gradient from `primary` to `primary_container`.

### Cards & Layout
*   **Corner Radius:** Standardize on `lg` (1rem) for all main dashboard cards to soften the data-heavy interface.
*   **Spacing:** Use a 24px (1.5rem) gap between cards. Never use dividers; the negative space is the divider.

### Input Fields
*   **Styling:** Use `surface_container_low` for the input background. No border. Use a 2px `primary` bottom-border only when the field is focused.
*   **Labels:** Floating labels using `label-md` when active, transitioning to `body-md` as a placeholder.

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. For example, a 70/30 split for the main dashboard view to create visual interest.
*   **Do** use `on_surface_variant` for secondary information to create a clear "read-order."
*   **Do** apply `backdrop-blur` to any element that sits "above" the main content scroll.

### Don't
*   **Don't** use pure black (#000000). Always use the `surface` tokens to maintain the deep emerald undertone.
*   **Don't** use 100% opaque borders. They "trap" the data and make the UI feel claustrophobic.
*   **Don't** use traditional "Drop Shadows" with high opacity. They break the glass-like immersion of the dark theme.
*   **Don't** clutter the UI. If a piece of data isn't essential for the current task, move it to a "Surface Container Low" secondary view.