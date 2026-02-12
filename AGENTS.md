<design_rules>
# Flat UI Mobile-First Design System

## Core Principles
- **Warm Modernity**: Prioritize "Warm" neutrals (Stone, Cream, Off-White) over clinical grays.
- **Card Physics**: Use `bg-white` cards with soft shadows (`shadow-sm`) on `bg-stone-50` backgrounds to create depth.
- **Rounded Aesthetics**: Use `rounded-xl` or `rounded-2xl` for cards/sections to enhance the friendly, organic feel.
- **Visual Density**: "Clean" does not mean "Empty". Use distinct section backgrounds to structure content.
- Modern, clean aesthetic with thoughtful color palette
- Subtle depth via soft shadows for hierarchy (use sparingly)
- Use icon libraries only (no hardcoded emojis as icons)
- Refrain from using sparkle icon.
- Avoid "Wireframe Minimalism": Ensure interfaces have visual weight and density, not just whitespace.

## Strictly Avoid
- Sparse, empty interfaces that look like wireframes or placeholders
- Floating elements and decorative non-functional embellishments
- Focus outlines/rings (maintain accessibility via other means)
- Horizontal overflow from absolute elements
- Desktop-first styling patterns
- Generic "safe" palettes (default blues, purples, tech gradients)
- Excessive white space as a crutch for layout
- Card-heavy layouts without visual variety

## Color & Aesthetic Philosophy
- **Palette Strategy**: Base = Warm Neutrals (Stone/Warm Gray). Accents = Organic/Earthy (Amber, Terracotta, Sage, Burnt Orange).
- **Contrast Hierarchy**: Use `text-stone-900` (Charcoal) for primary text against `bg-stone-50` (Cream) for softer, high-readability contrast.
- **Section Rhythm**: Alternate between Light (White/Cream) and Dark (Stone-900/Black) sections to break up scrolling monotony.
- **Pill Badges**: Use small, rounded-full badges (`bg-stone-100 text-stone-900`) for eyebrow text or categories.
- Contrast matters: ensure hierarchy through deliberate color relationships
- Avoid the "startup template" look: no generic hero + 3 cards + blue CTA
- Simple does not mean bland: minimal MUST have personality and visual interest
- Avoid "Clinical" or "Lab" aesthetics: Use font weights, borders, and subtle backgrounds to create structure
- Let the content/brand guide palette, not statistical averages

## Full Viewport (Main Sections Only)
- Hero and primary sections should fill 100vh (min-h-screen or min-h-dvh)
- Secondary/content sections: auto height based on content

## Mobile-First Responsive (Mandatory)
- Base: 320px+ (default styles, no prefix)
- Tablet: 768px+ (md: prefix)
- Desktop: 1024px+ (lg: prefix)

### Layout Patterns
- Mobile: single column, full width, px-4
- Tablet: 2 columns where appropriate, px-6
- Desktop: multi-column grids, max-width container, px-8

### Component Tokens (Reference)
- **Buttons**: `font-medium`, `rounded-full` or `rounded-xl`, `h-12` (generous touch targets).
- **Primary**: `bg-stone-900 text-white hover:bg-stone-800 hover:scale-[1.02] active:scale-95 transition-all`.
- **Secondary**: `bg-stone-100 text-stone-900 hover:bg-stone-200`.
- **Cards**: `bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow`.

### Touch Targets
- All interactive elements: minimum 44px height and width
- Adequate spacing between tap targets

### Typography Scaling
- Headings: smaller on mobile, scale up per breakpoint
- Body: base size on mobile, slightly larger on desktop

### Spacing Scaling
- Reduce padding/margins on mobile
- Increase progressively for tablet and desktop
- Gaps in grids: tighter on mobile, wider on desktop

### Absolute Elements
- Use responsive offsets to prevent overflow
- Test positioning at all breakpoints

## Placement & Centering Rules
- Vertical + horizontal center: use flexbox (flex + items-center + justify-center)
- Never use absolute positioning for main content centering
- For hero sections: flex column, center both axes, text-center on mobile
- Stack elements vertically on mobile, horizontal on desktop
- Images: block level, max-width 100%, auto height to prevent overflow

## Container Rules
- Always wrap page content in a max-width container on desktop
- Container centered with auto margins
- Fluid width on mobile (no max-width constraint)
- Consistent horizontal padding at every breakpoint

## Grid & Flex Patterns
- Mobile: flex-col or grid-cols-1 (single column always)
- Tablet: grid-cols-2 or flex-row with wrap
- Desktop: grid-cols-3 or grid-cols-4 based on content
- Gap scaling: gap-4 mobile, gap-6 tablet, gap-8 desktop
- Flex items: use flex-1 or width percentages, never fixed pixel widths

## Component Placement
- Buttons: full width on mobile (w-full), auto width on tablet+ (md:w-auto)
- Form inputs: always full width, stack labels above inputs
- Cards: full width mobile, 2-up tablet, 3-up desktop
- Navigation: hamburger menu on mobile, horizontal links on desktop
- Modals/dialogs: nearly full screen on mobile with small margin, centered box on desktop

## Image & Media Handling
- Always responsive: w-full, h-auto
- Object-fit cover for background-style images
- Aspect ratio containers to prevent layout shift
- Hide decorative images on mobile if they cause clutter

## Overflow Prevention
- Root containers: overflow-x-hidden if needed
- No negative margins that extend beyond viewport
- Absolute elements: inset values must be responsive (inset-4 md:inset-8)
- Test at 320px width - nothing should cause horizontal scroll
</design_rules>

<nextjs>
- Always use API routes for connecting to external services to keep API keys secure.
- When integrating .env, never use a fallback, it's either defined on .env or not.
EXAMPLE:
url_link | https://api.example.com; -> this is wrong
url_link; -> this is right
</nextjs>