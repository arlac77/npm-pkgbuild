import { Packager } from "./packager.mjs";
import execa from "execa";

export class Deb extends Packager {
  async execute() {
    await execa("dpkg", ["-b"]);
  }
}
