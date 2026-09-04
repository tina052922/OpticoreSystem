/** User-facing copy for teaching-load justification. Target is DOI — never “VPAA”. */

export const JUSTIFICATION_MIN_LENGTH = 12;

export const JUSTIFICATION_MODAL_TITLE = "Policy justification for DOI";

export const JUSTIFICATION_PROMPT =
  "This assignment exceeds faculty load policy (weekly hours and/or 4 or more subject preparations). Enter a justification for DOI. The plotted schedule is still saved; this records the reason and notifies DOI.";

export const JUSTIFICATION_ASSIGN_PROMPT =
  "This assignment pushes the instructor past faculty load policy (weekly hours and/or 4 or more subject preparations). Enter a justification for DOI. The assignment is kept and saved; this records the reason and notifies DOI.";

export const JUSTIFICATION_GEC_PROMPT =
  "Assigning this GEC slot exceeds faculty load policy (weekly hours and/or 4 or more subject preparations). Enter a justification for DOI. The plotted schedule is still saved; this records the reason and notifies DOI.";

export const JUSTIFICATION_PLACEHOLDER =
  "e.g. Temporary faculty shortage; approved overload; consolidated sections…";

export const JUSTIFICATION_TOO_SHORT = `Enter at least ${JUSTIFICATION_MIN_LENGTH} characters so DOI has a recorded rationale.`;

export const JUSTIFICATION_PANEL_TITLE = "Justification for DOI";

export const JUSTIFICATION_PANEL_HELP =
  "Faculty load rules are exceeded for this draft (weekly hours and/or 4 or more subject preparations). Enter a reason for DOI. The plot still saves; this is a record and notification only — there is no approval step.";

export const JUSTIFICATION_SUBMIT_LABEL = "Record justification for DOI";

export const JUSTIFICATION_SAVED_MSG = "Justification recorded. DOI and College Admin were notified.";

export const JUSTIFICATION_INLINE_LABEL =
  "Justification for DOI (recorded when hours or preparations exceed policy; the schedule still saves)";
