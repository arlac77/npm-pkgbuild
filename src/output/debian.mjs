import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import {
  transform,
  createPropertiesTransformer
} from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import { keyValueTransformer, Uint8ArraysToLines } from "key-value-transformer";
import {
  Packager,
  VERSION_FIELD,
  DESCRIPTION_FIELD,
  NAME_FIELD
} from "./packager.mjs";
import { copyEntries, fieldProvider, compileFields } from "../util.mjs";

/**
 * Create .deb packages
 */
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

  /**
   * @param {Object} options
   * @param {Object} variant
   * @param {string} variant.arch
   * @return {Promise<boolean>}
   */
  static async prepare(options, variant) {
    try {
      await execa("dpkg", ["--version"]);
      if (variant?.arch) {
        const uname = await execa("uname", ["-m"]);
        return uname.stdout.match(variant.arch) ? true : false;
      }
      return true;
    } catch {}

    return false;
  }

  get packageFileName() {
    const p = this.properties;

    // TODO utility to provide final values
    const arch = fields.Architecture.mapping[p.arch] || p.arch;

    // @ts-ignore
    return `${p.name}_${p.version}_${arch}${this.constructor.fileNameExtension}`;
  }

  /**
   * Map install hook named from default (arch) to deb.
   */
  get hookMapping() {
    return {
      post_install: "DEBIAN/postinst",
      post_remove: "DEBIAN/postrm"
    };
  }

  dependencyExpression(name, expression) {
    name = this.packageName(name);
    return expression ? `${name} (${expression})` : name;
  }

  async create(sources, transformer, publishingDetails, options, expander) {
    const { properties, staging, destination } = await this.prepare(options);

    transformer.push(
      createPropertiesTransformer(
        entry => (entry.name.match(/DEBIAN\/.*(inst|rm)/) ? true : false),
        { mode: { value: 0o775 } },
        "mode"
      )
    );

    const depends = this.makeDepends(properties.dependencies);
    if(depends.length) {
      properties.Depends = depends;
    }

    const fp = fieldProvider(properties, fields);
    const debianControlName = "DEBIAN/control";

    transformer.push({
      match: entry => entry.name === debianControlName,
      transform: async entry =>
        new IteratorContentEntry(
          entry.name,
          undefined,
          keyValueTransformer(Uint8ArraysToLines(await entry.readStream), fp)
        ),
      createEntryWhenMissing: () => new ContentEntry(debianControlName)
    });

    for await (const file of copyEntries(
      transform(aggregateFifo([...sources, this.hookContent()]), transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        // @ts-ignore
        console.log(file.destination, `mode=${file.mode}`);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, debianControlName), "utf8"));
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

const fields = compileFields({
  Package: {
    ...NAME_FIELD,
    set: v => v.toLowerCase()
  },
  Version: { ...VERSION_FIELD },
  Maintainer: { alias: "maintainer", type: "string", mandatory: true },
  Description: { ...DESCRIPTION_FIELD },
  Section: { alias: "groups", type: "string" },
  Priority: { type: "string" },
  Essential: { type: "boolean" },
  Origin: { type: "string" },
  Architecture: {
    alias: "arch",
    type: "string",
    default: "all",
    mandatory: true,
    mapping: { aarch64: "arm64" }
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
});

/*
@see https://www.debian.org/doc/debian-policy/ch-archive.html#sections
sections:
admin, cli-mono, comm, database, debug, devel, doc, editors, education, electronics, embedded, fonts, games, gnome, gnu-r, gnustep, graphics, hamradio, haskell, httpd, interpreters, introspection, java, javascript, kde, kernel, libdevel, libs, lisp, localization, mail, math, metapackages, misc, net, news, ocaml, oldlibs, otherosfs, perl, php, python, ruby, rust, science, shells, sound, tasks, tex, text, utils, vcs, video, web, x11, xfce, zope
*/
