# billnext Design QA

- Source visual truth: `C:\Users\48628\.codex\generated_images\019fc538-2299-7322-a5d0-1fd4289ef4fb\exec-10044baf-f1c4-43ad-98ee-17e9c5e09ba0.png`
- Browser-rendered implementation: `D:\code\billbillRead\artifacts\design-qa\implementation-final.png`
- Normalized source crop: `D:\code\billbillRead\artifacts\design-qa\source-normalized-1280x720.png`
- Combined comparison evidence: `D:\code\billbillRead\artifacts\design-qa\comparison-normalized.png`
- Source pixels: 1487 × 1058.
- Implementation pixels: 1280 × 720 at CSS viewport 1280 × 720, device pixel ratio 1.5 as reported by the in-app browser.
- Normalization: source resized proportionally to 1280 × 910 and top-cropped to 1280 × 720 so the same above-the-fold inspector-open state could be compared without browser chrome.
- State: light mode, dynamic inbox, AI-investment video selected, right detail panel open, three-column reflow.

## Full-view comparison evidence

The combined comparison verifies the same macrostructure in both artifacts: fixed left navigation, one continuous top toolbar, stable central content surface, three compact video columns in the inspector-open state, and a fixed right details surface. The implementation keeps glass limited to the four requested hierarchy-bearing surfaces and leaves video cards near-solid.

The in-app browser is limited to a 1280 × 720 live viewport, so the source was normalized to that crop. The implementation CSS retains the requested 1440px desktop behavior: five columns closed and three columns open. Browser measurements at 1280px confirmed five tracks of about 189.7px closed and three tracks of about 206.2px open.

## Focused region comparison evidence

- Navigation and toolbar: `billnext`, `动态收件箱`, global-search placeholder, category controls, filter action, glass opacity, 22px framework radius, and restrained blue active state are present.
- Card region: 16:9 media, medium-weight titles, regular metadata, near-solid surfaces, 14px card radius, quiet segmented actions, and selected blue outline match the target intent.
- Detail region: creator identity, metadata, AI summary, tags, close control, and three stacked decision actions are implemented with the deepest light-glass layer.
- Feedback layer: the existing toast service is restyled as compact dark translucent glass. The “帮我读” action transitions to a disabled `正在帮读` state.

## Required fidelity surfaces

- Fonts and typography: system-first SF Pro / Inter / PingFang SC / Helvetica Neue stack; page title 600, card title 500, body/metadata regular; multiple graphite-gray levels; no ultra-thin text.
- Spacing and layout rhythm: 196px rail, 66px toolbar, 346px inspector, 14px grid gaps, four-level radius system, and bounded desktop content. No persistent-control overlap was observed.
- Colors and tokens: cool gray page, low-saturation blue accent, near-solid cards, distinct thin/medium/deep glass opacity, restrained borders and shadows, readable contrast.
- Image quality and asset fidelity: production cards continue to use real Bilibili cover/avatar URLs. The local preview uses remote photographic mock data only to exercise the shared production components; all imagery remains real raster content with 16:9 crops and no code-drawn stand-ins.
- Copy and content: exact `billnext` brand, global search copy, `今天 40`, `全部 / 知识 / 娱乐`, `想看 / 帮我读 / 不想看`, and `AI 摘要` are present.
- Icons: Iconify MingCute and Tabler icons are used consistently; no handcrafted SVG, emoji, CSS drawing, or text-glyph icon substitutes were introduced.
- Accessibility: semantic nav/search/radiogroup/aside structure, alt text, 40–44px primary targets, focus-visible ring inherited from the design system, keyboard Enter opening for cards, reduced-motion fallback, and solid no-backdrop-filter fallback are present.
- Responsiveness: desktop 5→3 reflow is implemented; <=1180px reduces 4→2; <=860px converts the sidebar to bottom navigation and the inspector to a sheet; <=560px uses a single column.

## Comparison history

### Pass 1 — blocked

- [P2] Brand mark did not render in the local preview. Fixed by switching to the existing bundled Bilibili line icon.
- [P2] Per-card `取消关注` control introduced extra noise and compressed metadata compared with the quiet target. Fixed by removing that control from the card surface while preserving follow behavior elsewhere.
- [P2] Toolbar filter icon read as sorting lines rather than a filter. Fixed by switching to the matching Tabler filter icon.

Post-fix evidence: `implementation-final.png` and `comparison-normalized.png` show the corrected mark, quieter card metadata, and funnel icon.

### Pass 2 — passed

No actionable P0/P1/P2 mismatch remains in the normalized inspector-open comparison. Remaining differences are dynamic-content variation and the in-app browser's shorter viewport crop, neither of which changes the implemented production layout.

## Primary interactions tested

- Close detail panel: panel removed and grid changed to five columns.
- Keyboard-open selected card: panel restored, card selected, grid changed to three columns.
- Category filter: selecting `知识` changed the active state and reduced visible cards from 15 to 9; `全部` restored the full set.
- Help-read action: right-panel action changed to disabled `正在帮读` state.
- Browser console: no error or warning entries in the final rendered state.

## Follow-up polish

- [P3] The mock's exact thumbnail subjects cannot be guaranteed because production content is live Bilibili data; layout, crop, and image treatment are preserved.
- [P3] A native 1440 × 1024 browser capture can be added later if the desktop browser surface exposes that viewport; responsive CSS and measured track behavior are already in place.

final result: passed
