import { join } from "path";
import { createReadStream } from "fs";
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
import { keyValueTransformer } from "key-value-transformer";
import { Packager } from "./packager.mjs";
import {
  copyEntries,
  fieldProvider,
  extractFunctions,
  utf8StreamOptions
} from "../util.mjs";

/**
 * map install hook named from arch to deb
 */
const hookMapping = {
  post_install: "DEBIAN/postinst",
  post_remove: "DEBIAN/postrm"
};

export class DEB extends Packager {
  static get name() {
    return "deb";
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

  static async available() {
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

  async execute(sources, transformer, dependencies, options, expander) {
    const { properties, staging, destination } = await this.prepareExecute(
      options
    );

    if (properties.hooks) {
      for await (const f of extractFunctions(
        createReadStream(properties.hooks, utf8StreamOptions)
      )) {
        const name = hookMapping[f.name];
        if (name) {
          transformer.push({
            match: entry => entry.name === name,
            transform: async entry =>
              new ReadableStreamContentEntry(
                entry.name,
                keyValueTransformer(await entry.readStream, fp)
              ),
            createEntryWhenMissing: () =>
              Object.create(
                new StringContentEntry(
                  name,
                  f.body.replace(
                    /\{\{(\w+)\}\}/m,
                    (match, key, offset, string) =>
                      properties[key] || "{{" + key + "}}"
                  )
                ),
                { mode: { value: 0o775 } }
              )
          });
        }
      }
    }

    transformer.push(
      createPropertiesTransformer(
        entry => (entry.name.match(/DEBIAN\/.*(inst|rm)/) ? true : false),
        { mode: { value: 0o775 } },
        "mode"
      )
    );

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
      transform(sources, transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        console.log(file.destination);
      }
    }

    const dpkg = await execa("dpkg", ["-b", staging, destination]);

    if (options.verbose) {
      console.log(dpkg.stdout);
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
  Section: { type: "string" },
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
  Depends: { alias: "depends", type: "packageList" },
  Recommends: { type: "packageList" },
  Suggests: { type: "packageList" },
  Provides: { type: "packageList" },
  Breaks: { type: "packageList" },
  Replaces: { type: "packageList" },

  Source: { alias: "source", type: "string" },
  Uploaders: { mandatory: false },
  "Installed-Size": {}
};
