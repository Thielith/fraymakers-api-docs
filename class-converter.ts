import rehypeStringify from "npm:rehype-stringify";
import remarkFrontmatter from "npm:remark-frontmatter";
import remarkGfm from "npm:remark-gfm";
import remarkParse from "npm:remark-parse";
import { unified } from "npm:unified";
import { frontmatterToMarkdown } from "npm:mdast-util-frontmatter";
import { toMarkdown } from "npm:mdast-util-to-markdown";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { parse, stringify } from "npm:yaml";
// import { Table } from "mdast";
// import { Table } from "npm:mdast";

const classTree: Map<string, Array<string>> = new Map<string, Array<string>>();
classTree.set("ApiObject", ["CustomApiObject", "Entity"]);
classTree.set("CustomApiObject", ["AssistController"]);
classTree.set("Entity", ["AiGraphNode", "Vfx", "GameObject", "Structure"]);
classTree.set("GameObject", ["Character", "Projectile", "CustomGameObject"]);
classTree.set("CustomGameObject", ["Assist"]);
classTree.set("Structure", ["LineSegmentStructure"]);
classTree.set("LineSegmentStructure", ["CustomLineSegmentStructure"]);
classTree.set("DisplayObject", ["Mask", "Container", "Drawable"]);
classTree.set("Drawable", ["Sprite"]);
classTree.set("Filter", [
  "DisplacementFilter",
  "GlowFilter",
  "HsbcColorFilter",
  "MaskFilter",
  "StrokeFilter",
]);
classTree.set("Shader", [
  "PaletteSwappShader",
  "RgbaColorShader",
  "SolidColorShader",
]);
classTree.set("GameObjectStats", [
  "CharacterStats",
  "AssistStats",
  "ProjectileStats",
]);
classTree.set("AnimationStats", [
  "CharacterAnimationStats",
  "AssistAnimationStats",
  "ProjectileAnimationStats",
]);

const parents: Map<string, string> = new Map<string, string>();
classTree.forEach((children: Array<string>, parent: string) => {
  for (const child of children) {
    parents.set(child, parent);
  }
});

class DocElement {
  constructor() {
  }

  toMarkdown(): string {
    return "";
  }
  toJson(): any {
    return null;
  }
}

class VariableDoc extends DocElement {
  name: string;
  type: string;
  initialValue: string;
  description: string;
  customDescription: string;
  isStatic: boolean;
  parentClass: string;
  constructor(parent: string, isStatic: boolean) {
    super();
    this.name = "";
    this.type = "";
    this.initialValue = "";
    this.description = "";
    this.customDescription = "";
    this.isStatic = isStatic;
    this.parentClass = parent;
  }

  applyOverrides() {
    try {
      const parsed = JSON.parse(
        fsSync.readFileSync(`./docs/overrides/${this.parentClass}.json`)
          .toString(),
      );
      const altDescription = this.isStatic
        ? (parsed?.staticVariables?.[this.name])
        : (parsed?.instanceVariables?.[this.name]);
      if (altDescription != null) {
        this.customDescription = altDescription;
      }
    } catch (_error) {
      // nothing
    }
  }

  override toJson(): any {
    return {
      name: this.name,
      type: this.type,
      initialValue: this.initialValue,
      description: this.description,
      customDescription: this.customDescription,
    };
  }

  override toMarkdown(): string {
    let returnString = "";
    let title = this.isStatic ? `${this.parentClass}.${this.name}` : this.name;
    if (title != null) {
      title = title.trim();
    }
    const titleString = `### ${title}\n`;
    const typeString = `##### Type\n\`${this.type}\`\n`;
    const initialValueString =
      `##### Initial Value\n\`${this.initialValue}\`\n`;
    const descriptionString =
      `##### description\n${this.description?.trim()}\n`;
    const customDescriptionString =
      `##### community description\n ${this.customDescription?.trim()}\n`;
    returnString += titleString;

    if (this.type != null && this.type.trim().length > 0) {
      returnString += typeString;
    }

    if (
      this.initialValue != null && this.initialValue.trim() != "n/a" &&
      this.initialValue.trim().length > 0
    ) {
      returnString += initialValueString;
    }

    if (this.description != null && this.description.trim().length > 0) {
      returnString += descriptionString;
    }

    if (
      this.customDescription != null && this.customDescription.trim().length > 0
    ) {
      returnString += customDescriptionString;
    }

    return returnString;
  }
}

class FunctionDoc extends DocElement {
  name: string;
  fieldName: string;
  description: string;
  customDescription: string;
  isStatic: boolean;
  parentClass: string;
  constructor(parent: string, isStatic: boolean) {
    super();
    this.name = "";
    this.fieldName = "";
    this.description = "";
    this.customDescription = "";
    this.isStatic = isStatic;
    this.parentClass = parent;
  }

  applyOverrides() {
    try {
      const parsed = JSON.parse(
        fsSync.readFileSync(`./docs/overrides/${this.parentClass}.json`)
          .toString(),
      );
      const altDescription = this.isStatic
        ? (parsed?.staticFunctions?.[this.fieldName])
        : (parsed?.instanceFunctions?.[this.fieldName]);
      if (altDescription != null) {
        this.customDescription = altDescription;
      }
    } catch (_error) {
      //nothing
    }
  }

  override toJson(): any {
    return {
      name: this.name,
      fieldName: this.fieldName,
      description: this.description,
      customDescription: this.customDescription,
    };
  }

  override toMarkdown(): string {
    let returnString = "";
    let title = this.isStatic ? `${this.parentClass}.${this.name}` : this.name;
    if (title != null) {
      title = title.trim();
    }
    const titleString = `### ${title}\n`;
    const descriptionString =
      `##### description\n${this.description?.trim()}\n`;
    const customDescriptionString =
      `##### community description\n${this.customDescription?.trim()}\n`;
    returnString += titleString;
    if (this.description != null && this.description.trim().length > 0) {
      returnString += descriptionString;
    }

    if (
      this.customDescription != null && this.customDescription.trim().length > 0
    ) {
      returnString += customDescriptionString;
    }

    return returnString;
  }
}

class ClassDoc extends DocElement {
  name: string;
  instanceVariables: VariableDoc[];
  staticVariables: VariableDoc[];
  instanceFunctions: FunctionDoc[];
  staticFunctions: FunctionDoc[];
  constructor() {
    super();
    this.name = "";
    this.instanceVariables = [];
    this.instanceFunctions = [];
    this.staticFunctions = [];
    this.staticVariables = [];
  }

  getParentPath(): string[] {
    let parentPath: string[] = [];
    console.log(parentPath.length);
    let curr = parents.get(this.name);
    if (curr == null) {
      return parentPath;
    }
    parentPath.push(curr);
    while (curr != null && parents.has(curr)) {
      curr = parents.get(curr);
      if (curr != null) {
        parentPath.push(curr);
      }
    }
    return parentPath;
  }

  getChildren(): Array<string> | undefined {
    return classTree.get(this.name);
  }

  getLink(v: string): string {
    return `[${v}](./${v}.md)`;
  }

  override toJson() {
    return {
      name: this.name,
      instanceVariables: (this.instanceVariables.length > 0)
        ? this.instanceVariables.map((docVal) => docVal.toJson())
        : null,
      staticVariables: (this.staticVariables.length > 0)
        ? this.staticVariables.map((docVal) => docVal.toJson())
        : null,
      instanceMethods: (this.instanceFunctions.length > 0)
        ? this.instanceFunctions.map((docVal) => docVal.toJson())
        : null,
      staticMethods: (this.staticFunctions.length > 0)
        ? this.staticFunctions.map((docVal) => docVal.toJson())
        : null,
    };
  }
  override toMarkdown(): string {
    let returnString = "";
    returnString += `---\ntitle: ${this.name}\nlayout: doc\n---\n\n`;
    const parentPath = this.getParentPath();
    if (parentPath.length > 0) {
      returnString += "***Extends*** " + parentPath.map((val: string, _1, _2) =>
        this.getLink(val)
      ).join(" -> ") + "\n\n";
    }

    const children = this.getChildren();
    if (children != null && children != undefined && children.length > 0) {
      returnString += "***Extended by*** " +
        children.map((val: string, _1, _2) => this.getLink(val)).join(", ") +
        "\n\n";
    }

    returnString += "\n";
    if (this.staticVariables != null && this.staticVariables.length > 0) {
      returnString += `## Static Variables\n`;
      this.staticVariables.forEach(
        (val: VariableDoc, _index: number, _arr: VariableDoc[]) => {
          returnString += val.toMarkdown();
        },
      );
    }
    if (this.staticFunctions != null && this.staticFunctions.length > 0) {
      returnString += `## Static Functions\n`;
      this.staticFunctions.forEach(
        (val: FunctionDoc, _index: number, _arr: FunctionDoc[]) => {
          returnString += val.toMarkdown();
        },
      );
    }
    if (this.instanceVariables != null && this.instanceVariables.length > 0) {
      returnString += `## Instance Variables\n`;
      this.instanceVariables.forEach(
        (val: VariableDoc, _index: number, _arr: VariableDoc[]) => {
          returnString += val.toMarkdown();
        },
      );
    }
    if (this.instanceFunctions != null && this.instanceFunctions.length > 0) {
      returnString += `## Instance Functions\n`;
      this.instanceFunctions.forEach(
        (val: FunctionDoc, _index: number, _arr: FunctionDoc[]) => {
          returnString += val.toMarkdown();
        },
      );
    }
    return returnString;
  }
}

async function main() {
  const isFile = (fileName: string) => {
    if (fileName != "Readme.md") {
      return fsSync.lstatSync(fileName).isFile();
    } else {
      return false;
    }
  };

  let pageObjects: ClassDoc[] = [];

  const folderPath = "./fraymakers-api-docs/docs/classes";
  const outPath = "./docs/classes";
  await fs.mkdir(outPath, { recursive: true });
  let files = fsSync
    .readdirSync(folderPath)
    .map((fileName: any) => {
      return path.join(folderPath, fileName);
    })
    .filter(isFile);
  let classNames: Array<string> = [];
  let classDocMap: Map<string, ClassDoc> = new Map<string, ClassDoc>();
  for (let h = 0; h < files.length; h++) {
    let data = fsSync.readFileSync(files[h]).toString();
    data = data.replaceAll("<", "\\&lt;").replaceAll(">", "\\&gt;");
    const tree = unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .use(remarkGfm)
      .use(rehypeStringify)
      .parse(data);

    let newChildren = [];
    let currentClassDoc: ClassDoc = new ClassDoc();
    let frontMatterData: { title: string; layout: string } = {
      title: "",
      layout: "",
    };
    if (tree.children.length > 0 && tree.children[0]?.type == "yaml") {
      frontMatterData = parse(tree.children[0].value);
      currentClassDoc.name = frontMatterData.title;
    }

    let currentHeader: string = "";
    for (let i = 0; i < tree.children.length; i++) {
      let table = tree.children[i];
      if (table.type === "table") {
        processTable(table, currentClassDoc, currentHeader);
      }

      if (table.type === "heading") {
        const headerString = tree?.children[i]?.children?.[0]?.value;
        currentHeader = headerString;
      }
    }
    const newOutPath = path.join(outPath, `${currentClassDoc.name}.md`);
    await fs.writeFile(newOutPath, currentClassDoc.toMarkdown());
    classNames.push(currentClassDoc.name);
    classDocMap.set(newOutPath, currentClassDoc);
  }

  classDocMap.forEach(
    function p(currentClassDoc: ClassDoc, fileLocation: string) {
      let file = fsSync.readFileSync(fileLocation).toString();
      for (let i = 0; i < classNames.length; i++) {
        const className = currentClassDoc.name;
        function generateReplacementMap(
          target: string,
          targetpathname: string,
        ) {
          const baseReplace = `[${target}](./${targetpathname}.md)`;
          return [
            [`:${target}\n`, `:${baseReplace}\n`],
            [`:${target},`, `:${baseReplace},`],
            [`:${target})`, `:${baseReplace})`],
            [`@see ${target}`, `@see ${baseReplace}`],
            [`&lt;${target}&gt;`, `&lt;${baseReplace}&gt;`],
          ];
        }
        const replacements = [
          ["AnimationStatsProps", "AnimationStats"],
          ["HitboxStatsProps", "HitboxStats"],
          ["CharacterAnimationStatsProps", "CharacterAnimationStatsProps"],
          ["GameObjectStatsProps", "GameObjectStats"],
          ["AssistStatsProps", "AssistStats"],
          ["ProjectileStatsProps", "ProjectileStats"],
          ["CharacterStatsProps", "CharacterStats"],
          ["StageShadowLayerStatsProps", "StageShadowLayerStats"],
          ...classNames.map((s) => [s, s]),
        ];

        const fnReplacementMaps = [
          [
            "Character",
            "updateAnimationStats(stats:Dynamic):Void",
            "updateAnimationStats(stats:CharacterAnimationStatsProps):Void",
          ],
          [
            "Projectile",
            "updateAnimationStats(stats:Dynamic):Void",
            "updateAnimationStats(stats:AnimationStatsProps):Void",
          ],
          [
            "Assist",
            "updateAnimationStats(stats:Dynamic):Void",
            "updateAnimationStats(stats:AssistAnimationStatsProps):Void",
          ],
          [
            "GameObject",
            "updateAnimationStats(stats:Dynamic):Void",
            "updateAnimationStats(stats:AnimationStatsProps):Void",
          ],
          [
            "CustomGameObject",
            "updateAnimationStats(stats:Dynamic):Void",
            "updateAnimationStats(stats:AnimationStatsProps):Void",
          ],
        ];
        for (const f of fnReplacementMaps) {
          if (className === f[0]) {
            file = file.replaceAll(f[1], f[2]);
            console.dir(f);
          }
        }

        for (const t of replacements) {
          for (const r of generateReplacementMap(t[0], t[1])) {
            file = file.replaceAll(r[0], r[1]);
          }
        }
      }
      fsSync.writeFileSync(fileLocation, file);
    },
  );
  fs.writeFile(
    path.join(outPath, `index.md`),
    fsSync.readFileSync(path.join(folderPath, "Readme.md")).toString().replace(
      "layout: page",
      "layout: doc",
    ).replace("Docs", "Class Index"),
  );
}

function processTable(table: Table, classDoc: ClassDoc, headerName: string) {
  const rows = table.children;
  if (
    headerName === "Instance Variables" || headerName === "Static Variables"
  ) {
    for (let i = 1; i < rows.length; i++) {
      const currRow = rows[i];
      const isStatic: boolean = headerName === "Static Variables";
      const variableField: VariableDoc = new VariableDoc(
        classDoc.name,
        isStatic,
      );
      variableField.name = currRow.children[0].children[0].value;
      variableField.type = currRow.children[1].children[0].value;
      variableField.initialValue = currRow.children[2].children[0].value;
      variableField.description = currRow.children[3].children[0]?.value;
      if (variableField.description != null) {
        variableField.description = currRow.children[3].children.map(
          (item: { value: string | null }) => {
            return item.value != null
              ? item.value.replaceAll("&lt;br&gt;", "\n").replaceAll(
                "\- \n",
                "",
              ).replaceAll("\-\n", "").replaceAll("\n-", "")
              : null;
          },
        ).join("\n").replaceAll("\n\n", "\n");
      }
      variableField.applyOverrides();
      if (isStatic) {
        classDoc.staticVariables.push(variableField);
      } else {
        classDoc.instanceVariables.push(variableField);
      }
    }
  } else if (
    headerName === "Instance Functions" || headerName === "Static Functions"
  ) {
    for (let i = 1; i < rows.length; i++) {
      const currRow = rows[i];

      const isStatic: boolean = headerName === "Static Functions";
      const functionField: FunctionDoc = new FunctionDoc(
        classDoc.name,
        isStatic,
      );
      functionField.name = currRow.children[0].children[0].value;
      if (functionField.name != null && functionField.name.length > 0) {
        functionField.fieldName = functionField.name.split("(")[0];
      }
      functionField.description = currRow.children[1].children[0]?.value;
      if (functionField.description != null) {
        functionField.description = currRow.children[1].children.map(
          (item: { value: string | null }) => {
            return item.value != null
              ? item.value.replaceAll("&lt;br&gt;", "\n").replaceAll(
                "\- \n",
                "",
              ).replaceAll("\-\n", "").replaceAll("\n-", "")
              : null;
          },
        ).join("\n").replaceAll("\n\n", "\n");
      }

      functionField.applyOverrides();
      if (isStatic) {
        classDoc.staticFunctions.push(functionField);
      } else {
        classDoc.instanceFunctions.push(functionField);
      }
    }
  }
}

await main();
