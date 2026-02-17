<design_rules>
# Flat UI Mobile-First Design System

## Core Principles
- **Brand Consistency First**: Match the existing Inbox, Dashboard, and Login visual language.
- **Card Physics**: Use `bg-white` cards with soft shadows (`shadow-sm`) on white or very light neutral backgrounds.
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
- Any new accent palette that does not match the existing product purple + neutral system
- Excessive white space as a crutch for layout
- Card-heavy layouts without visual variety

## Color & Aesthetic Philosophy
- **Source of truth**: Reuse the same palette already present in `login`, `dashboard`, and `inbox`.
- **Primary Accent (Brand Purple)**:
  - `#8771FF` = main CTAs, active navigation, highlights
  - `#6d5ed6` = hover/darker purple state
  - `rgba(135, 113, 255, 0.10)` / `#F3F0FF` / `#F8F7FF` = subtle accent backgrounds
- **Neutrals**:
  - `#101011` = primary text
  - `#606266` = secondary text
  - `#F0F2F6` = borders/dividers
  - `#FFFFFF` = primary surfaces
- **Status Colors**:
  - Error: red palette (`bg-red-50 border-red-200 text-red-700`)
  - Success: prefer purple-tinted success messaging when aligned with auth/connect flows
  - Warning: neutral or amber, but keep hierarchy subtle
- **Pill Badges**: Use rounded-full badges with purple-tinted neutral fills for section/category tags.
- **No palette drift**: Do not introduce Stone/Earthy accents on new pages unless explicitly requested by the user.

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
- **Primary**: `bg-[#8771FF] text-white hover:bg-[#6d5ed6] hover:scale-[1.02] active:scale-95 transition-all`.
- **Secondary**: `bg-[#F3F0FF] text-[#8771FF] hover:bg-[#EBE5FF]`.
- **Cards**: `bg-white rounded-2xl border border-[#F0F2F6] shadow-sm`.
- **Inputs**: `border-[#F0F2F6] bg-white text-[#101011] placeholder:text-[#9A9CA2]`.
- **Section tint**: `bg-[#F8F7FF]` for subtle grouped content blocks.

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
middleware.ts is replaced by proxy.ts in NextJS 16+
</nextjs>

<notes_about_project>
Frontend is optimistic for good UX, but backend should be pessimistic for security and data integrity. Always validate and sanitize on the server, even if the frontend is doing its best to prevent bad input.

Always follow the design system of the project
</notes_about_project>
