import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrderCoordinator, type OrderStore, type PendingOrder } from "./order-coordinator.ts";

function memoryStore(initialOrder: PendingOrder): OrderStore {
  let order = structuredClone(initialOrder);
  return {
    find: async () => structuredClone(order),
    saveIfVersion: async (updatedOrder, expectedVersion) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (order.version !== expectedVersion) return false;
      order = structuredClone(updatedOrder);
      return true;
    }
  };
}

function pendingOrder(overrides: Partial<PendingOrder> = {}): PendingOrder {
  return {
    id: "order-1",
    customerId: "customer-1",
    customerEmail: "synthetic@example.com",
    itemPrices: [0.1, 0.2],
    discountPercent: 0,
    status: "pending",
    version: 0,
    ...overrides
  };
}

describe("OrderCoordinator review fixture", () => {
  it("charges a decimal total exactly once across concurrent coordinators", async () => {
    const order = pendingOrder();
    const store = memoryStore(order);
    const firstCoordinator = new OrderCoordinator(store);
    const secondCoordinator = new OrderCoordinator(store);
    let paidEvents = 0;
    firstCoordinator.onOrderPaid(() => paidEvents++);
    secondCoordinator.onOrderPaid(() => paidEvents++);

    const totals = await Promise.all([
      firstCoordinator.pay(order.id, order.customerId),
      secondCoordinator.pay(order.id, order.customerId)
    ]);

    assert.deepEqual(totals, [0.3, 0.3]);
    assert.equal(paidEvents, 1);
  });

  it("does not allow one customer to pay another customer's order", async () => {
    const order = pendingOrder();
    const coordinator = new OrderCoordinator(memoryStore(order));
    await assert.rejects(() => coordinator.pay(order.id, "different-customer"), /not authorized/);
  });

  it("loads the persisted total when a new coordinator sees a paid order", async () => {
    const order = pendingOrder();
    const store = memoryStore(order);
    await new OrderCoordinator(store).pay(order.id, order.customerId);

    const total = await new OrderCoordinator(store).pay(order.id, order.customerId);

    assert.equal(total, 0.3);
  });

  it("waits for cancellation persistence and propagates store errors", async () => {
    const order = pendingOrder();
    const failure = new Error("store unavailable");
    const store: OrderStore = {
      find: async () => structuredClone(order),
      saveIfVersion: async () => { throw failure; }
    };

    await assert.rejects(() => new OrderCoordinator(store).cancel(order.id), failure);
  });

  it("allows paid-event listeners to unsubscribe", async () => {
    const order = pendingOrder();
    const coordinator = new OrderCoordinator(memoryStore(order));
    let paidEvents = 0;
    const unsubscribe = coordinator.onOrderPaid(() => paidEvents++);
    unsubscribe();

    await coordinator.pay(order.id, order.customerId);

    assert.equal(paidEvents, 0);
  });
});
