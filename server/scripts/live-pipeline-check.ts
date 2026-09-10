import "dotenv/config";
import { PrismaClient, OrderStatus, LogisticsStatus } from "@prisma/client";

const prisma = new PrismaClient();
const API = "http://127.0.0.1:8787";

type Login = { token: string; user: { id: string; role: string; email: string } };

async function login(email: string, password: string): Promise<Login> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${email}: ${JSON.stringify(data)}`);
  return data;
}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

function dump(label: string, value: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(value, null, 2));
}

try {
  const consumer = await login("consumer@farm2fork.demo", "ShopDemo@123");
  const farmer = await login("farmer@farm2fork.demo", "FarmDemo@123");
  const logistics = await login("logistics@farm2fork.demo", "FleetDemo@123");

  const logisticsUsers = await prisma.user.findMany({
    where: { role: "LOGISTICS" },
    select: { id: true, email: true },
  });

  const products = await prisma.product.findMany({
    where: { active: true, inventory: { is: { available: { gte: 0.25 } } } },
    include: { inventory: true, farmer: { include: { user: { select: { email: true } } } } },
    take: 30,
  });
  const usable = products.filter((p) => p.minQty <= 0.25);
  if (usable.length < 1) throw new Error("No product allows qty 0.25");

  const farmerOwned = usable.filter((p) => p.farmer.user.email === "farmer@farm2fork.demo");
  const p1 = farmerOwned[0] || usable[0];
  dump("TEST1 product", {
    id: p1.id,
    name: p1.name,
    farmerId: p1.farmerId,
    farmerEmail: p1.farmer.user.email,
    minQty: p1.minQty,
    availableBefore: p1.inventory?.available,
    reservedBefore: p1.inventory?.reserved,
  });

  await api(consumer.token, "/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId: p1.id, qty: 0 }),
  });
  const existingCart = await prisma.cartItem.findMany({ where: { userId: consumer.user.id } });
  for (const row of existingCart) {
    await api(consumer.token, "/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId: row.productId, qty: 0 }),
    });
  }
  const add1 = await api(consumer.token, "/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId: p1.id, qty: 0.25 }),
  });
  dump("TEST1 add cart", { status: add1.status, data: add1.data });
  if (add1.status !== 200) throw new Error("Could not add 0.25 to cart");

  const addrCountBefore = await prisma.address.count({ where: { userId: consumer.user.id } });
  let addresses = await api<{ addresses: { id: string }[] }>(consumer.token, "/api/addresses");
  if (!addresses.data.addresses?.length) {
    const createdAddr = await api<{ address: { id: string } }>(consumer.token, "/api/addresses", {
      method: "POST",
      body: JSON.stringify({
        line1: "12 Harvest Lane",
        city: "Nashik",
        district: "Nashik",
        state: "Maharashtra",
        pinCode: "422001",
      }),
    });
    if (createdAddr.status !== 201) throw new Error(`Could not save address: ${JSON.stringify(createdAddr.data)}`);
    addresses = await api<{ addresses: { id: string }[] }>(consumer.token, "/api/addresses");
  }
  if (!addresses.data.addresses?.length) throw new Error("Consumer has no saved address");
  const addressId = addresses.data.addresses[0].id;

  const slotBefore = await prisma.deliverySlot.findMany({
    where: { booked: { gt: 0 } },
    orderBy: { booked: "desc" },
    take: 5,
  });

  const orderRes = await api<{ order: { id: string; status: string; addressId: string } }>(
    consumer.token,
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify({ paymentMethod: "COD", addressId }),
    }
  );
  dump("TEST1 COD response", { status: orderRes.status, data: orderRes.data });
  if (orderRes.status !== 201) throw new Error("COD order failed");
  if ("otpId" in (orderRes.data as object)) throw new Error("COD still returned otpId");

  const orderId = orderRes.data.order.id;
  const addrCountAfter = await prisma.address.count({ where: { userId: consumer.user.id } });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, bookings: true },
  });
  const inv = await prisma.inventory.findUnique({ where: { productId: p1.id } });
  const cartLeft = await prisma.cartItem.findMany({ where: { userId: consumer.user.id } });
  const slot = order?.bookings[0]
    ? await prisma.deliverySlot.findUnique({ where: { id: order.bookings[0].slotId } })
    : null;

  dump("TEST1 Order", {
    id: order?.id,
    status: order?.status,
    consumerId: order?.consumerId,
    addressId: order?.addressId,
    paymentMethod: order?.paymentMethod,
    totalPaise: order?.totalPaise,
  });
  dump("TEST1 OrderItems", order?.items.map((i) => ({
    productId: i.productId,
    farmerId: i.farmerId,
    qty: i.qty,
    unitPaise: i.unitPaise,
    linePaise: i.linePaise,
  })));
  dump("TEST1 Inventory", {
    productId: inv?.productId,
    available: inv?.available,
    reserved: inv?.reserved,
    sold: inv?.sold,
    availableDelta: (p1.inventory?.available ?? 0) - (inv?.available ?? 0),
    reservedDelta: (inv?.reserved ?? 0) - (p1.inventory?.reserved ?? 0),
  });
  dump("TEST1 LogisticsBooking", order?.bookings.map((b) => ({
    id: b.id,
    orderId: b.orderId,
    farmerId: b.farmerId,
    quantity: b.quantity,
    slotId: b.slotId,
    status: b.status,
    assignedUserId: b.assignedUserId,
    pickup: b.pickup,
  })));
  dump("TEST1 DeliverySlot", slot && {
    id: slot.id,
    date: slot.date,
    startMin: slot.startMin,
    endMin: slot.endMin,
    capacity: slot.capacity,
    booked: slot.booked,
  });
  dump("TEST1 Cart remaining", cartLeft);
  dump("TEST1 address counts", { addrCountBefore, addrCountAfter, usedAddressId: addressId });

  const t1 = {
    orderOk: order?.status === OrderStatus.COD_PENDING,
    consumerOk: order?.consumerId === consumer.user.id,
    addressOk: order?.addressId === addressId,
    itemOk: order?.items.length === 1 && order.items[0].qty === 0.25 && order.items[0].farmerId === p1.farmerId,
    invOk: (inv?.available ?? 0) === (p1.inventory?.available ?? 0) - 0.25 && (inv?.reserved ?? 0) === (p1.inventory?.reserved ?? 0) + 0.25,
    noNeg: (inv?.available ?? 0) >= 0 && (inv?.reserved ?? 0) >= 0,
    cartEmpty: cartLeft.length === 0,
    oneBooking: order?.bookings.length === 1,
    bookingQty: order?.bookings[0]?.quantity === 0.25,
    noDuplicateAddress: addrCountAfter === addrCountBefore,
  };
  dump("TEST1 verdict", t1);

  // Multi-farmer
  const byFarmer = new Map<string, typeof usable>();
  for (const p of usable) {
    const list = byFarmer.get(p.farmerId) || [];
    list.push(p);
    byFarmer.set(p.farmerId, list);
  }
  const farmerIds = [...byFarmer.keys()];
  let multi: { pass: boolean; orderId?: string; reason?: string } = { pass: false, reason: "not enough farmers in catalog with minQty<=0.25" };
  if (farmerIds.length >= 2) {
    const aProds = byFarmer.get(farmerIds[0])!;
    const bProd = byFarmer.get(farmerIds[1])![0];
    const a1 = aProds[0];
    const a2 = aProds[1] && aProds[1].id !== bProd.id ? aProds[1] : aProds[0];
    await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: a1.id, qty: 0 }) });
    await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: a2.id, qty: 0 }) });
    await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: bProd.id, qty: 0 }) });
    const qA1 = 0.25;
    const qA2 = a2.id === a1.id ? 0 : 0.5;
    const addA1 = await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: a1.id, qty: qA1 + (a2.id === a1.id ? 0.5 : 0) }) });
    const addA2 =
      a2.id === a1.id
        ? addA1
        : await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: a2.id, qty: qA2 }) });
    const addB = await api(consumer.token, "/api/cart", { method: "POST", body: JSON.stringify({ productId: bProd.id, qty: 1 }) });
    if (addA1.status !== 200 || addA2.status !== 200 || addB.status !== 200) {
      multi = { pass: false, reason: `cart add failed ${addA1.status} ${addA2.status} ${addB.status}` };
    } else {
      const mRes = await api<{ order: { id: string } }>(consumer.token, "/api/orders", {
        method: "POST",
        body: JSON.stringify({ paymentMethod: "COD", addressId }),
      });
      if (mRes.status !== 201) {
        multi = { pass: false, reason: JSON.stringify(mRes.data) };
      } else {
        const mo = await prisma.order.findUnique({
          where: { id: mRes.data.order.id },
          include: { items: true, bookings: true },
        });
        const grouped = new Map<string, number>();
        for (const i of mo?.items || []) grouped.set(i.farmerId, (grouped.get(i.farmerId) || 0) + i.qty);
        const bookingMatch = (mo?.bookings || []).every(
          (b) => Math.abs((grouped.get(b.farmerId) || 0) - b.quantity) < 1e-9
        );
        multi = {
          pass: Boolean(
            mo &&
              new Set(mo.items.map((i) => i.farmerId)).size >= 2 &&
              mo.bookings.length === new Set(mo.items.map((i) => i.farmerId)).size &&
              mo.bookings.every((b) => b.orderId === mo.id) &&
              bookingMatch
          ),
          orderId: mo?.id,
        };
        dump("TEST2 multi-farmer", {
          orderId: mo?.id,
          itemFarmers: mo?.items.map((i) => ({ farmerId: i.farmerId, qty: i.qty, productId: i.productId })),
          bookings: mo?.bookings.map((b) => ({ farmerId: b.farmerId, qty: b.quantity, orderId: b.orderId })),
          grouped: Object.fromEntries(grouped),
        });
      }
    }
  }
  dump("TEST2 verdict", multi);

  // Farmer lifecycle on TEST1 if that farmer is farmer@ demo
  const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmer.user.id } });
  let farmerLife: Record<string, unknown> = { pass: false };
  if (farmerProfile && order?.items.some((i) => i.farmerId === farmerProfile.id)) {
    const leak = await api<{ orders: { id: string; items: { farmerId?: string }[] }[] }>(farmer.token, "/api/orders");
    const leaked = (leak.data.orders || []).some((o) =>
      (o.items || []).some((it) => it.farmerId && it.farmerId !== farmerProfile.id)
    );
    const a1s = await api(farmer.token, `/api/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    const a2s = await api(farmer.token, `/api/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "PREPARING" }),
    });
    const a3s = await api(farmer.token, `/api/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "READY_FOR_PICKUP" }),
    });
    const delivered = await api(farmer.token, `/api/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    const after = await prisma.order.findUnique({ where: { id: orderId } });
    farmerLife = {
      pass:
        !leaked &&
        a1s.status === 200 &&
        a2s.status === 200 &&
        a3s.status === 200 &&
        delivered.status === 403 &&
        after?.status === OrderStatus.READY_FOR_PICKUP,
      leaked,
      statuses: { a1s: a1s.status, a2s: a2s.status, a3s: a3s.status, delivered: delivered.status, db: after?.status },
    };
  } else {
    farmerLife = { pass: false, reason: "TEST1 product is not owned by farmer@farm2fork.demo" };
  }
  dump("TEST7 farmer", farmerLife);

  // Logistics on TEST1 booking
  const jobs = await api<{ jobs: { id: string; assignedUserId: string | null; orderId: string | null }[] }>(
    logistics.token,
    "/api/logistics/jobs"
  );
  const job = (jobs.data.jobs || []).find((j) => j.orderId === orderId);
  dump("TEST8 jobs include TEST1", { jobCount: jobs.data.jobs?.length, found: Boolean(job), job });
  let logisticsLife: Record<string, unknown> = { pass: false };
  let doubleClaim: Record<string, unknown> = { pass: false, tested: false };
  if (job) {
    const claim1 = await api(logistics.token, `/api/logistics/jobs/${job.id}/claim`, { method: "POST" });
    const afterClaim = await prisma.logisticsBooking.findUnique({ where: { id: job.id } });
    const other = logisticsUsers.find((u) => u.email !== "logistics@farm2fork.demo");
    if (other) {
      // cannot login without password; skip unless we have a known second demo
      doubleClaim = { pass: false, tested: false, reason: `second logistics exists (${other.email}) but password unknown` };
    }
    const claimAgain = await api(logistics.token, `/api/logistics/jobs/${job.id}/claim`, { method: "POST" });
    doubleClaim = {
      ...doubleClaim,
      sameUserReclaimStatus: claimAgain.status,
      assignedUserId: afterClaim?.assignedUserId,
      matchesLogistics: afterClaim?.assignedUserId === logistics.user.id,
    };

    const orderJobs = (jobs.data.jobs || []).filter((j) => j.orderId === orderId);
    let lastClaim = 0;
    for (const j of orderJobs) {
      if (!j.assignedUserId) {
        lastClaim = (await api(logistics.token, `/api/logistics/jobs/${j.id}/claim`, { method: "POST" })).status;
      }
    }
    const seq = ["FARMER_READY", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
    const steps: Record<string, number> = {};
    for (const j of orderJobs) {
      for (const st of seq) {
        const r = await api(logistics.token, `/api/logistics/jobs/${j.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: st }),
        });
        steps[`${j.id}:${st}`] = r.status;
      }
    }
    const bookingsEnd = await prisma.logisticsBooking.findMany({ where: { orderId } });
    const orderEnd = await prisma.order.findUnique({ where: { id: orderId } });
    logisticsLife = {
      pass:
        claim1.status === 200 &&
        bookingsEnd.every((b) => b.status === LogisticsStatus.DELIVERED) &&
        orderEnd?.status === OrderStatus.DELIVERED,
      claim1: claim1.status,
      lastClaim,
      steps,
      bookingStatuses: bookingsEnd.map((b) => b.status),
      orderStatus: orderEnd?.status,
    };
  }
  dump("TEST8/9 logistics", { logisticsLife, doubleClaim });

  // GPS without fake coords
  dump("TEST10 GPS", { tested: false, reason: "No browser geolocation in this API runner" });

  // Multi-farmer partial delivery
  let multiComplete: Record<string, unknown> = { pass: false };
  if (multi.pass && multi.orderId) {
    const mo = await prisma.order.findUnique({
      where: { id: multi.orderId },
      include: { bookings: true },
    });
    if (mo && mo.bookings.length >= 2) {
      await prisma.logisticsBooking.update({
        where: { id: mo.bookings[0].id },
        data: { status: LogisticsStatus.DELIVERED, deliveredAt: new Date() },
      });
      await prisma.logisticsBooking.update({
        where: { id: mo.bookings[1].id },
        data: { status: LogisticsStatus.IN_TRANSIT, inTransitAt: new Date() },
      });
      const all = await prisma.logisticsBooking.findMany({ where: { orderId: mo.id } });
      const { orderStatusFromBookings } = await import("../src/lib/orderStatus.js");
      const mapped = orderStatusFromBookings(all, mo.status);
      const still = await prisma.order.findUnique({ where: { id: mo.id } });
      multiComplete = {
        pass: still?.status !== OrderStatus.DELIVERED && mapped !== OrderStatus.DELIVERED,
        orderStatus: still?.status,
        mapped,
        bookings: all.map((b) => ({ id: b.id, status: b.status })),
      };
      // restore bookings to CONFIRMED so we do not leave a half-delivered production order incorrectly
      // actually user asked to verify in postgres; leave as-is for evidence? Better not leave IN_TRANSIT fake without logistics user.
      // Revert those two booking status writes — those were test mutations on real bookings.
      await prisma.logisticsBooking.update({
        where: { id: mo.bookings[0].id },
        data: { status: LogisticsStatus.CONFIRMED, deliveredAt: null },
      });
      await prisma.logisticsBooking.update({
        where: { id: mo.bookings[1].id },
        data: { status: LogisticsStatus.CONFIRMED, inTransitAt: null },
      });
    }
  }
  dump("TEST12 multi completion mapping", multiComplete);

  // Cancellation before pickup on multi order if still COD_PENDING
  let cancel: Record<string, unknown> = { pass: false };
  if (multi.orderId) {
    const before = await prisma.order.findUnique({
      where: { id: multi.orderId },
      include: { items: true, bookings: true },
    });
    const invBefore = before
      ? await prisma.inventory.findMany({ where: { productId: { in: before.items.map((i) => i.productId) } } })
      : [];
    const slotBookedBefore = before?.bookings[0]
      ? await prisma.deliverySlot.findUnique({ where: { id: before.bookings[0].slotId } })
      : null;
    const cRes = await api(consumer.token, `/api/orders/${multi.orderId}/cancel`, { method: "POST" });
    const afterC = await prisma.order.findUnique({
      where: { id: multi.orderId },
      include: { bookings: true, items: true },
    });
    const invAfter = afterC
      ? await prisma.inventory.findMany({ where: { productId: { in: afterC.items.map((i) => i.productId) } } })
      : [];
    const afterPickupCancel = await api(consumer.token, `/api/orders/${orderId}/cancel`, { method: "POST" });
    cancel = {
      beforePickupStatus: cRes.status,
      orderStatus: afterC?.status,
      bookings: afterC?.bookings.map((b) => b.status),
      afterPickupOnDeliveredOrder: afterPickupCancel.status,
      pass:
        cRes.status === 200 &&
        afterC?.status === OrderStatus.CANCELLED &&
        afterC.bookings.every((b) => b.status === LogisticsStatus.CANCELLED) &&
        afterPickupCancel.status === 409,
    };
    dump("TEST13 cancel inventory before/after", { invBefore, invAfter, slotBookedBefore });
  }
  dump("TEST13 cancel", cancel);

  const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  dump("TEST14 razorpay keys present", razorpayConfigured);

  console.log("\nDONE");
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
