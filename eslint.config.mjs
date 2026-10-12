import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

/**
 * Lint rules, built from the plugins directly.
 *
 * This used to extend `next/core-web-vitals` and `next/typescript` through `eslint-config-next`.
 * That package pulls `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`, and
 * `braces` has an open stack-exhaustion advisory with no patched release — it stops at 3.0.3 and the
 * advisory covers every version. npm's only remedy was downgrading the whole config two majors, to a
 * release that predates the dependency, which would have meant linting a Next 15 app with Next 14
 * rules.
 *
 * Every rule that was actually firing is reproduced below, from `typescript-eslint`,
 * `eslint-plugin-react-hooks` and core ESLint. The one Next-specific rule in use, `no-img-element`,
 * is kept as a `no-restricted-syntax` check, since the rule itself only ever matched a JSX tag name.
 *
 * Trade-off worth knowing: the rest of the Next plugin's rules are gone — `no-sync-scripts`,
 * `no-page-custom-font`, `google-font-display`, `next-script-for-ga` and the like. None of them were
 * reporting anything, but they are no longer watching either.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      // A separate project vendored into this folder; `next lint` never scanned it either.
      "Smart-Campus Navigation System/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser and Node names this codebase uses in both environments.
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        crypto: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        React: "readonly",
      },
    },
    rules: {
      /*
       * The accessibility subset `next/core-web-vitals` enabled, at the severity it used.
       *
       * `jsx-a11y`'s own `recommended` is considerably stricter — it reported 57 errors here on
       * markup that has shipped for months. Widening it is a deliberate piece of work, not
       * something to inherit by accident while swapping a dependency.
       */
      "jsx-a11y/alt-text": ["warn", { elements: ["img"], img: ["Image"] }],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",

      /*
       * The two classic hook rules, and only those.
       *
       * `eslint-plugin-react-hooks` v7's `recommended` preset also turns on the React Compiler
       * checks — set-state-in-effect, refs-during-render, purity, memoization. They reported 178
       * errors here on code that works, and `eslint-config-next` never enabled them. Adopting them
       * is its own piece of work, not a side effect of a dependency swap.
       */
      "react-hooks/rules-of-hooks": "error",

      /** The four that this codebase actually reports on, at the severities it had. */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",

      /**
       * Stands in for `@next/next/no-img-element`.
       *
       * That rule reported a bare `<img>`, which `next/image` should usually replace. It was warning
       * on one file, and losing it silently is how that becomes ten.
       */
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXOpeningElement[name.name='img']",
          message:
            "Using `<img>` could result in slower LCP and higher bandwidth. Use `<Image />` from `next/image` instead.",
        },
      ],

      /** Rules that fire on patterns this codebase uses deliberately. */
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      // Types come from TypeScript, which already resolves every global this would flag.
      "no-undef": "off",
      // `catch {}` with a comment is how this codebase says "this failure is expected".
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  {
    // Tests and config files run under Node and Vitest globals.
    files: ["**/*.test.{ts,tsx}", "*.config.{ts,mjs,js}", "scripts/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
