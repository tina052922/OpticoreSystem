/**
 * Turning whatever went wrong into something the person in front of the screen can act on.
 *
 * Failures arrive from several layers and most of them are written for whoever is maintaining the
 * system: `Cannot reach API (Failed to fetch)`, `could not find the 'profileImageUrl' column of
 * 'User' in the schema cache`, `run migration 016_subject_category.sql on the database`. A chairman
 * reading that learns nothing they can do.
 *
 * So: the server's own message is shown when it was written for a person — "Juan already holds this
 * post", "4 subjects still use Elective" — and replaced when it was not. The original is never
 * lost; it goes to the console for whoever is debugging.
 */

export type UserMessage = {
  title: string;
  detail?: string;
};

/** Markers of a message written for a developer rather than for the person using the app. */
const DEV_MARKERS: readonly RegExp[] = [
  /\brun migration\b/i,
  /\bschema cache\b/i,
  /\bPGRST\d*/i,
  /\bviolates\b.*\bconstraint\b/i,
  /\bduplicate key\b/i,
  /\brelation\b.*\bdoes not exist\b/i,
  /\bcolumn\b.*\bdoes not exist\b/i,
  /\bfailed to fetch\b/i,
  /\bnetworkerror\b/i,
  /\bECONNREFUSED\b|\bENOTFOUND\b|\bETIMEDOUT\b|\bEAI_AGAIN\b/i,
  /\bsocket hang ?up\b/i,
  /\bunexpected token\b.*\bJSON\b/i,
  /\bcannot reach api\b/i,
  /\bundefined is not\b|\bnull is not\b|\bis not a function\b/i,
  /\bat\s+\w+\s+\(.*:\d+:\d+\)/,
  /\bsupabase\b/i,
  /\.sql\b/i,
  /\bstack\b.*\btrace\b/i,
];

/** True when a message would confuse rather than help. */
export function isDeveloperMessage(message: string | null | undefined): boolean {
  const text = (message ?? "").trim();
  if (!text) return true;
  // A bare code, or something that reads like an identifier rather than a sentence.
  if (/^[A-Z_]{4,}$/.test(text)) return true;
  return DEV_MARKERS.some((re) => re.test(text));
}

type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

function readError(err: unknown): ErrorLike {
  if (!err || typeof err !== "object") {
    return { message: typeof err === "string" ? err : undefined };
  }
  const e = err as Record<string, unknown>;
  return {
    status: typeof e.status === "number" ? e.status : undefined,
    code: typeof e.code === "string" ? e.code : undefined,
    message: typeof e.message === "string" ? e.message : undefined,
  };
}

/**
 * What each HTTP status means to someone trying to get something done.
 *
 * 409 is deliberately absent: a conflict is the one case where the server almost always has
 * something specific and useful to say, so its own message is preferred.
 */
function messageForStatus(status: number | undefined): UserMessage | null {
  if (status === undefined) return null;
  if (status === 0) {
    return {
      title: "No connection",
      detail: "Check your internet connection, then try again. Nothing was saved.",
    };
  }
  if (status === 401) {
    return { title: "Your session has ended", detail: "Sign in again to continue." };
  }
  if (status === 403) {
    return {
      title: "You do not have access to this",
      detail: "Ask a DOI administrator if you think you should.",
    };
  }
  if (status === 404) {
    return {
      title: "This is no longer here",
      detail: "Someone may have removed it. Refresh the page to see the latest.",
    };
  }
  if (status === 413) {
    return { title: "That file is too large", detail: "Try a smaller one." };
  }
  if (status === 423) {
    return {
      title: "This has been locked",
      detail: "The schedule was published, so it can no longer be changed here.",
    };
  }
  if (status === 429) {
    return { title: "Too many attempts", detail: "Wait a moment, then try again." };
  }
  if (status >= 500) {
    return {
      title: "Something went wrong at our end",
      detail: "Please try again in a moment. If it keeps happening, tell your administrator.",
    };
  }
  return null;
}

/**
 * The message to show for a failure.
 *
 * `fallbackTitle` is what the action was trying to do, phrased for a person — "Could not save the
 * subject" — and is used whenever the underlying error has nothing presentable of its own.
 */
export function toUserMessage(err: unknown, fallbackTitle: string): UserMessage {
  const { status, code, message } = readError(err);

  if (code === "NETWORK_ERROR" || status === 0) {
    return {
      title: "No connection",
      detail: "Check your internet connection, then try again. Nothing was saved.",
    };
  }

  // A conflict is the server telling the person something specific about their own data.
  const serverSaidSomethingUseful = Boolean(message) && !isDeveloperMessage(message);
  if (serverSaidSomethingUseful && (status === 409 || status === 400 || status === 422)) {
    return { title: fallbackTitle, detail: message };
  }

  const byStatus = messageForStatus(status);
  if (byStatus) return byStatus;

  if (serverSaidSomethingUseful) return { title: fallbackTitle, detail: message };

  return {
    title: fallbackTitle,
    detail: "Please try again. If it keeps happening, tell your administrator.",
  };
}

/**
 * Logs the original for whoever is debugging, then returns what to show.
 *
 * Keeping these together means the technical detail is never simply discarded in the name of a
 * friendlier message.
 */
export function reportUserError(err: unknown, fallbackTitle: string, context?: string): UserMessage {
  if (typeof console !== "undefined") {
    console.error(`[opticore] ${context ?? fallbackTitle}`, err);
  }
  return toUserMessage(err, fallbackTitle);
}
