import { join } from "path";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { keyValueTransformer } from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { copyEntries, transform, fieldProvider, createModeTransformer } from "../util.mjs";

export class DEB extends Packager {
  static get name() {
    return "deb";
  }

  static get fileNameExtension() {
    return ".deb";
  }

  static get fields() {
    return fields;
  }

  get packageFileName() {
    const p = this.properties;
    return `${p.name}_${p.version}_${p.arch}${this.constructor.fileNameExtension}`;
  }

  async execute(sources, transformer, options, expander) {
    const properties = this.properties;
    const staging = await this.tmpdir;

    transformer.push(createModeTransformer(0o775, entry => entry.name.match(/DEBIAN\/.*(inst|rm)/)));

    const fp = fieldProvider(properties, fields);
    const debianControlName = "DEBIAN/control";
    
    transformer.push(
      {
        match: entry => entry.name === debianControlName,
        transform: async entry =>
          new ReadableStreamContentEntry(
            entry.name,
            keyValueTransformer(await entry.readStream, fp)
          ),
        createEntryWhenMissing: () => new EmptyContentEntry(debianControlName)
      });
 
    await copyEntries(transform(sources, transformer), staging, expander);

    const dpkg = await execa("dpkg", ["-b", staging, options.destination]);

    if(options.verbose) {
      console.log(dpkg.stdout);
    }

    return join(options.destination, this.packageFileName);
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
