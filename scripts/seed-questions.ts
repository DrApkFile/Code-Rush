import * as admin from "firebase-admin"
import * as fs from "fs"
import * as path from "path"

const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json")
if (!fs.existsSync(serviceAccountPath)) {
  console.error("serviceAccountKey.json not found!")
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8")) as admin.ServiceAccount),
})
const db = admin.firestore()

interface Question {
  content: string
  language: "HTML" | "CSS" | "JavaScript"
  format: "MCQ" | "Fill in the Blank" | "Fix the Code"
  difficulty: "Easy" | "Medium" | "Hard"
  options: string[]
  correctAnswerIndex: number
  explanation: string
}

const questions: Question[] = [

  // ==============================================================
  // ======================= HTML - 60 NEW QUESTIONS =============
  // ==============================================================

  // HTML MCQ (20)
  { content: "Which attribute improves performance by hinting the browser to preload a resource?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["rel='preload'", "rel='prefetch'", "rel='prerender'", "loading='eager'"], correctAnswerIndex: 0, explanation: "<link rel='preload' href='font.woff2' as='font'>" },
  { content: "What is the purpose of the 'popover' attribute in HTML?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["Native tooltips/popovers without JS", "Creates modal", "Hides content", "Form validation"], correctAnswerIndex: 0, explanation: "New in HTML 2024+" },
  { content: "Which input type supports native date + time picker with timezone?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["datetime-local", "datetime", "timestamp", "None"], correctAnswerIndex: 0, explanation: "type='datetime-local'" },
  { content: "What does the 'enterkeyhint' attribute define?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["Mobile keyboard Enter key label", "Submit behavior", "Auto-capitalize", "Spellcheck"], correctAnswerIndex: 0, explanation: "enterkeyhint='search'" },
  { content: "Which tag is used for searchable content (e.g. site search)?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["<search>", "<form role='search'>", "Both valid", "<input type='search'>"], correctAnswerIndex: 2, explanation: "New semantic <search> element" },
  { content: "What happens when you use 'blocking=render' on <script>?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["Blocks rendering until script loads", "Same as defer", "Same as async", "No effect"], correctAnswerIndex: 0, explanation: "New blocking attribute" },
  { content: "Which attribute disables browser's built-in translation?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["translate='no'", "notranslate", "class='notranslate'", "All valid"], correctAnswerIndex: 3, explanation: "Multiple ways exist" },
  { content: "What is the correct way to mark up a dialog/modal?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["<dialog>", "<div role='dialog'>", "Both valid", "<aside>"], correctAnswerIndex: 2, explanation: "<dialog> has showModal() method" },
  { content: "Which attribute makes a link open in the parent's frame?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["target='_top'", "target='_parent'", "target='_self'", "target='_blank'"], correctAnswerIndex: 0, explanation: "Breaks out of iframe" },
  { content: "What does the 'crossorigin' attribute on <img> enable?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["CORS for canvas operations", "Faster loading", "Lazy loading", "Better compression"], correctAnswerIndex: 0, explanation: "Needed for taint-free canvas" },
  { content: "Which element is used for a progress bar?", language: "HTML", format: "MCQ", difficulty: "Easy", options: ["<progress>", "<meter>", "<range>", "<bar>"], correctAnswerIndex: 0, explanation: "<progress max='100' value='70'>" },
  { content: "What is the purpose of the 'slot' attribute?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["Web Components shadow DOM", "Named slots", "Both", "Iframe placeholder"], correctAnswerIndex: 2, explanation: "Part of Web Components" },
  { content: "Which attribute prevents iOS from auto-styling phone numbers?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["<meta name='format-detection' content='telephone=no'>", "data-no-phone", "tel='false'", "No way"], correctAnswerIndex: 0, explanation: "Apple-specific meta" },
  { content: "What does the 'hidden' attribute do when used with CSS display?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["Overridden by CSS", "Always hidden", "Only for JS", "Deprecated"], correctAnswerIndex: 0, explanation: "[hidden] { display: none } by default" },
  { content: "Which tag defines a keygen (now removed)?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["<keygen>", "It was real", "Never existed", "<crypto>"], correctAnswerIndex: 0, explanation: "Deprecated in HTML5" },
  { content: "What is the correct way to add a manifest for PWA?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["<link rel='manifest' href='manifest.json'>", "<meta name='manifest'>", "Both", "No longer needed"], correctAnswerIndex: 0, explanation: "Still required" },
  { content: "Which attribute improves accessibility for icons?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["aria-hidden='true'", "role='img'", "Both", "alt=''"], correctAnswerIndex: 2, explanation: "Best practice for decorative SVG" },
  { content: "What does the 'decoding' attribute on <img> do?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["decoding='async'", "Faster rendering", "Both", "No effect"], correctAnswerIndex: 2, explanation: "Hints async decoding" },
  { content: "Which element represents measurements within a known range?", language: "HTML", format: "MCQ", difficulty: "Medium", options: ["<meter>", "<progress>", "<gauge>", "<range>"], correctAnswerIndex: 0, explanation: "<meter value='6' min='0' max='10'>" },
  { content: "What is the purpose of the 'importance' attribute on <link> or <script>?", language: "HTML", format: "MCQ", difficulty: "Hard", options: ["Priority hints for browser", "SEO boost", "Caching", "Security"], correctAnswerIndex: 0, explanation: "importance='high'" },

  // HTML Fill in the Blank (20)
  { content: "To make a button trigger a popover, use popovertarget='___'", language: "HTML", format: "Fill in the Blank", difficulty: "Hard", options: ["id", "name", "class", "data-target"], correctAnswerIndex: 0, explanation: "New popover API" },
  { content: "The attribute to prevent zooming on iOS is ___", language: "HTML", format: "Fill in the Blank", difficulty: "Medium", options: ["maximum-scale=1", "user-scalable=no", "Both in viewport", "touch-action"], correctAnswerIndex: 2, explanation: "Common in viewport meta" },
  { content: "To show a native date picker, use type='___'", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["date", "datetime-local", "month", "All valid"], correctAnswerIndex: 3, explanation: "Multiple date types" },
  { content: "Complete: <dialog id='modal'>...<button popovertarget='modal' popovertargetaction='___'>", language: "HTML", format: "Fill in the Blank", difficulty: "Hard", options: ["show", "toggle", "open", "reveal"], correctAnswerIndex: 1, explanation: "toggle is default" },
  { content: "The semantic tag for navigation is <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["nav", "navigation", "menu", "links"], correctAnswerIndex: 0, explanation: "<nav>" },
  { content: "To allow multiple file uploads, add ___ attribute", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["multiple", "multi", "files", "array"], correctAnswerIndex: 0, explanation: "multiple on input type='file'" },
  { content: "The attribute to disable autocomplete on specific input is ___", language: "HTML", format: "Fill in the Blank", difficulty: "Medium", options: ["autocomplete='off'", "off", "no-complete", "false"], correctAnswerIndex: 0, explanation: "Per-field override" },
  { content: "To create a details disclosure widget, use <___> and <summary>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["details", "disclosure", "accordion", "collapse"], correctAnswerIndex: 0, explanation: "Native HTML" },
  { content: "The tag for ruby annotations (e.g. Japanese) is <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Hard", options: ["ruby", "rt", "rp", "All part of ruby"], correctAnswerIndex: 3, explanation: "<ruby>漢<rt>kan</rt></ruby>" },
  { content: "To mark text as inserted, use <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["ins", "add", "new", "insert"], correctAnswerIndex: 0, explanation: "<ins>new text</ins>" },
  { content: "The attribute to force vertical writing is ___", language: "HTML", format: "Fill in the Blank", difficulty: "Hard", options: ["writing-mode: vertical-rl", "dir='vertical'", "No HTML way", "lang='ja'"], correctAnswerIndex: 2, explanation: "CSS only" },
  { content: "To add a caption to a figure, use <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["figcaption", "caption", "label", "p"], correctAnswerIndex: 0, explanation: "<figcaption>" },
  { content: "The correct way to define a template is <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Medium", options: ["template", "script type='template'", "Both", "tmpl"], correctAnswerIndex: 2, explanation: "Both valid" },
  { content: "To make a form field optional after required, remove ___", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["required", "mandatory", "validate", "check"], correctAnswerIndex: 0, explanation: "Boolean attribute" },
  { content: "The tag for a definition list item is <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["dd", "dt", "dl", "li"], correctAnswerIndex: 0, explanation: "<dd>definition</dd>" },
  { content: "To create a search input with native clear button, use type='___'", language: "HTML", format: "Fill in the Blank", difficulty: "Medium", options: ["search", "text", "Both show X", "query"], correctAnswerIndex: 0, explanation: "Safari/Chrome feature" },
  { content: "The attribute to preload video frames is ___", language: "HTML", format: "Fill in the Blank", difficulty: "Hard", options: ["poster", "preload='auto'", "Both", "cover"], correctAnswerIndex: 2, explanation: "poster + preload" },
  { content: "To group form fields visually, use <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["fieldset", "group", "section", "div"], correctAnswerIndex: 0, explanation: "<fieldset><legend>Group</legend>" },
  { content: "The correct way to mark deleted text is <___>", language: "HTML", format: "Fill in the Blank", difficulty: "Easy", options: ["del", "s", "strike", "remove"], correctAnswerIndex: 0, explanation: "<del>old</del>" },
  { content: "To make an element focusable via keyboard, add ___", language: "HTML", format: "Fill in the Blank", difficulty: "Medium", options: ["tabindex='0'", "tabindex", "focusable", "role='button'"], correctAnswerIndex: 0, explanation: "tabindex='0'" },

  // HTML Fix the Code (20)
  { content: "Fix: <picture><source srcset='large.webp'><img src='fallback.jpg'></picture> Missing ___", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["type='image/webp'", "media query", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "type needed for format" },
  { content: "Fix: <button type='button' onclick='submit()'>Submit</button> Inside form", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["type='submit'", "remove onclick", "Both better", "Nothing"], correctAnswerIndex: 2, explanation: "Semantic & secure" },
  { content: "Fix: <img src='photo.jpg' loading='lazy' width='800' height='600'> Add ___", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["intrinsicsize or aspect-ratio", "sizes", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Prevent layout shift" },
  { content: "Fix: <a href='tel:1234567890'>Call</a> On mobile", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Add tel: prefix", "Both valid", "Use button"], correctAnswerIndex: 0, explanation: "Perfect" },
  { content: "Fix: <input type='email' placeholder='name@domain.com'> Add ___", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["autocomplete='email'", "name='email'", "Both important", "Nothing"], correctAnswerIndex: 2, explanation: "UX + functionality" },
  { content: "Fix: <video controls><source src='movie.webm'><source src='movie.mp4'></video> Order wrong", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["mp4 first", "webm first", "Order doesn't matter", "Add type"], correctAnswerIndex: 1, explanation: "Better format first" },
  { content: "Fix: <h2>Section</h2> after <h1>, then <h4> next", language: "HTML", format: "Fix the Code", difficulty: "Hard", options: ["Bad hierarchy", "Use h3", "Both", "No rule"], correctAnswerIndex: 2, explanation: "Don't skip levels" },
  { content: "Fix: <div popover id='tip'>Content</div><button popovertarget='tip'>Show</button>", language: "HTML", format: "Fix the Code", difficulty: "Hard", options: ["Add popover='auto' or 'manual'", "Correct", "Add show()", "Use JS"], correctAnswerIndex: 0, explanation: "Needs popover attribute" },
  { content: "Fix: <meta name='theme-color' content='#ff6600'>", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Add media", "Both valid", "Deprecated"], correctAnswerIndex: 2, explanation: "Works perfectly" },
  { content: "Fix: <label for='name'>Name:</label><input id='name'>", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Wrap input in label", "Both valid", "Add name"], correctAnswerIndex: 2, explanation: "Both accessible" },
  { content: "Fix: <link rel='icon' href='favicon.ico'> Add ___", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["sizes='any' or multiple", "type", "Both", "Nothing"], correctAnswerIndex: 0, explanation: "For modern favicons" },
  { content: "Fix: <input type='range' value='50'> Add ___", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["min/max", "step", "Both", "list"], correctAnswerIndex: 2, explanation: "Otherwise useless" },
  { content: "Fix: <audio controls autoplay loop muted>", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["Remove autoplay or add muted", "Correct", "Add playsinline", "Bad UX"], correctAnswerIndex: 2, explanation: "playsinline for mobile" },
  { content: "Fix: <svg width='24' height='24' aria-label='Close'>", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["Add role='img'", "aria-hidden='true' if decorative", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Depends on use" },
  { content: "Fix: <button disabled='false'>Click</button>", language: "HTML", format: "Fix the Code", difficulty: "Hard", options: ["Remove attribute", "disabled='true'", "Both wrong", "Use JS"], correctAnswerIndex: 0, explanation: "Boolean attribute" },
  { content: "Fix: <input type='checkbox' name='agree' required> Missing ___", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["value", "id/label", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "value required for submission" },
  { content: "Fix: <img src='cat.jpg' alt='A photo of a cat'>", language: "HTML", format: "Fix the Code", difficulty: "Easy", options: ["Perfect", "Too long", "Should be empty", "Add title"], correctAnswerIndex: 0, explanation: "Excellent alt text" },
  { content: "Fix: <form action='/submit' method='get'> for sensitive data", language: "HTML", format: "Fix the Code", difficulty: "Hard", options: ["Use POST", "Add enctype", "Both", "Nothing"], correctAnswerIndex: 0, explanation: "GET exposes in URL" },
  { content: "Fix: <div role='alert' hidden>Message</div>", language: "HTML", format: "Fix the Code", difficulty: "Hard", options: ["Remove hidden", "Use aria-live", "Both", "Use dialog"], correctAnswerIndex: 2, explanation: "alert shouldn't be hidden" },
  { content: "Fix: <link rel='stylesheet' href='dark.css' media='prefers-color-scheme: dark'>", language: "HTML", format: "Fix the Code", difficulty: "Medium", options: ["Correct", "Use title", "Both valid", "Use @import"], correctAnswerIndex: 2, explanation: "Modern approach" },

  // ==============================================================
  // ======================= CSS - 60 NEW QUESTIONS ===============
  // ==============================================================

  // CSS MCQ (20)
  { content: "What does the new 'dvh' unit represent?", language: "CSS", format: "MCQ", difficulty: "Medium", options: ["Dynamic viewport height", "Device height", "Both", "Desktop height"], correctAnswerIndex: 0, explanation: "Handles mobile browser UI" },
  { content: "Which property enables container queries?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["container-type", "container", "contain", "query"], correctAnswerIndex: 0, explanation: "container-type: inline-size" },
  { content: "What does 'text-wrap: pretty' do?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["Better line breaking", "Wraps at word", "Both", "No effect"], correctAnswerIndex: 0, explanation: "New in 2024" },
  { content: "Which function creates a color using OKLCH color space?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["oklch()", "lch()", "lab()", "hsl()"], correctAnswerIndex: 0, explanation: "Perceptually uniform" },
  { content: "What is the purpose of '@layer' in CSS?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["Cascade layers", "Z-index control", "Animation layers", "All"], correctAnswerIndex: 0, explanation: "Explicit cascade control" },
  { content: "Which property creates subgrid?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["grid-template-columns: subgrid", "display: subgrid", "Both", "No such thing"], correctAnswerIndex: 2, explanation: "Level 2 Grid" },
  { content: "What does 'anchor()' function do?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["Positions relative to anchor", "Creates fixed point", "Both", "Deprecated"], correctAnswerIndex: 0, explanation: "New positioning" },
  { content: "Which selector targets elements based on their container size?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["@container", "@media", "Both", ":has()"], correctAnswerIndex: 0, explanation: "Container queries" },
  { content: "What does 'field-sizing: content' do?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["Auto-resizing textarea", "Input grows", "Both", "No effect"], correctAnswerIndex: 2, explanation: "New form control sizing" },
  { content: "Which property controls individual border image slices?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["border-image-slice", "border-image-outset", "Both", "border-slice"], correctAnswerIndex: 0, explanation: "Often forgotten" },
  { content: "What does 'overscroll-behavior' prevent?", language: "CSS", format: "MCQ", difficulty: "Medium", options: ["Pull-to-refresh on mobile", "Bounce effect", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Great for modals" },
  { content: "Which value makes an element respect its aspect ratio?", language: "CSS", format: "MCQ", difficulty: "Easy", options: ["aspect-ratio: auto", "aspect-ratio: 1/1", "Both", "height: auto"], correctAnswerIndex: 2, explanation: "Modern solution" },
  { content: "What does 'color-scheme' property do?", language: "CSS", format: "MCQ", difficulty: "Medium", options: ["Hints OS light/dark mode", "Forces color", "Both", "No effect"], correctAnswerIndex: 0, explanation: "Improves native controls" },
  { content: "Which pseudo-class targets elements with open <details>?", language: "CSS", format: "MCQ", difficulty: "Hard", options: [":open", ":expanded", ":visible", "details:open"], correctAnswerIndex: 0, explanation: ":open selector" },
  { content: "What does 'scroll-padding' do?", language: "CSS", format: "MCQ", difficulty: "Medium", options: ["Offsets scroll snapping", "Adds padding when scrolling to anchor", "Both", "Nothing"], correctAnswerIndex: 1, explanation: "Fixes fixed header issue" },
  { content: "Which property creates masonry layout?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["grid-template-rows: masonry", "display: masonry", "Both", "No standard yet"], correctAnswerIndex: 2, explanation: "Firefox only for now" },
  { content: "What does 'accent-color' change?", language: "CSS", format: "MCQ", difficulty: "Easy", options: ["Checkbox/radio color", "Focus ring", "Both", "Scrollbar"], correctAnswerIndex: 0, explanation: "Simple theming" },
  { content: "Which at-rule detects high contrast mode?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["@media (prefers-contrast: high)", "@media (forced-colors)", "Both", "No way"], correctAnswerIndex: 2, explanation: "Windows high contrast" },
  { content: "What does 'view-transition-name' enable?", language: "CSS", format: "MCQ", difficulty: "Hard", options: ["Smooth page transitions", "Shared element transitions", "Both", "No effect"], correctAnswerIndex: 2, explanation: "New View Transitions API" },
  { content: "Which property creates individual transform animations?", language: "CSS", format: "MCQ", difficulty: "Medium", options: ["transform: scale()", "transition: transform", "Both", "animation-timeline"], correctAnswerIndex: 3, explanation: "scroll-driven animations" },

  // CSS Fill in the Blank (20)
  { content: "To center with grid, use place-content: ___", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["center", "center center", "Both valid", "middle"], correctAnswerIndex: 2, explanation: "Shorthand" },
  { content: "To create a responsive square, use aspect-ratio: ___", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["1 / 1", "1", "Both valid", "100%"], correctAnswerIndex: 2, explanation: "Both work" },
  { content: "The property to disable text selection is user-select: ___", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["none", "no-select", "text-none", "block"], correctAnswerIndex: 0, explanation: "Standard" },
  { content: "To create a sticky header that respects safe-area, use top: ___", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["env(safe-area-inset-top)", "constant(safe-area-inset-top)", "Both", "0"], correctAnswerIndex: 2, explanation: "iOS notch" },
  { content: "Complete: @container (min-width: 300px) { ___ }", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: [".card { grid-template-columns: 1fr 1fr }", "style query", "Both valid", "media query"], correctAnswerIndex: 0, explanation: "Container query" },
  { content: "To prevent layout shift, use ___ on images", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: ["aspect-ratio", "width/height attributes", "Both", "contain: layout"], correctAnswerIndex: 2, explanation: "Best practice" },
  { content: "The property to round only top corners is border-___-radius", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["top", "block-start", "Both valid", "corner"], correctAnswerIndex: 2, explanation: "Logical properties" },
  { content: "To create a full-bleed section, use margin: ___", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: ["0 calc(50% - 50vw)", "0 -50vw", "Both valid", "0 auto"], correctAnswerIndex: 2, explanation: "Common pattern" },
  { content: "Complete: .card { view-transition-name: ___ } for smooth transition", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["card-1", "unique-name", "Both", "transition"], correctAnswerIndex: 2, explanation: "Must be unique" },
  { content: "To hide content visually but keep for screen readers, use ___", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: [".sr-only", "visibility: hidden", "display: none", "opacity: 0"], correctAnswerIndex: 0, explanation: "Accessibility class" },
  { content: "The modern way to reset margins is * { margin: ___ }", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["0", "unset", "revert", "initial"], correctAnswerIndex: 0, explanation: "Classic reset" },
  { content: "To create a hover effect only on non-touch devices, use @media (___)", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["hover: hover", "pointer: fine", "Both", "any-hover"], correctAnswerIndex: 1, explanation: "pointer: fine" },
  { content: "Complete: .element { content: ___ } for custom counter", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["counter(increment)", "counters()", "Both", "var(--i)"], correctAnswerIndex: 2, explanation: "counter(name)" },
  { content: "To create a gradient text effect, use background: linear-gradient, then ___", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: ["-webkit-background-clip: text", "background-clip: text", "Both", "text-fill-color"], correctAnswerIndex: 2, explanation: "Standard + WebKit" },
  { content: "The property to control scroll snap alignment is scroll-snap-___", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: ["align", "type", "stop", "padding"], correctAnswerIndex: 0, explanation: "scroll-snap-align" },
  { content: "To create a neon glow, use box-shadow with ___", language: "CSS", format: "Fill in the Blank", difficulty: "Medium", options: ["multiple shadows", "text-shadow", "Both", "filter: glow"], correctAnswerIndex: 2, explanation: "Layered shadows" },
  { content: "Complete: @property --color { syntax: '<color>'; inherits: ___ }", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["false", "true", "Both valid", "auto"], correctAnswerIndex: 0, explanation: "Usually false" },
  { content: "To make a div behave like a button, add role='button' and ___", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["cursor: pointer", "tabindex='0'", "Both + keyboard handler", "user-select: none"], correctAnswerIndex: 2, explanation: "Full accessibility" },
  { content: "The property to animate grid tracks is grid-template-___", language: "CSS", format: "Fill in the Blank", difficulty: "Hard", options: ["columns", "rows", "Both animatable", "areas"], correctAnswerIndex: 2, explanation: "Now animatable!" },
  { content: "To detect dark mode, use @media (___)", language: "CSS", format: "Fill in the Blank", difficulty: "Easy", options: ["prefers-color-scheme: dark", "color-scheme: dark", "Both valid", "dark-mode"], correctAnswerIndex: 2, explanation: "Standard" },

  // CSS Fix the Code (20)
  { content: "Fix: .btn { padding: 1rem 2rem; border: none; cursor: pointer } Missing ___", language: "CSS", format: "Fix the Code", difficulty: "Easy", options: ["background", "display", "Both", "transition"], correctAnswerIndex: 2, explanation: "Looks like text otherwise" },
  { content: "Fix: img { width: 100%; height: auto } Add ___", language: "CSS", format: "Fix the Code", difficulty: "Easy", options: ["display: block", "aspect-ratio", "Both", "object-fit"], correctAnswerIndex: 0, explanation: "Prevents extra space" },
  { content: "Fix: .container { width: 100vw; margin: 0 auto } Problem", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["Includes scrollbar", "Use 100%", "100dvw", "max-width"], correctAnswerIndex: 2, explanation: "100dvw is new fix" },
  { content: "Fix: .card { transition: all 0.3s ease } Performance", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["Only transform/opacity", "will-change", "Both", "Nothing"], correctAnswerIndex: 0, explanation: "all is expensive" },
  { content: "Fix: a { text-decoration: none } Missing ___", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: [":hover state", "color", "Both", "cursor"], correctAnswerIndex: 2, explanation: "Users won't know it's a link" },
  { content: "Fix: .modal { position: fixed; inset: 0; margin: auto } Wrong", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["Remove margin", "Use flex on body", "Both", "Use transform"], correctAnswerIndex: 0, explanation: "inset:0 + margin:auto conflict" },
  { content: "Fix: ::-webkit-scrollbar { width: 10px } Only works in ___", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["WebKit", "All browsers", "Firefox", "No browser"], correctAnswerIndex: 0, explanation: "Non-standard" },
  { content: "Fix: .element { transform: translate(-50%, -50%) } Missing ___", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["left: 50%; top: 50%", "position", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Classic centering" },
  { content: "Fix: .grid { display: grid; gap: 1rem } No columns", language: "CSS", format: "Fix the Code", difficulty: "Easy", options: ["Add grid-template-columns", "auto-fill", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Needs column definition" },
  { content: "Fix: input { border: 2px solid transparent } On focus", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["Add :focus state", "outline: none", "Both", "accent-color"], correctAnswerIndex: 2, explanation: "Needs visual feedback" },
  { content: "Fix: .tooltip { opacity: 0; transition: opacity 0.3s } On hover", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: [".tooltip:hover { opacity: 1 }", "pointer-events", "Both", "visibility"], correctAnswerIndex: 2, explanation: "Can't hover if opacity 0" },
  { content: "Fix: .container { padding: 2rem; background: white } On dark mode", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["Add prefers-color-scheme", "color-scheme", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Better with dark support" },
  { content: "Fix: .btn:hover { background: darken(#0066cc, 10%) } Syntax", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["No darken() function", "Use color-mix()", "calc()", "filter"], correctAnswerIndex: 1, explanation: "Sass only" },
  { content: "Fix: .card { border-radius: 12px; overflow: hidden } With transform", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["Add transform-style", "will-change", "Both", "Nothing"], correctAnswerIndex: 2, explanation: "Clipping issue on some browsers" },
  { content: "Fix: h1 { font: bold 3rem/1.2 'Inter' } Syntax", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["font shorthand order", "Correct", "Missing family", "Use font-face"], correctAnswerIndex: 0, explanation: "Order matters" },
  { content: "Fix: .element { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) } Same as ___", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["No clip-path needed", "inset(0)", "border", "background-clip"], correctAnswerIndex: 0, explanation: "Unnecessary" },
  { content: "Fix: .loading::before { content: '' } Animation", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["Add spinner styles", "Correct", "Use ::after", "JS"], correctAnswerIndex: 0, explanation: "Needs full styles" },
  { content: "Fix: body { font-size: 16px } h1 { font-size: 2em } Compounds", language: "CSS", format: "Fix the Code", difficulty: "Medium", options: ["Use rem", "Both valid", "Use px", "No issue"], correctAnswerIndex: 0, explanation: "rem doesn't compound" },
  { content: "Fix: .nav { position: sticky; top: -1px } Flicker", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["top: 0", "z-index", "background", "All common fixes"], correctAnswerIndex: 3, explanation: "Multiple causes" },
  { content: "Fix: .glass { backdrop-filter: blur(10px) } On mobile", language: "CSS", format: "Fix the Code", difficulty: "Hard", options: ["Performance heavy", "Add -webkit-backdrop-filter", "Both", "Use opacity"], correctAnswerIndex: 2, explanation: "iOS needs prefix" },

  // ==============================================================
  // =================== JAVASCRIPT - 60 NEW QUESTIONS ============
  // ==============================================================

  // JavaScript MCQ (20)
  { content: "What does the new 'using' declaration do in JS?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["Automatic disposal (like try/finally)", "Variable declaration", "Module import", "Symbol"], correctAnswerIndex: 0, explanation: "Explicit resource management" },
  { content: "Which method returns a promise that resolves after DOM update?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["requestAnimationFrame", "queueMicrotask", "requestPostAnimationFrame", "No such method"], correctAnswerIndex: 0, explanation: "RAF is closest" },
  { content: "What is the output of Promise.withResolvers()?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["{ promise, resolve, reject }", "Promise", "Array", "Object"], correctAnswerIndex: 0, explanation: "New in 2024" },
  { content: "Which method groups array items into a Map?", language: "JavaScript", format: "MCQ", difficulty: "Medium", options: ["Object.groupBy()", "Array.group()", "Map.groupBy()", "No built-in"], correctAnswerIndex: 0, explanation: "New static method" },
  { content: "What does Array.findLast() do?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["Searches from end", "Same as find", "Both", "Error"], correctAnswerIndex: 0, explanation: "Reverse search" },
  { content: "Which symbol makes a class method non-enumerable?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["Symbol.toStringTag", "Symbol.hasInstance", "No way", "Object.defineProperty"], correctAnswerIndex: 3, explanation: "Must define manually" },
  { content: "What is the purpose of Temporal API?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["Better date/time handling", "Replace Date", "Both", "No longer proposed"], correctAnswerIndex: 2, explanation: "Stage 3 proposal" },
  { content: "Which method resizes an array in place?", language: "JavaScript", format: "MCQ", difficulty: "Medium", options: ["array.length = 5", "array.resize()", "array.setLength()", "No way"], correctAnswerIndex: 0, explanation: "Just assign length" },
  { content: "What does the '#private' field do in classes?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["True private field", "Convention only", "Both", "Deprecated"], correctAnswerIndex: 0, explanation: "Real privacy" },
  { content: "Which API allows measuring performance of code?", language: "JavaScript", format: "MCQ", difficulty: "Medium", options: ["Performance.mark()", "console.time()", "Both", "Date.now()"], correctAnswerIndex: 2, explanation: "Multiple ways" },
  { content: "What is the output of 0.1 + 0.2 === 0.3?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["false", "true", "Error", "undefined"], correctAnswerIndex: 0, explanation: "Floating point precision" },
  { content: "Which method converts iterable to array safely?", language: "JavaScript", format: "MCQ", difficulty: "Medium", options: ["Array.from()", "[...iterable]", "Both", "Array.of()"], correctAnswerIndex: 2, explanation: "Both work" },
  { content: "What does '??=' operator do?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["Nullish coalescing assignment", "Logical OR assignment", "Both", "No such operator"], correctAnswerIndex: 0, explanation: "x ??= y" },
  { content: "Which method is used for pattern matching (proposed)?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["match()", "when()", "No standard", "switch with objects"], correctAnswerIndex: 2, explanation: "Stage 1 proposal" },
  { content: "What does globalThis refer to?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["Global object in any environment", "window", "global", "All of the above"], correctAnswerIndex: 3, explanation: "Universal global" },
  { content: "Which method flattens nested arrays?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["flat()", "flatten()", "reduce()", "All of the above"], correctAnswerIndex: 3, explanation: "Multiple ways" },
  { content: "What is the difference between let and const?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["const cannot be reassigned", "let is block scoped", "Both", "No difference"], correctAnswerIndex: 2, explanation: "Both true" },
  { content: "Which method schedules code after current call stack?", language: "JavaScript", format: "MCQ", difficulty: "Medium", options: ["setTimeout(() => {}, 0)", "queueMicrotask()", "Both", "Promise.resolve().then()"], correctAnswerIndex: 2, explanation: "All async" },
  { content: "What does Array.prototype.at(-1) return?", language: "JavaScript", format: "MCQ", difficulty: "Easy", options: ["Last element", "undefined", "Error", "null"], correctAnswerIndex: 0, explanation: "Negative indexing" },
  { content: "Which operator has the lowest precedence?", language: "JavaScript", format: "MCQ", difficulty: "Hard", options: ["=", "??", "||", "&&"], correctAnswerIndex: 0, explanation: "Assignment" },

  // JavaScript Fill in the Blank (20)
  { content: "To remove duplicates from array, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["[...new Set(arr)]", "Array.from(new Set(arr))", "Both", "arr.unique()"], correctAnswerIndex: 2, explanation: "Modern way" },
  { content: "Complete: const delay = ms => new Promise(___ => setTimeout(resolve, ms))", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["resolve", "res", "done", "callback"], correctAnswerIndex: 0, explanation: "resolve function" },
  { content: "To deep compare objects, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["JSON.stringify", "structuredClone + ===", "No built-in", "lodash isEqual"], correctAnswerIndex: 2, explanation: "No native deep equal" },
  { content: "Complete: element.addEventListener('click', ___ , { once: true })", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["handler", "function", "Both", "e => {}"], correctAnswerIndex: 2, explanation: "Any function" },
  { content: "To throttle a function, use setTimeout and ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["clearTimeout", "timestamp", "Both", "requestAnimationFrame"], correctAnswerIndex: 2, explanation: "Classic pattern" },
  { content: "Complete: const [first, ...rest] = arr uses ___ syntax", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["rest", "spread", "destructuring", "All"], correctAnswerIndex: 3, explanation: "Rest in destructuring" },
  { content: "To get object keys, use Object.___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["keys()", "getOwnPropertyNames()", "Both", "entries()"], correctAnswerIndex: 2, explanation: "keys() most common" },
  { content: "Complete: fetch('/data').then(res => res.___()) for JSON", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["json()", "text()", "blob()", "arrayBuffer()"], correctAnswerIndex: 0, explanation: "res.json()" },
  { content: "To create an abortable fetch, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["AbortController", "signal", "Both", "timeout"], correctAnswerIndex: 2, explanation: "Standard way" },
  { content: "Complete: const person = { name: 'John', ...defaults } uses ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["spread", "rest", "Both", "merge"], correctAnswerIndex: 0, explanation: "Object spread" },
  { content: "To check if object has property, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["'prop' in obj", "obj.hasOwnProperty()", "Both", "obj.prop !== undefined"], correctAnswerIndex: 2, explanation: "in includes prototype" },
  { content: "Complete: class MyClass { #private = 42; ___ getValue() { return this.#private } }", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["private", "static", "Nothing", "#"], correctAnswerIndex: 2, explanation: "Methods don't need #" },
  { content: "To create a memoized function, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["Map cache", "WeakMap", "Both", "closure"], correctAnswerIndex: 3, explanation: "Multiple ways" },
  { content: "Complete: element.matches('___') checks selector", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: [".active", "css selector", "tag", "id"], correctAnswerIndex: 1, explanation: "CSS selector string" },
  { content: "To observe element size changes, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["ResizeObserver", "MutationObserver", "Both", "getBoundingClientRect"], correctAnswerIndex: 0, explanation: "Modern API" },
  { content: "Complete: const { log } = console uses ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Easy", options: ["destructuring", "spread", "rest", "import"], correctAnswerIndex: 0, explanation: "Object destructuring" },
  { content: "To create a generator function, use function* ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["name()", "()", "{}", "any name"], correctAnswerIndex: 3, explanation: "Star is important" },
  { content: "Complete: import json from './data.json' with { type: '___' }", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["json", "module", "data", "import"], correctAnswerIndex: 0, explanation: "JSON modules" },
  { content: "To get current script URL, use ___", language: "JavaScript", format: "Fill in the Blank", difficulty: "Hard", options: ["import.meta.url", "document.currentScript", "Both", "location.href"], correctAnswerIndex: 2, explanation: "Both work" },
  { content: "Complete: const controller = new AbortController(); fetch(url, { signal: ___ })", language: "JavaScript", format: "Fill in the Blank", difficulty: "Medium", options: ["controller.signal", "signal", "Both", "controller"], correctAnswerIndex: 0, explanation: "signal property" },

  // JavaScript Fix the Code (20)
  { content: "Fix: const obj = { a: 1, b: 2 }; const copy = obj; copy.a = 99;", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Use spread { ...obj }", "Object.assign()", "Both", "structuredClone()"], correctAnswerIndex: 2, explanation: "Reference vs copy" },
  { content: "Fix: setTimeout(() => console.log('Hi'), 1000) Repeats", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Use setInterval", "No fix needed", "Both valid", "clearTimeout"], correctAnswerIndex: 0, explanation: "setTimeout runs once" },
  { content: "Fix: fetch('/api').then(res => res.json()).then(data => console.log(data))", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Add error handling", "Check res.ok", "Both", "Use async/await"], correctAnswerIndex: 2, explanation: "Missing error handling" },
  { content: "Fix: const arr = [1,2,3]; arr.length = 0; Clears array", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Use arr = []", "Both valid", "arr.splice(0)"], correctAnswerIndex: 2, explanation: "Multiple ways" },
  { content: "Fix: document.querySelector('button').addEventListener('click', handler)", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Check if element exists", "Use optional chaining", "Both", "Use delegation"], correctAnswerIndex: 2, explanation: "Can be null" },
  { content: "Fix: const person = { name: 'John' }; console.log(person.age.years)", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Use optional chaining ?. ", "Check if age exists", "Both", "Try/catch"], correctAnswerIndex: 0, explanation: "Prevents error" },
  { content: "Fix: const timer = setInterval(fn, 1000); Never cleared", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["clearInterval(timer)", "return timer", "Both", "Use setTimeout"], correctAnswerIndex: 2, explanation: "Memory leak" },
  { content: "Fix: JSON.parse(undefined)", language: "JavaScript", format: "Fix the Code", difficulty: "Hard", options: ["Throws error", "Use try/catch", "Check data first", "Both"], correctAnswerIndex: 3, explanation: "Common fetch bug" },
  { content: "Fix: const obj = {}; obj.prop = obj.prop || 'default'", language: "JavaScript", format: "Fix the Code", difficulty: "Hard", options: ["Use ?? for nullish", "Both valid", "Use default parameter", "Object.hasOwn()"], correctAnswerIndex: 0, explanation: "?? better than ||" },
  { content: "Fix: for (var i = 0; i < 5; i++) { setTimeout(() => console.log(i), 1000) }", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Use let", "Pass i as parameter", "Both fix closure", "IIFE"], correctAnswerIndex: 2, explanation: "Classic loop issue" },
  { content: "Fix: element.addEventListener('click', function(e) { e.preventDefault() })", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Use arrow function", "Both valid", "return false"], correctAnswerIndex: 2, explanation: "Both work" },
  { content: "Fix: const nums = [1,2,3]; nums.map(x => x * 2); Original unchanged", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["map returns new array", "Use forEach", "Both valid", "nums = nums.map()"], correctAnswerIndex: 0, explanation: "map is immutable" },
  { content: "Fix: Promise.resolve().then(() => console.log('micro')).then(() => console.log('micro2'))", language: "JavaScript", format: "Fix the Code", difficulty: "Hard", options: ["Both microtasks", "Correct", "One then only", "Use queueMicrotask"], correctAnswerIndex: 0, explanation: "Chaining" },
  { content: "Fix: const user = await fetch('/user').then(r => r.json())", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Must be in async function", "Use top-level await", "Both valid", "Use .json() directly"], correctAnswerIndex: 2, explanation: "Context matters" },
  { content: "Fix: document.getElementById('btn').onclick = handler", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Use addEventListener", "Both valid", "Listener better", "No difference"], correctAnswerIndex: 2, explanation: "addEventListener preferred" },
  { content: "Fix: const obj = { value: 42 }; JSON.stringify(obj, null, 2)", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Correct", "Pretty print", "Both", "Use replacer"], correctAnswerIndex: 2, explanation: "Works perfectly" },
  { content: "Fix: const arr = [1,2,3]; arr.push(4); console.log(arr.length)", language: "JavaScript", format: "Fix the Code", difficulty: "Easy", options: ["Returns new length", "Correct", "Returns pushed value", "undefined"], correctAnswerIndex: 1, explanation: "push returns length" },
  { content: "Fix: element.classList.add('active') Multiple times", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Safe, no duplicates", "Use toggle", "Both", "Check first"], correctAnswerIndex: 0, explanation: "classList is safe" },
  { content: "Fix: const fn = () => { console.log(this) } Called as method", language: "JavaScript", format: "Fix the Code", difficulty: "Hard", options: ["this is undefined", "Use regular function", "Both", "bind this"], correctAnswerIndex: 0, explanation: "Arrow functions don't bind this" },
  { content: "Fix: const controller = new AbortController(); setTimeout(() => controller.abort(), 5000)", language: "JavaScript", format: "Fix the Code", difficulty: "Medium", options: ["Correct timeout pattern", "Good practice", "Both", "Use clearTimeout"], correctAnswerIndex: 2, explanation: "Standard pattern" },

]
async function seedQuestions() {
  try {
    const questionsRef = db.collection("questions")
 

    console.log(`[Seed] Seeding ${questions.length} questions...`)
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      await questionsRef.add({
        ...q,
        createdAt: admin.firestore.Timestamp.now(),
      })
      console.log(`[Seed] Seeded ${i + 1}/${questions.length}`)
    }
    console.log("[Seed] Done! 180 questions seeded.")
    process.exit(0)
  } catch (err) {
    console.error("[Seed] Error:", err)
    process.exit(1)
  }
}

seedQuestions()