import sonarjs from "eslint-plugin-sonarjs"
import tseslint from "typescript-eslint"

// SonarSource's own rules for JavaScript/TypeScript (the engine SonarQube
// uses), run through ESLint — no SonarQube server needed. `pnpm lint:sonar`
// lists the issues; `pnpm lint:sonar:gate` (CI) fails if any rule has more
// issues than sonar-baseline.json, so issues can only go down.
const config = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "**/*.config.*",
      // shadcn-generated primitives: vendor code, not edited by hand.
      "packages/ui/src/components/ui/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { sonarjs },
    rules: sonarjs.configs.recommended.rules,
  },
]

export default config
