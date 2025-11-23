import  { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
  DialogTitle,
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
  PaginationPrevious,
  PaginationItem,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const API_URL = "http://localhost:4000/api/trays";

interface Tray {
  id: number;
  code: string;
  name: string;
  is_cadangan: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationType {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  message: string;
  data: T[];
  pagination: PaginationType;
}

export default function TrayManagement() {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedTray, setSelectedTray] = useState<Tray | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    is_cadangan: false,
  });


  const token = localStorage.getItem("token");

  const fetchTrays = async (page = 1, newLimit = limit) => {
    try {

      const res = await fetch(`${API_URL}?page=${page}&limit=${newLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch trays");

      const result: ApiResponse<Tray> = await res.json();

      setTrays(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch (err) {
      toast.error("Failed to load trays");
    } finally {
    }
  };

  useEffect(() => {
    fetchTrays();
  }, []);

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.warning("Please fill out all required fields!");
      return;
    }

    try {

      const url = selectedTray ? `${API_URL}/${selectedTray.id}` : API_URL;
      const method = selectedTray ? "PUT" : "POST";

      const payload = {
        code: formData.code,
        name: formData.name,
        is_cadangan: formData.is_cadangan,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success(
        selectedTray
          ? "Tray updated successfully!"
          : "Tray created successfully!"
      );

      setIsModalOpen(false);
      fetchTrays();
    } catch {
      toast.error("Failed to save tray");
    } finally {
    }
  };

  const handleDelete = async () => {
    if (!selectedTray) return;

    try {
      await fetch(`${API_URL}/${selectedTray.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Tray deleted");
      setIsDeleteDialogOpen(false);
      fetchTrays();
    } catch {
      toast.error("Failed to delete tray");
    }
  };

  const filteredTrays = trays.filter(
    (t) =>
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tray Management</h1>
          <p className="text-gray-600">Manage tray list</p>
        </div>

        {/* Search + Add */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tray by code or name..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            className="w-full md:w-auto"
            onClick={() => {
              setSelectedTray(null);
              setFormData({ code: "", name: "", is_cadangan: false });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tray
          </Button>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Cadangan?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTrays.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-gray-500"
                  >
                    No trays found
                  </TableCell>
                </TableRow>
              )}

              {filteredTrays.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell className="font-medium">{t.code}</TableCell>
                  <TableCell>{t.name}</TableCell>

                  <TableCell>
                    {t.is_cadangan ? (
                      <Badge className="bg-yellow-200 text-yellow-800">
                        Cadangan
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Regular</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedTray(t);
                          setFormData({
                            code: t.code,
                            name: t.name,
                            is_cadangan: t.is_cadangan,
                          });
                          setIsModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setSelectedTray(t);
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
              Showing <b>{trays.length}</b> of <b>{pagination.total}</b> trays
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* ROWS PER PAGE */}
              <Select
                value={String(limit)}
                onValueChange={(v) => fetchTrays(1, Number(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>

              {/* PAGINATION */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 && fetchTrays(pagination.page - 1)
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pagination.page === i + 1}
                        onClick={() => fetchTrays(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchTrays(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              {/* REFRESH */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchTrays()}
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL CREATE / EDIT */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTray ? "Edit Tray" : "Create Tray"}
              </DialogTitle>
              <DialogDescription>
                {selectedTray
                  ? "Update tray details"
                  : "Add new tray to the system"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Tray Code (e.g. EXT)"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />

              <Input
                placeholder="Tray Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <div className="flex items-center justify-between border p-3 rounded-md">
                <label className="font-medium">Cadangan?</label>
                <Switch
                  checked={formData.is_cadangan}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, is_cadangan: v })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedTray ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tray</DialogTitle>
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
