import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MockTable } from "@/mocks/tables";

interface DataTableProps {
  table: MockTable;
}

export function DataTable({ table }: DataTableProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span className="font-mono">{table.name}</span> · {table.rows.length} rows
        · {table.columns.length} columns
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {table.columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, i) => (
              <TableRow key={i}>
                {table.columns.map((c) => (
                  <TableCell key={c} className="font-mono text-xs">
                    {formatCell(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}
