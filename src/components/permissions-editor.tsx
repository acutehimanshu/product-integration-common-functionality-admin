import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVELS,
  ADMIN_SECTION_LABELS,
  ADMIN_SECTIONS,
  noPermissions,
  PERMISSION_PRESETS,
  presetPermissions,
  type AdminPermissions,
  type PermissionPreset,
} from "@acutehimanshu/core/domain/admin"
import { Button } from "@acutehimanshu/ui/components/ui/button"

/**
 * Per-section access for a sub-admin: No access / View only / View and act.
 * Presets fill it in quickly; every row can then be changed.
 */
export function PermissionsEditor({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: AdminPermissions
  onChange: (value: AdminPermissions) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Access per section</legend>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Start from:</span>
        {(Object.keys(PERMISSION_PRESETS) as PermissionPreset[]).map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange(presetPermissions(preset))}
          >
            {PERMISSION_PRESETS[preset].label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onChange(noPermissions())}
        >
          Nothing
        </Button>
      </div>
      <div className="max-h-80 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">Access per section</caption>
          <thead className="bg-muted/50 sticky top-0 text-left text-xs">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-medium">
                Section
              </th>
              {ACCESS_LEVELS.map((level) => (
                <th
                  key={level}
                  scope="col"
                  className="px-2 py-1.5 text-center font-medium"
                >
                  {ACCESS_LEVEL_LABELS[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_SECTIONS.map((section) => (
              <tr key={section} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {ADMIN_SECTION_LABELS[section]}
                </th>
                {ACCESS_LEVELS.map((level) => (
                  <td key={level} className="px-2 py-1.5 text-center">
                    <input
                      type="radio"
                      className="size-4"
                      name={`${idPrefix}-${section}`}
                      aria-label={`${ADMIN_SECTION_LABELS[section]}: ${ACCESS_LEVEL_LABELS[level]}`}
                      checked={value[section] === level}
                      onChange={() => onChange({ ...value, [section]: level })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  )
}
