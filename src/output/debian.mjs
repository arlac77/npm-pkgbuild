import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import {
  integer_attribute_writable,
  yesno_attribute_writable,
  string_attribute_writable,
  string_collection_attribute_writable,
  types
} from "pacc";
import { ContentEntry, IteratorContentEntry } from "content-entry";
import {
  transform,
  createPropertiesTransformer
} from "content-entry-transform";
import { keyValueTransformer, Uint8ArraysToLines } from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, fieldProvider, aggregate } from "../util.mjs";
import {
  pkgbuild_version_attribute,
  pkgbuild_description_attribute,
  pkgbuild_name_attribute,
  dependency_attribute_collection_writable,
  architectureType
} from "../types.mjs";

const debian_dependency_attribute_collection_writable = {
  ...dependency_attribute_collection_writable,
  separator: ","
};

const CONTROL_NAME = "DEBIAN/control";

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
    name: {
      ...pkgbuild_name_attribute,
      externalName: "Package",
      type: types["lowercase-string"]
    },
    description: {
      ...pkgbuild_description_attribute,
      externalName: "Description",
      skipEmpty: true
    },
    version: { ...pkgbuild_version_attribute, externalName: "Version" },
    maintainer: {
      ...string_attribute_writable,
      name: "maintainer",
      externalName: "Maintainer",
      mandatory: true
    },
    arch: {
      ...string_attribute_writable,
      name: "arch",
      externalName: "Architecture",
      default: "all",
      mandatory: true,
      type: architectureType,
      mapping: { aarch64: "arm64" }
    },
    groups: {
      ...string_attribute_writable,
      name: "groups",
      externalName: "Section",
      skipEmpty: true
    },
    Priority: {
      ...string_attribute_writable,
      name: "Priority",
      skipEmpty: true
    },
    Essential: {
      ...yesno_attribute_writable,
      name: "Essential",
      skipEmpty: true
    },
    Origin: { ...string_attribute_writable, name: "Origin", skipEmpty: true },
    homepage: {
      ...string_attribute_writable,
      name: "homepage",
      externalName: "Homepage",
      skipEmpty: true
    },
    Bugs: {
      ...string_attribute_writable,
      name: "bugs",
      externalName: "Bugs",
      skipEmpty: true
    },
    dependencies: {
      ...debian_dependency_attribute_collection_writable,
      name: "dependencies",
      externalName: "Depends",
      skipEmpty: true
    },
    "Pre-Depends": {
      ...debian_dependency_attribute_collection_writable,
      name: "Pre-Depends",
      skipEmpty: true
    },
    "Build-Depends": {
      ...debian_dependency_attribute_collection_writable,
      name: "Build-Depends",
      skipEmpty: true
    },
    "Build-Depends-Indep": {
      ...debian_dependency_attribute_collection_writable,
      name: "Build-Depends-Indep",
      skipEmpty: true
    },
    "Build-Depends-Arch": {
      ...debian_dependency_attribute_collection_writable,
      name: "Build-Depends-Arch",
      skipEmpty: true
    },
    Recommends: {
      ...debian_dependency_attribute_collection_writable,
      name: "Recommends",
      skipEmpty: true
    },
    Suggests: {
      ...debian_dependency_attribute_collection_writable,
      name: "Suggests",
      skipEmpty: true
    },
    Provides: {
      ...debian_dependency_attribute_collection_writable,
      name: "Provides",
      skipEmpty: true
    },
    Breaks: {
      ...debian_dependency_attribute_collection_writable,
      name: "Breaks",
      skipEmpty: true
    },
    Replaces: {
      ...debian_dependency_attribute_collection_writable,
      name: "Replaces",
      skipEmpty: true
    },
    source: {
      ...string_attribute_writable,
      name: "source",
      externalName: "Source",
      skipEmpty: true
    },
    Uploaders: {
      ...string_collection_attribute_writable,
      name: "Uploaders",
      mandatory: false,
      skipEmpty: true
    },
    "Installed-Size": {
      ...integer_attribute_writable,
      name: "Installed-Size",
      skipEmpty: true
    }
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
    const p = this.externalProperties;
    return `${p.Package}_${p.Version}_${p.Architecture}${this.constructor.fileNameExtension}`;
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

    const hooks = new Set(Object.values(this.hookMapping));

    transformer.push(
      createPropertiesTransformer(
        entry => hooks.has(entry.name),
        { mode: { value: 0o775 } },
        "mode"
      )
    );

    properties.dependencies = this.makeDepends(properties.dependencies);

    const fp = fieldProvider(properties, this.attributes);

    transformer.push({
      match: entry => entry.name === CONTROL_NAME,
      transform: async entry =>
        new IteratorContentEntry(
          entry.name,
          undefined,
          keyValueTransformer(Uint8ArraysToLines(await entry.readStream), fp)
        ),
      createEntryWhenMissing: () => new ContentEntry(CONTROL_NAME)
    });

    for await (const file of copyEntries(
      transform(aggregate(sources, this.hookContent()), transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        // @ts-ignore
        console.log(file.destination, `mode=${file.mode}`);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, CONTROL_NAME), "utf8"));
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
