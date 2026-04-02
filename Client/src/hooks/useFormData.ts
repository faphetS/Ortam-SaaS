import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import type { FormField, FormSettings } from "@/types/form";

interface FormFieldRow {
  id: string;
  field_type: string;
  label: string;
  placeholder: string;
  description: string;
  is_required: boolean;
  sort_order: number;
  options: string[] | unknown;
  allow_other: boolean;
}

/** Shared hook: fetch form fields directly from form_fields table */
export function useFormFieldsQuery() {
  return useQuery({
    queryKey: ["form_fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_fields")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data as FormFieldRow[]) ?? []).map((f) => ({
        ...f,
        options: Array.isArray(f.options) ? f.options : [],
      })) as FormField[];
    },
  });
}

/** Shared hook: fetch form settings directly from form_settings table */
export function useFormSettingsQuery() {
  return useQuery({
    queryKey: ["form_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          opening_title: data.opening_title ?? "",
          opening_text: data.opening_text ?? "",
          closing_title: data.closing_title ?? "",
          closing_text: data.closing_text ?? "",
        } as FormSettings;
      }
      return null;
    },
  });
}
