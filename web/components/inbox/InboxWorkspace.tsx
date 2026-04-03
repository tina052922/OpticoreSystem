"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Download,
  Edit,
  MoreVertical,
  Printer,
  Search,
  Share2,
} from "lucide-react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import type { InboxMessage, PortalId } from "@/lib/inbox-store";

type Props = {
  portal: PortalId;
  title?: string;
  subtitle?: string;
};

/** Opticore-CampusIntelligence Inbox layout: Mail | Sent, search, 2+3 grid, orange list header, preview + actions. */
export function InboxWorkspace({ portal, title = "Inbox", subtitle }: Props) {
  const [tab, setTab] = useState<"mail" | "sent">("mail");
  const [query, setQuery] = useState("");
  const [mail, setMail] = useState<InboxMessage[]>([]);
  const [sent, setSent] = useState<InboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPreviewMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function refresh() {
    const res = await fetch(`/api/inbox?portal=${encodeURIComponent(portal)}`, { cache: "no-store" });
    const data = (await res.json()) as {
      mail?: InboxMessage[];
      sent?: InboxMessage[];
      messages?: InboxMessage[];
    };

    if (data.mail && data.sent) {
      setMail(data.mail);
      setSent(data.sent);
      setSelectedId((cur) => {
        const poolMail = data.mail!;
        const poolSent = data.sent!;
        const pool = tab === "mail" ? poolMail : poolSent;
        if (cur && pool.some((m) => m.id === cur)) return cur;
        return pool[0]?.id ?? null;
      });
    } else if (data.messages) {
      const m = data.messages.filter((x) => x.mailFor?.includes(portal));
      const s = data.messages.filter((x) => x.sentFor?.includes(portal));
      setMail(m);
      setSent(s);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when portal changes only
  }, [portal]);

  const filtered = useMemo(() => {
    const pool = tab === "mail" ? mail : sent;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((m) => {
      const hay = `${m.from} ${m.to} ${m.subject} ${m.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mail, sent, query, tab]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((m) => m.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((m) => m.id === selectedId) || filtered[0] || null;

  const defaultSubtitle =
    portal === "chairman"
      ? "Send and receive workflow mail — share INS / Evaluator drafts with College Admin from Sent."
      : portal === "college"
        ? "Receive drafts from Chairman in Mail; forward validated drafts to CAS Admin."
        : portal === "cas"
          ? "Receive from College, distribute GEC portions, forward to DOI."
          : portal === "gec"
            ? "Receive GEC distribution from CAS; return filled vacant slots."
            : "Receive validated drafts from CAS for final approval and publication.";

  function shortDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function downloadMessage() {
    if (!selected) return;
    const blob = new Blob(
      [`${selected.subject}\n\nFrom: ${selected.from}\nTo: ${selected.to}\n\n${selected.body}`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${selected.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowPreviewMenu(false);
  }

  return (
    <div>
      <ChairmanPageHeader title={title} subtitle={subtitle ?? defaultSubtitle} />

      <div className="px-6 pb-8 space-y-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => {
              setTab("mail");
              setSelectedId(mail[0]?.id ?? null);
            }}
            className={`px-6 py-3 font-medium transition-colors relative ${
              tab === "mail" ? "text-[#FF990A] border-b-2 border-[#FF990A]" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Mail
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("sent");
              setSelectedId(sent[0]?.id ?? null);
            }}
            className={`px-6 py-3 font-medium transition-colors relative ${
              tab === "sent" ? "text-[#FF990A] border-b-2 border-[#FF990A]" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Sent
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex items-center gap-2 px-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search mail"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 py-2 outline-none text-sm bg-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[420px]">
            <div className="bg-[#FF990A] text-white px-3 py-3 font-semibold text-xs">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">{tab === "mail" ? "From" : "To"}</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-3">Date</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 flex-1 overflow-y-auto max-h-[560px]">
              {filtered.map((m) => {
                const unread = tab === "mail" && m.status === "Unread";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-3 transition-colors ${
                      selected?.id === m.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-2 items-center text-sm">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        {unread ? <Circle className="w-2 h-2 shrink-0 fill-[#FF990A] text-[#FF990A]" /> : null}
                        <span className={`truncate ${unread ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                          {tab === "mail" ? m.from : m.to}
                        </span>
                      </div>
                      <div className="col-span-4 truncate text-gray-700">{m.subject}</div>
                      <div className="col-span-3 text-gray-500 text-xs">{shortDate(m.createdAt)}</div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">No messages.</div>
              ) : null}
            </div>
            <div className="p-3 border-t border-gray-200">
              <Button variant="outline" className="w-full bg-white" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[420px] flex flex-col">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg text-gray-800 pr-2">{selected.subject}</h3>
                      <div className="relative shrink-0" ref={menuRef}>
                        <button
                          type="button"
                          onClick={() => setShowPreviewMenu(!showPreviewMenu)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded"
                          aria-label="Message actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {showPreviewMenu ? (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              type="button"
                              onClick={downloadMessage}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowPreviewMenu(false);
                                void navigator.clipboard.writeText(
                                  `${window.location.origin} — ${selected.subject}`,
                                );
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Share2 className="w-4 h-4" />
                              Share
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowPreviewMenu(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowPreviewMenu(false);
                                window.print();
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              Print
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {selected.workflowStage ? (
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#FF990A] mt-2">
                        {selected.workflowStage.replace(/_/g, " ")}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 flex-wrap">
                      <span className="font-medium text-gray-800">
                        {tab === "mail" ? selected.from : selected.to}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>{shortDate(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none flex-1">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{selected.body}</p>
                </div>

                {tab === "mail" ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-[#FF990A] text-white rounded-lg hover:bg-[#e88909] transition-colors text-sm font-medium"
                      onClick={() => alert("Reply — connect to compose workflow when integrated.")}
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      onClick={() => alert("Delete — connect to archive when integrated.")}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      onClick={() => alert("Archive — connect when integrated.")}
                    >
                      Archive
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-gray-500">Select a message.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
