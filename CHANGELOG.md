# Changelog

All notable changes to the `@mgamil/slug-generator` package will be documented in this file.

## [1.1.0] - 2026-05-26

### Added
- New `toSlug` and `slugify` (alias) utility functions to convert any arbitrary UTF-8 text into a URL-safe slug.
- Option `preserveSpace` (defaults to `false` to replace spaces with the separator character, or set to `true` to leave space characters intact in the sanitized slug).
- Option `preserveCase` in `toSlug` (defaults to `false` to lowercase the slug).
- Option `allowedCharacters` in `toSlug` to allow custom characters (must be a subset of URL-safe characters: `a-zA-Z0-9-_.~`).
- Configurable minimum/maximum length constraints in `toSlug` (minimum >= 1, maximum <= 128).
- Modern package exports configuration in `package.json` for ESM support and type declarations mapping.

### Changed
- Refactored `generateSlug` to support configurable minimum and maximum length bounds (minimum >= 2, maximum <= 64).
- Constrained `separator` option to only accept a single, URL-safe character (min/max length of 1), throwing a validation error on invalid configuration.

### Fixed
- Added robust input validation (checks for integers, empty alphabets, non-string inputs, invalid separators/custom characters, and null options).
- Improved separator and space trimming logic to cleanly slice and format the resulting slugs.

---

## [1.0.0] - 2026-05-25

### Added
- Initial implementation of `@mgamil/slug-generator` supporting random cryptographically secure slug generation.
- Default length of 8, customizable between 5 and 64 characters.
- Custom alphabets and Vitest suite configuration.
