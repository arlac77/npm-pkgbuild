import { join } from "node:path";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import {
  EmptyContentEntry,
  ReadableStreamContentEntry,
  StringContentEntry
} from "content-entry";
import {
  transform,
  createPropertiesTransformer
} from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import { keyValueTransformer } from "key-value-transformer";
import { Packager } from "./packager.mjs";
import {
  copyEntries,
  fieldProvider,
  extractFunctions,
  utf8StreamOptions,
  packageNameMapping
} from "../util.mjs";

/**
 * map install hook named from arch to deb
 */
const hookMapping = {
  post_install: "DEBIAN/postinst",
  post_remove: "DEBIAN/postrm"
};

export class DEBIAN extends Packager {
  static get name() {
    return "debian";
  }

  static get description() {
    return "generate Debian package";
  }

  static get fileNameExtension() {
    return ".deb";
  }

  static get fields() {
    return fields;
  }

  static async prepare() {
    try {
      await execa("dpkg", ["--version"]);
      return true;
    } catch {}

    return false;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}_${p.version}_${p.arch}${this.constructor.fileNameExtension}`;
  }

  async *hookFiles(properties) {
    if (properties.hooks) {
      for await (const f of extractFunctions(
        createReadStream(properties.hooks, utf8StreamOptions)
      )) {
        const name = hookMapping[f.name];
        if (name) {
          yield new StringContentEntry(
            name,
            f.body.replace(
              /\{\{(\w+)\}\}/m,
              (match, key, offset, string) =>
                properties[key] || "{{" + key + "}}"
            )
          );
        }
      }
    }
  }

  async execute(sources, transformer, dependencies, options, expander) {
    const { properties, staging, destination } = await this.prepareExecute(
      options
    );

    transformer.push(
      createPropertiesTransformer(
        entry => (entry.name.match(/DEBIAN\/.*(inst|rm)/) ? true : false),
        { mode: { value: 0o775 } },
        "mode"
      )
    );

    if (Object.keys(dependencies).length > 0) {
      properties.Depends = Object.entries(dependencies).map(
        ([name, e]) =>
          `${packageNameMapping[name] ? packageNameMapping[name] : name} (${e})`
      );
    }

    const fp = fieldProvider(properties, fields);
    const debianControlName = "DEBIAN/control";

    transformer.push({
      match: entry => entry.name === debianControlName,
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, fp)
        ),
      createEntryWhenMissing: () => new EmptyContentEntry(debianControlName)
    });

    for await (const file of copyEntries(
      transform(
        aggregateFifo([...sources, this.hookFiles(properties)]),
        transformer
      ),
      staging,
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination, `mode=${file.mode}`);
      }
    }

    if (options.verbose) {
      console.log(
        await readFile(join(staging, debianControlName), { encoding: "utf8" })
      );
    }

    if (!options.dry) {
      const dpkg = await execa("dpkg", ["-b", staging, destination]);

      if (options.verbose) {
        console.log(dpkg.stdout);
      }
    }

    return join(destination, this.packageFileName);
  }
}

/**
 * @see https://www.debian.org/doc/debian-policy/ch-controlfields.html
 * @see https://linux.die.net/man/5/deb-control
 */

const fields = {
  Package: { alias: "name", type: "string", mandatory: true },
  Version: { alias: "version", type: "string", mandatory: true },
  Maintainer: { alias: "maintainer", type: "string", mandatory: true },
  Description: { alias: "description", type: "string", mandatory: true },
  Section: { alias: "groups", type: "string" },
  Priority: { type: "string" },
  Essential: { type: "boolean" },
  Origin: { type: "string" },
  Architecture: {
    alias: "arch",
    type: "string",
    default: "all",
    mandatory: true
  },
  Homepage: { alias: "homepage", type: "string" },
  Bugs: { alias: "bugs", type: "string" },
  Depends: { type: "string[]" },
  "Pre-Depends": { type: "string[]" },
  "Build-Depends": { type: "string[]" },
  "Build-Depends-Indep": { type: "string[]" },
  "Build-Depends-Arch": { type: "string[]" },
  Recommends: { type: "string[]" },
  Suggests: { type: "string[]" },
  Provides: { type: "string[]" },
  Breaks: { type: "string[]" },
  Replaces: { type: "string[]" },
  Source: { alias: "source", type: "string" },
  Uploaders: { mandatory: false },
  "Installed-Size": {}
};

/*
@see https://www.debian.org/doc/debian-policy/ch-archive.html#sections
sections:
admin, cli-mono, comm, database, debug, devel, doc, editors, education, electronics, embedded, fonts, games, gnome, gnu-r, gnustep, graphics, hamradio, haskell, httpd, interpreters, introspection, java, javascript, kde, kernel, libdevel, libs, lisp, localization, mail, math, metapackages, misc, net, news, ocaml, oldlibs, otherosfs, perl, php, python, ruby, rust, science, shells, sound, tasks, tex, text, utils, vcs, video, web, x11, xfce, zope
*/
