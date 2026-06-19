export interface PresetColumn {
  table: string;
  field: string;
  alias: string;
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
          { table: "bookings", field: "id", alias: "Booking ID" },
          { table: "bookings", field: "status", alias: "Status" },
          { table: "bookings", field: "createdAt", alias: "Booking Date" },
          { table: "users", field: "fullName", alias: "Customer Name" },
          { table: "users", field: "email", alias: "Customer Email" }
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
          { table: "payments", field: "id", alias: "Payment ID" },
          { table: "payments", field: "amount", alias: "Amount Paid" },
          { table: "bookings", field: "status", alias: "Booking Status" }
        ],
        filters: [
          { table: "bookings", field: "status", operator: "equals", value: "CONFIRMED" }
        ]
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
          { table: "orders", field: "id", alias: "Order ID" },
          { table: "orders", field: "totalMinor", alias: "Total Amount" },
          { table: "orders", field: "status", alias: "Order Status" },
          { table: "users", field: "name", alias: "Buyer Name" },
          { table: "users", field: "email", alias: "Buyer Email" }
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
          { table: "orders", field: "id", alias: "Order ID" },
          { table: "orders", field: "totalMinor", alias: "Total Amount" },
          { table: "orders", field: "status", alias: "Status" }
        ],
        filters: [
          { table: "orders", field: "status", operator: "equals", value: "PENDING_PAYMENT" }
        ]
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
          { table: "users", field: "name", alias: "Student Name" },
          { table: "courses", field: "title", alias: "Course Title" },
          { table: "enrollments", field: "enrolledAt", alias: "Enrollment Date" }
        ],
        filters: []
      }
    ]
  }
};
