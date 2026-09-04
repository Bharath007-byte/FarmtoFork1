import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const catalogPath = join(
  process.cwd(),
  "..",
  "frontend",
  "src",
  "Data",
  "catalog.json"
);

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

if (!Array.isArray(catalog)) {
  throw new Error("catalog.json is not an array");
}

if (catalog.length !== 159) {
  throw new Error(
    `Expected exactly 159 catalog products, found ${catalog.length}`
  );
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function farmerEmail(farmerName) {
  return `catalog.${slugify(farmerName)}@farm2fork.demo`;
}

function safeText(value) {
  if (value == null) return null;

  const text = String(value).trim();

  return text || null;
}

function parseUnit(weight) {
  const value = String(weight || "").trim();

  if (/ml/i.test(value)) return "ml";
  if (/kg/i.test(value)) return "kg";
  if (/g/i.test(value)) return "g";

  return "unit";
}

function parseQuantity(weight) {
  const value = String(weight || "");

  const match = value.match(/([\d.]+)\s*(kg|g|ml)/i);

  if (!match) return 1;

  const amount = Number(match[1]);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 1;
  }

  return amount;
}

function productIdFor(index) {
  return `MKT-${String(index + 1).padStart(4, "0")}`;
}

function assertLocalImage(item) {
  const imageUrl = safeText(item.imageUrl);

  if (!imageUrl) {
    throw new Error(
      `Missing imageUrl for product: ${item.name}`
    );
  }

  if (!imageUrl.startsWith("/products/")) {
    throw new Error(
      `Product ${item.name} does not use a local image: ${imageUrl}`
    );
  }

  return imageUrl;
}

async function main() {
  console.log("========================================");
  console.log("Farm2Fork 159-Product Catalog Import");
  console.log("========================================");
  console.log(`Catalog file: ${catalogPath}`);
  console.log(`Catalog products: ${catalog.length}`);
  console.log("Image source: LOCAL /products ONLY");
  console.log("");

  /*
   * ---------------------------------------------------------
   * 0. Validate catalog before touching the database
   * ---------------------------------------------------------
   */

  const names = new Set();
  const imageUrls = new Set();

  for (const [index, item] of catalog.entries()) {
    const name = safeText(item.name);

    if (!name) {
      throw new Error(
        `Product ${index + 1} has no name`
      );
    }

    if (names.has(name)) {
      throw new Error(
        `Duplicate product name: ${name}`
      );
    }

    names.add(name);

    const imageUrl = assertLocalImage(item);

    if (imageUrls.has(imageUrl)) {
      throw new Error(
        `Duplicate local image URL: ${imageUrl}`
      );
    }

    imageUrls.add(imageUrl);

    const price = Number(item.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `Invalid price for product ${name}: ${item.price}`
      );
    }
  }

  console.log(
    `Validated unique products: ${names.size}`
  );

  console.log(
    `Validated unique local images: ${imageUrls.size}`
  );

  /*
   * ---------------------------------------------------------
   * 1. Categories
   * ---------------------------------------------------------
   */

  const categoryMap = new Map();

  const categoryNames = [
    ...new Set(
      catalog.map((product) =>
        String(product.category).trim()
      )
    ),
  ];

  for (const name of categoryNames) {
    const slug = slugify(name);

    const category =
      await prisma.productCategory.upsert({
        where: { slug },

        update: { name },

        create: {
          name,
          slug,
        },
      });

    categoryMap.set(name, category);
  }

  console.log(
    `Categories ready: ${categoryMap.size}`
  );

  /*
   * ---------------------------------------------------------
   * 2. Catalog farmers
   *
   * These are explicitly unverified catalog profiles.
   * Existing real/demo farmer accounts are never overwritten.
   * ---------------------------------------------------------
   */

  const farmerNames = [
    ...new Set(
      catalog.map((product) =>
        String(product.farmer).trim()
      )
    ),
  ];

  const catalogPasswordHash =
    await bcrypt.hash(
      "CatalogDemo@123",
      12
    );

  const farmerMap = new Map();

  for (const farmerName of farmerNames) {
    const email = farmerEmail(farmerName);

    let user =
      await prisma.user.findUnique({
        where: { email },

        include: {
          farmer: true,
        },
      });

    if (!user) {
      user =
        await prisma.user.create({
          data: {
            email,
            name: farmerName,
            role: "FARMER",
            passwordHash:
              catalogPasswordHash,

            farmer: {
              create: {
                farmName: farmerName,
                district: "Not specified",
                state: "India",
                pinCode: "000000",
                location: "India",
                categories: [],
                details:
                  "Unverified catalog profile used for Farm2Fork marketplace catalog demonstration.",
                verified: false,
              },
            },
          },

          include: {
            farmer: true,
          },
        });
    }

    if (!user.farmer) {
      throw new Error(
        `User ${email} exists but has no FarmerProfile. Refusing to modify it.`
      );
    }

    farmerMap.set(
      farmerName,
      user.farmer
    );

    console.log(
      `Farmer ready: ${farmerName}`
    );
  }

  /*
   * ---------------------------------------------------------
   * 3. Deactivate the OLD generated F2F catalog
   *
   * We do NOT delete these records.
   *
   * This protects historical order items, carts, reviews,
   * inventory relationships and other references.
   * ---------------------------------------------------------
   */

  const oldCatalogResult =
    await prisma.product.updateMany({
      where: {
        id: {
          startsWith: "F2F-",
        },
      },

      data: {
        active: false,
      },
    });

  console.log(
    `Old F2F products deactivated: ${oldCatalogResult.count}`
  );

  /*
   * ---------------------------------------------------------
   * 4. Import the NEW 159 master products
   *
   * New IDs intentionally use MKT-xxxx.
   * This prevents collisions with the old F2F-xxxx catalog.
   * ---------------------------------------------------------
   */

  let created = 0;
  let updated = 0;

  for (const [index, item] of catalog.entries()) {
    const categoryName =
      String(item.category).trim();

    const farmerName =
      String(item.farmer).trim();

    const category =
      categoryMap.get(categoryName);

    const farmer =
      farmerMap.get(farmerName);

    if (!category) {
      throw new Error(
        `Missing category for product: ${item.name}`
      );
    }

    if (!farmer) {
      throw new Error(
        `Missing farmer for product: ${item.name}`
      );
    }

    const price =
      Number(item.price);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error(
        `Invalid price for product ${item.name}: ${item.price}`
      );
    }

    const pricePaise =
      Math.round(price * 100);

    const unit =
      parseUnit(item.weight);

    const packageQuantity =
      parseQuantity(item.weight);

    const imageUrl =
      assertLocalImage(item);

    const productId =
      productIdFor(index);

    const existing =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          pricePaise: true,
        },
      });

    const product =
      await prisma.product.upsert({
        where: {
          id: productId,
        },

        update: {
          farmerId: farmer.id,
          categoryId: category.id,

          name: String(item.name),

          variety:
            safeText(item.subCategory),

          description:
            safeText(item.description),

          unit,

          pricePaise,

          organic:
            Boolean(item.organic),

          imageUrl,

          active: true,

          minQty: 1,

          maxQty:
            packageQuantity,
        },

        create: {
          id: productId,

          farmerId: farmer.id,
          categoryId: category.id,

          name: String(item.name),

          variety:
            safeText(item.subCategory),

          description:
            safeText(item.description),

          unit,

          pricePaise,

          organic:
            Boolean(item.organic),

          imageUrl,

          active: true,

          minQty: 1,

          maxQty:
            packageQuantity,
        },
      });

    if (existing) {
      updated++;
    } else {
      created++;
    }

    /*
     * Do not overwrite existing inventory.
     *
     * For newly-created catalog products we create a zero
     * available quantity because we do not have a verified
     * live farmer inventory source yet.
     *
     * This prevents us from presenting invented stock numbers
     * as real inventory.
     */

    await prisma.inventory.upsert({
      where: {
        productId: product.id,
      },

      update: {
        farmerId: farmer.id,
      },

      create: {
        productId: product.id,
        farmerId: farmer.id,

        available: 0,
        reserved: 0,
        sold: 0,
      },
    });

    /*
     * Price history.
     */

    if (!existing) {
      await prisma.productPriceLog.create({
        data: {
          productId: product.id,
          pricePaise,
        },
      });
    } else if (
      existing.pricePaise !== pricePaise
    ) {
      await prisma.productPriceLog.create({
        data: {
          productId: product.id,
          pricePaise,
        },
      });
    }

    if ((index + 1) % 25 === 0) {
      console.log(
        `Imported ${index + 1}/${catalog.length} products`
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * 5. Update catalog farmer categories
   * ---------------------------------------------------------
   */

  for (const [
    farmerName,
    farmer,
  ] of farmerMap) {
    const categories = [
      ...new Set(
        catalog
          .filter(
            (product) =>
              String(product.farmer).trim() ===
              farmerName
          )
          .map(
            (product) =>
              String(product.category).trim()
          )
      ),
    ];

    await prisma.farmerProfile.update({
      where: {
        id: farmer.id,
      },

      data: {
        categories,
      },
    });
  }

  /*
   * ---------------------------------------------------------
   * 6. Final verification
   * ---------------------------------------------------------
   */

  const activeCatalogProducts =
    await prisma.product.count({
      where: {
        id: {
          startsWith: "MKT-",
        },

        active: true,
      },
    });

  const inactiveOldProducts =
    await prisma.product.count({
      where: {
        id: {
          startsWith: "F2F-",
        },

        active: false,
      },
    });

  const totalProducts =
    await prisma.product.count();

  const activeProducts =
    await prisma.product.count({
      where: {
        active: true,
      },
    });

  const inventoryCount =
    await prisma.inventory.count();

  const localImageProducts =
    await prisma.product.count({
      where: {
        id: {
          startsWith: "MKT-",
        },

        imageUrl: {
          startsWith: "/products/",
        },

        active: true,
      },
    });

  console.log("");
  console.log("========================================");
  console.log("IMPORT COMPLETE");
  console.log("========================================");
  console.log(
    `Created master products: ${created}`
  );
  console.log(
    `Updated master products: ${updated}`
  );
  console.log(
    `Active MKT products: ${activeCatalogProducts}`
  );
  console.log(
    `Inactive old F2F products: ${inactiveOldProducts}`
  );
  console.log(
    `Active products total: ${activeProducts}`
  );
  console.log(
    `Total database products: ${totalProducts}`
  );
  console.log(
    `Local-image MKT products: ${localImageProducts}`
  );
  console.log(
    `Total inventory records: ${inventoryCount}`
  );
  console.log(
    `Catalog farmers: ${farmerMap.size}`
  );
  console.log(
    `Categories: ${categoryMap.size}`
  );
  console.log("========================================");

  if (activeCatalogProducts !== 159) {
    throw new Error(
      `Verification failed: expected 159 active MKT products, found ${activeCatalogProducts}`
    );
  }

  if (localImageProducts !== 159) {
    throw new Error(
      `Verification failed: expected 159 local-image MKT products, found ${localImageProducts}`
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("CATALOG IMPORT FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
