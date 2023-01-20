import { join } from "node:path";
import { execa } from "execa";
import { EmptyContentEntry, ReadableStreamContentEntry } from "content-entry";
import {
  keyValueTransformer,
} from "key-value-transformer";
import { Packager } from "./packager.mjs";

const DOCKERFILE = "Dockerfile";

export class DOCKER extends Packager {
  static get name() {
    return "docker";
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

    const fp = fieldProvider(properties, fields);

    transformer.push({
      name: DOCKERFILE,
      match: entry => entry.name === DOCKERFILE,
      transform: async entry =>
        new ReadableStreamContentEntry(
          "../" + entry.name,
          keyValueTransformer(await entry.readStream, fp)
        ),
      createEntryWhenMissing: () => new EmptyContentEntry(DOCKERFILE)
    });

    if (!options.dry) {
      const docker = await execa("docker", ["build", "-e"], {
        cwd: staging
      });

      if (options.verbose) {
        console.log(docker.stdout);
      }
    }

    return join(destination, this.packageFileName);
  }
}

const fields = {
};