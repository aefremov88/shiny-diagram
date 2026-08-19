# Coding Standards

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-18  
> **Scope:** Rules and standards of a code: formatting, naming, annotation, syntax patterns

## 1. Enforced standards

These rules are enforced by the compiler and toolchain. The pipeline rejects code that violates them.

### TypeScript compiler

Configuration lives in `tsconfig.json` (extension host) and `tsconfig.webview.json` (webview). Both use `strict: true`, which enables:

- `strictNullChecks` — null and undefined are not assignable to other types without explicit handling
- `noImplicitAny` — every value must have an explicit or inferrable type
- `strictFunctionTypes` — function parameter types are checked contravariantly
- `strictPropertyInitialization` — class properties must be assigned in the constructor

### Prettier

Configuration: `.prettierrc` in the repo root.

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

Prettier owns all formatting decisions: indentation, spacing, line breaks, quote style, trailing commas.

### ESLint

Configuration: `eslint.config.js` in the repo root. Uses ESLint 9 flat config format.

Key rules:

- `@typescript-eslint/no-explicit-any` — error
- `@typescript-eslint/no-unused-vars` — error
- `@typescript-eslint/no-non-null-assertion` — error
- `@typescript-eslint/consistent-type-imports` — type imports use `import type`
- `react-hooks/rules-of-hooks` — error
- `react-hooks/exhaustive-deps` — warning
- `no-console` — error

`console.warn` and `console.error` are permitted in `webview/src/` where VS Code's output channel is unavailable, but must not remain on non-error paths in committed code.

Structured logging goes through `webview/src/shared/logging/`, which is the only permitted logging path. It may be called from any layer on any path; direct `console` use remains restricted as above.

---

## 2. Standards requiring judgment

### Code readability

As a general rule, written code must be optimized for **reducing the cognitive load** of a human reader.

**Rules:**

- Prefer early returns (guard clauses) over nested conditionals — each guard removes one case, leaving only the remaining real case to read.
- Prefer explicitly named functions over inline closures that act like sub-components — a name tells the reader what a block does without reading its body.
- A one-line closure (`() => onChange(option.value)`) is fine inline — its whole behavior fits at the call site. A closure with multiple steps or branches is worth naming, so the call site documents _what_ happens and the named function documents _how_.
- Prefer a named type over an indexed-access type (`Foo["bar"]`) when a named type for that shape already exists — don't make the reader look up a second type to find a third.

**Examples**

Bad — nested conditionals, each level adding to the reader's mental stack:

```ts
function describe(parsed: ParseResult): string {
  if (parsed.ok) {
    return "ok";
  } else {
    if (parsed.error === "invalidSyntax") {
      return "invalid syntax";
    } else {
      return "missing annotations";
    }
  }
}
```

Good — guard clauses; only the remaining case needs reading:

```ts
function describe(parsed: ParseResult): string {
  if (parsed.ok) return "ok";
  if (parsed.error === "invalidSyntax") return "invalid syntax";
  return "missing annotations";
}
```

---

Bad — a multi-step anonymous callback; the reader has to parse the whole body just to know what `.map` produces:

```ts
const edits = missingIds.map((classId, idx) => {
  const position = malformedAnnotations.has(classId)
    ? computeMalformedBoxLayout(idx, startY)
    : computeNewBoxLayout(idx, startY);
  return formatSpatialAnnotation(
    classId,
    position.x,
    position.y,
    position.width,
    position.height
  );
});
```

Good — the call site reads as one sentence ("place each missing class"); the steps are named and isolated:

```ts
const edits = missingIds.map((classId, idx) => placeClass(classId, idx, startY));

function placeClass(classId: ClassId, idx: number, startY: number): string {
  const position = malformedAnnotations.has(classId)
    ? computeMalformedBoxLayout(idx, startY)
    : computeNewBoxLayout(idx, startY);
  return formatSpatialAnnotation(classId, position.x, position.y, position.width, position.height);
}
```

### Non-bloated code

Special attention to be paid to code redundancy. Agents tend to add extended safeguards to code, leading to code bloat — e.g. conditional branches that cannot be reached are checked anyway. This should not happen; code should remain concise to **reduce cognitive load** for a human reader.

If an invariant might genuinely not hold and silent failure would be dangerous, assert it (throw) rather than silently early-returning — a silent early return hides a broken invariant from whoever debugs it later.

### Naming

Shiny follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) for naming.

Summary:

- `camelCase` — variables, functions, module-scope constants, CSS module class names
- `PascalCase` — React components, classes, type aliases, interfaces
- `UPPER_SNAKE_CASE` — true compile-time constants (e.g. protocol message type literals)
- No `_` prefix for private members — use TypeScript `private` instead
- No abbreviations unless unambiguous in this domain (`mmd`, `css`, `id`, `url` are fine; `mgr`, `tmp`, `val` are not)
- Names describe responsibility, not implementation (`computeDragEdit`, not `updateSpatialLine2` or `processData`)

### Comments and annotations

Shiny uses [JSDoc](https://jsdoc.app/) annotation style, aligned with Google's TSDoc conventions.

The goal of comments and annotations is to **reduce a cognitive load of human reader**. Thus comments and annotations should:

- not be too extensive;
- require little attention;
- be concise and up to the point;
- be placed only when they are needed;
- be structured well when they have to be long, e.g. with logically parallel bullet points.

#### File-level annotation

Every non-component TypeScript module and non-library CSS module begins with a `@fileoverview` block:

```ts
/**
 * @fileoverview Parses Mermaid source text into a structured diagram model.
 * Handles class declarations, relationships, style declarations, and
 * Shiny spatial annotations. Pure functions only — no VS Code dependencies.
 */
```

React component files (`.tsx`) are exempt.

UI library files under `webview/src/ui/**` follow [UI Library Standards](./architecture/UI-library-standards.md) instead:

- component `.tsx` files may use a `@behavior` or `@render` header for non-derivable facts, or omit the header;
- component `.module.css` files may use a `@render` header for non-derivable facts, or omit the header;
- utility modules that are not component files still use `@fileoverview`.

#### Function annotation

Every exported function has a JSDoc block with at minimum a one-line summary:

```ts
/**
 * Builds a ClassNode from a classDeclaration token.
 */
export function buildClassNode(token: ParseToken): ClassNode | null {
```

`@param` and `@returns` are added when types alone do not make the contract clear:

```ts
/**
 * Rebuilds a classDef line with an updated property value.
 * Preserves existing classDef properties while replacing the requested one.
 *
 * @param style - Current style definition with source location.
 * @param property - Which property to set (fill, stroke, color, etc.)
 * @param value - New value for that property.
 * @returns Complete replacement classDef line text, without a trailing newline.
 */
export function formatStyleProperty(
  style: StyleDefNode,
  property: StyleProperty["property"],
  value: string
): string {
```

Non-exported functions: JSDoc block if non-trivial; omit for obvious one-liners.

#### CSS style ownership

Style value ownership is architectural, not local preference. For `webview/src/ui/**` and the temporary allowlisted legacy canvas surface CSS modules, the [UI Library Standards property ownership table](./architecture/UI-library-standards.md#property-ownership) is authoritative:

- token-owned properties use `var(--shiny-*)` reads, not raw values;
- local literals are allowed only for properties owned by the component or arranging template;
- a needed value with no defined home requires a table amendment, not a local exception;
- `tokens.css` is governed by its own header annotation.

#### Inline comments

**When needed:**

- when code is not self-explanatory of WHAT it is doing;
- when it might be unclear WHY we are doing that.

**Format:**

Written with double slash `//`:

- long comments are written above the explained line;
- short comments are written after the explained line.

**Examples:**

Wrong: code is self-explanatory

```ts
// Loop through all classes
for (const cls of classes) {
```

Right: WHY we are doing it

```ts
// Stop at a closing brace — caller consumes it.
// Mermaid requires closing "}" on its own line.
if (/^\s*\}\s*$/.test(raw)) {
  break;
}
```

Right: WHAT we are doing with not self-explanatory and not frequently used API

```js
localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out", "webview")], // allowlist of disk resources for webview
```
