# @internal/typescript-config

![private package](https://img.shields.io/badge/package-private-informational)
![TypeScript](https://img.shields.io/badge/TypeScript-7-blue)

Shared TypeScript configuration for the srvquery workspace.

## Installation

```sh
pnpm add --save-dev --workspace @internal/typescript-config
```

## Usage

```json
{
  "extends": "@internal/typescript-config/base.tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```
