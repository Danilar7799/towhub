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

// ========== CUSTOMERS (CRM) ==========
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  company: text("company"),
  notes: text("notes"),
  totalJobs: integer("total_jobs").default(0),
  totalSpent: real("total_spent").default(0),
  isVip: boolean("is_vip").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== INVOICES ==========
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id),
  customerId: uuid("customer_id").references(() => customers.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").default(0),
  discount: real("discount").default(0),
  total: real("total").notNull(),
  paidAmount: real("paid_amount").default(0),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== RATE SHEETS ==========
export const rateSheets = pgTable("rate_sheets", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  rates: jsonb("rates").default([]), // [{service: "light_duty", base: 75, perMile: 3.50, minCharge: 50}]
  afterHoursMultiplier: real("after_hours_multiplier").default(1.5),
  weekendMultiplier: real("weekend_multiplier").default(1.25),
  holidayMultiplier: real("holiday_multiplier").default(2.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== JOB PHOTOS ==========
export const jobPhotos = pgTable("job_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  type: text("type").default("general"), // general, damage, pickup, dropoff, odometer, signature
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== IMPOUND LOT ==========
export const impoundVehicles = pgTable("impound_vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleYear: integer("vehicle_year"),
  vehicleColor: text("vehicle_color"),
  vehiclePlate: text("vehicle_plate"),
  vehicleVin: text("vehicle_vin"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  lotLocation: text("lot_location"),
  lotSpot: text("lot_spot"),
  dailyRate: real("daily_rate").default(25),
  status: text("status").default("stored"), // stored, released, auctioned, disposed
  storedAt: timestamp("stored_at").defaultNow().notNull(),
  releasedAt: timestamp("released_at"),
  releaseAuth: text("release_auth"),
  totalCharges: real("total_charges").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== NEW RELATIONS ==========
export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, { fields: [customers.orgId], references: [organizations.id] }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  job: one(jobs, { fields: [invoices.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
}));

export const jobPhotosRelations = relations(jobPhotos, ({ one }) => ({
  job: one(jobs, { fields: [jobPhotos.jobId], references: [jobs.id] }),
  organization: one(organizations, { fields: [jobPhotos.orgId], references: [organizations.id] }),
}));

export const impoundVehiclesRelations = relations(impoundVehicles, ({ one }) => ({
  organization: one(organizations, { fields: [impoundVehicles.orgId], references: [organizations.id] }),
  job: one(jobs, { fields: [impoundVehicles.jobId], references: [jobs.id] }),
}));

// ========== DRIVER SCHEDULES & RATES ==========
export const driverSchedules = pgTable("driver_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  driverId: uuid("driver_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 6=Sat
  startTime: text("start_time").notNull(), // "08:00"
  endTime: text("end_time").notNull(), // "18:00"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const driverRates = pgTable("driver_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  driverId: uuid("driver_id").references(() => users.id).notNull(),
  rateType: text("rate_type").notNull(), // hourly, per_job, commission
  dayRate: real("day_rate").default(0), // $/hr or % during day
  nightRate: real("night_rate").default(0), // $/hr or % during night
  nightStart: text("night_start").default("18:00"),
  nightEnd: text("night_end").default("06:00"),
  weekendRate: real("weekend_rate").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== SUBCONTRACTORS ==========
export const subcontractors = pgTable("subcontractors", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  mcNumber: text("mc_number"), // Motor carrier number
  dotNumber: text("dot_number"),
  insuranceExpiry: timestamp("insurance_expiry"),
  ratePerMile: real("rate_per_mile"),
  flatRate: real("flat_rate"),
  commission: real("commission"), // % they take
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subcontractorDrivers = pgTable("subcontractor_drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  licenseNumber: text("license_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subcontractorVehicles = pgTable("subcontractor_vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  licensePlate: text("license_plate"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== CONTRACTS (B2B / B2C) ==========
export const contractTypeEnum = pgEnum("contract_type", ["b2b", "b2c"]);
export const contractStatusEnum = pgEnum("contract_status", ["active", "expired", "terminated", "pending"]);

export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id),
  contractType: contractTypeEnum("contract_type").notNull(),
  status: contractStatusEnum("status").default("active").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  terms: text("terms"), // contract terms summary
  ratePerMile: real("rate_per_mile"),
  flatRate: real("flat_rate"),
  monthlyRetainer: real("monthly_retainer"),
  commission: real("commission"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  renewalDate: timestamp("renewal_date"),
  notifyDaysBefore: integer("notify_days_before").default(30),
  isAutoRenew: boolean("is_auto_renew").default(false),
  documentUrl: text("document_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== IMPOUND POLICE REPORTS ==========
export const policeReports = pgTable("police_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  impoundVehicleId: uuid("impound_vehicle_id").references(() => impoundVehicles.id).notNull(),
  reportNumber: text("report_number"),
  department: text("department"), // LAPD, CHP, etc.
  officerName: text("officer_name"),
  officerBadge: text("officer_badge"),
  reasonForTow: text("reason_for_tow"), // accident, illegal_parking, abandoned, etc.
  accidentReportNumber: text("accident_report_number"),
  towReleaseNumber: text("tow_release_number"),
  formFields: jsonb("form_fields").default({}), // pre-filled form data
  status: text("status").default("draft"), // draft, sent, acknowledged
  sentAt: timestamp("sent_at"),
  sentMethod: text("sent_method"), // email, fax, portal
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== AUCTION LISTINGS ==========
export const auctionListings = pgTable("auction_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  auctionDate: timestamp("auction_date"),
  location: text("location"),
  status: text("status").default("draft"), // draft, published, completed, cancelled
  vehicleIds: jsonb("vehicle_ids").default([]), // array of impound_vehicle IDs
  announcementUrl: text("announcement_url"), // generated PDF
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== NEW RELATIONS ==========
export const driverSchedulesRelations = relations(driverSchedules, ({ one }) => ({
  organization: one(organizations, { fields: [driverSchedules.orgId], references: [organizations.id] }),
  driver: one(users, { fields: [driverSchedules.driverId], references: [users.id] }),
}));

export const driverRatesRelations = relations(driverRates, ({ one }) => ({
  organization: one(organizations, { fields: [driverRates.orgId], references: [organizations.id] }),
  driver: one(users, { fields: [driverRates.driverId], references: [users.id] }),
}));

export const subcontractorsRelations = relations(subcontractors, ({ one, many }) => ({
  organization: one(organizations, { fields: [subcontractors.orgId], references: [organizations.id] }),
  drivers: many(subcontractorDrivers),
  vehicles: many(subcontractorVehicles),
  contracts: many(contracts),
}));

export const subcontractorDriversRelations = relations(subcontractorDrivers, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [subcontractorDrivers.subcontractorId], references: [subcontractors.id] }),
}));

export const subcontractorVehiclesRelations = relations(subcontractorVehicles, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [subcontractorVehicles.subcontractorId], references: [subcontractors.id] }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  organization: one(organizations, { fields: [contracts.orgId], references: [organizations.id] }),
  customer: one(customers, { fields: [contracts.customerId], references: [customers.id] }),
  subcontractor: one(subcontractors, { fields: [contracts.subcontractorId], references: [subcontractors.id] }),
}));

export const policeReportsRelations = relations(policeReports, ({ one }) => ({
  organization: one(organizations, { fields: [policeReports.orgId], references: [organizations.id] }),
  impoundVehicle: one(impoundVehicles, { fields: [policeReports.impoundVehicleId], references: [impoundVehicles.id] }),
}));

export const auctionListingsRelations = relations(auctionListings, ({ one }) => ({
  organization: one(organizations, { fields: [auctionListings.orgId], references: [organizations.id] }),
}));

// ========== MESSAGES (In-app chat with auto-translation) ==========
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: text("conversation_id").notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id),
  text: text("text").notNull(),
  translatedText: text("translated_text"),
  detectedLanguage: text("detected_language"),
  targetLanguage: text("target_language"),
  isTranslated: boolean("is_translated").default(false),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id] }),
  job: one(jobs, { fields: [messages.jobId], references: [jobs.id] }),
}));

// ========== CUSTOMER RATINGS ==========
export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  driverId: uuid("driver_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ratingsRelations = relations(ratings, ({ one }) => ({
  organization: one(organizations, { fields: [ratings.orgId], references: [organizations.id] }),
  job: one(jobs, { fields: [ratings.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [ratings.customerId], references: [customers.id] }),
  driver: one(users, { fields: [ratings.driverId], references: [users.id] }),
}));

// ========== NOTIFICATIONS ==========
export const notificationTypeEnum = pgEnum("notification_type", ["lead", "job", "payment", "system"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  orgId: uuid("org_id").references(() => organizations.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  organization: one(organizations, { fields: [notifications.orgId], references: [organizations.id] }),
}));

// ========== AD BANNERS ==========
export const adPlacementEnum = pgEnum("ad_placement", ["top_banner", "sidebar", "inline", "modal", "footer"]);
export const adStatusEnum = pgEnum("ad_status", ["active", "paused", "scheduled", "ended"]);

export const adBanners = pgTable("ad_banners", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  placement: adPlacementEnum("placement").notNull(),
  status: adStatusEnum("status").default("active").notNull(),
  // Content
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  ctaText: text("cta_text"), // Call to action button text
  ctaLink: text("cta_link"), // Where CTA leads
  // Visual
  imageUrl: text("image_url"), // Banner image URL
  gifUrl: text("gif_url"), // Animated GIF URL
  bgColor: text("bg_color").default("#533afd"),
  textColor: text("text_color").default("#ffffff"),
  useGradient: boolean("use_gradient").default(false),
  gradientFrom: text("gradient_from").default("#533afd"),
  gradientTo: text("gradient_to").default("#f96bee"),
  // Animation
  animation: text("animation").default("none"), // none, slide-in, fade, pulse, bounce, shimmer
  animationDuration: integer("animation_duration").default(3000), // ms
  // Targeting
  targetRoles: text("target_roles").array().default(["owner", "admin", "dispatcher"]),
  targetPlans: text("targetPlans").array().default([]),
  excludeRoles: text("exclude_roles").array().default(["driver"]),
  // Schedule
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  // Stats
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  // Meta
  priority: integer("priority").default(1),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
