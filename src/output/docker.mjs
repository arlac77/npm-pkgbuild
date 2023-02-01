import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import { transform } from "content-entry-transform";
import { aggregateFifo } from "aggregate-async-iterator";
import {
  keyValueTransformer,
  equalSeparatedKeyValuePairOptions
} from "key-value-transformer";
import { Packager } from "./packager.mjs";
import { fieldProvider, copyEntries, utf8StreamOptions } from "../util.mjs";

const DOCKERFILE = "Dockerfile";

export class DOCKER extends Packager {
  static get name() {
    return "docker";
  }

  static get description() {
    return "generate container image with docker|podman";
  }

  async execute(
    sources,
    transformer,
    dependencies,
    options,
    expander = v => v
  ) {
    const { properties, staging, destination } = await this.prepareExecute(
      options
    );

    async function* trailingLines() {
      yield `
FROM node-18
ENTRYPOINT ["node", ""]
`;
    }

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: DOCKERFILE,
      match: entry => entry.name === DOCKERFILE,
      transform: async entry =>
        new ReadableStreamContentEntry(
          entry.name,
          keyValueTransformer(await entry.readStream, fp, {
            ...equalSeparatedKeyValuePairOptions,
            trailingLines
          })
        ),
      createEntryWhenMissing: () => new EmptyContentEntry(DOCKERFILE)
    });

    for await (const file of copyEntries(
      transform(aggregateFifo(sources), transformer),
      staging,
      expander
    )) {
      if (options.verbose) {
        console.log("D", file.destination);
      }
    }

    if (options.verbose) {
      console.log(await readFile(join(staging, DOCKERFILE), utf8StreamOptions));
    }

    if (!options.dry) {
      const docker = await execa("docker", ["build", staging], {
        cwd: staging
      });

      if (options.verbose) {
        console.log(docker.stdout);
      }
    }

    return join(destination, this.packageFileName);
  }
}

/**
 * @see {https://docs.docker.com/engine/reference/builder/}
 */
const fields = {
  version: { type: "string", mandatory: true }
};
