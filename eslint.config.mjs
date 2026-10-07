import { reactConfig, typeAware } from "@acutehimanshu/config/eslint"
import { moduleBoundaries } from "@acutehimanshu/config/eslint-modules"

export default [
  { ignores: ["dist/**"] },
  ...reactConfig,
  ...typeAware(import.meta.dirname),
  // A module in src/modules/<id> may not import another module.
  ...moduleBoundaries(import.meta.dirname),
]
