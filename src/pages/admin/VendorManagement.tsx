import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import { toast } from "sonner";

const API_URL = "http://localhost:4000/api/vendors";
const LOC_URL = "http://localhost:4000/api/locations";

interface Location {
  id: number;
  name: string;
}

interface Vendor {
  id: number;
  name: string;
  location_id: number;
  contact: string;
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

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
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
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    location_id: "",
    contact: "",
  });

  const token = localStorage.getItem("token");

  const fetchVendors = async (page = 1, newLimit = limit) => {
    try {
      const response = await fetch(
        `${API_URL}?page=${page}&limit=${newLimit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed fetching vendors");

      const result: ApiResponse<Vendor> = await response.json();

      setVendors(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed to load vendors");
    } finally {
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(LOC_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result: ApiResponse<Location> = await res.json();
      setLocations(result.data);
    } catch {
      toast.error("Failed to load locations");
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchLocations();
  }, []);

  const getLocationName = (id: number) => {
    const loc = locations.find((l) => l.id === id);
    return loc?.name || "Unknown";
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.contact || !formData.location_id) {
      toast.warning("Please fill all required fields");
      return;
    }

    try {

      const url = selectedVendor ? `${API_URL}/${selectedVendor.id}` : API_URL;
      const method = selectedVendor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          location_id: Number(formData.location_id),
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(
        selectedVendor
          ? "Vendor updated successfully!"
          : "Vendor created successfully!"
      );

      setIsModalOpen(false);
      fetchVendors();
    } catch {
      toast.error("Failed saving vendor");
    } finally {
    }
  };

  const handleDelete = async () => {
    if (!selectedVendor) return;

    try {

      const res = await fetch(`${API_URL}/${selectedVendor.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      toast.success("Vendor deleted");
      setIsDeleteDialogOpen(false);
      fetchVendors();
    } catch {
      toast.error("Failed deleting vendor");
    } finally {
    }
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLocationName(v.location_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendor Management</h1>
          <p className="text-sm text-gray-600">Manage vendor database</p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search vendors..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            className="w-full md:w-auto"
            onClick={() => {
              setSelectedVendor(null);
              setFormData({ name: "", location_id: "", contact: "" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
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
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredVendors.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-gray-500"
                  >
                    No vendors found
                  </TableCell>
                </TableRow>
              )}

              {filteredVendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.id}</TableCell>
                  <TableCell className="font-medium">{v.name}</TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {getLocationName(v.location_id)}
                    </Badge>
                  </TableCell>

                  <TableCell>{v.contact}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedVendor(v);
                          setFormData({
                            name: v.name,
                            contact: v.contact,
                            location_id: v.location_id.toString(),
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
                          setSelectedVendor(v);
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
              Showing <b>{vendors.length}</b> of <b>{pagination.total}</b>{" "}
              vendors
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Rows per page */}
              <Select
                value={String(limit)}
                onValueChange={(v) => fetchVendors(1, Number(v))}
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

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        pagination.page > 1 && fetchVendors(pagination.page - 1)
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pagination.page === i + 1}
                        onClick={() => fetchVendors(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchVendors(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchVendors()}
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL CREATE/EDIT */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedVendor ? "Edit Vendor" : "Create Vendor"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder="Vendor name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <Select
                value={formData.location_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, location_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>

                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Contact"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedVendor ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM DIALOG */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Vendor</DialogTitle>
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
