[![npm](https://img.shields.io/npm/v/npm-pkgbuild.svg)](https://www.npmjs.com/package/npm-pkgbuild)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Typed with TypeScript](https://flat.badgen.net/badge/icon/Typed?icon=typescript\&label\&labelColor=blue\&color=555555)](https://typescriptlang.org)
[![bundlejs](https://deno.bundlejs.com/?q=npm-pkgbuild\&badge=detailed)](https://bundlejs.com/?q=npm-pkgbuild)
[![downloads](http://img.shields.io/npm/dm/npm-pkgbuild.svg?style=flat-square)](https://npmjs.org/package/npm-pkgbuild)
[![GitHub Issues](https://img.shields.io/github/issues/arlac77/npm-pkgbuild.svg?style=flat-square)](https://github.com/arlac77/npm-pkgbuild/issues)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Farlac77%2Fnpm-pkgbuild%2Fbadge\&style=flat)](https://actions-badge.atrox.dev/arlac77/npm-pkgbuild/goto)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-pkgbuild/badge.svg)](https://snyk.io/test/github/arlac77/npm-pkgbuild)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-pkgbuild/badge.svg)](https://coveralls.io/github/arlac77/npm-pkgbuild)

## npm-pkgbuild

Create ArchLinux, RPM, Debian and Docker packages from npm packages.

# usage

In a package directory execute

```shell
npm-pkgbuild --rpm --debian --arch --content /destination:build --publish /some/directory
```

This will create a arch, rpm and a debian package of the build dir.

## upload package

```shell
npm-pkgbuild --arch --content build --publish 'https://my.package-service.com/binaries/linux/{{type}}/{{access}}/{{arch}}'
```

You can specify the package content in package.json.

```json
{
  "pkgbuild": {
    "content": {
      "/some/location/" : { "base": "build" },
      "/etc/myconfig.json" : "sample-config.json",
      "/erc/secret" : { "name":  "secret", "mode": "600" },
      "/opt/myapp": [
        {
          "type": "npm-pack"
        },
        {
          "type": "node-modules",
          "withoutDevelpmentDependencies": true
        }
      ]
    },
    "hooks" : "pkg/hooks",
    "output": {
      "debian" : {},
      "rpm" : {},
      "arch" : {}
    },
  "dependencies": { "nginx" : ">=1.12" }
  }
}
```

# content providers

Defining where the package content should come from.

## files (default)

content from the file system

## npm-pack

content as provided by npm pack

## node-modules

content of all (production) dependencies

options:
\- withoutDevelpmentDependencies when to stip away dev dependencies (defaults to true)

# shared configuration

You can import common configuration from other packages.
See [mf-hosting](https://www.npmjs.com/package/mf-hosting) or [mf-hosting-frontend](https://www.npmjs.com/package/mf-hosting-frontend) modules.

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [ContentProvider](#contentprovider)
    *   [Parameters](#parameters)
    *   [Properties](#properties)
    *   [asyncIterator](#asynciterator)
*   [FileContentProvider](#filecontentprovider)
    *   [Parameters](#parameters-1)
    *   [name](#name)
*   [utf8StreamOptions](#utf8streamoptions)
    *   [Properties](#properties-1)
*   [packageNameMapping](#packagenamemapping)
*   [decodePassword](#decodepassword)
    *   [Parameters](#parameters-2)
*   [FunctionDecl](#functiondecl)
    *   [Properties](#properties-2)
*   [extractFunctions](#extractfunctions)
    *   [Parameters](#parameters-3)
*   [fieldProvider](#fieldprovider)
    *   [Parameters](#parameters-4)
*   [Expander](#expander)
    *   [Parameters](#parameters-5)
*   [copyEntries](#copyentries)
    *   [Parameters](#parameters-6)
*   [NFTContentProvider](#nftcontentprovider)
    *   [Parameters](#parameters-7)
    *   [name](#name-1)
*   [NodeModulesContentProvider](#nodemodulescontentprovider)
    *   [Parameters](#parameters-8)
    *   [Properties](#properties-3)
    *   [name](#name-2)
*   [NPMPackContentProvider](#npmpackcontentprovider)
    *   [Parameters](#parameters-9)
    *   [Properties](#properties-4)
    *   [name](#name-3)
*   [pkgKeyValuePairOptions](#pkgkeyvaluepairoptions)
*   [fields](#fields)
*   [fields](#fields-1)
*   [fields](#fields-2)
*   [fields](#fields-3)
*   [hookMapping](#hookmapping)
*   [hookMapping](#hookmapping-1)
*   [DEBIAN](#debian)
    *   [prepare](#prepare)
        *   [Parameters](#parameters-10)
*   [Field](#field)
    *   [Properties](#properties-5)
*   [Packager](#packager)
    *   [Parameters](#parameters-11)
    *   [tmpdir](#tmpdir)
    *   [execute](#execute)
        *   [Parameters](#parameters-12)
    *   [workspaceLayout](#workspacelayout)
    *   [prepare](#prepare-1)
        *   [Parameters](#parameters-13)
*   [RPM](#rpm)
    *   [prepare](#prepare-2)
        *   [Parameters](#parameters-14)

## ContentProvider

Source of package content.

### Parameters

*   `definitions` &#x20;
*   `entryProperties` &#x20;

### Properties

*   `dir` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `transformer` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<Transformer>**&#x20;

### asyncIterator

List all entries.

Returns **AsyncIterable\<ContentEntry>** all entries

## FileContentProvider

**Extends ContentProvider**

Content provided form the file system.

### Parameters

*   `definitions` **([Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) | [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))**&#x20;

    *   `definitions.pattern` **([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>)**&#x20;
    *   `definitions.base` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** base directory where to find the files
*   `entryProperties` &#x20;

### name

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the content provider

## utf8StreamOptions

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `encoding` **BufferEncoding**&#x20;

## packageNameMapping

What is the node name in the package eco-system

## decodePassword

Decode a password

### Parameters

*   `password` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** plaintext password

## FunctionDecl

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `body` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

## extractFunctions

Extract shell functions from a given text.

### Parameters

*   `source` **AsyncIterable<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;

Returns **AsyncIterable<[FunctionDecl](#functiondecl)>**&#x20;

## fieldProvider

### Parameters

*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `fields` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)**&#x20;

## Expander

Type: [Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)

### Parameters

*   `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

## copyEntries

Copy content from source into destinationDirectory.
Destination paths a generated without leading '/' (as for entry names too).

### Parameters

*   `source` **AsyncIterable\<ContentEntry>**&#x20;
*   `destinationDirectory` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `expander` **[Expander](#expander)**  (optional, default `v=>v`)

## NFTContentProvider

**Extends ContentProvider**

Content provided form the file system.

### Parameters

*   `definitions` **([Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object) | [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))**&#x20;

    *   `definitions.pattern` **([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) | [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>)**&#x20;
    *   `definitions.base` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** base directory where to find the files
*   `entryProperties` &#x20;

### name

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the content provider

## NodeModulesContentProvider

**Extends ContentProvider**

Content from node\_modules

### Parameters

*   `definitions` &#x20;
*   `entryProperties` &#x20;

### Properties

*   `withoutDevelpmentDependencies` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

### name

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the content provider

## NPMPackContentProvider

**Extends ContentProvider**

Content from npm pack.

### Parameters

*   `definitions` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `entryProperties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** to be set for each entry

### Properties

*   `dir` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

### name

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the content provider

## pkgKeyValuePairOptions

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## fields

well known package properties
<https://www.archlinux.org/pacman/PKGBUILD.5.html>

## fields

*   **See**: <https://www.debian.org/doc/debian-policy/ch-controlfields.html>
*   **See**: <https://linux.die.net/man/5/deb-control>

## fields

*   **See**: <https://docs.docker.com/engine/reference/builder/>

## fields

*   **See**: <https://rpm-packaging-guide.github.io>

## hookMapping

map install hook named from arch to deb

## hookMapping

map install hook named from arch to rpm

## DEBIAN

**Extends Packager**

Create .deb packages

### prepare

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

    *   `variant.arch` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**&#x20;

## Field

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `alias` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** interchangeable field name
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `default` **any**&#x20;
*   `mandatory` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

## Packager

### Parameters

*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

### tmpdir

Create tmp directory.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** directory path

### execute

Execute package generation.

#### Parameters

*   `sources` &#x20;
*   `transformer` &#x20;
*   `dependencies` &#x20;
*   `options` &#x20;
*   `expander` &#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** location of the resulting package

### workspaceLayout

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

### prepare

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**&#x20;

## RPM

**Extends Packager**

produce rpm packages

### prepare

Check for rpmbuild presence.

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

    *   `variant.arch` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>** true when rpmbuild executable is present

# install

With [npm](http://npmjs.org) do:

```shell
npm install npm-pkgbuild
```

# license

BSD-2-Clause
