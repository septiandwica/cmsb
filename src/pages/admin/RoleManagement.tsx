/* ROLE MANAGEMENT — READ ONLY VERSION */

import { useEffect, useState } from "react";
import { Search, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import { toast } from "sonner";

const API_URL = "http://localhost:4000/api/roles";

interface Role {
  id: number;
  name: string;
}

interface PaginationType {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  data: T[];
  pagination: PaginationType;
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const token = localStorage.getItem("token");

  // ============================
  // FETCH ROLES
  // ============================
  const fetchRoles = async (page = 1, newLimit = limit) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(newLimit),
        search: search,
      });

      const res = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const result: ApiResponse<Role> = await res.json();

      setRoles(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed loading roles");
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // ============================
  // UI
  // ============================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* TITLE */}
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-gray-600">View system roles assigned to users</p>
        </div>

        {/* SEARCH */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search role..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" onClick={() => fetchRoles(1)}>
            <Search className="w-4 h-4 mr-2" /> Apply
          </Button>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {roles.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-6 text-center text-gray-500"
                  >
                    No roles found
                  </TableCell>
                </TableRow>
              )}

              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* PAGINATION */}
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <p className="text-sm text-gray-600">
              Showing <b>{roles.length}</b> of <b>{pagination.total}</b> roles
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Rows per page */}
              <select
                className="border rounded px-2 py-1"
                value={limit}
                onChange={(e) => fetchRoles(1, Number(e.target.value))}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 &&
                        fetchRoles(pagination.page - 1)
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map(
                    (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={pagination.page === i + 1}
                          onClick={() => fetchRoles(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchRoles(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchRoles()}
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
