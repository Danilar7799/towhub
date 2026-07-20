import { db } from "./index";
import { users, organizations, vehicles, jobs, customers, invoices, leads, expenses, shifts } from "./schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database with comprehensive demo data...");

  // ========== SUPER ADMIN ==========
  const adminEmail = "admin@towhub.io";
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  let adminUser;
  if (existingAdmin.length === 0) {
    const passwordHash = await hashPassword("admin123");
    [adminUser] = await db.insert(users).values({
      email: adminEmail, passwordHash, firstName: "Super", lastName: "Admin", role: "super_admin", phone: "+1-555-000-0000",
    }).returning();
    console.log("✅ Super admin: admin@towhub.io / admin123");
  } else {
    adminUser = existingAdmin[0];
    console.log("ℹ️  Super admin exists");
  }

  // ========== DEMO ORGANIZATION ==========
  const demoSlug = "demo-towing";
  const existingOrg = await db.select().from(organizations).where(eq(organizations.slug, demoSlug)).limit(1);
  let org;
  if (existingOrg.length === 0) {
    [org] = await db.insert(organizations).values({
      name: "Demo Towing Co", slug: demoSlug, email: "info@demotowing.com", phone: "+1-555-123-4567",
      address: "456 Industrial Blvd", city: "Los Angeles", state: "CA", zip: "90001",
      website: "https://demotowing.com", status: "approved", commissionPercent: 10, monthlyFee: 99,
      googleBusinessUrl: "https://maps.google.com/demotowing",
    }).returning();
    console.log("✅ Demo org created");
  } else {
    org = existingOrg[0];
    console.log("ℹ️  Demo org exists");
  }

  // ========== USERS / DRIVERS ==========
  const existingOwner = await db.select().from(users).where(eq(users.email, "owner@demotowing.com")).limit(1);
  let owner;
  if (existingOwner.length === 0) {
    const hash = await hashPassword("demo123");
    [owner] = await db.insert(users).values({ orgId: org.id, email: "owner@demotowing.com", passwordHash: hash, firstName: "John", lastName: "Smith", role: "owner", phone: "+1-555-100-0001" }).returning();

    // Drivers
    const driverHash = await hashPassword("driver123");
    const drivers = [
      { email: "carlos@demotowing.com", firstName: "Carlos", lastName: "Rodriguez", phone: "+1-555-200-0001" },
      { email: "james@demotowing.com", firstName: "James", lastName: "Thompson", phone: "+1-555-200-0002" },
      { email: "mike@demotowing.com", firstName: "Mike", lastName: "Williams", phone: "+1-555-200-0003" },
      { email: "sarah@demotowing.com", firstName: "Sarah", lastName: "Chen", phone: "+1-555-200-0004" },
      { email: "david@demotowing.com", firstName: "David", lastName: "Park", phone: "+1-555-200-0005" },
    ];
    const driverRecords = [];
    for (const d of drivers) {
      const [rec] = await db.insert(users).values({ orgId: org.id, ...d, passwordHash: driverHash, role: "driver" }).returning();
      driverRecords.push(rec);
    }

    // Dispatcher
    await db.insert(users).values({ orgId: org.id, email: "dispatch@demotowing.com", passwordHash: driverHash, firstName: "Maria", lastName: "Garcia", role: "dispatcher", phone: "+1-555-300-0001" });

    // Admin
    await db.insert(users).values({ orgId: org.id, email: "admin@demotowing.com", passwordHash: driverHash, firstName: "Alex", lastName: "Johnson", role: "admin", phone: "+1-555-400-0001" });

    console.log(`✅ ${drivers.length} drivers + dispatcher + admin created`);

    // ========== VEHICLES ==========
    const vehicleData = [
      { name: "Truck #1 — Big Rig", type: "heavy_duty" as const, make: "Peterbilt", model: "389", year: 2022, licensePlate: "CA-TOW-001", color: "Red", capacityLbs: 40000, mileage: 45230 },
      { name: "Truck #2 — Flatbed", type: "flatbed" as const, make: "Ford", model: "F-550", year: 2023, licensePlate: "CA-TOW-002", color: "White", capacityLbs: 19500, mileage: 28100 },
      { name: "Truck #3 — Wheel Lift", type: "wheel_lift" as const, make: "Chevrolet", model: "Silverado 3500", year: 2021, licensePlate: "CA-TOW-003", color: "Black", capacityLbs: 14000, mileage: 62400 },
      { name: "Truck #4 — Medium", type: "medium_duty" as const, make: "International", model: "CV", year: 2022, licensePlate: "CA-TOW-004", color: "Blue", capacityLbs: 26000, mileage: 38900 },
      { name: "Truck #5 — Quick Response", type: "flatbed" as const, make: "RAM", model: "3500", year: 2024, licensePlate: "CA-TOW-005", color: "Silver", capacityLbs: 16000, mileage: 12300 },
    ];
    const vehicleRecords = [];
    for (let i = 0; i < vehicleData.length; i++) {
      const [v] = await db.insert(vehicles).values({ orgId: org.id, ...vehicleData[i], assignedDriverId: driverRecords[i]?.id, isActive: true }).returning();
      vehicleRecords.push(v);
    }
    console.log(`✅ ${vehicleData.length} vehicles created`);

    // ========== CUSTOMERS ==========
    const customerData = [
      { name: "Robert Martinez", phone: "+1-310-555-0101", email: "rmartinez@email.com", company: "Martinez Auto Sales", city: "Los Angeles", state: "CA", totalJobs: 12, totalSpent: 2840, isVip: true },
      { name: "Linda Johnson", phone: "+1-310-555-0102", email: "ljohnson@email.com", city: "Santa Monica", state: "CA", totalJobs: 3, totalSpent: 520 },
      { name: "ABC Insurance Co", phone: "+1-310-555-0103", email: "claims@abcinsurance.com", company: "ABC Insurance", city: "Beverly Hills", state: "CA", totalJobs: 28, totalSpent: 8400, isVip: true },
      { name: "Copart Los Angeles", phone: "+1-310-555-0104", email: "dispatch@copart.com", company: "Copart Inc", city: "Rancho Cucamonga", state: "CA", totalJobs: 45, totalSpent: 15200, isVip: true },
      { name: "Mike's Auto Body", phone: "+1-310-555-0105", email: "mike@autobody.com", company: "Mike's Auto Body Shop", city: "Inglewood", state: "CA", totalJobs: 8, totalSpent: 1680 },
      { name: "Jennifer Lee", phone: "+1-310-555-0106", email: "jlee@email.com", city: "Pasadena", state: "CA", totalJobs: 1, totalSpent: 185 },
      { name: "GEICO Insurance", phone: "+1-800-555-0107", email: "towdispatch@geico.com", company: "GEICO", city: "Washington", state: "DC", totalJobs: 15, totalSpent: 4200 },
      { name: "Tony's Tires", phone: "+1-310-555-0108", email: "tony@tonystires.com", company: "Tony's Tire Shop", city: "Compton", state: "CA", totalJobs: 5, totalSpent: 950 },
      { name: "IAA Van Nuys", phone: "+1-818-555-0109", email: "transport@iaai.com", company: "Insurance Auto Auctions", city: "Van Nuys", state: "CA", totalJobs: 32, totalSpent: 11200, isVip: true },
      { name: "Sandra Wilson", phone: "+1-310-555-0110", email: "swilson@email.com", city: "Long Beach", state: "CA", totalJobs: 2, totalSpent: 370 },
    ];
    const customerRecords = [];
    for (const c of customerData) {
      const [rec] = await db.insert(customers).values({ orgId: org.id, ...c }).returning();
      customerRecords.push(rec);
    }
    console.log(`✅ ${customerData.length} customers created`);

    // ========== JOBS ==========
    const statuses = ["pending", "assigned", "en_route", "on_scene", "towing", "completed", "completed", "completed", "completed", "completed"] as const;
    const sources = ["phone", "yelp", "google", "thumbtack", "ai_dispatcher", "website", "manual"] as const;
    const pickupAddresses = [
      "1234 Wilshire Blvd, Los Angeles, CA", "5678 Sunset Blvd, Hollywood, CA", "9012 Santa Monica Blvd, West Hollywood, CA",
      "3456 Venice Blvd, Venice, CA", "7890 Sepulveda Blvd, Culver City, CA", "2345 Pico Blvd, Santa Monica, CA",
      "6789 Florence Ave, Downey, CA", "1357 Pacific Coast Hwy, Long Beach, CA", "2468 Crenshaw Blvd, Los Angeles, CA",
      "8021 Van Nuys Blvd, Van Nuys, CA", "4680 Imperial Hwy, Inglewood, CA", "1590 Colorado Blvd, Pasadena, CA",
      "3571 Slauson Ave, Vernon, CA", "7410 Rosecrans Ave, Paramount, CA", "9630 Lakewood Blvd, Downey, CA",
    ];
    const destAddresses = [
      "4567 Melrose Ave, Los Angeles, CA", "8901 Beverly Blvd, West Hollywood, CA", "2345 La Brea Ave, Los Angeles, CA",
      "6789 Robertson Blvd, Los Angeles, CA", "1234 Fairfax Ave, Los Angeles, CA", null, null, null,
    ];
    const vehicleMakes = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Nissan", "Hyundai", "Kia", "RAM"];
    const vehicleModels = ["Camry", "Civic", "F-150", "Silverado", "3 Series", "C-Class", "Altima", "Tucson", "Sportage", "1500"];

    const jobRecords = [];
    for (let i = 0; i < 30; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const created = new Date(Date.now() - daysAgo * 86400000);
      const status = statuses[i % statuses.length];
      const customer = customerRecords[i % customerRecords.length];
      const baseRate = 75 + Math.floor(Math.random() * 100);
      const miles = 5 + Math.floor(Math.random() * 40);
      const mileageRate = 3 + Math.random() * 2;
      const total = baseRate + miles * mileageRate;

      const [job] = await db.insert(jobs).values({
        orgId: org.id, status: status as "pending" | "assigned" | "en_route" | "on_scene" | "towing" | "completed" | "cancelled", source: sources[i % sources.length] as "phone" | "yelp" | "google" | "thumbtack" | "ai_dispatcher" | "website" | "manual",
        customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
        pickupAddress: pickupAddresses[i % pickupAddresses.length],
        destinationAddress: destAddresses[i % destAddresses.length] || undefined,
        towVehicleMake: vehicleMakes[i % vehicleMakes.length],
        towVehicleModel: vehicleModels[i % vehicleModels.length],
        towVehicleYear: 2015 + Math.floor(Math.random() * 10),
        towVehicleColor: ["White", "Black", "Silver", "Red", "Blue"][i % 5],
        towVehiclePlate: `CA-${1000 + i}${String.fromCharCode(65 + (i % 26))}`,
        estimatedMiles: miles, baseRate, mileageRate: Math.round(mileageRate * 100) / 100,
        totalAmount: Math.round(total * 100) / 100,
        isPaid: status === "completed" ? Math.random() > 0.3 : false,
        assignedDriverId: status !== "pending" ? driverRecords[i % driverRecords.length]?.id : undefined,
        assignedVehicleId: status !== "pending" ? vehicleRecords[i % vehicleRecords.length]?.id : undefined,

        completedAt: status === "completed" ? new Date(created.getTime() + 3600000 * (1 + Math.random() * 3)) : undefined,
        notes: i % 3 === 0 ? "Customer requested flatbed" : i % 5 === 0 ? "Vehicle is in parking garage, level B2" : undefined,
      }).returning();
      jobRecords.push(job);
    }
    console.log(`✅ 30 jobs created`);

    // ========== INVOICES ==========
    const completedJobs = jobRecords.filter(j => j.status === "completed");
    let invNum = 1;
    for (const job of completedJobs.slice(0, 15)) {
      const subtotal = job.totalAmount || 150;
      const tax = Math.round(subtotal * 0.0875 * 100) / 100;
      const total = subtotal + tax;
      await db.insert(invoices).values({
        orgId: org.id, jobId: job.id, invoiceNumber: `INV-202607${String(invNum).padStart(4, "0")}`,
        status: Math.random() > 0.3 ? "paid" : "sent", subtotal, tax, total,
        paidAmount: Math.random() > 0.3 ? total : 0,
        dueDate: new Date(Date.now() + 30 * 86400000),

      });
      invNum++;
    }
    console.log(`✅ ${Math.min(completedJobs.length, 15)} invoices created`);

    // ========== LEADS ==========
    const leadData = [
      { source: "yelp", customerName: "New Customer Yelp", customerPhone: "+1-310-555-9001", message: "Need a tow from LAX area, car won't start", status: "new" as const, estimatedValue: 185 },
      { source: "google", customerName: "Google Lead", customerPhone: "+1-310-555-9002", message: "Flat tire on 405 freeway, need assistance", status: "contacted" as const, estimatedValue: 120 },
      { source: "thumbtack", customerName: "Thumbtack User", customerPhone: "+1-310-555-9003", message: "Need motorcycle transported from Torrance to Long Beach", status: "new" as const, estimatedValue: 250 },
      { source: "website", customerName: "Website Visitor", customerEmail: "visitor@email.com", message: "Looking for heavy duty tow for RV", status: "quoted" as const, estimatedValue: 450 },
      { source: "phone", customerName: "Phone Caller", customerPhone: "+1-310-555-9005", message: "Accident on PCH, need immediate tow", status: "new" as const, estimatedValue: 320 },
    ];
    for (const l of leadData) {
      await db.insert(leads).values({ orgId: org.id, ...l });
    }
    console.log(`✅ ${leadData.length} leads created`);

    // ========== EXPENSES ==========
    const expenseData = [
      { category: "fuel" as const, amount: 487.50, description: "Diesel fill-up — Trucks #1, #4", date: new Date(Date.now() - 1 * 86400000) },
      { category: "fuel" as const, amount: 312.25, description: "Gas — Trucks #2, #3, #5", date: new Date(Date.now() - 3 * 86400000) },
      { category: "maintenance" as const, amount: 850.00, description: "Oil change + tire rotation — all trucks", date: new Date(Date.now() - 5 * 86400000) },
      { category: "maintenance" as const, amount: 1200.00, description: "Brake pads replacement — Truck #1", date: new Date(Date.now() - 10 * 86400000) },
      { category: "insurance" as const, amount: 2400.00, description: "Monthly fleet insurance premium", date: new Date(Date.now() - 15 * 86400000) },
      { category: "tolls" as const, amount: 87.50, description: "LA Metro tolls — July", date: new Date(Date.now() - 2 * 86400000) },
      { category: "supplies" as const, amount: 234.00, description: "Tow straps, chains, safety cones", date: new Date(Date.now() - 7 * 86400000) },
      { category: "fuel" as const, amount: 520.75, description: "Diesel fill-up — all trucks", date: new Date(Date.now() - 8 * 86400000) },
    ];
    for (const e of expenseData) {
      await db.insert(expenses).values({ orgId: org.id, ...e });
    }
    console.log(`✅ ${expenseData.length} expenses created`);

    // ========== SHIFTS ==========
    for (const driver of driverRecords.slice(0, 3)) {
      for (let d = 0; d < 5; d++) {
        const start = new Date(Date.now() - d * 86400000);
        start.setHours(6 + Math.floor(Math.random() * 3), 0, 0, 0);
        const end = new Date(start);
        end.setHours(start.getHours() + 8 + Math.floor(Math.random() * 4));
        await db.insert(shifts).values({
          orgId: org.id, driverId: driver.id, vehicleId: vehicleRecords[driverRecords.indexOf(driver)]?.id,
          startedAt: start, endedAt: end,
          startMileage: 10000 + d * 50 + Math.floor(Math.random() * 100),
          endMileage: 10000 + d * 50 + 80 + Math.floor(Math.random() * 100),
          totalEarnings: 200 + Math.floor(Math.random() * 400),
          totalJobs: 2 + Math.floor(Math.random() * 5),
        });
      }
    }
    console.log("✅ Shifts created");

    console.log("\n🎉 Demo data seed complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Login credentials:");
    console.log("  Super Admin: admin@towhub.io / admin123");
    console.log("  Owner:       owner@demotowing.com / demo123");
    console.log("  Driver:      carlos@demotowing.com / driver123");
    console.log("  Dispatcher:  dispatch@demotowing.com / driver123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Data created:");
    console.log("  1 organization, 8 users (1 owner + 5 drivers + 1 dispatcher + 1 admin)");
    console.log("  5 vehicles, 10 customers, 30 jobs, 15 invoices");
    console.log("  5 leads, 8 expenses, 15 shifts");
  } else {
    console.log("ℹ️  Demo org exists — skipping seed");
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
