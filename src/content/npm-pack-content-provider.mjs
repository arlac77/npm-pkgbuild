import { pipeline } from "node:stream/promises";
import { createGunzip } from "zlib";
import pacote from "pacote";
import { extract as tarExtract } from "tar-stream";
import { BufferContentEntry } from "content-entry";
import { ContentProvider } from "./content-provider.mjs";

/**
 * Content from npm pack.
 *
 * @param {Object} definitions
 * @param {Object} entryProperties to be set for each entry
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

  constructor(definitions, entryProperties) {
    super();
    Object.assign(this, definitions);

    this.entryProperties = entryProperties;
  }

  toString() {
    return `${this.constructor.name}: ${this.dir} -> ${this.entryProperties.destination}`;
  }

  async *[Symbol.asyncIterator]() {
    const entries = [];

    await pacote.tarball.stream(this.dir, async stream => {
      const extract = tarExtract();

      extract.on("entry", async (header, stream, next) => {
        stream.on("end", () => next());

        const chunks = [];
        for await (const chunk of await stream) {
          chunks.push(chunk);
        }

        entries.push(
          Object.assign(
            Object.create(
              new BufferContentEntry(
                header.name.substring(8),
                Buffer.concat(chunks)
              ),
              {
                mode: { value: header.mode }
              }
            ),
            this.entryProperties
          )
        );

        stream.resume();
      });

      await pipeline(stream, createGunzip(), extract);
    });

    for (const entry of entries) {
      yield entry;
    }
  }
}
