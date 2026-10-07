import { textField } from "@/lib/form-data"
import { useSearchParams } from "react-router"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"

/** A search kept in ?q= (and back to page 1), submitted with Enter or Search. */
export function SearchBox({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) {
  const [params, setParams] = useSearchParams()
  return (
    <form
      role="search"
      aria-label={label}
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const q = textField(new FormData(event.currentTarget), "q")
        const next = new URLSearchParams(params)
        if (q) next.set("q", q)
        else next.delete("q")
        next.delete("page")
        setParams(next)
      }}
    >
      <Input
        name="q"
        type="search"
        size="sm"
        aria-label={label}
        placeholder={placeholder}
        defaultValue={params.get("q") ?? ""}
        key={params.get("q") ?? ""}
      />
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
    </form>
  )
}
