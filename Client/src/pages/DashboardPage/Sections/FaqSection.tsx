import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, HelpCircle, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/hooks/useAuth";
import { EASE, stagger, fadeUp } from "@/lib/animations";

interface FaqDraftEntry {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

export default function FaqSection() {
  const { t } = useTranslation("faq");
  const { user } = useAuth();


  const [entries, setEntries] = useState<FaqDraftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load entries from the live faq_entries table
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data, error: listErr } = await supabase
          .from("faq_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true });

        if (listErr) throw listErr;

        setEntries(
          (data ?? []).map((e) => ({
            id: e.id,
            question: e.question ?? "",
            answer: e.answer ?? "",
            is_active: e.is_active ?? true,
            sort_order: e.sort_order ?? 0,
          })),
        );
      } catch {
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, t]);

  const updateField = (id: string, field: "question" | "answer", value: string) => {
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : { ...e, [field]: value })));
    setDirty(true);
  };

  const toggleActive = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : { ...e, is_active: !e.is_active })));
    setDirty(true);
  };

  const addEntry = () => {
    const nextOrder = entries.length > 0 ? Math.max(...entries.map((e) => e.sort_order)) + 1 : 0;
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: "",
        answer: "",
        is_active: true,
        sort_order: nextOrder,
      },
    ]);
    setDirty(true);
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);

    const activeEntries = entries.filter((e) => e.question.trim() || e.answer.trim());
    const activeIds = new Set(activeEntries.map((e) => e.id));

    try {
      // 1. Delete removed entries (ones that were loaded from DB but no longer in local state)
      const { data: existing } = await supabase
        .from("faq_entries")
        .select("id")
        .eq("user_id", user.id);

      const idsToDelete = (existing ?? [])
        .map((e) => e.id)
        .filter((id) => !activeIds.has(id));

      if (idsToDelete.length > 0) {
        await supabase.from("faq_entries").delete().in("id", idsToDelete);
      }

      // 2. Upsert active entries
      if (activeEntries.length > 0) {
        const rows = activeEntries.map((e, idx) => ({
          id: e.id,
          user_id: user.id,
          question: e.question,
          answer: e.answer,
          is_active: e.is_active,
          sort_order: idx,
        }));
        const { data: upserted, error: upsertErr } = await supabase
          .from("faq_entries")
          .upsert(rows, { onConflict: "id" })
          .select();
        if (upsertErr) throw upsertErr;

        if (upserted) {
          setEntries(
            upserted.map((e) => ({
              id: e.id,
              question: e.question ?? "",
              answer: e.answer ?? "",
              is_active: e.is_active ?? true,
              sort_order: e.sort_order ?? 0,
            })),
          );
        }
      }

      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[FaqSection] save error:", err);
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#22D3EE]" />
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col"
    >
      {/* Table */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl shadow-[0_2px_24px_rgba(17,24,39,0.05)] border border-[#E5E7EB]/50 overflow-hidden"
      >
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_64px_48px] gap-3 px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]/60 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
          <span>#</span>
          <span>{t("question")}</span>
          <span>{t("answer")}</span>
          <span className="text-center">{t("active")}</span>
          <span />
        </div>

        {/* Entries */}
        <AnimatePresence mode="popLayout">
          {entries.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="grid grid-cols-[40px_1fr_1fr_64px_48px] gap-3 px-5 py-3 border-b border-[#E5E7EB]/30 items-center group"
            >
              {/* Row number */}
              <span className="text-xs text-[#9CA3AF] font-mono">{idx + 1}</span>

              {/* Question */}
              <input
                type="text"
                value={entry.question}
                onChange={(e) => updateField(entry.id, "question", e.target.value)}
                placeholder={t("questionPlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-transparent hover:border-[#E5E7EB] focus:border-[#22D3EE]/40 focus:ring-2 focus:ring-[#22D3EE]/20 bg-transparent text-sm text-[#111827] placeholder-[#C5BDB4] transition-all outline-none"
              />

              {/* Answer */}
              <input
                type="text"
                value={entry.answer}
                onChange={(e) => updateField(entry.id, "answer", e.target.value)}
                placeholder={t("answerPlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-transparent hover:border-[#E5E7EB] focus:border-[#22D3EE]/40 focus:ring-2 focus:ring-[#22D3EE]/20 bg-transparent text-sm text-[#111827] placeholder-[#C5BDB4] transition-all outline-none"
              />

              {/* Active toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => toggleActive(entry.id)}
                  className={`w-10 h-5.5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                    entry.is_active ? "bg-[#22D3EE]" : "bg-[#D9D4CE]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      entry.is_active ? "right-0.5" : "right-[calc(100%-1.25rem)]"
                    }`}
                  />
                </button>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                className="p-1.5 rounded-lg text-[#C5BDB4] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HelpCircle className="w-10 h-10 text-[#D9D4CE] mb-3" />
            <p className="text-sm text-[#6B7280] font-medium">{t("noQuestionsYet")}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">{t("clickAddToStart")}</p>
          </div>
        )}

        {/* Add Row Button */}
        <div className="px-5 py-3 border-t border-[#E5E7EB]/40">
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#22D3EE] hover:bg-[#22D3EE]/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("addRow")}
          </button>
        </div>
      </motion.div>

      {/* Fixed toast notifications via portal */}
      {(saved || error) &&
        createPortal(
          <AnimatePresence>
            {saved && (
              <motion.div
                key="faq-success"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {t("changesSaved")}
              </motion.div>
            )}
            {error && (
              <motion.div
                key="faq-error"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium shadow-lg"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Save Draft Button */}
      {entries.length > 0 && (
        <motion.div variants={fadeUp} className="flex justify-center pt-6 pb-4">
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            whileHover={dirty ? { scale: 1.02 } : {}}
            whileTap={dirty ? { scale: 0.98 } : {}}
            className={`group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 font-bold text-base rounded-2xl px-10 py-4 transition-all duration-300 ${
              dirty
                ? "bg-[#22D3EE] hover:bg-[#0891B2] text-white shadow-[0_4px_20px_rgba(34,211,238,0.3)] hover:shadow-[0_6px_28px_rgba(34,211,238,0.4)]"
                : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                {t("saveChanges")}
                <Sparkles className="w-4.5 h-4.5 transition-transform group-hover:rotate-12" />
              </>
            )}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
