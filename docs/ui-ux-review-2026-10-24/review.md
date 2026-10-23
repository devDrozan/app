# UI/UX review — 24 October 2026

The app has a coherent visual system and a recognizable employment → wages → review → result journey. The highest-value improvements are preserving entered work, making validation actionable, and keeping users oriented when steps change. Seven actionable issues are listed below; none requires changing calculation formulas or adding persistent salary storage.

## Scope and evidence

The intended users are E-9 workers in Korea who need to enter employment/wage information and understand an English or Burmese estimate and its limitations. This review used the current [specification](/Users/rozannaing/Desktop/SeverancePayCaculator/SPEC.md), workspace/repository instructions, the UI/UX specialist's independent source review, and a walkthrough of the running web app using public example/synthetic amounts.

Rendered checks covered the initial desktop screen at 1280 × 720, the web flow at 390 × 844, Burmese guide content at 320 × 740, normal/provisional results, DC contributions with a separate reported balance, special-history review-required results, wage validation, Back navigation, and language/help navigation. Native Android/iPhone behavior was inspected in source only. PWA installation/offline behavior, actual screen readers, increased system text size, native rendering, fluent translation review, real-user testing, and financial/legal correctness were not validated. No product code was changed.

Criteria are the maintained syntheses of the user's [UI.pdf](/Users/rozannaing/Desktop/SeverancePayCaculator/UI.pdf) and [UX.pdf](/Users/rozannaing/Desktop/SeverancePayCaculator/UX.pdf), in [UI criteria](/Users/rozannaing/.codex/skills/ui-ux-subagent/references/ui-criteria.md) and [UX criteria](/Users/rozannaing/.codex/skills/ui-ux-subagent/references/ux-criteria.md). Page numbers below are one-based PDF pages. Deck examples were treated as examples, not mandatory palettes, font sizes, ratios, or new product requirements.

P2 means an issue worth scheduling because it affects task completion, clarity, trust, or accessibility. Ordering reflects the observed journey and expected user effort, rather than a formal usability score.

## 1. [P2] Returning to Employment clears the wage draft

**Observed:** Load “Try an example,” go Back from Wages to Employment, change nothing, then Continue to wages. Base-pay fields become empty; allowances, bonus, and leave pay reset to zero. The same initialization also clears ordinary wage and DC balance/date. Users who return to inspect or correct employment details lose completed work without warning.

**Evidence:** [Web draft initialization](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:74) and [Back action](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:115). [Mobile initialization](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/app/index.tsx:53) and its Back action at line 97 follow the same path. Selecting the already-active scheme also resets the flow via the scheme buttons.

**Improvement:** Preserve the in-memory draft when the method and API-returned periods are unchanged. Reconcile existing rows by their exact periods when dates change, and explain entries requiring re-entry when a period becomes incompatible. Make choosing the current plan a no-op.

**Acceptance:** Returning to Employment and continuing without a change preserves all amounts; changing only hours preserves compatible wage rows; genuinely changed periods are explained. No salary persistence is introduced.

**Criterion:** UX pp. 5–9, 21–25: predictable task journeys; UI p. 38: recovery.

## 2. [P2] Invalid wages have no identifiable field error, and the message can be offscreen

**Observed:** At 390 × 844, replace the first example base pay with `-1` and press Review my details. The viewport stays at the bottom of the wage form. The only error banner is roughly 1,321 CSS pixels above the viewport, and no input has `aria-invalid="true"`. A user sees the same button and no visible explanation of why they could not continue.

**Evidence:** [Amount validation](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:83), [MoneyInput](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:18), and [banner placement](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:139). Mobile also collapses all amount errors into one banner in [review validation](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/app/index.tsx:57), while [MoneyField](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/components/ui.tsx:15) has no error prop. Structured server issues are only mapped to employment-date fields in both clients.

**Improvement:** Track errors by field and period/year, display localized guidance beside each invalid amount, associate it with the input, and focus/scroll to the first error. Retain a form-level summary for failures that cannot be attributed to a field.

**Acceptance:** A blank or malformed field among several wage periods is visibly identified and reachable immediately after submission, without searching the entire form. A screen-reader check should confirm the linked error is announced.

**Criterion:** UI pp. 35, 38–39: accessibility and error states; UX p. 23: clear, simple interaction.

![Phone viewport after invalid wage submission; its error banner is above the visible area](/Users/rozannaing/Desktop/SeverancePayCaculator/app/docs/ui-ux-review-2026-10-24/phone-validation-bottom.jpg)

## 3. [P2] Advancing a step leaves the new content above the viewport and loses focus

**Observed:** At 390 × 844, submit the completed long wage form. After Review opens, `document.activeElement` is `BODY`; the “One last look” heading is roughly 899 CSS pixels above the viewport. The visible page shows the estimate placeholder, privacy notice, and sources below the review form. Calculating from Review similarly leaves the result summary above the visible breakdown.

**Evidence:** [Step transition](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:88), [result transition](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:123), and [remounted form panel](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:139). Scroll management currently exists only for top-level view navigation. Native mobile has a [ScrollView wrapper](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/components/ui.tsx:18) without a step-change mechanism; its visible effect still needs device verification.

**Improvement:** On successful transitions, scroll the new step heading/result summary into view and move focus to a suitable heading or container. Preserve ordinary reading position when only changing language. Respect reduced-motion preferences.

**Acceptance:** Continue, Review, Calculate, Back, and Edit show and announce the newly relevant step. Keyboard users can continue from that step without returning to the page header. Check both languages and small screens.

**Criterion:** UX pp. 5–9, 23: understandable journeys; UI pp. 38–39: realistic states and hierarchy.

![Phone viewport immediately after advancing to Review; the new review form is above it](/Users/rozannaing/Desktop/SeverancePayCaculator/app/docs/ui-ux-review-2026-10-24/phone-review-transition.jpg)

## 4. [P2] Review changes accepted decimal amounts before approval

**Observed:** Entering `1000000.50` into the first base-pay field displays `₩1,000,001` in Review. The payload builder still submits the original decimal string. Users therefore approve a different visible amount from the accepted input.

**Evidence:** [Web formatter](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/validation.ts:17), [review rendering](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:120), and [payload builder](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:78). [Mobile formatter](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/validation.ts:17) and its review rendering have the same behavior. The input pattern accepts up to six decimal places; this is a presentation mismatch, not a review of the financial formula.

**Improvement:** Separate exact input-review formatting from final estimate formatting. Group digits while retaining accepted fractional digits without converting the input through binary `Number`. Specify and label the display precision of intermediate breakdown figures separately from the final API-provided whole-won estimate.

**Acceptance:** Every accepted input has the same numeric value in input, review, and submission. Review of `1000.50` never becomes `1,001`. Final estimate rounding stays with the API contract.

**Criterion:** UX pp. 5–12: trust/reliability; UI pp. 20–27, 39: meaningful, readable information.

## 5. [P2] Native mobile mislabels HTTP service errors as bad input

**Source evidence:** [Mobile error handling](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/app/index.tsx:40) chooses `invalid` for every `ApiFailure`. [Its API client](/Users/rozannaing/Desktop/SeverancePayCaculator/mobile/src/api/client.ts:21) uses that class for HTTP errors, including empty issue lists. The API returns empty-issue envelopes for [rate limiting](/Users/rozannaing/Desktop/SeverancePayCaculator/api/src/server.ts:13) and server failures. The resulting message asks users to check highlighted fields even when their entries are correct and no fields are highlighted.

**Improvement:** Distinguish field-validation errors from operational HTTP failures, show a service/retry message for the latter, and retain the draft. Rate-limit handling should explain when retrying is appropriate. Web already distinguishes an empty issue list.

**Acceptance:** Inject native-client 429/500 responses and a genuine field-validation response; each produces the appropriate localized next action without clearing entries. This review did not perform native fault injection.

**Criterion:** UI p. 38: error/recovery states; UX pp. 5–12, 23: clarity and reliability.

## 6. [P2] A pending web calculation can overtake later edits

**Source evidence:** On [Review](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/App.tsx:123), Calculate is disabled while busy but Back remains active. The user can also go Back from Wages to editable Employment fields. The earlier calculation callback unconditionally sets its result and step 3 after resolving, so a slow response can replace the user's later editing state with a result for the old captured input. Mobile's Review Back is disabled while busy.

**Improvement:** Either disable draft-changing actions during submission, or explicitly support cancellation/editing and discard responses whose request/draft version is no longer current. Explanation-page navigation can remain available if it preserves the draft.

**Acceptance:** Delay a calculation response, navigate backward, and try editing. The eventual result must correspond to the current reviewed draft, or the request must be canceled/ignored. This race is established from source; no delayed-response injection was performed in the running browser.

**Criterion:** UI p. 38: loading states; UX p. 23: consistent, predictable behavior.

## 7. [P2] Available phone navigation looks disabled because its text is too faint

**Observed:** At 320px width, inactive but usable navigation uses `rgb(152,164,139)` on `rgb(251,252,249)` with 10px Burmese text. Their measured color contrast is approximately **2.54:1**. These destinations are available actions, but their low emphasis makes them difficult to read and gives a disabled impression.

**Evidence:** [Phone navigation color](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/styles.css:10), [final phone typography](/Users/rozannaing/Desktop/SeverancePayCaculator/app/src/styles.css:38), and computed styles from the rendered guide.

**Improvement:** Use a darker muted-text token for available navigation. Keep selection recognizable through the current underline and emphasis. Check phone help text and secondary actions using actual text/background combinations, and increase small Burmese labels where needed without clipping or causing overflow.

**Acceptance:** Available navigation remains readable in both languages at 320px and 390px, with selection still distinguishable. Validate contrast against the project's selected accessibility target; this review does not certify conformance.

**Criterion:** UI p. 18, pp. 20–27, 35, 39: contrast, readability, accessibility, and purposeful hierarchy.

![Burmese guide at 320px; inactive navigation is available but faint](/Users/rozannaing/Desktop/SeverancePayCaculator/app/docs/ui-ux-review-2026-10-24/phone-burmese-guide.jpg)

## What worked in the walkthrough

- The green/neutral system, icon family, card styling, and primary buttons are coherent across the inspected web screens.
- Switching English/Burmese and visiting the guide retained the active calculation. The inspected Burmese screens wrapped without horizontal page overflow at 320px; this is not a fluent translation review.
- A normal result showed its before-tax KRW estimate, provisional status, missing ordinary-wage explanation, rule version, and sources.
- DC contributions and reported account balance appeared as separate labeled values with a statement date and an explanation that they measure different things.
- Special-history screening produced a review-required message without a benefit amount.

## Suggested sequence

First address draft retention, amount errors, and step focus/scroll together. Then separate review-value formatting and operational error handling, and protect pending requests. Finish with navigation contrast and a native/assistive-technology walkthrough.

Two content ideas merit validation rather than being treated as demonstrated bugs: make the special-history question easier to answer without requiring users to diagnose “adjustments,” and give “Not sure which plan?” a short, domain-reviewed way to identify the user's actual plan rather than definitions alone.
