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

There are several ways to make this repo your starting scaffold, you can download it as a `.zip` file and copy what you need into your project, you can clone it and copy the files you need into your project, or do any pick-and-edit variation you find more appealing.

I'll just depict a possible way:

```shell
git clone --depth 1 git@github.com:fernandocanizo/clean-code-starter.git your-project
cd your-project
rm -f LICENCE README.md
```

Edit `package.json` accordingly to your project. Be sure to change:
- name
- version
- description
- keywords
- author
- license

Then amend first commit:

```shell
git add .
git commit --amend -m 'Start project'
```

And point the repository to your main repo, assuming GitHub:

```shell
git remote remove origin # to stop pointing to the scaffolder
git remote add origin git@github.com:your-user/your-project.git
git branch -M main
git push -u origin main
```

Start coding :)

## What's inside

- [EditorConfig](https://editorconfig.org/)
  Helps maintain consistent coding style.

- [Standardjs](https://standardjs.com/) linting
  Fixes your code.

```
npm run lint-fix
```


