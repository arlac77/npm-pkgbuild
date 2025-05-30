import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import pacote from "pacote";
import Arborist from "@npmcli/arborist";
import { extract } from "tar-stream";
import { BufferContentEntry } from "content-entry";
import { ContentProvider } from "./content-provider.mjs";

/**
 * Content from npm pack.
 *
 * @param {Object} definitions
 * @param {Object} entryProperties to be set for each entry
 * @property {string} dir
 */
export class NPMPackContentProvider extends ContentProvider {
  /**
   * @return {string} name of the content provider
   */
  static get name() {
    return "npm-pack";
  }

  static get description() {
    return "use npm pack as source";
  }

  constructor(definitions, entryProperties, directoryProperties) {
    if (
      entryProperties?.destination &&
      !entryProperties.destination.endsWith("/")
    ) {
      entryProperties.destination += "/";
    }
    super(definitions, entryProperties, directoryProperties);
    Object.assign(this, definitions);
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    const entries = [];

    await pacote.tarball.stream(
      this.dir,
      async stream => {
        const ex = extract();

        ex.on("entry", async (header, stream, next) => {
          stream.on("end", () => next());

          const chunks = [];
          for await (const chunk of await stream) {
            chunks.push(chunk);
          }

          entries.push(
            new BufferContentEntry(
              header.name.substring(8),
              {
                ...this.entryProperties,
                mtime: header.mtime,
                mode: header.mode
              },
              Buffer.concat(chunks)
            )
          );

          stream.resume();
        });

        await pipeline(stream, createGunzip(), ex);
      },
      { Arborist }
    );

    for (const entry of entries) {
      yield entry;
    }
  }
}
