[![npm](https://img.shields.io/npm/v/npm-pkgbuild.svg)](https://www.npmjs.com/package/npm-pkgbuild)
[![License](https://img.shields.io/badge/License-0BSD-blue.svg)](https://spdx.org/licenses/0BSD.html)
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

*   [allInputs](#allinputs)
*   [allOutputs](#alloutputs)
*   [npmArchMapping](#npmarchmapping)
*   [content2Sources](#content2sources)
    *   [Parameters](#parameters)
*   [PackageDefinition](#packagedefinition)
    *   [Properties](#properties)
*   [extractFromPackage](#extractfrompackage)
    *   [Parameters](#parameters-1)
*   [BUILDAH](#buildah)
*   [ContentProvider](#contentprovider)
    *   [Parameters](#parameters-2)
    *   [Properties](#properties-1)
    *   [asyncIterator](#asynciterator)
*   [FileContentProvider](#filecontentprovider)
    *   [Parameters](#parameters-3)
    *   [name](#name)
*   [NodeModulesContentProvider](#nodemodulescontentprovider)
    *   [Parameters](#parameters-4)
    *   [Properties](#properties-2)
    *   [name](#name-1)
*   [NPMPackContentProvider](#npmpackcontentprovider)
    *   [Parameters](#parameters-5)
    *   [Properties](#properties-3)
    *   [name](#name-2)
*   [NFTContentProvider](#nftcontentprovider)
    *   [Parameters](#parameters-6)
    *   [name](#name-3)
*   [hookMapping](#hookmapping)
*   [hookMapping](#hookmapping-1)
*   [DEBIAN](#debian)
    *   [prepare](#prepare)
        *   [Parameters](#parameters-7)
*   [fields](#fields)
*   [fields](#fields-1)
*   [fields](#fields-2)
*   [fields](#fields-3)
*   [quoteFile](#quotefile)
    *   [Parameters](#parameters-8)
*   [RPM](#rpm)
    *   [prepare](#prepare-1)
        *   [Parameters](#parameters-9)
*   [pkgKeyValuePairOptions](#pkgkeyvaluepairoptions)
*   [OCI](#oci)
*   [DOCKER](#docker)
    *   [prepare](#prepare-2)
        *   [Parameters](#parameters-10)
*   [Packager](#packager)
    *   [Parameters](#parameters-11)
    *   [packageName](#packagename)
        *   [Parameters](#parameters-12)
    *   [tmpdir](#tmpdir)
    *   [prepare](#prepare-3)
        *   [Parameters](#parameters-13)
    *   [create](#create)
        *   [Parameters](#parameters-14)
    *   [workspaceLayout](#workspacelayout)
    *   [prepare](#prepare-4)
        *   [Parameters](#parameters-15)
*   [Packager](#packager-1)
    *   [Parameters](#parameters-16)
    *   [packageName](#packagename-1)
        *   [Parameters](#parameters-17)
    *   [tmpdir](#tmpdir-1)
    *   [prepare](#prepare-5)
        *   [Parameters](#parameters-18)
    *   [create](#create-1)
        *   [Parameters](#parameters-19)
    *   [workspaceLayout](#workspacelayout-1)
    *   [prepare](#prepare-6)
        *   [Parameters](#parameters-20)
*   [Field](#field)
    *   [Properties](#properties-4)
*   [copyNodeModules](#copynodemodules)
    *   [Parameters](#parameters-21)
*   [PublishingDetail](#publishingdetail)
    *   [Properties](#properties-5)
*   [createPublishingDetails](#createpublishingdetails)
    *   [Parameters](#parameters-22)
*   [publish](#publish)
    *   [Parameters](#parameters-23)
*   [utf8StreamOptions](#utf8streamoptions)
*   [decodePassword](#decodepassword)
    *   [Parameters](#parameters-24)
*   [FunctionDecl](#functiondecl)
    *   [Properties](#properties-6)
*   [extractFunctions](#extractfunctions)
    *   [Parameters](#parameters-25)
*   [fieldProvider](#fieldprovider)
    *   [Parameters](#parameters-26)
*   [Expander](#expander)
    *   [Parameters](#parameters-27)
*   [copyEntries](#copyentries)
    *   [Parameters](#parameters-28)

## allInputs

All content providers (input)

## allOutputs

All output formats

## npmArchMapping

Node architecture name to os native arch name mapping
{@see <https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processargv}>

## content2Sources

Delivers ContentProviders from pkgbuild.content definition.

### Parameters

*   `content` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** from pkgbuild.content
*   `dir` &#x20;

Returns **Iterable<[ContentProvider](#contentprovider)>**&#x20;

## PackageDefinition

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** values describing the package attributes

    *   `properties.dependencies` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[ContentProvider](#contentprovider)>** content providers
*   `output` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** package type
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** identifier of the variant

    *   `variant.name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the variant
    *   `variant.arch` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** name of the architecture

## extractFromPackage

Extract package definition from package.json.

*   for each architecture deliver a new result
*   if no architecture is given one result set is provided nethertheless
*   architectures are taken from cpu (node arch ids) and from pkgbuild.arch (raw arch ids)
*   architecture given in a variant definition are used to restrict the set of avaliable architectures

### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)

    *   `options.dir` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** where to look for package.json
    *   `options.verbose` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)?** log
*   `env` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** as delared in process.env (optional, default `{}`)

Returns **AsyncIterable<[PackageDefinition](#packagedefinition)>**&#x20;

## BUILDAH

**Extends DOCKER**

Use buildah @see <https://buildah.io>

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

## NodeModulesContentProvider

**Extends ContentProvider**

Content from node\_modules.
Requires .npmrc or NPM\_TOKEN environment

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

## fields

*   **See**: <https://www.debian.org/doc/debian-policy/ch-controlfields.html>
*   **See**: <https://linux.die.net/man/5/deb-control>

## fields

*   **See**: <https://rpm-packaging-guide.github.io>

## fields

well known package properties
<https://www.archlinux.org/pacman/PKGBUILD.5.html>

## fields

*   **See**: <https://docs.docker.com/engine/reference/builder/>

## quoteFile

### Parameters

*   `name` &#x20;

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

## pkgKeyValuePairOptions

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## OCI

**Extends Packager**

Low level OCI compatible packager

## DOCKER

**Extends Packager**

docker image build

### prepare

Check for docker presence.

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

    *   `variant.arch` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>** true when docker executable is present

## Packager

### Parameters

*   `properties` &#x20;

### packageName

What is the package name in the package eco-system.

#### Parameters

*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** package name in the target eco-system

### tmpdir

Create tmp directory.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** directory path

### prepare

Prepares artifact generation

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `publishingDetail` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<{properties: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object), destination: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), tmpdir: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), staging: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)}>**&#x20;

### create

Execute package generation.

#### Parameters

*   `sources` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `transformer` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**&#x20;
*   `publishingDetails` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[PublishingDetail](#publishingdetail)>**&#x20;
*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `expander` **function ([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** identifier of the resulting package

### workspaceLayout

Returns **{named: [object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object), others: \[]}**&#x20;

### prepare

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**&#x20;

## Packager

Base Packager

### Parameters

*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

### packageName

What is the package name in the package eco-system.

#### Parameters

*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** package name in the target eco-system

### tmpdir

Create tmp directory.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** directory path

### prepare

Prepares artifact generation

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `publishingDetail` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<{properties: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object), destination: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), tmpdir: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), staging: [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)}>**&#x20;

### create

Execute package generation.

#### Parameters

*   `sources` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `transformer` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**&#x20;
*   `publishingDetails` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[PublishingDetail](#publishingdetail)>**&#x20;
*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `expander` **function ([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)): [string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** identifier of the resulting package

### workspaceLayout

Returns **{named: [object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object), others: \[]}**&#x20;

### prepare

#### Parameters

*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `variant` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)>**&#x20;

## Field

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `alias` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** interchangeable field name
*   `type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `default` **any**&#x20;
*   `mandatory` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

## copyNodeModules

### Parameters

*   `source` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `dest` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `defaultOptions`)

## PublishingDetail

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `url` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**&#x20;
*   `scheme` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `username` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;
*   `password` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;

## createPublishingDetails

### Parameters

*   `locations` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**  (optional, default `[]`)
*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**&#x20;

    *   `properties.PKGBUILD_PUBLISH` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;
    *   `properties.arch` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;
    *   `properties.access` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;
    *   `properties.type` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;
    *   `properties.username` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?**&#x20;

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[PublishingDetail](#publishingdetail)>**&#x20;

## publish

### Parameters

*   `artifactIdentifier` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `publishingDetail` **[PublishingDetail](#publishingdetail)?**&#x20;
*   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?**&#x20;
*   `logger` **function (any): void**  (optional, default `console.log`)

## utf8StreamOptions

Type: BufferEncoding

## decodePassword

Decode a password

### Parameters

*   `password` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** plaintext password

## FunctionDecl

Type: [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

### Properties

*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `body` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

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

# install

With [npm](http://npmjs.org) do:

```shell
npm install npm-pkgbuild
```

# license

BSD-2-Clause
