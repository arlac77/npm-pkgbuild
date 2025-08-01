import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { string_attribute, string_collection_attribute_writable } from "pacc";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import {
  transform,
  createPropertiesTransformer
} from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import { keyValueTransformer, Uint8ArraysToLines } from "key-value-transformer";
import {
  Packager,
  pkgbuild_version_attribute,
  pkgbuild_description_attribute,
  pkgbuild_name_attribute
} from "./packager.mjs";
import { copyEntries, fieldProvider } from "../util.mjs";

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

  /**
   * @see https://www.debian.org/doc/debian-policy/ch-controlfields.html
   * @see https://linux.die.net/man/5/deb-control
   */
  static attributes = {
    Package: {
      ...pkgbuild_name_attribute,
      set: v => v.toLowerCase()
    },
    Version: pkgbuild_version_attribute,
    Maintainer: { ...string_attribute, alias: "maintainer", mandatory: true },
    Description: pkgbuild_description_attribute,
    Section: { ...string_attribute, alias: "groups" },
    Priority: string_attribute,
    Essential: { type: "boolean" },
    Origin: string_attribute,
    Architecture: {
      ...string_attribute,
      alias: "arch",
      default: "all",
      mandatory: true,
      mapping: { aarch64: "arm64" }
    },
    Homepage: { ...string_attribute, alias: "homepage" },
    Bugs: { ...string_attribute, alias: "bugs" },
    Depends: string_collection_attribute_writable,
    "Pre-Depends": string_collection_attribute_writable,
    "Build-Depends": string_collection_attribute_writable,
    "Build-Depends-Indep": string_collection_attribute_writable,
    "Build-Depends-Arch": string_collection_attribute_writable,
    Recommends: string_collection_attribute_writable,
    Suggests: string_collection_attribute_writable,
    Provides: string_collection_attribute_writable,
    Breaks: string_collection_attribute_writable,
    Replaces: string_collection_attribute_writable,
    Source: { ...string_attribute, alias: "source" },
    Uploaders: { mandatory: false },
    "Installed-Size": {}
  };

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
    const arch = this.attributes.Architecture.mapping[p.arch] || p.arch;

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
    if (depends.length) {
      properties.Depends = depends;
    }

    const fp = fieldProvider(properties, this.attributes);
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

/*
@see https://www.debian.org/doc/debian-policy/ch-archive.html#sections
sections:
admin, cli-mono, comm, database, debug, devel, doc, editors, education, electronics, embedded, fonts, games, gnome, gnu-r, gnustep, graphics, hamradio, haskell, httpd, interpreters, introspection, java, javascript, kde, kernel, libdevel, libs, lisp, localization, mail, math, metapackages, misc, net, news, ocaml, oldlibs, otherosfs, perl, php, python, ruby, rust, science, shells, sound, tasks, tex, text, utils, vcs, video, web, x11, xfce, zope
*/
