Act as a senior creative developer, motion designer, and product designer. Build a complete, polished, responsive one-page website for Cantina Cana's Mulled Wine Kit. Implement the experience in the current project; do not stop at a plan or a static mockup.

The central experience is one continuous, scroll-controlled product story: a burgundy gift box opens, its wine bottle comes out and pours into a saucepan, spices and dried oranges enter the wine, gentle heating releases steam, the heat switches off and the orange spirit is added, then the finished drink is strained through a sieve into a wine glass.

1. START WITH THE PROVIDED MATERIAL

Inspect the repository, its instructions, installed dependencies, components, and assets before making changes. Preserve the existing stack and conventions where practical. If this is an empty project, use React, TypeScript, Vite, GSAP ScrollTrigger, Three.js, and React Three Fiber with compatible stable versions.

Read and visually inspect these attachments:

| File | Purpose |
| --- | --- |
| image(20261113-095329).png | Closed packaging reference showing front, back, and side panels |
| image(20261113-095342).png | Open-box reference showing the hinged lid and internal compartments |
| Recipe Book final 15x10.pdf | Ingredient information, recipe steps, English/Arabic wording, and booklet design |

The reference reel is https://www.instagram.com/reel/DfQqLfhSdov/. Use it for the idea of a large central visual that transforms with scrolling, spacious typography, and seamless chapter transitions. Our product identity comes from the attached Cantina Cana materials.

If Instagram is inaccessible, continue from this specification. If an attachment is genuinely missing, identify it precisely and continue all independent implementation. Never invent having inspected a missing file.

2. BRAND AND ART DIRECTION

Brand: CANTINA CANA
Product: Mulled Wine Kit
Tagline: A Warm Winter Ritual
Emotional direction: the pleasure of opening a thoughtful gift, preparing something fragrant, and sharing a warm evening.

Build an elegant, cinematic product experience with:
- Deep burgundy, wine red, warm ivory, muted gold, and subtle orange accents.
- Starting design tokens: burgundy #48151D, wine #6A2430, gold #D6B57B, ivory #F5ECDD, dark text #281A19. Adjust for accessible contrast.
- Refined editorial serif headings, a readable complementary body font, restrained letter spacing, and generous space.
- Soft studio lighting, believable contact shadows, dark glass, warm metal, textured cardboard, and a subtle fabric-inspired background referencing the packaging.
- Quiet transitions between burgundy hero/finale scenes and warm ivory preparation scenes.
- A readable Cantina Cana wordmark and faithful package artwork.

Keep the product large and visually dominant. Avoid generic template sections, excessive rounded cards, dashboards, loud gradients, cartoon emojis, constant floating decorations, and unrelated vineyard stock photography. The preparation scene should feel like one physical world.

3. VERIFIED PRODUCT CONTENT

Use the booklet and packaging as the product source:
- One 750 ml dry red wine bottle, vintage 2023, 13% alcohol; Cabernet Sauvignon and Merlot, produced in Bethlehem.
- Organic Ceylon cinnamon sticks, Alba Grade, from Sri Lanka, supplied by Mama Muna.
- Dried orange slices, star anise, cardamom, and cloves.
- One 40 ml orange spirit mini bottle, 35% alcohol.
- Recipe booklet.
- Corkscrew wine opener.

Naming detail: the ingredient page calls the mini bottle "Orange Aperitif"; the package and English recipe also refer to orange brandy/brandy. Use "orange aperitif" as the default ingredient label, describe its citrus finishing role, and keep its display name editable in one product configuration object. Do not invent a different ingredient.

The saucepan, hob, spoon, sieve, and serving glass are preparation props, not items included in the kit. Sugar is optional and is not presented as included.

Do not invent prices, serving counts, stock levels, customer reviews, awards, shipping promises, product certifications, or health benefits. Do not promote the booklet's WARM30 offer as a discount on this kit; the booklet explicitly excludes the Mulled Wine Kit.

4. PAGE STRUCTURE

Create these connected areas on the same page:

A. Compact sticky navigation
Cantina Cana wordmark; links to The Ritual, Inside the Box, and Recipe; a clear Get the Kit CTA. Use real section anchors, visible keyboard focus, and a usable mobile menu.

B. Hero
Show the closed kit in a beautiful studio composition, matching the supplied packaging.
Headline: "A warm winter ritual."
Supporting copy: "Red wine, fragrant spices, and a touch of orange. Thoughtfully gathered in one box, ready to share."
Primary CTA: "Discover the ritual" scrolls into the story.
Secondary CTA: "Explore the kit" goes to the product details.
Add a restrained scroll cue. Present the hero immediately; avoid a long cinematic loading screen.

C. The six-chapter preparation story
A single persistent visual stage with changing objects, camera framing, and nearby short copy. On desktop, keep the stage pinned while scrolling advances the story. Show a subtle six-step chapter indicator with real accessible jump links.

D. Inside the box
After the preparation finale, return visually to the gift kit and reveal an attractive exploded arrangement of its actual contents. Use concise ingredient labels and sensory descriptions. Make the booklet and corkscrew visible. Clearly distinguish ingredients from the cookware used in the story.

E. Recipe and booklet
Provide a readable recipe directly in HTML, plus a real "Read the recipe book" or "Download the recipe" link to the supplied PDF. The PDF should be an addition to the accessible recipe, not the only place instructions can be read.

F. Closing product/order section
Bring the box, bottle, booklet, and finished glass into one composed still life.
Headline: "Pour. Warm. Share."
Supporting copy: "A little preparation. A warmer evening."
Repeat the main product CTA and key kit contents.
Use an existing verified product checkout route if the project has one. Otherwise keep the order URL and any price in one editable configuration object. When no ordering destination is configured, offer a transparent "How to order" panel with the supplied brand contact details rather than a fake checkout or false order confirmation.
Use the brand website and Instagram details from the supplied material. Do not invent a telephone number, address, or contact endpoint.

G. Minimal footer
Cantina Cana wordmark, brand links, recipe access, and a replay link that returns to the beginning of the ritual.

5. CHOREOGRAPH THE COMPLETE SCROLL JOURNEY

Use one normalized story progress value from 0 to 1. Suggested chapter ranges below apply to the pinned story, excluding the hero and ordinary sections. Tune the pacing after testing.

CHAPTER 1 / 0.00-0.18 / "Open a little warmth."
- Begin with the closed burgundy presentation box in a three-quarter view.
- Open the lid from its left hinge, matching the open-box photo.
- Reveal the wine bottle in the large left compartment and the booklet, dried oranges, spice packet, mini bottle, and opener in the smaller right compartments.
- Give the contents a brief, restrained reveal, then lift the wine bottle out.
- Include a tasteful corkscrew/uncorking beat before the bottle pours.
- Transition the camera and introduce the saucepan smoothly as the box leaves the foreground.

CHAPTER 2 / 0.18-0.35 / "Begin with the wine."
- Move and tilt the uncorked bottle above the saucepan.
- Pour a continuous deep-red stream from the actual bottle opening into the pan.
- Show the wine volume in the bottle decreasing and the pan level increasing.
- Include restrained ripples and a believable receiving point.
- Finish with the stream stopping and the bottle clearing the next action.
- Copy: "Pour the entire 750 ml bottle into a saucepan."

CHAPTER 3 / 0.35-0.50 / "Let the spices tell their story."
- Open the ingredient packet or introduce its contents from the kit.
- Add dried orange slices, cinnamon sticks, star anise, cardamom, and cloves in a clear sequence.
- Let ingredient names appear briefly as they enter.
- Ingredients land in the wine, settle or float believably, and move with a gentle stir.
- Copy: "Add the dried oranges and the included spices. Stir gently."

CHAPTER 4 / 0.50-0.67 / "Slow warmth. Rich aroma."
- Settle the saucepan above a minimal hob and switch on a restrained warm glow.
- Introduce a few delicate steam wisps. Keep the liquid calm, with subtle movement.
- Use a quiet time-passage cue to communicate approximately 15 minutes; the visitor never waits for a real timer.
- Copy: "Warm gently over low heat for approximately 15 minutes, stirring occasionally."
- Keep "Do not boil" clearly readable.
- No rolling boil, aggressive bubbling, fire theatrics, or exaggerated smoke.

CHAPTER 5 / 0.67-0.82 / "The finishing touch."
- First turn off the heat. Make the hob glow visibly fade.
- Then open and pour the 40 ml orange spirit mini bottle into the saucepan.
- Show the small amber stream joining the wine and a gentle final stir.
- Introduce a quiet "Rest for 8 minutes" time-passage cue, while the ingredients infuse and the steam softens.
- Copy: "Turn off the heat. Add the orange aperitif, stir, and let the spices infuse for another 8 minutes."
- This order must match the recipe: heat off, spirit added, rest, then strain.

CHAPTER 6 / 0.82-1.00 / "Pour. Strain. Share."
- Bring an elegant, heat-resistant stemmed wine glass into the composition.
- Position a fine-mesh sieve above its rim.
- Tilt the saucepan and pour through the sieve, with clear alignment: pan lip to sieve bowl, then filtered liquid into the glass.
- Wine passes through; orange pieces and whole spices remain in the sieve.
- The pan liquid level falls while the glass fills to a tasteful serving level.
- Stop the stream and remove the pan and sieve without clipping through the glass.
- Finish with the glass, a little rising steam, a soft shadow, and the brand line.
- Add an optional serving note: "Sweeten to taste; the recipe suggests approximately one teaspoon of sugar per cup."
- Hold the finished composition long enough to appreciate it, then flow naturally into the product details.

Keep every transition continuous. Avoid six disconnected animations, unexplained camera cuts, objects teleporting between locations, liquid streams detached from containers, or spices visibly passing through the sieve.

6. ANIMATION AND ASSET IMPLEMENTATION

Use GSAP ScrollTrigger for the pinned scroll timeline and HTML text transitions. Use Three.js through React Three Fiber for the shared visual stage, unless the existing project already has an equally suitable implementation.

The supplied images are visual references, not ready-made 3D models. Build an immediately runnable scene:
- Use available high-quality GLB assets when they exist.
- Otherwise create careful procedural geometry for the hinged box, compartments, bottles, saucepan, spoon, hob, sieve, glass, and recognizable spices.
- Use faithful crops or extracted artwork from the supplied packaging as textures. Do not place the entire four-panel mockup image on one box face.
- The open-box photo is low resolution: use it to guide construction and arrangement, not as a full-screen enlarged texture.
- Use readable, sharp labels and restrained realistic materials.
- Approximate pouring with animated stream geometry and liquid surfaces; a full fluid simulation is unnecessary.
- Make steam light and sparse, using efficient transparent geometry or particles.
- Keep mesh quality and lighting economical enough for mobile.

If production-ready rendered image sequences are already supplied, a canvas sequence can replace the 3D renderer behind the same progress interface. Choose one primary renderer. Do not build two competing animation systems.

Do not pause implementation because photorealistic assets are missing. Finish the working experience with the best available assets, then identify any specific render or model that would materially improve final production quality.

All major object states must derive from timeline progress. Scrolling backward, jumping chapters, resizing, and re-entering the scene must restore the correct lid angle, bottle orientation, liquid levels, ingredient positions, heat state, steam intensity, and glass fill. Avoid irreversible click handlers and wall-clock timers for recipe progression. Seed decorative particle randomness so scenes do not jump unpredictably.

Keep typography and recipe instructions in the DOM, separate from the 3D canvas. Clean up animation contexts, listeners, and GPU resources correctly.

7. MOBILE, LANGUAGE, AND ACCESSIBILITY

- Make the full story usable at 390 px, tablet sizes, and wide desktop sizes.
- Use a portrait camera composition on mobile, with copy above or below the stage and safe space around the sticky header and bottom CTA.
- Keep native touch scrolling and ordinary scrollbar behavior; do not hijack the scroll wheel.
- Shorten mobile pacing where useful without removing recipe information.
- Support reduced motion with static chapter compositions and the complete readable recipe.
- Provide "Skip animation" and chapter navigation. Handle no-WebGL, context loss, and slow loading gracefully.
- Give essential images useful alt text; mark decorative canvas content appropriately.
- Maintain accessible contrast, meaningful headings, keyboard navigation, and a focus-trapped mobile menu or dialog with Escape/close behavior.
- Start in English and provide a complete English/Arabic toggle using the booklet's Arabic recipe wording where available. Use proper RTL layout and localized interface copy; do not mirror brand art or bottle labels.
- Do not rely on motion, hover, tiny labels, or canvas text to communicate essential instructions.

8. PERFORMANCE AND CONTENT MANAGEMENT

- Show a lightweight hero before loading the heavier interactive scene.
- Load scene assets progressively, compress imagery, reuse geometry/materials, and cap device pixel ratio for phones.
- Avoid loading hundreds of full-resolution frames or running hidden render loops unnecessarily.
- Keep product facts, ingredient descriptions, chapter copy, translations, brand links, order configuration, and asset paths centralized and editable.
- Serve the supplied booklet locally under a clean filename.
- Avoid unnecessary dependencies, unrequested backends, fake newsletter submissions, and unconfigured forms.

9. COMPLETION AND QUALITY BAR

Implement the entire page and all six chapters, not just the hero. Use cohesive final copy and make every visible control work.

Before finishing:
- Run the project's build and appropriate type checks.
- Inspect at mobile, tablet, and desktop widths.
- Scrub every chapter forward and backward.
- Test rapid scrolling, direct chapter jumps, resize during the story, and replay.
- Confirm heat turns off before the mini bottle pours; the rest cue precedes straining.
- Confirm the sieve retains solids and the glass receives the filtered wine.
- Test the PDF link, recipe readability, English/Arabic layouts, reduced motion, and non-WebGL fallback.
- Fix clipping, layout shifts, unreadable text, broken assets, dead buttons, console errors, and loading stalls.
- Report what was implemented, how it was verified, and any specific production asset or commerce configuration still needed.

The final result should make someone understand the kit, enjoy the preparation journey, and know how to get it. The defining feature is the continuous transformation from a closed Cantina Cana gift box into a warm glass of mulled wine.
