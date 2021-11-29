import { ReconnectingSocket } from "../../common/reconnecting-socket.js";
import { v4 as uuidv4 } from "uuid";
import knex from "knex";
import config from "./db/knexfile.js";

let db = knex(config.development);
let inventory = await ReconnectingSocket.connect("inventory");

inventory.on("info_req", async (msg) => {
  console.log(msg);
  let src = msg.header.from;
  let response_to = msg.header.id;
  let barcode = msg.body.barcode;

  let items = await db("inventory").select().where({ barcode }).limit(1);

  if (items.length === 1) {
    return inventory.send(
      JSON.stringify({
        header: {
          id: uuidv4(),
          response_to,
          to: src,
          type: "item_info",
        },
        body: items[0],
      })
    );
  }

  let users = await db("users").select().where({ barcode }).limit(1);

  if (items.length === 0) {
    inventory.send(
      JSON.stringify({
        header: {
          id: uuidv4(),
          response_to,
          to: src,
          type: "user_info",
        },
        body: users[0],
      })
    );
  } else {
    inventory.send(
      JSON.stringify({
        header: {
          id: uuidv4(),
          response_to,
          to: src,
          type: "item_not_found",
        },
        body: {},
      })
    );
  }
});

inventory.on("purchase", async (purchase) => {
  const user_id = purchase.body?.user_id;
  const item_id = purchase.body?.item_id;

  if (!user_id || !item_id) {
    return console.error("Invalid request: ", purchase);
  }

  // First, confirm the item exists
  let items = await db("inventory").select().where({ id: item_id }).limit(1);
  if (items.length === 0) {
    inventory.send(
      JSON.stringify({
        header: {
          id: uuidv4(),
          response_to: purchase.header.id,
          to: purchase.header.from,
          type: "item_not_found",
        },
        body: {},
      })
    );
  }

  let cents = items[0].cents;

  try {
    await db("transactions").insert([{ user_id, item_id, cents: -cents }]);
  } catch (e) {
    // TODO: surface errors to the client
    return console.error(e);
  }

  // TODO: Evaluate the perf of this. Might need to denormalize
  let balance = (
    await db("transactions").sum({ balance: "cents" }).where({ user_id })
  )[0].balance;

  inventory.send(
    JSON.stringify({
      header: {
        id: uuidv4(),
        response_to: purchase.header.id,
        to: purchase.header.from,
        type: "purchase_success",
      },
      body: {
        item: items[0],
        balance,
      },
    })
  );
});