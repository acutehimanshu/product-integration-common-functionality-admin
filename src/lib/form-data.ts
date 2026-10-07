/** A text field from a submitted form, trimmed ("" if missing or a file). */
export function textField(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value.trim() : ""
}
