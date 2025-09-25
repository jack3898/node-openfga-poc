import { fgaClient } from "./fga-client.ts";

const vehicle = {
  id: "VEHICLE-01",
  vrn: "AA99000",
};

const site1 = {
  id: "SITE-01",
  name: "Site 1",
};

const site2 = {
  id: "SITE-02",
  name: "Site 2",
};

const user1 = {
  id: "USER-01",
  name: "John Doe",
  siteId: "SITE-01",
};

const user2 = {
  id: "USER-02",
  name: "Jason Doobenshbloomer",
  siteId: "SITE-02",
};

await fgaClient.writeAuthorizationModel({
  schema_version: "1.2",
  type_definitions: [
    {
      type: "user",
    },
    {
      type: "site",
    },
    {
      type: "vehicle",
      relations: {
        driver: { this: {} },
        owner: { this: {} },
      },
    },
  ],
});

await fgaClient.write({
  writes: [
    {
      user: "user:USER-01",
      relation: "driver",
      object: "vehicle:VEHICLE-01",
    },
    {
      user: "user:USER-02",
      relation: "owner",
      object: "vehicle:VEHICLE-01",
    },
  ],
});

const res = await fgaClient.check({
  user: "user:USER-01",
  relation: "driver",
  object: "vehicle:VEHICLE-01",
});

console.log(res);
