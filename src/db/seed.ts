import { db } from "./index";
import { users, organizations } from "./schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create super admin
  const adminEmail = "admin@towhub.io";
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (existingAdmin.length === 0) {
    const passwordHash = await hashPassword("admin123");
    await db.insert(users).values({
      email: adminEmail,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      role: "super_admin",
      phone: "+1-555-000-0000",
    });
    console.log("✅ Super admin created: admin@towhub.io / admin123");
  } else {
    console.log("ℹ️  Super admin already exists");
  }

  // Create demo org
  const demoSlug = "demo-towing";
  const existingOrg = await db.select().from(organizations).where(eq(organizations.slug, demoSlug)).limit(1);

  if (existingOrg.length === 0) {
    const [org] = await db.insert(organizations).values({
      name: "Demo Towing Co",
      slug: demoSlug,
      email: "demo@demotowing.com",
      phone: "+1-555-123-4567",
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      status: "approved",
      commissionPercent: 15,
      apiKey: "th_demo_key_for_testing_1234567890abcdef",
    }).returning();

    // Create demo company owner
    const ownerHash = await hashPassword("demo123");
    await db.insert(users).values({
      orgId: org.id,
      email: "owner@demotowing.com",
      passwordHash: ownerHash,
      firstName: "John",
      lastName: "Smith",
      role: "owner",
      phone: "+1-555-123-4567",
    });
    console.log("✅ Demo org + owner created: owner@demotowing.com / demo123");
  } else {
    console.log("ℹ️  Demo org already exists");
  }

  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
