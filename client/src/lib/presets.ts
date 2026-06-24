export interface PresetColumn {
  table: string;
  field: string;
  alias: string;
  function?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'NONE';
}

export interface PresetJoin {
  type: 'LEFT' | 'INNER';
  relatedTable: string;
  fromColumn: string;
  toColumn: string;
}

export interface PresetFilter {
  table: string;
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string;
}

export interface ReportPreset {
  id: string;
  name: string;
  description: string;
  baseTable: string;
  columns: PresetColumn[];
  joins: PresetJoin[];
  filters: PresetFilter[];
}

export interface PresetCategory {
  label: string;
  presets: ReportPreset[];
}

export const REPORT_PRESETS: Record<string, PresetCategory> = {
  rental: {
    label: "Rental Business Pack",
    presets: [
      {
        id: "rental_bookings_customers",
        name: "Bookings Details & Customers",
        description: "Comprehensive view of booking records joined with customer details and transaction info.",
        baseTable: "bookings",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "userId", toColumn: "id" }
        ],
        columns: [
          { table: "bookings", field: "id", alias: "Booking ID", function: "NONE" },
          { table: "bookings", field: "status", alias: "Status", function: "NONE" },
          { table: "bookings", field: "createdAt", alias: "Booking Date", function: "NONE" },
          { table: "users", field: "fullName", alias: "Customer Name", function: "NONE" },
          { table: "users", field: "email", alias: "Customer Email", function: "NONE" }
        ],
        filters: []
      },
      {
        id: "rental_revenue_completed",
        name: "Completed Bookings Revenue",
        description: "Aggregated transaction values filtered strictly by completed bookings.",
        baseTable: "payments",
        joins: [
          { type: "LEFT", relatedTable: "bookings", fromColumn: "bookingId", toColumn: "id" }
        ],
        columns: [
          { table: "payments", field: "id", alias: "Payment ID", function: "NONE" },
          { table: "payments", field: "amount", alias: "Amount Paid", function: "NONE" },
          { table: "bookings", field: "status", alias: "Booking Status", function: "NONE" }
        ],
        filters: [
          { table: "bookings", field: "status", operator: "equals", value: "CONFIRMED" }
        ]
      },
      {
        id: "rental_bookings_by_location",
        name: "Bookings Count by Property Location",
        description: "Shows aggregate bookings count grouped by property location (city/country/state).",
        baseTable: "bookings",
        joins: [
          { type: "LEFT", relatedTable: "properties", fromColumn: "propertyId", toColumn: "id" }
        ],
        columns: [
          { table: "properties", field: "city", alias: "City Location", function: "NONE" },
          { table: "properties", field: "country", alias: "Country", function: "NONE" },
          { table: "bookings", field: "id", alias: "Total Bookings", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "rental_avg_duration",
        name: "Average Rental Stay Duration",
        description: "Average number of days booked per stay grouped by property category.",
        baseTable: "bookings",
        joins: [
          { type: "LEFT", relatedTable: "properties", fromColumn: "propertyId", toColumn: "id" }
        ],
        columns: [
          { table: "properties", field: "type", alias: "Property Type", function: "NONE" },
          { table: "bookings", field: "durationDays", alias: "Average Stay Days", function: "AVG" }
        ],
        filters: []
      },
      {
        id: "rental_leads_by_geo",
        name: "Guest Inquiries by Geography",
        description: "Total booking inquiries and support queries grouped by guest location (country/state/city).",
        baseTable: "inquiries",
        joins: [],
        columns: [
          { table: "inquiries", field: "country", alias: "Country", function: "NONE" },
          { table: "inquiries", field: "state", alias: "State", function: "NONE" },
          { table: "inquiries", field: "city", alias: "City", function: "NONE" },
          { table: "inquiries", field: "id", alias: "Total Inquiries", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  ecommerce: {
    label: "E-Commerce Business Pack",
    presets: [
      {
        id: "ecommerce_orders_customers",
        name: "Customer Order Profiles",
        description: "Presents customer order records alongside names, email addresses, and total order amounts.",
        baseTable: "orders",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "userId", toColumn: "id" }
        ],
        columns: [
          { table: "orders", field: "id", alias: "Order ID", function: "NONE" },
          { table: "orders", field: "totalMinor", alias: "Total Amount", function: "NONE" },
          { table: "orders", field: "status", alias: "Order Status", function: "NONE" },
          { table: "users", field: "name", alias: "Buyer Name", function: "NONE" },
          { table: "users", field: "email", alias: "Buyer Email", function: "NONE" }
        ],
        filters: []
      },
      {
        id: "ecommerce_pending_dispatch",
        name: "Pending Orders Dispatch",
        description: "List of orders currently awaiting fulfillment or processing.",
        baseTable: "orders",
        joins: [],
        columns: [
          { table: "orders", field: "id", alias: "Order ID", function: "NONE" },
          { table: "orders", field: "totalMinor", alias: "Total Amount", function: "NONE" },
          { table: "orders", field: "status", alias: "Status", function: "NONE" }
        ],
        filters: [
          { table: "orders", field: "status", operator: "equals", value: "PENDING_PAYMENT" }
        ]
      },
      {
        id: "ecommerce_best_sellers",
        name: "Best Selling Products",
        description: "Total quantity sold and revenue generated grouped by product name.",
        baseTable: "order_items",
        joins: [
          { type: "LEFT", relatedTable: "products", fromColumn: "productId", toColumn: "id" }
        ],
        columns: [
          { table: "products", field: "name", alias: "Product Name", function: "NONE" },
          { table: "order_items", field: "quantity", alias: "Total Units Sold", function: "SUM" },
          { table: "order_items", field: "price", alias: "Total Revenue Generated", function: "SUM" }
        ],
        filters: []
      },
      {
        id: "ecommerce_clv",
        name: "Customer Lifetime Value (CLV)",
        description: "Aggregated total spending per customer for completed orders.",
        baseTable: "orders",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "userId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "name", alias: "Customer Name", function: "NONE" },
          { table: "users", field: "email", alias: "Email Address", function: "NONE" },
          { table: "orders", field: "totalMinor", alias: "Lifetime Value (LTV)", function: "SUM" }
        ],
        filters: [
          { table: "orders", field: "status", operator: "equals", value: "COMPLETED" }
        ]
      },
      {
        id: "ecommerce_low_stock",
        name: "Low Stock Inventory Alerts",
        description: "List of products with stock quantity below safety limits.",
        baseTable: "products",
        joins: [],
        columns: [
          { table: "products", field: "id", alias: "Product ID", function: "NONE" },
          { table: "products", field: "name", alias: "Product Name", function: "NONE" },
          { table: "products", field: "stock", alias: "Current Stock", function: "NONE" },
          { table: "products", field: "price", alias: "Unit Price", function: "NONE" }
        ],
        filters: [
          { table: "products", field: "stock", operator: "lessThan", value: "10" }
        ]
      },
      {
        id: "ecommerce_leads_by_geo",
        name: "Support Queries by Customer Location",
        description: "Total customer service contacts and leads grouped by geographic location (country/state/city).",
        baseTable: "contacts",
        joins: [],
        columns: [
          { table: "contacts", field: "country", alias: "Country", function: "NONE" },
          { table: "contacts", field: "state", alias: "State", function: "NONE" },
          { table: "contacts", field: "city", alias: "City", function: "NONE" },
          { table: "contacts", field: "id", alias: "Query Count", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  education: {
    label: "Education Business Pack",
    presets: [
      {
        id: "education_student_enrollments",
        name: "Student Course Enrollments",
        description: "Matches enrolled students with courses and enrollment date.",
        baseTable: "enrollments",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "userId", toColumn: "id" },
          { type: "LEFT", relatedTable: "courses", fromColumn: "courseId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "name", alias: "Student Name", function: "NONE" },
          { table: "courses", field: "title", alias: "Course Title", function: "NONE" },
          { table: "enrollments", field: "enrolledAt", alias: "Enrollment Date", function: "NONE" }
        ],
        filters: []
      },
      {
        id: "education_course_popularity",
        name: "Course Popularity (Enrollments Count)",
        description: "Total count of students enrolled per course.",
        baseTable: "enrollments",
        joins: [
          { type: "LEFT", relatedTable: "courses", fromColumn: "courseId", toColumn: "id" }
        ],
        columns: [
          { table: "courses", field: "title", alias: "Course Title", function: "NONE" },
          { table: "enrollments", field: "id", alias: "Enrolled Students", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "education_average_grades",
        name: "Student Average Grades",
        description: "Aggregated average score/grades achieved by students across classes.",
        baseTable: "grades",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "studentId", toColumn: "id" },
          { type: "LEFT", relatedTable: "courses", fromColumn: "courseId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "name", alias: "Student Name", function: "NONE" },
          { table: "courses", field: "title", alias: "Course Title", function: "NONE" },
          { table: "grades", field: "score", alias: "Average Score", function: "AVG" }
        ],
        filters: []
      },
      {
        id: "education_course_revenue",
        name: "Course Revenue Summary",
        description: "Total revenue generated per course from payments.",
        baseTable: "payments",
        joins: [
          { type: "LEFT", relatedTable: "enrollments", fromColumn: "enrollmentId", toColumn: "id" },
          { type: "LEFT", relatedTable: "courses", fromColumn: "courseId", toColumn: "id" }
        ],
        columns: [
          { table: "courses", field: "title", alias: "Course Title", function: "NONE" },
          { table: "payments", field: "amount", alias: "Total Revenue Generated", function: "SUM" }
        ],
        filters: []
      },
      {
        id: "education_leads_by_geo",
        name: "Student Inquiries by Location",
        description: "Pre-enrollment and course inquiry submissions grouped by student location (country/state/city).",
        baseTable: "inquiries",
        joins: [],
        columns: [
          { table: "inquiries", field: "country", alias: "Country", function: "NONE" },
          { table: "inquiries", field: "state", alias: "State", function: "NONE" },
          { table: "inquiries", field: "city", alias: "City", function: "NONE" },
          { table: "inquiries", field: "id", alias: "Inquiry Count", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  crm: {
    label: "CRM & Sales Business Pack",
    presets: [
      {
        id: "crm_deals_value_stage",
        name: "Total Deals Value by Stage",
        description: "Summarizes the total monetary value of all deals grouped by their pipeline stage.",
        baseTable: "deals",
        joins: [],
        columns: [
          { table: "deals", field: "stage", alias: "Pipeline Stage", function: "NONE" },
          { table: "deals", field: "amount", alias: "Total Amount", function: "SUM" }
        ],
        filters: []
      },
      {
        id: "crm_deals_rep_performance",
        name: "Sales Representative Performance",
        description: "Aggregates sum of closed deals and counts of opportunities per sales rep.",
        baseTable: "deals",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "ownerId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "name", alias: "Sales Rep", function: "NONE" },
          { table: "deals", field: "amount", alias: "Total Sales", function: "SUM" },
          { table: "deals", field: "id", alias: "Opportunities Count", function: "COUNT" }
        ],
        filters: [
          { table: "deals", field: "stage", operator: "equals", value: "CLOSED_WON" }
        ]
      },
      {
        id: "crm_active_leads",
        name: "Active Leads Directory",
        description: "List of newly generated active prospects currently in contact.",
        baseTable: "leads",
        joins: [],
        columns: [
          { table: "leads", field: "id", alias: "Lead ID", function: "NONE" },
          { table: "leads", field: "companyName", alias: "Company", function: "NONE" },
          { table: "leads", field: "status", alias: "Lead Status", function: "NONE" },
          { table: "leads", field: "createdAt", alias: "Created Date", function: "NONE" }
        ],
        filters: [
          { table: "leads", field: "status", operator: "equals", value: "ACTIVE" }
        ]
      },
      {
        id: "crm_leads_by_geo",
        name: "Leads Distribution by Geography",
        description: "Distribution of lead counts grouped by country, state, or city.",
        baseTable: "leads",
        joins: [],
        columns: [
          { table: "leads", field: "country", alias: "Country", function: "NONE" },
          { table: "leads", field: "state", alias: "State", function: "NONE" },
          { table: "leads", field: "city", alias: "City", function: "NONE" },
          { table: "leads", field: "id", alias: "Total Leads", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "crm_leads_by_source",
        name: "Lead Count by Acquisition Source",
        description: "Summarizes prospects count grouped by how they were acquired (organic, search, social, etc.).",
        baseTable: "leads",
        joins: [],
        columns: [
          { table: "leads", field: "source", alias: "Lead Source", function: "NONE" },
          { table: "leads", field: "id", alias: "Prospect Count", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  saas: {
    label: "SaaS & Subscriptions Business Pack",
    presets: [
      {
        id: "saas_mrr_by_plan",
        name: "Monthly Recurring Revenue by Plan",
        description: "Aggregated monthly revenue split by subscription plan levels.",
        baseTable: "subscriptions",
        joins: [
          { type: "INNER", relatedTable: "plans", fromColumn: "planId", toColumn: "id" }
        ],
        columns: [
          { table: "plans", field: "name", alias: "Plan Level", function: "NONE" },
          { table: "plans", field: "price", alias: "MRR Contribution", function: "SUM" }
        ],
        filters: [
          { table: "subscriptions", field: "status", operator: "equals", value: "ACTIVE" }
        ]
      },
      {
        id: "saas_active_subs_count",
        name: "Active Subscriptions Count",
        description: "Count of all active customer subscriptions per pricing structure.",
        baseTable: "subscriptions",
        joins: [
          { type: "LEFT", relatedTable: "plans", fromColumn: "planId", toColumn: "id" }
        ],
        columns: [
          { table: "plans", field: "name", alias: "Plan Level", function: "NONE" },
          { table: "subscriptions", field: "id", alias: "Total Subscriptions", function: "COUNT" }
        ],
        filters: [
          { table: "subscriptions", field: "status", operator: "equals", value: "ACTIVE" }
        ]
      },
      {
        id: "saas_subscribers_by_geo",
        name: "Subscribers Distribution by Location",
        description: "Number of active subscriptions grouped by subscriber geographic location.",
        baseTable: "subscriptions",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "userId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "country", alias: "Country", function: "NONE" },
          { table: "users", field: "state", alias: "State/Region", function: "NONE" },
          { table: "subscriptions", field: "id", alias: "Active Subscriptions", function: "COUNT" }
        ],
        filters: [
          { table: "subscriptions", field: "status", operator: "equals", value: "ACTIVE" }
        ]
      },
      {
        id: "saas_churn_reasons",
        name: "Cancelled Subscriptions by Cancellation Reason",
        description: "Count of subscription cancellations grouped by user's stated reason.",
        baseTable: "subscriptions",
        joins: [],
        columns: [
          { table: "subscriptions", field: "cancelReason", alias: "Cancellation Reason", function: "NONE" },
          { table: "subscriptions", field: "id", alias: "Cancelled Count", function: "COUNT" }
        ],
        filters: [
          { table: "subscriptions", field: "status", operator: "equals", value: "CANCELLED" }
        ]
      },
      {
        id: "saas_leads_by_geo",
        name: "Demo Requests & Leads by Geography",
        description: "Total product demo requests and SaaS sales leads grouped by location (country/state/city).",
        baseTable: "leads",
        joins: [],
        columns: [
          { table: "leads", field: "country", alias: "Country", function: "NONE" },
          { table: "leads", field: "state", alias: "State", function: "NONE" },
          { table: "leads", field: "city", alias: "City", function: "NONE" },
          { table: "leads", field: "id", alias: "Total Requests", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  healthcare: {
    label: "Healthcare & Clinic Business Pack",
    presets: [
      {
        id: "healthcare_appt_by_doctor",
        name: "Appointments Count by Doctor",
        description: "Total number of patients scheduled for checkups per doctor.",
        baseTable: "appointments",
        joins: [
          { type: "LEFT", relatedTable: "doctors", fromColumn: "doctorId", toColumn: "id" }
        ],
        columns: [
          { table: "doctors", field: "name", alias: "Doctor Name", function: "NONE" },
          { table: "appointments", field: "id", alias: "Appointments Count", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "healthcare_patient_billing",
        name: "Patient Total Billing Summary",
        description: "Aggregated sum of bills generated per patient for clinical services.",
        baseTable: "bills",
        joins: [
          { type: "LEFT", relatedTable: "patients", fromColumn: "patientId", toColumn: "id" }
        ],
        columns: [
          { table: "patients", field: "name", alias: "Patient Name", function: "NONE" },
          { table: "bills", field: "amount", alias: "Total Invoiced", function: "SUM" }
        ],
        filters: []
      },
      {
        id: "healthcare_patients_by_geo",
        name: "Patients Distribution by Location",
        description: "Summarizes total patient counts grouped by their home city/state.",
        baseTable: "patients",
        joins: [],
        columns: [
          { table: "patients", field: "city", alias: "Patient City", function: "NONE" },
          { table: "patients", field: "state", alias: "Patient State", function: "NONE" },
          { table: "patients", field: "id", alias: "Total Registered Patients", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "healthcare_appt_by_dept",
        name: "Appointments by Department",
        description: "Aggregated scheduled appointments grouped by medical department/specialty.",
        baseTable: "appointments",
        joins: [
          { type: "LEFT", relatedTable: "doctors", fromColumn: "doctorId", toColumn: "id" }
        ],
        columns: [
          { table: "doctors", field: "specialty", alias: "Specialty / Department", function: "NONE" },
          { table: "appointments", field: "id", alias: "Total Appointments", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "healthcare_leads_by_geo",
        name: "Patient Queries by Location",
        description: "Total medical appointment requests and portal queries grouped by patient location (country/state/city).",
        baseTable: "queries",
        joins: [],
        columns: [
          { table: "queries", field: "country", alias: "Country", function: "NONE" },
          { table: "queries", field: "state", alias: "State", function: "NONE" },
          { table: "queries", field: "city", alias: "City", function: "NONE" },
          { table: "queries", field: "id", alias: "Queries Count", function: "COUNT" }
        ],
        filters: []
      }
    ]
  },
  project: {
    label: "Project Management Business Pack",
    presets: [
      {
        id: "project_task_by_assignee",
        name: "Task Load by Assignee",
        description: "Shows tasks count distribution for tracking resource allocation and workflow capacity.",
        baseTable: "tasks",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "assigneeId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "name", alias: "Assignee Name", function: "NONE" },
          { table: "tasks", field: "id", alias: "Total Tasks Assignee", function: "COUNT" }
        ],
        filters: [
          { table: "tasks", field: "status", operator: "equals", value: "IN_PROGRESS" }
        ]
      },
      {
        id: "project_high_bugs",
        name: "High Priority Active Bugs",
        description: "Comprehensive view of unaddressed critical bugs sorted by creation date.",
        baseTable: "bugs",
        joins: [],
        columns: [
          { table: "bugs", field: "id", alias: "Bug ID", function: "NONE" },
          { table: "bugs", field: "title", alias: "Bug Title", function: "NONE" },
          { table: "bugs", field: "priority", alias: "Priority", function: "NONE" },
          { table: "bugs", field: "status", alias: "Status", function: "NONE" }
        ],
        filters: [
          { table: "bugs", field: "priority", operator: "equals", value: "HIGH" },
          { table: "bugs", field: "status", operator: "equals", value: "OPEN" }
        ]
      },
      {
        id: "project_workload_by_location",
        name: "Tasks Distribution by User Location",
        description: "Total count of incomplete tasks grouped by employee location.",
        baseTable: "tasks",
        joins: [
          { type: "LEFT", relatedTable: "users", fromColumn: "assigneeId", toColumn: "id" }
        ],
        columns: [
          { table: "users", field: "country", alias: "Assignee Country", function: "NONE" },
          { table: "users", field: "city", alias: "Assignee City", function: "NONE" },
          { table: "tasks", field: "id", alias: "Active Tasks Count", function: "COUNT" }
        ],
        filters: [
          { table: "tasks", field: "status", operator: "equals", value: "IN_PROGRESS" }
        ]
      },
      {
        id: "project_bug_by_severity",
        name: "Total Bug Reports by Severity Level",
        description: "Total bug counts grouped by severity ranking.",
        baseTable: "bugs",
        joins: [],
        columns: [
          { table: "bugs", field: "severity", alias: "Severity Tier", function: "NONE" },
          { table: "bugs", field: "id", alias: "Reported Bug Count", function: "COUNT" }
        ],
        filters: []
      },
      {
        id: "project_leads_by_geo",
        name: "Client Inquiries by Geography",
        description: "Total project proposals and client onboarding queries grouped by company location (country/state/city).",
        baseTable: "proposals",
        joins: [],
        columns: [
          { table: "proposals", field: "country", alias: "Country", function: "NONE" },
          { table: "proposals", field: "state", alias: "State", function: "NONE" },
          { table: "proposals", field: "city", alias: "City", function: "NONE" },
          { table: "proposals", field: "id", alias: "Query Count", function: "COUNT" }
        ],
        filters: []
      }
    ]
  }
};
