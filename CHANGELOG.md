# Changelog

All notable changes to the `@mgamil/slug-generator` package will be documented in this file.

## [1.1.0] - 2026-05-26

### Added
- New `toSlug` and `slugify` (alias) utility functions to convert any arbitrary UTF-8 text into a URL-safe slug.
- Option `preserveSpace` (defaults to `false` to strip all spaces inside the string, or set to `true` to map spaces to the separator).
- Option `preserveCase` in `toSlug` (defaults to `false` to lowercase the slug).
- Configurable minimum/maximum length constraints in `toSlug` (minimum >= 1, maximum <= 128).
- Modern package exports configuration in `package.json` for ESM support and type declarations mapping.

### Changed
- Refactored `generateSlug` to support configurable minimum and maximum length bounds (minimum >= 2, maximum <= 64).

### Fixed
- Added robust input validation (checks for integers, empty alphabets, non-string inputs, and null options).
- Improved multi-character separator trimming logic using non-capturing groups `(?:...)` so the separator is matched and trimmed as a single unit.

---

## [1.0.0] - 2026-05-25

### Added
- Initial implementation of `@mgamil/slug-generator` supporting random cryptographically secure slug generation.
- Default length of 8, customizable between 5 and 64 characters.
- Custom alphabets and Vitest suite configuration.
