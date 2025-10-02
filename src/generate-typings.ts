import type { AuthorizationModel } from "@openfga/sdk";
import {
  FunctionDeclaration,
  Project,
  SourceFile,
  StructureKind,
  VariableDeclarationKind,
} from "ts-morph";
import fs from "fs";

import { transformer } from "@openfga/syntax-transformer";

function dslToJSON(path: string): Omit<AuthorizationModel, "id"> {
  const dsl = fs.readFileSync(path, "utf-8");

  return transformer.transformDSLToJSONObject(dsl);
}

function generate(dsl: Omit<AuthorizationModel, "id">): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile("model.ts");

  file.addTypeAlias({
    name: "FgaType",
    isExported: true,
    type: dsl.type_definitions.map((td) => JSON.stringify(td.type)).join(" | "),
    kind: StructureKind.TypeAlias,
  });

  const identifyFn = file.addFunction({
    name: "identify",
    parameters: [
      { name: "id", type: "FgaType" },
      { name: "query", type: "any" },
    ],
    returnType: "string",
    isExported: true,
  });

  identifyFn.setBodyText((writer) => {
    writer.writeLine("return `${id}:${query}`;");
  });

  file.formatText();

  return file;
}

const dsl = dslToJSON("./src/model.fga");

fs.writeFileSync("model.ts", generate(dsl).getFullText());
