import { EventEmitter } from "node:events";

export interface PendingOrder {
  id: string;
  customerId: string;
  customerEmail: string;
  itemPrices: number[];
  discountPercent: number;
  status: "pending" | "paid" | "cancelled";
  chargedTotalCents?: number;
  version: number;
}

export interface OrderStore {
  find(id: string): Promise<PendingOrder | undefined>;
  /** Compare the version and persist the order as one atomic storage operation. */
  saveIfVersion(order: PendingOrder, expectedVersion: number): Promise<boolean>;
}

function calculateTotalCents(order: PendingOrder): number {
  if (!Number.isFinite(order.discountPercent) || order.discountPercent < 0 || order.discountPercent > 100) {
    throw new Error("Discount percent must be between 0 and 100");
  }

  const subtotalCents = order.itemPrices.reduce((sum, price) => {
    const priceCents = Math.round(price * 100);
    if (
      !Number.isFinite(price)
      || price < 0
      || !Number.isSafeInteger(priceCents)
      || Math.abs(price - priceCents / 100) > Number.EPSILON
      || !Number.isSafeInteger(sum + priceCents)
    ) {
      throw new Error("Item prices must be non-negative values with at most two decimal places");
    }
    return sum + priceCents;
  }, 0);

  const totalCents = Math.round(subtotalCents * (100 - order.discountPercent) / 100);
  if (!Number.isSafeInteger(totalCents)) throw new Error("Order total is outside the supported range");
  return totalCents;
}

export class OrderCoordinator {
  private readonly events = new EventEmitter();
  private readonly store: OrderStore;

  constructor(store: OrderStore) {
    this.store = store;
  }

  onOrderPaid(listener: (order: PendingOrder) => void): () => void {
    this.events.on("paid", listener);
    return () => this.events.off("paid", listener);
  }

  async pay(orderId: string, actorCustomerId: string): Promise<number> {
    while (true) {
      const order = await this.store.find(orderId);
      if (!order) throw new Error("Order not found");
      if (order.customerId !== actorCustomerId) throw new Error("Customer is not authorized to pay this order");

      if (order.status === "paid") {
        if (order.chargedTotalCents === undefined) throw new Error("Paid order has no recorded total");
        console.log("payment processed", { orderId, outcome: "already_paid" });
        return order.chargedTotalCents / 100;
      }
      if (order.status !== "pending") throw new Error("Only pending orders can be paid");

      const totalCents = calculateTotalCents(order);
      const paidOrder: PendingOrder = {
        ...order,
        status: "paid",
        chargedTotalCents: totalCents,
        version: order.version + 1
      };

      if (!await this.store.saveIfVersion(paidOrder, order.version)) continue;

      console.log("payment processed", { orderId, outcome: "paid" });
      this.events.emit("paid", paidOrder);
      return totalCents / 100;
    }
  }

  async cancel(orderId: string): Promise<void> {
    while (true) {
      const order = await this.store.find(orderId);
      if (!order || order.status === "cancelled") return;
      if (order.status === "paid") throw new Error("Paid orders cannot be cancelled");

      const cancelledOrder: PendingOrder = {
        ...order,
        status: "cancelled",
        version: order.version + 1
      };
      if (await this.store.saveIfVersion(cancelledOrder, order.version)) return;
    }
  }
}
