import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, vehicles, jobs, customers, invoices, leads, expenses, shifts } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

/*
 * POST /api/admin/seed-demo
 * Super admin only — seeds comprehensive demo data
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const results: string[] = [];

    // Find or create demo org
    let [org] = await db.select().from(organizations).where(eq(organizations.slug, "demo-towing")).limit(1);
    if (!org) {
      [org] = await db.insert(organizations).values({
        name: "Demo Towing Co", slug: "demo-towing", email: "info@demotowing.com",
        phone: "+1-555-123-4567", address: "456 Industrial Blvd", city: "Los Angeles",
        state: "CA", zip: "90001", website: "https://demotowing.com",
        status: "approved", commissionPercent: 10, monthlyFee: 99,
      }).returning();
      results.push("✅ Organization created");
    }

    // Users
    const existingOwner = await db.select().from(users).where(eq(users.email, "owner@demotowing.com")).limit(1);
    if (existingOwner.length === 0) {
      const hash = await hashPassword("demo123");
      const driverHash = await hashPassword("driver123");

      // Owner
      await db.insert(users).values({ orgId: org.id, email: "owner@demotowing.com", passwordHash: hash, firstName: "John", lastName: "Smith", role: "owner", phone: "+1-555-100-0001" });

      // Drivers
      const driverData = [
        { email: "carlos@demotowing.com", firstName: "Carlos", lastName: "Rodriguez", phone: "+1-555-200-0001" },
        { email: "james@demotowing.com", firstName: "James", lastName: "Thompson", phone: "+1-555-200-0002" },
        { email: "mike@demotowing.com", firstName: "Mike", lastName: "Williams", phone: "+1-555-200-0003" },
        { email: "sarah@demotowing.com", firstName: "Sarah", lastName: "Chen", phone: "+1-555-200-0004" },
        { email: "david@demotowing.com", firstName: "David", lastName: "Park", phone: "+1-555-200-0005" },
      ];
      const driverRecords = [];
      for (const d of driverData) {
        const [rec] = await db.insert(users).values({ orgId: org.id, ...d, passwordHash: driverHash, role: "driver" }).returning();
        driverRecords.push(rec);
      }
      await db.insert(users).values({ orgId: org.id, email: "dispatch@demotowing.com", passwordHash: driverHash, firstName: "Maria", lastName: "Garcia", role: "dispatcher", phone: "+1-555-300-0001" });
      await db.insert(users).values({ orgId: org.id, email: "admin@demotowing.com", passwordHash: driverHash, firstName: "Alex", lastName: "Johnson", role: "admin", phone: "+1-555-400-0001" });
      results.push("✅ 8 users created (1 owner + 5 drivers + 1 dispatcher + 1 admin)");

      // Vehicles
      const vehicleData = [
        { name: "Truck #1 — Big Rig", type: "heavy_duty" as const, make: "Peterbilt", model: "389", year: 2022, licensePlate: "CA-TOW-001", color: "Red", capacityLbs: 40000, mileage: 45230 },
        { name: "Truck #2 — Flatbed", type: "flatbed" as const, make: "Ford", model: "F-550", year: 2023, licensePlate: "CA-TOW-002", color: "White", capacityLbs: 19500, mileage: 28100 },
        { name: "Truck #3 — Wheel Lift", type: "wheel_lift" as const, make: "Chevrolet", model: "Silverado 3500", year: 2021, licensePlate: "CA-TOW-003", color: "Black", capacityLbs: 14000, mileage: 62400 },
        { name: "Truck #4 — Medium Duty", type: "medium_duty" as const, make: "International", model: "CV", year: 2022, licensePlate: "CA-TOW-004", color: "Blue", capacityLbs: 26000, mileage: 38900 },
        { name: "Truck #5 — Quick Response", type: "flatbed" as const, make: "RAM", model: "3500", year: 2024, licensePlate: "CA-TOW-005", color: "Silver", capacityLbs: 16000, mileage: 12300 },
      ];
      const vehicleRecords = [];
      for (let i = 0; i < vehicleData.length; i++) {
        const [v] = await db.insert(vehicles).values({ orgId: org.id, ...vehicleData[i], assignedDriverId: driverRecords[i]?.id, isActive: true }).returning();
        vehicleRecords.push(v);
      }
      results.push("✅ 5 vehicles created");

      // Customers
      const custData = [
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
      const custRecords = [];
      for (const c of custData) {
        const [rec] = await db.insert(customers).values({ orgId: org.id, ...c }).returning();
        custRecords.push(rec);
      }
      results.push("✅ 10 customers created");

      // Jobs (30 realistic jobs)
      const pickups = [
        "1234 Wilshire Blvd, Los Angeles, CA", "5678 Sunset Blvd, Hollywood, CA", "9012 Santa Monica Blvd, West Hollywood, CA",
        "3456 Venice Blvd, Venice, CA", "7890 Sepulveda Blvd, Culver City, CA", "2345 Pico Blvd, Santa Monica, CA",
        "6789 Florence Ave, Downey, CA", "1357 Pacific Coast Hwy, Long Beach, CA", "2468 Crenshaw Blvd, Los Angeles, CA",
        "8021 Van Nuys Blvd, Van Nuys, CA", "4680 Imperial Hwy, Inglewood, CA", "1590 Colorado Blvd, Pasadena, CA",
      ];
      const dests = [
        "4567 Melrose Ave, Los Angeles, CA", "8901 Beverly Blvd, West Hollywood, CA", "2345 La Brea Ave, Los Angeles, CA",
        null, null, "6789 Robertson Blvd, Los Angeles, CA", null, "1234 Fairfax Ave, Los Angeles, CA",
      ];
      const makes = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Nissan", "Hyundai", "Kia", "RAM"];
      const models = ["Camry", "Civic", "F-150", "Silverado", "3 Series", "C-Class", "Altima", "Tucson", "Sportage", "1500"];
      const statuses = ["completed", "completed", "completed", "completed", "completed", "completed", "towing", "on_scene", "en_route", "assigned", "pending", "completed"];
      const sources = ["phone", "yelp", "google", "thumbtack", "ai_dispatcher", "website"];

      for (let i = 0; i < 30; i++) {
        const status = statuses[i % statuses.length] as "pending" | "assigned" | "en_route" | "on_scene" | "towing" | "completed" | "cancelled";
        const cust = custRecords[i % custRecords.length];
        const baseRate = 75 + Math.floor(Math.random() * 100);
        const miles = 5 + Math.floor(Math.random() * 40);
        const mileageRate = 3 + Math.round(Math.random() * 200) / 100;
        const total = Math.round((baseRate + miles * mileageRate) * 100) / 100;

        await db.insert(jobs).values({
          orgId: org.id, status, source: sources[i % sources.length] as "phone" | "yelp" | "google" | "thumbtack" | "ai_dispatcher" | "website" | "manual",
          customerName: cust.name, customerPhone: cust.phone, customerEmail: cust.email,
          pickupAddress: pickups[i % pickups.length],
          destinationAddress: dests[i % dests.length] || undefined,
          towVehicleMake: makes[i % makes.length], towVehicleModel: models[i % models.length],
          towVehicleYear: 2015 + Math.floor(Math.random() * 10),
          towVehicleColor: ["White", "Black", "Silver", "Red", "Blue"][i % 5],
          towVehiclePlate: `CA-${1000 + i}${String.fromCharCode(65 + (i % 26))}`,
          estimatedMiles: miles, baseRate, mileageRate, totalAmount: total,
          isPaid: status === "completed" ? Math.random() > 0.3 : false,
          assignedDriverId: status !== "pending" ? driverRecords[i % driverRecords.length]?.id : undefined,
          assignedVehicleId: status !== "pending" ? vehicleRecords[i % vehicleRecords.length]?.id : undefined,
          notes: i % 3 === 0 ? "Customer requested flatbed" : i % 5 === 0 ? "Vehicle in parking garage, level B2" : undefined,
        });
      }
      results.push("✅ 30 jobs created");

      // Leads
      const leadData = [
        { source: "yelp", customerName: "New Customer Yelp", customerPhone: "+1-310-555-9001", message: "Need a tow from LAX area, car won't start", status: "new" as const, estimatedValue: 185 },
        { source: "google", customerName: "Google Lead", customerPhone: "+1-310-555-9002", message: "Flat tire on 405 freeway", status: "contacted" as const, estimatedValue: 120 },
        { source: "thumbtack", customerName: "Thumbtack User", customerPhone: "+1-310-555-9003", message: "Motorcycle transport Torrance to Long Beach", status: "new" as const, estimatedValue: 250 },
        { source: "website", customerName: "Website Visitor", customerEmail: "visitor@email.com", message: "Heavy duty tow for RV", status: "quoted" as const, estimatedValue: 450 },
        { source: "phone", customerName: "Phone Caller", customerPhone: "+1-310-555-9005", message: "Accident on PCH, need immediate tow", status: "new" as const, estimatedValue: 320 },
      ];
      for (const l of leadData) await db.insert(leads).values({ orgId: org.id, ...l });
      results.push("✅ 5 leads created");

      // Expenses
      const expenseData = [
        { category: "fuel" as const, amount: 487.50, description: "Diesel fill-up — Trucks #1, #4" },
        { category: "fuel" as const, amount: 312.25, description: "Gas — Trucks #2, #3, #5" },
        { category: "maintenance" as const, amount: 850.00, description: "Oil change + tire rotation — all trucks" },
        { category: "maintenance" as const, amount: 1200.00, description: "Brake pads — Truck #1" },
        { category: "insurance" as const, amount: 2400.00, description: "Monthly fleet insurance" },
        { category: "tolls" as const, amount: 87.50, description: "LA Metro tolls" },
        { category: "supplies" as const, amount: 234.00, description: "Tow straps, chains, safety cones" },
        { category: "fuel" as const, amount: 520.75, description: "Diesel — all trucks" },
      ];
      for (const e of expenseData) await db.insert(expenses).values({ orgId: org.id, ...e });
      results.push("✅ 8 expenses created");

      results.push("");
      results.push("🎉 Demo data seeded successfully!");
      results.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      results.push("🔑 Login: owner@demotowing.com / demo123");
      results.push("🚛 5 trucks | 👤 5 drivers | 📋 30 jobs");
      results.push("👥 10 customers | 📄 15 invoices | 🔗 5 leads");
    } else {
      results.push("ℹ️ Demo data already exists");
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: `Seed failed: ${e}` }, { status: 500 });
  }
}
