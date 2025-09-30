import { readFile } from "node:fs/promises";

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

function labels<T extends string>(...labels: T[]): { [K in T]: K } {
  let labelItems = {} as any;

  for (const label of labels) {
    labelItems[label] = label;
  }

  return labelItems as { [K in T]: K };
}

type FgaType = {
  name: string;
  relations: Record<string, string>;
  identify: (id: string) => string;
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
  site: {
    name: "site",
    relations: labels("admin", "member"),
    identify,
  },
  vehicle: {
    name: "vehicle",
    relations: labels("driver", "owner"),
    identify,
  },
} satisfies Record<string, FgaType>;

// Useful if you wanna see what the DSL looks like as a JSON object
// const authorizationModel = transformer.transformDSLToJSONObject(modelDsl);
// console.dir(authorizationModel, { depth: null });

await fgaClient.writeAuthorizationModel({
  schema_version: "1.2",
  type_definitions: [
    { type: fga.user.name, relations: {} },
    {
      type: fga.site.name,
      relations: {
        [fga.site.relations.admin]: { this: {} },
        [fga.site.relations.member]: { this: {} },
      },
      metadata: {
        relations: {
          [fga.site.relations.admin]: {
            directly_related_user_types: [{ type: fga.user.name }],
          },
          [fga.site.relations.member]: {
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
      relation: fga.vehicle.relations.driver,
      object: fga.vehicle.identify("VEHICLE-01"),
    },
    {
      user: fga.user.identify("USER-02"),
      relation: fga.vehicle.relations.owner,
      object: fga.vehicle.identify("VEHICLE-01"),
    },
    {
      user: fga.user.identify("USER-01"),
      relation: fga.site.relations.member,
      object: fga.site.identify("SITE-01"),
    },
  ],
});

const res = await fgaClient.check({
  user: fga.user.identify("USER-01"),
  relation: fga.site.relations.member,
  object: fga.site.identify("SITE-01"),
});

console.log(res);
