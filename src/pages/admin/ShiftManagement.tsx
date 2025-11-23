import { useEffect, useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_URL = "http://localhost:4000/api/shifts";

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
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

export default function ShiftManagement() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    start_time: "",
    end_time: "",
  });

  const token = localStorage.getItem("token");

  // =========================================================================
  // FETCH SHIFTS
  // =========================================================================
  const fetchShifts = async (page = 1, newLimit = limit) => {
    try {

      const response = await fetch(
        `${API_URL}?page=${page}&limit=${newLimit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed fetching shifts");

      const result: ApiResponse<Shift> = await response.json();

      setShifts(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed loading shifts");
    } finally {
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  // =========================================================================
  // FILTER (REALTIME LIKE VENDOR)
  // =========================================================================
  const filteredShifts = useMemo(() => {
    return shifts.filter((sh) => {
      const term = searchTerm.toLowerCase();
      return (
        sh.name.toLowerCase().includes(term) ||
        sh.start_time.includes(term) ||
        sh.end_time.includes(term)
      );
    });
  }, [searchTerm, shifts]);

  // =========================================================================
  // SUBMIT FORM
  // =========================================================================
  const handleSubmit = async () => {
    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast.warning("All fields are required");
      return;
    }

    // VALIDASI WAKTU
    if (formData.start_time >= formData.end_time) {
      toast.error("End time must be later than start time");
      return;
    }

    try {

      const url = selectedShift ? `${API_URL}/${selectedShift.id}` : API_URL;
      const method = selectedShift ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success(selectedShift ? "Shift updated!" : "Shift created!");

      setIsModalOpen(false);
      fetchShifts();
    } catch {
      toast.error("Failed saving shift");
    } finally {
    }
  };

  // =========================================================================
  // DELETE SHIFT
  // =========================================================================
  const handleDelete = async () => {
    if (!selectedShift) return;

    try {
      const res = await fetch(`${API_URL}/${selectedShift.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      toast.success("Shift deleted");
      setIsDeleteDialogOpen(false);
      fetchShifts();
    } catch {
      toast.error("Failed deleting shift");
    } finally {
    }
  };

  // =========================================================================
  // UI
  // =========================================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">Shift Management</h1>
          <p className="text-gray-600">Manage employee work shifts</p>
        </div>

        {/* SEARCH + ADD */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search shifts..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            onClick={() => {
              setSelectedShift(null);
              setFormData({
                name: "",
                start_time: "",
                end_time: "",
              });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Shift
          </Button>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredShifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    No shifts found
                  </TableCell>
                </TableRow>
              )}

              {filteredShifts.map((sh) => (
                <TableRow key={sh.id}>
                  <TableCell>{sh.id}</TableCell>
                  <TableCell>{sh.name}</TableCell>
                  <TableCell>{sh.start_time}</TableCell>
                  <TableCell>{sh.end_time}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSelectedShift(sh);
                          setFormData({
                            name: sh.name,
                            start_time: sh.start_time,
                            end_time: sh.end_time,
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
                          setSelectedShift(sh);
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
              Showing <b>{shifts.length}</b> of <b>{pagination.total}</b> shifts
            </p>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* ROWS PER PAGE */}
              <Select
                value={String(limit)}
                onValueChange={(v) => fetchShifts(1, Number(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 &&
                        fetchShifts(pagination.page - 1)
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map(
                    (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={pagination.page === i + 1}
                          onClick={() => fetchShifts(i + 1)}
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
                        fetchShifts(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Button variant="outline" size="icon" onClick={() => fetchShifts()}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* CREATE / EDIT MODAL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedShift ? "Edit Shift" : "Create Shift"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <Input
                placeholder="Shift name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
              />

              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>

              <Button onClick={handleSubmit}>
                {selectedShift ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Shift</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
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
