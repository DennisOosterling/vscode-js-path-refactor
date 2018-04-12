import * as vscode from "vscode";
import { extname } from "path";
import { isDirectorySync, isFileSync } from "fs-plus";
import { buildPathsToRename, renameFile } from "./utils";
import importDeclarationCodemodRunner from "./transforms/importDeclarationCodemodRunner";
import importRelativeCodemodRunner from "./transforms/importRelativeCodemodRunner";

function renameAndTransform(
  previousPath,
  nextPath,
  projectRoot,
  paths,
  userOptions
) {
  return Promise.resolve().then(() => {
    if (isFileSync(nextPath)) {
      vscode.window.showErrorMessage(`${nextPath} already exists!`);
      return;
    }
    if (renameFile(previousPath, nextPath)) {
      if (
        isDirectorySync(nextPath) ||
        (extname(previousPath) === ".jsx" && extname(nextPath) === ".jsx")
      ) {
        const filesThatMoved = paths.map(path => path.nextFilePath);
        return Promise.resolve()
          .then(() => {
            if (filesThatMoved.length > 0) {
              return importRelativeCodemodRunner(
                filesThatMoved,
                paths,
                userOptions
              );
            }
          })
          .then(() => {
            console.log("starting import declaration");
            console.log("projectRoot:", projectRoot);
            return importDeclarationCodemodRunner(
              [projectRoot],
              paths,
              userOptions
            ).then(() => {
              console.log("Paths successfully renamed");
              return;
            });
          })
          .catch(e => {
            console.error("Error running transforms:", e);
            vscode.window.showErrorMessage("Error running transforms");
          });
      } else {
        vscode.window.showErrorMessage("The file is not a .jsx file");
      }
    } else {
      vscode.window.showErrorMessage("Error renaming file");
    }
  });
}

export default function renamePaths(previousPath, nextPath, searchInPath) {
  // const [projectRoot] = vscode.workspace.workspaceFolders;
  vscode.workspace.getConfiguration();
  const userOptions = getUserOptions();
  const paths = buildPathsToRename(previousPath, nextPath);
  const res = renameAndTransform(
    previousPath,
    nextPath,
    searchInPath,
    paths,
    userOptions
  );
  return res;
}
function getUserOptions() {
  return {
    extensions: "jsx",
    ignorePattern: [
      ...Object.keys(vscode.workspace.getConfiguration().files.exclude)
    ],
    runInBand: "true"
  };
}
