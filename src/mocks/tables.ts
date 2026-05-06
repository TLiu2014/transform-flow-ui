export interface MockTable {
  name: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
}

export const mockCustomers: MockTable = {
  name: "customers",
  columns: ["id", "name", "country", "signup_date"],
  rows: [
    { id: 1, name: "Ada Lovelace", country: "UK", signup_date: "2024-02-11" },
    { id: 2, name: "Grace Hopper", country: "US", signup_date: "2024-03-04" },
    { id: 3, name: "Alan Turing", country: "UK", signup_date: "2024-04-22" },
    { id: 4, name: "Linus Torvalds", country: "FI", signup_date: "2024-05-19" },
    { id: 5, name: "Margaret Hamilton", country: "US", signup_date: "2024-06-01" },
  ],
};

export const mockOrders: MockTable = {
  name: "orders",
  columns: ["order_id", "customer_id", "amount", "status"],
  rows: [
    { order_id: 101, customer_id: 1, amount: 49.99, status: "shipped" },
    { order_id: 102, customer_id: 2, amount: 129.0, status: "processing" },
    { order_id: 103, customer_id: 1, amount: 19.5, status: "shipped" },
    { order_id: 104, customer_id: 3, amount: 249.0, status: "cancelled" },
    { order_id: 105, customer_id: 5, amount: 89.0, status: "shipped" },
  ],
};

export const mockFilteredCustomers: MockTable = {
  name: "filtered_customers",
  columns: ["id", "name", "country", "signup_date"],
  rows: mockCustomers.rows.filter((r) => r.country === "US"),
};

export const mockJoined: MockTable = {
  name: "customers_with_orders",
  columns: ["id", "name", "country", "order_id", "amount", "status"],
  rows: [
    { id: 1, name: "Ada Lovelace", country: "UK", order_id: 101, amount: 49.99, status: "shipped" },
    { id: 1, name: "Ada Lovelace", country: "UK", order_id: 103, amount: 19.5, status: "shipped" },
    { id: 2, name: "Grace Hopper", country: "US", order_id: 102, amount: 129.0, status: "processing" },
    { id: 3, name: "Alan Turing", country: "UK", order_id: 104, amount: 249.0, status: "cancelled" },
    { id: 5, name: "Margaret Hamilton", country: "US", order_id: 105, amount: 89.0, status: "shipped" },
  ],
};

export const MOCK_TABLES: Record<string, MockTable> = {
  customers: mockCustomers,
  orders: mockOrders,
  filtered_customers: mockFilteredCustomers,
  customers_with_orders: mockJoined,
};

/**
 * Resolve a mock table by output name. Falls back to a generic 5-row table so
 * every node has *something* to display while this UI is still mock-only.
 */
export function getMockResultFor(outputName: string): MockTable {
  if (MOCK_TABLES[outputName]) return MOCK_TABLES[outputName];
  return {
    name: outputName,
    columns: ["id", "value", "note"],
    rows: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      value: Math.round(Math.random() * 1000),
      note: `mock row for ${outputName}`,
    })),
  };
}
