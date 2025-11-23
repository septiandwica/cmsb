/* DEPARTMENT MANAGEMENT — FINAL VERSION */

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

const API_URL = "http://localhost:4000/api/departments";

interface Department {
  id: number;
  name: string;
  description?: string | null;
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

export default function DepartmentManagement() {
  // STATES ----------------------------------------
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const token = localStorage.getItem("token");

  // ==================================================
  // FETCH DEPARTMENTS
  // ==================================================
  const fetchDepartments = async (page = 1, newLimit = limit) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(newLimit),
        search,
      });

      const res = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const result: ApiResponse<Department> = await res.json();

      setDepartments(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed loading departments");
    }
  };

useEffect(() => {
  const delay = setTimeout(() => {
    fetchDepartments(1);
  }, 400);

  return () => clearTimeout(delay);
}, [search]);

  // ==================================================
  // SUBMIT CREATE / UPDATE
  // ==================================================
  const handleSubmit = async () => {
    if (!formData.name) {
      toast.warning("Department name is required");
      return;
    }

    const url = selectedDepartment
      ? `${API_URL}/${selectedDepartment.id}`
      : API_URL;

    const method = selectedDepartment ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success(selectedDepartment ? "Department updated" : "Department created");

      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      toast.error("Failed saving department");
    }
  };

  // ==================================================
  // DELETE
  // ==================================================
  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      const res = await fetch(`${API_URL}/${selectedDepartment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      toast.success("Department deleted");
      setIsDeleteDialogOpen(false);
      fetchDepartments();
    } catch {
      toast.error("Failed deleting department");
    }
  };

  // ==================================================
  // UI
  // ==================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-gray-600">Manage departments for employees and GA workflows</p>
        </div>

        {/* SEARCH + ADD BUTTON */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search department..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              setSelectedDepartment(null);
              setFormData({ name: "", description: "" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Department
          </Button>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                    No departments found
                  </TableCell>
                </TableRow>
              )}

              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.description || "-"}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSelectedDepartment(d);
                          setFormData({
                            name: d.name,
                            description: d.description || "",
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setSelectedDepartment(d);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* PAGINATION */}
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <p className="text-sm text-gray-600">
              Showing <b>{departments.length}</b> of <b>{pagination.total}</b> departments
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Rows per page */}
              <select
                className="border rounded px-2 py-1"
                value={limit}
                onChange={(e) => fetchDepartments(1, Number(e.target.value))}
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
                      onClick={() => pagination.page > 1 && fetchDepartments(pagination.page - 1)}
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pagination.page === i + 1}
                        onClick={() => fetchDepartments(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchDepartments(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Button variant="outline" size="icon" onClick={() => fetchDepartments()}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* CREATE/EDIT MODAL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedDepartment ? "Edit Department" : "Create Department"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder="Department name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <Input
                placeholder="Description (optional)"
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleSubmit}>
                {selectedDepartment ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Department</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>

              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
