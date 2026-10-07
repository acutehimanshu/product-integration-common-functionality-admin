import type { SupportedCountry } from "@acutehimanshu/core/types/address"
import { NativeSelect } from "@acutehimanshu/ui/components/native-select"
import { Button } from "@acutehimanshu/ui/components/ui/button"
import { Input } from "@acutehimanshu/ui/components/ui/input"

/**
 * Prices per country, typed in the country's own currency (major units,
 * e.g. 499). `columns` are the amounts per row: monthly + yearly for a
 * package, one price for a credit pack.
 */
export function PriceRows<Row extends { country: string } & Record<string, string>>({
  rows,
  onChange,
  countries,
  columns,
  blank,
}: {
  rows: Row[]
  onChange: (rows: Row[]) => void
  countries: SupportedCountry[]
  columns: Array<{
    key: Exclude<keyof Row, "country"> & string
    label: string
    optional?: boolean
  }>
  blank: Row
}) {
  const update = (index: number, patch: Partial<Row>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const unused = countries.filter((c) => !rows.some((row) => row.country === c.code))
  const firstUnused = unused[0]

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Prices by country</legend>
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No prices yet — a package or pack is only sold in countries with a price.
        </p>
      )}
      {rows.map((row, index) => {
        const country = countries.find((c) => c.code === row.country)
        return (
          <div
            key={index}
            className="flex flex-wrap items-end gap-2 rounded-lg border p-2"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor={`price-${index}-country`} className="text-xs">
                Country
              </label>
              <NativeSelect
                id={`price-${index}-country`}
                value={row.country}
                onChange={(e) =>
                  update(index, { country: e.target.value } as Partial<Row>)
                }
              >
                <option value="">Choose…</option>
                {countries
                  .filter((c) => c.code === row.country || unused.includes(c))
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
              </NativeSelect>
            </div>
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col gap-1">
                <label htmlFor={`price-${index}-${column.key}`} className="text-xs">
                  {column.label}
                  {country ? ` (${country.currency})` : ""}
                  {column.optional ? " — optional" : ""}
                </label>
                <Input
                  id={`price-${index}-${column.key}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32"
                  value={row[column.key]}
                  onChange={(e) =>
                    update(index, { [column.key]: e.target.value } as Partial<Row>)
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove the ${country?.name ?? "empty"} price row`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        )
      })}
      {firstUnused && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...rows, { ...blank, country: firstUnused.code }])}
        >
          Add a country
        </Button>
      )}
    </fieldset>
  )
}
