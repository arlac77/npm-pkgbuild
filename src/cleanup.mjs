import globby from "globby";
import { join, basename } from "path";
import fs from "fs";
import { asArray } from "./util.mjs";

export async function cleanup(context, stagingDir) {
 
  for (const name of await globby(['**/package.json'], {
          cwd: statgingDir
        })) {  
      console.log(`cleanup ${name}`);
  }      
}
