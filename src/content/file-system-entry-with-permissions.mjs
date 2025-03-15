import { FileSystemEntry } from "content-entry-filesystem";

export class FileSystemEntryWithPermissions extends FileSystemEntry {
  #mode;

  set mode(value) {
    this.#mode = value;
  }

  get mode() {
    return this.#mode || super.mode;
  }
}
