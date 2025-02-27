# SVG Validation

This directory contains scripts for validating and fixing SVG files according to the project's formatting rules.

## SVG Formatting Rules

All SVG files in this project must follow these formatting rules:

1. Use single quotes (') instead of double quotes (")
2. Include these attributes in the root SVG element:
   - `xmlns='http://www.w3.org/2000/svg'`
   - `fill='none'`
   - `stroke='#fff'`
   - `fill-rule='evenodd'`
   - `stroke-linecap='round'`
   - `stroke-linejoin='round'`
   - `stroke-width='1'` or `stroke-width='2'` (preserve original width)
   - Preserve original width/height/viewBox attributes
3. Remove redundant stroke attributes from individual paths
4. Keep path data unchanged, but convert any quotes within to single quotes

## Running the Validator

You can run the SVG validator manually with:

```bash
yarn validate-svg
```

## Fixing SVG Files

If the validator finds issues with your SVG files, you can automatically fix them with:

```bash
yarn fix-svg
```

You can also fix specific SVG files by providing their paths:

```bash
yarn fix-svg path/to/file1.svg path/to/file2.svg
```

## Pre-commit Hook

The validator is automatically run as a pre-commit hook to ensure all SVG files meet the formatting requirements before they are committed.

If the validator finds issues, it will prevent the commit and display the issues that need to be fixed. You can then run `yarn fix-svg` to automatically fix the issues before committing again.

## Setting Up the Pre-commit Hook

The pre-commit hook is set up automatically when you run `yarn install` due to the `prepare` script in package.json.

If you need to set it up manually, run:

```bash
yarn prepare
```

## Example SVG Transformation

Before:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
  <path stroke="#fff" stroke-width="2" d="M10 10L20 20"/>
</svg>
```

After:

```svg
<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' stroke='#fff' fill-rule='evenodd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'>
  <path d='M10 10L20 20'/>
</svg>
```
