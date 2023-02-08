import { DOCKER } from "./docker.mjs";

export class BUILDAH extends DOCKER {
  static get name() {
    return "buildah";
  }
}
