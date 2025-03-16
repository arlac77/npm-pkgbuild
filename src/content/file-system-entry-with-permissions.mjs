import { FileSystemEntry } from "content-entry-filesystem";

export class FileSystemEntryWithPermissions extends FileSystemEntry {
  constructor(name, baseDir, properties) {
    super(name, baseDir);
    Object.assign(this, properties);
  }

  #mode;

  set mode(value) {
    this.#mode = value;
  }

  get mode() {
    return this.#mode || super.mode;
  }
}
