import { DOCKER } from "./docker.mjs";

/**
 * Use buildah @see https://buildah.io
 */
export class BUILDAH extends DOCKER {
  static get name() {
    return "buildah";
  }
}
