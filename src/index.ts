import { readFile } from "node:fs/promises";
import { transformer } from "@openfga/syntax-transformer";

import { OpenFgaClient } from "@openfga/sdk";

let storeId = "";

// Create a new store
{
  const tempFgaCLient = new OpenFgaClient({
    apiUrl: "http://localhost:8080",
  });

  const { id } = await tempFgaCLient.createStore({
    name: "My Logistics App Store",
  });

  storeId = id;
}

const fgaClient = new OpenFgaClient({
  apiUrl: "http://localhost:8080",
  storeId,
});

const modelDsl = await readFile(
  new URL("./model.fga", import.meta.url),
  "utf-8"
);

function relations<T extends string>(...labels: T[]): { [K in T]: K } {
  let labelItems = {} as any;

  for (const label of labels) {
    labelItems[label] = label;
  }

  return labelItems as { [K in T]: K };
}

type FgaType = {
  name: string;
  relations: Record<string, string>;
  identify: typeof identify;
};

function identify(this: FgaType, id: string) {
  return `${this.name}:${id}`;
}

const fga = {
  user: {
    name: "user",
    relations: {},
    identify,
  },
  tenant: {
    name: "tenant",
    relations: relations("member"),
    identify,
  },
  site: {
    name: "site",
    relations: relations("admin", "member", "parent"),
    identify,
  },
  vehicle: {
    name: "vehicle",
    relations: relations("driver", "owner"),
    identify,
  },
} satisfies Record<string, FgaType>;

// Useful if you wanna see what the DSL looks like as a JSON object
const authorizationModel = transformer.transformDSLToJSONObject(modelDsl);
console.dir(authorizationModel, { depth: null });

await fgaClient.writeAuthorizationModel({
  schema_version: "1.2",
  type_definitions: [
    { type: fga.user.name, relations: {} },
    {
      type: fga.tenant.name,
      relations: {
        [fga.site.relations.member]: { this: {} },
        [fga.site.relations.admin]: {
          computedUserset: { relation: fga.tenant.relations.member },
        },
      },
      metadata: {
        relations: {
          [fga.site.relations.member]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
          [fga.site.relations.admin]: {
            directly_related_user_types: [],
          },
        },
      },
    },
    {
      type: fga.site.name,
      relations: {
        [fga.site.relations.parent]: { this: {} },
        [fga.site.relations.member]: {
          union: {
            child: [
              { this: {} },
              {
                tupleToUserset: {
                  computedUserset: { relation: fga.site.relations.member },
                  tupleset: { relation: fga.site.relations.parent },
                },
              },
            ],
          },
        },
        [fga.site.relations.admin]: {
          union: {
            child: [
              { this: {} },
              {
                tupleToUserset: {
                  computedUserset: { relation: fga.site.relations.admin },
                  tupleset: { relation: fga.site.relations.parent },
                },
              },
            ],
          },
        },
      },
      metadata: {
        relations: {
          [fga.site.relations.parent]: {
            directly_related_user_types: [{ type: fga.tenant.name }],
          },
          [fga.site.relations.member]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
          [fga.site.relations.admin]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
        },
      },
    },
    {
      type: fga.vehicle.name,
      relations: {
        [fga.vehicle.relations.driver]: { this: {} },
        [fga.vehicle.relations.owner]: { this: {} },
      },
      metadata: {
        relations: {
          [fga.vehicle.relations.driver]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
          [fga.vehicle.relations.owner]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
        },
      },
    },
  ],
});

await fgaClient.write({
  writes: [
    {
      user: fga.user.identify("USER-01"),
      relation: fga.site.relations.admin,
      object: fga.tenant.identify("TENANT-01"),
    },
  ],
});

const res = await fgaClient.check({
  user: fga.user.identify("USER-01"),
  relation: fga.site.relations.admin,
  object: fga.site.identify("SITE-01"),
});

console.log(res);
