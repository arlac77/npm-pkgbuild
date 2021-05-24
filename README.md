[![npm](https://img.shields.io/npm/v/npm-pkgbuild.svg)](https://www.npmjs.com/package/npm-pkgbuild)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/npm-pkgbuild)](https://bundlephobia.com/result?p=npm-pkgbuild)
[![downloads](http://img.shields.io/npm/dm/npm-pkgbuild.svg?style=flat-square)](https://npmjs.org/package/npm-pkgbuild)
[![GitHub Issues](https://img.shields.io/github/issues/arlac77/npm-pkgbuild.svg?style=flat-square)](https://github.com/arlac77/npm-pkgbuild/issues)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Farlac77%2Fnpm-pkgbuild%2Fbadge\&style=flat)](https://actions-badge.atrox.dev/arlac77/npm-pkgbuild/goto)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-pkgbuild/badge.svg)](https://snyk.io/test/github/arlac77/npm-pkgbuild)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-pkgbuild/badge.svg)](https://coveralls.io/github/arlac77/npm-pkgbuild)

## npm-pkgbuild

create ArchLinux packages from npm packages

# usage

In a package directory execute

```shell
npm-pkgbuild --npm-dist --npm-modules pkgbuild pacman makepkg
```

This will create a PKGBUILD file and execute it
The resulting pkg will contain the package dist content and all production dependencies

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [createContext](#createcontext)
    *   [Parameters](#parameters)

## createContext

Used as a reference throuhout the runtime of the npm-pkgbuild

### Parameters

*   `dir` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)

# install

With [npm](http://npmjs.org) do:

```shell
npm install npm-pkgbuild
```

# license

BSD-2-Clause
