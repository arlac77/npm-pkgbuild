import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { integer_attribute_writable, yesno_attribute_writable, string_attribute_writable } from "pacc";
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
  pkgbuild_name_attribute,
  dependency_attribute_collection_writable
} from "./packager.mjs";
import { copyEntries, fieldProvider } from "../util.mjs";

const debian_dependency_attribute_collection_writable =
{
  ...dependency_attribute_collection_writable,
  separator: ","
};

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
    Maintainer: { ...string_attribute_writable, alias: "maintainer", mandatory: true },
    Description: pkgbuild_description_attribute,
    Section: { ...string_attribute_writable, alias: "groups" },
    Priority: string_attribute_writable,
    Essential: yesno_attribute_writable,
    Origin: string_attribute_writable,
    Architecture: {
      ...string_attribute_writable,
      alias: "arch",
      default: "all",
      mandatory: true,
      mapping: { aarch64: "arm64" }
    },
    Homepage: { ...string_attribute_writable, alias: "homepage" },
    Bugs: { ...string_attribute_writable, alias: "bugs" },
    Depends: debian_dependency_attribute_collection_writable,
    "Pre-Depends": debian_dependency_attribute_collection_writable,
    "Build-Depends": debian_dependency_attribute_collection_writable,
    "Build-Depends-Indep": debian_dependency_attribute_collection_writable,
    "Build-Depends-Arch": debian_dependency_attribute_collection_writable,
    Recommends: debian_dependency_attribute_collection_writable,
    Suggests: debian_dependency_attribute_collection_writable,
    Provides: debian_dependency_attribute_collection_writable,
    Breaks: debian_dependency_attribute_collection_writable,
    Replaces: debian_dependency_attribute_collection_writable,
    Source: { ...string_attribute_writable, alias: "source" },
    Uploaders: { mandatory: false },
    "Installed-Size": integer_attribute_writable
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
      pre_install: "DEBIAN/preinst",
      post_install: "DEBIAN/postinst",
      pre_remove: "DEBIAN/prerm",
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
