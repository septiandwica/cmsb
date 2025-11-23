import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

import { toast } from "sonner";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const API_URL = "http://localhost:4000/api/locations";

interface Location {
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

export default function LocationManagement() {
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
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  const [formName, setFormName] = useState("");


  const token = localStorage.getItem("token");

  const fetchLocations = async (page = 1, newLimit = limit) => {
    try {

      const response = await fetch(
        `${API_URL}?page=${page}&limit=${newLimit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Unable to fetch locations");

      const result: ApiResponse<Location> = await response.json();

      setLocations(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed to load locations");
    } finally {
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.warning("Location name is required");
      return;
    }

    try {

      const url = selectedLocation
        ? `${API_URL}/${selectedLocation.id}`
        : API_URL;

      const method = selectedLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formName }),
      });

      if (!response.ok) throw new Error();

      toast.success(
        selectedLocation ? "Location updated!" : "Location created!"
      );

      setIsModalOpen(false);
      fetchLocations();
    } catch {
      toast.error("Failed to save location");
    } finally {
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    try {
      await fetch(`${API_URL}/${selectedLocation.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Location deleted");
      setIsDeleteDialogOpen(false);
      fetchLocations();
    } catch {
      toast.error("Failed to delete location");
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Location Management</h1>
          <p className="text-gray-600">Manage available locations</p>
        </div>

        {/* Search + Add */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search location..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button
            className="w-full md:w-auto"
            onClick={() => {
              setSelectedLocation(null);
              setFormName("");
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>

        <Separator />

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLocations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-6 text-gray-500"
                  >
                    No locations found
                  </TableCell>
                </TableRow>
              )}

              {filteredLocations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>{loc.id}</TableCell>

                  <TableCell className="font-medium">
                    <Badge variant="secondary">{loc.name}</Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedLocation(loc);
                          setFormName(loc.name);
                          setIsModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          setSelectedLocation(loc);
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
          <div className="p-4 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
            <p className="text-sm text-gray-600">
              Showing <b>{locations.length}</b> of <b>{pagination.total}</b>{" "}
              items
            </p>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* Rows per page */}
              <Select
                value={String(limit)}
                onValueChange={(v) => fetchLocations(1, Number(v))}
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
                        pagination.page > 1 &&
                        fetchLocations(pagination.page - 1)
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pagination.page === i + 1}
                        onClick={() => fetchLocations(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchLocations(pagination.page + 1)
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchLocations()}
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
                {selectedLocation ? "Edit Location" : "Create Location"}
              </DialogTitle>
              <DialogDescription>
                {selectedLocation
                  ? "Update the location name"
                  : "Create a new location"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder="Location name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedLocation ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Location</DialogTitle>
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
