# Clean Code Starter

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A starter repo with preconfigured code quality tools to:

- prevent programmer errors
  Code that won't run, code with syntactic errors.

- enforce best practices
  Code with no syntactic errors but with confusing patterns that often lead to errors.

- enforce style
  So you don't have to waste time discussing about spaces or other trivial part of the code.

## Usage

This is a repository template, hit the button up there which says "Use this template" -> "Create new repository", and you're set up.

Then you should remove unwanted files, most probably:

```shell
rm -f LICENCE README.md delete-me.js
```

Also, edit `package.json` accordingly to your project. Be sure to change:
- name
- version
- description
- keywords
- author
- license

You may want to fix `devDependencies` versions. Currently I decided to set them all as `*` version, in order to always start a new project with the most up to date tools. In order to do so you can automatically fix dependencies with:

```shell
pnpm up
```

Start coding :)

## What's inside

- [EditorConfig](https://editorconfig.org/)
  Helps maintain consistent coding style inside the editor.

- [Standardjs](https://standardjs.com/) linting
  Fixes your code.

- [Husky](https://github.com/typicode/husky)
  Let's you define git hooks easily and make the part of the repository.

- [lint-staged](https://github.com/okonet/lint-staged)
  Just lint what's about to be commited.

- [TypeScript](https://www.typescriptlang.org/)
  Add strong typing to Javascript plus a whole bunch of cool benefits.

- [Jest](https://jestjs.io/)
  For testing
