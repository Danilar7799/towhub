import { pgTable, text, timestamp, uuid, integer, real, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========== ENUMS ==========
export const orgStatusEnum = pgEnum("org_status", ["pending", "approved", "suspended", "rejected"]);
export const userRoleEnum = pgEnum("user_role", ["super_admin", "owner", "admin", "dispatcher", "driver"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "assigned", "en_route", "on_scene", "towing", "completed", "cancelled"]);
export const jobSourceEnum = pgEnum("job_source", ["manual", "phone", "yelp", "thumbtack", "google", "ai_dispatcher", "app"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "quoted", "accepted", "declined", "expired"]);
export const vehicleTypeEnum = pgEnum("vehicle_type", ["flatbed", "wheel_lift", "heavy_duty", "medium_duty", "motorcycle", "other"]);
export const expenseCategoryEnum = pgEnum("expense_category", ["fuel", "maintenance", "insurance", "tolls", "supplies", "other"]);

// ========== ORGANIZATIONS (Towing Companies) ==========
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  website: text("website"),
  googleBusinessUrl: text("google_business_url"),
  status: orgStatusEnum("status").default("pending").notNull(),
  commissionPercent: real("commission_percent").default(15),
  monthlyFee: real("monthly_fee").default(0),
  blandApiKey: text("bland_api_key"),
  blandPhoneNumber: text("bland_phone_number"),
  twilioPhoneNumber: text("twilio_phone_number"),
  apiKey: text("api_key").unique(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== USERS ==========
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").default("driver").notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== VEHICLES (Fleet) ==========
export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: vehicleTypeEnum("type").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  vin: text("vin"),
  licensePlate: text("license_plate"),
  color: text("color"),
  capacityLbs: integer("capacity_lbs"),
  mileage: integer("mileage").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  assignedDriverId: uuid("assigned_driver_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== JOBS (Tow Requests / Orders) ==========
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  assignedDriverId: uuid("assigned_driver_id").references(() => users.id),
  assignedVehicleId: uuid("assigned_vehicle_id").references(() => vehicles.id),
  status: jobStatusEnum("status").default("pending").notNull(),
  source: jobSourceEnum("source").default("manual").notNull(),
  // Customer info
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  // Pickup
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: real("pickup_lat"),
  pickupLng: real("pickup_lng"),
  // Destination
  destinationAddress: text("destination_address"),
  destinationLat: real("destination_lat"),
  destinationLng: real("destination_lng"),
  // Vehicle being towed
  towVehicleMake: text("tow_vehicle_make"),
  towVehicleModel: text("tow_vehicle_model"),
  towVehicleYear: integer("tow_vehicle_year"),
  towVehicleColor: text("tow_vehicle_color"),
  towVehiclePlate: text("tow_vehicle_plate"),
  // Pricing
  estimatedMiles: real("estimated_miles"),
  actualMiles: real("actual_miles"),
  baseRate: real("base_rate"),
  mileageRate: real("mileage_rate"),
  additionalFees: jsonb("additional_fees").default([]),
  totalAmount: real("total_amount"),
  paymentMethod: text("payment_method"),
  isPaid: boolean("is_paid").default(false),
  // Notes
  notes: text("notes"),
  dispatcherNotes: text("dispatcher_notes"),
  // Timestamps
  assignedAt: timestamp("assigned_at"),
  enRouteAt: timestamp("en_route_at"),
  onSceneAt: timestamp("on_scene_at"),
  towingAt: timestamp("towing_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  estimatedArrival: timestamp("estimated_arrival"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== GPS TRACKING (Driver Location History) ==========
export const gpsLocations = pgTable("gps_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  accuracy: real("accuracy"),
  batteryLevel: integer("battery_level"),
  isOnline: boolean("is_online").default(true),
  activeJobId: uuid("active_job_id").references(() => jobs.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ========== LEADS (from Yelp, Thumbtack, Google, etc.) ==========
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  source: text("source").notNull(),
  externalId: text("external_id"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  message: text("message"),
  pickupAddress: text("pickup_address"),
  destinationAddress: text("destination_address"),
  estimatedValue: real("estimated_value"),
  status: leadStatusEnum("status").default("new").notNull(),
  convertedJobId: uuid("converted_job_id").references(() => jobs.id),
  notes: text("notes"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== EXPENSES ==========
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  driverId: uuid("driver_id").references(() => users.id),
  jobId: uuid("job_id").references(() => jobs.id),
  category: expenseCategoryEnum("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== DRIVER SHIFTS (Time Tracking) ==========
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  driverId: uuid("driver_id").references(() => users.id).notNull(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  startMileage: integer("start_mileage"),
  endMileage: integer("end_mileage"),
  totalEarnings: real("total_earnings").default(0),
  totalJobs: integer("total_jobs").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== WAITLIST (Companies wanting to join) ==========
export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  fleetSize: integer("fleet_size"),
  yearsInBusiness: integer("years_in_business"),
  servicesOffered: text("services_offered").array(),
  monthlyTowVolume: integer("monthly_tow_volume"),
  website: text("website"),
  googleBusinessUrl: text("google_business_url"),
  message: text("message"),
  isApproved: boolean("is_approved").default(false),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== RELATIONS ==========
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  jobs: many(jobs),
  leads: many(leads),
  expenses: many(expenses),
  shifts: many(shifts),
  gpsLocations: many(gpsLocations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  assignedVehicles: many(vehicles),
  assignedJobs: many(jobs),
  gpsLocations: many(gpsLocations),
  shifts: many(shifts),
  expenses: many(expenses),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  organization: one(organizations, { fields: [vehicles.orgId], references: [organizations.id] }),
  assignedDriver: one(users, { fields: [vehicles.assignedDriverId], references: [users.id] }),
  jobs: many(jobs),
  expenses: many(expenses),
  shifts: many(shifts),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobs.orgId], references: [organizations.id] }),
  assignedDriver: one(users, { fields: [jobs.assignedDriverId], references: [users.id] }),
  assignedVehicle: one(vehicles, { fields: [jobs.assignedVehicleId], references: [vehicles.id] }),
  gpsLocations: many(gpsLocations),
  expenses: many(expenses),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  organization: one(organizations, { fields: [leads.orgId], references: [organizations.id] }),
  convertedJob: one(jobs, { fields: [leads.convertedJobId], references: [jobs.id] }),
}));

export const gpsLocationsRelations = relations(gpsLocations, ({ one }) => ({
  user: one(users, { fields: [gpsLocations.userId], references: [users.id] }),
  organization: one(organizations, { fields: [gpsLocations.orgId], references: [organizations.id] }),
  activeJob: one(jobs, { fields: [gpsLocations.activeJobId], references: [jobs.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  organization: one(organizations, { fields: [expenses.orgId], references: [organizations.id] }),
  vehicle: one(vehicles, { fields: [expenses.vehicleId], references: [vehicles.id] }),
  driver: one(users, { fields: [expenses.driverId], references: [users.id] }),
  job: one(jobs, { fields: [expenses.jobId], references: [jobs.id] }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  organization: one(organizations, { fields: [shifts.orgId], references: [organizations.id] }),
  driver: one(users, { fields: [shifts.driverId], references: [users.id] }),
  vehicle: one(vehicles, { fields: [shifts.vehicleId], references: [vehicles.id] }),
}));
