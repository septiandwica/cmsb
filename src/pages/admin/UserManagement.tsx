import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCcw,
  QrCode,
  Filter,
  QrCodeIcon,
} from "lucide-react";

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
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

import { toast } from "sonner";

// ===============================
const API_URL = "http://localhost:4000/api/users";
const DEP_URL = "http://localhost:4000/api/departments";
const LOC_URL = "http://localhost:4000/api/locations";
const ROLE_URL = "http://localhost:4000/api/roles";
// ===============================

interface User {
  id: number;
  uuid: string | null;
  name: string;
  email: string;
  department_id: number | null;
  location_id: number | null;
  role_id: number | null;
  status: string;
  barcode_url?: string | null;
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

export default function UserManagement() {
  // ============================================================
  // STATE
  // ============================================================
  const [users, setUsers] = useState<User[]>([]);
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    withQr: 0,
    noQr: 0,
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [pagination, setPagination] = useState<PaginationType>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Password option
  const [passwordOption, setPasswordOption] = useState("auto");
  const [password, setPassword] = useState("");

  const [formData, setFormData] = useState({
    uuid: "",
    name: "",
    email: "",
    department_id: "",
    location_id: "",
    role_id: "",
    status: "active",
  });

  const token = localStorage.getItem("token");

  // ============================================================
  // FETCH USERS (PAGINATED)
  // ============================================================
  const fetchUsers = async (page = 1, newLimit = limit) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(newLimit),
        search,
        department_id: departmentFilter,
        location_id: locationFilter,
        role_id: roleFilter,
        status: statusFilter,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error();

      const result: ApiResponse<User> = await response.json();
      setUsers(result.data);
      setPagination(result.pagination);
      setLimit(newLimit);
    } catch {
      toast.error("Failed loading users");
    }
  };

  // ============================================================
  // FETCH GLOBAL USERS (FOR STATISTICS)
  // ============================================================
  const fetchAllUsersStats = async () => {
    const res = await fetch(`${API_URL}?limit=999999`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result: ApiResponse<User> = await res.json();
    const all = result.data;

    setGlobalStats({
      total: all.length,
      active: all.filter((u) => u.status === "active").length,
      inactive: all.filter((u) => u.status === "inactive").length,
      suspended: all.filter((u) => u.status === "suspended").length,
      withQr: all.filter((u) => u.barcode_url).length,
      noQr: all.filter((u) => !u.barcode_url).length,
    });
  };

  // ============================================================
  // FETCH SUPPORTING DATA
  // ============================================================
  const fetchDeps = async () => {
    const res = await fetch(DEP_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setDepartments(result.data ?? []);
  };

  const fetchLocations = async () => {
    const res = await fetch(LOC_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setLocations(result.data ?? []);
  };

  const fetchRoles = async () => {
    const res = await fetch(ROLE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setRoles(result.data ?? []);
  };

  useEffect(() => {
    fetchUsers();
    fetchAllUsersStats();
    fetchDeps();
    fetchLocations();
    fetchRoles();
  }, []);

  // ============================================================
  // SUBMIT USER
  // ============================================================
  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.location_id || !formData.role_id) {
      toast.warning("Name, email, location & role required");
      return;
    }

    const url = selectedUser ? `${API_URL}/${selectedUser.id}` : API_URL;
    const method = selectedUser ? "PUT" : "POST";

    const payload: any = {
      uuid: selectedUser ? undefined : formData.uuid,
      name: formData.name,
      email: formData.email,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      location_id: Number(formData.location_id),
      role_id: Number(formData.role_id),
      status: formData.status,
    };

    if (passwordOption === "manual" && password.trim() !== "") {
      payload.password = password;
    } else if (passwordOption === "default") {
      payload.password = "123456";
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success(selectedUser ? "User updated" : "User created");
      setIsModalOpen(false);

      fetchUsers();
      fetchAllUsersStats(); // refresh statistic
    } catch {
      toast.error("Failed saving user");
    }
  };

  // ============================================================
  // DELETE USER
  // ============================================================
  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`${API_URL}/${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();
      toast.success("User deleted");

      setIsDeleteDialogOpen(false);
      fetchUsers();
      fetchAllUsersStats();
    } catch {
      toast.error("Failed deleting user");
    }
  };

  // ============================================================
  // QR FUNCTIONS
  // ============================================================
  const handleGenerateQr = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/${id}/generate-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      toast.success("QR Generated!");

      if (result.qr_path)
        window.open("http://localhost:4000" + result.qr_path);

      fetchUsers();
      fetchAllUsersStats();
    } catch {
      toast.error("QR generation failed");
    }
  };

  const handleBulkQr = async () => {
    try {
      await fetch(`${API_URL}/generate-all-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Generated all QR codes");
      fetchUsers();
      fetchAllUsersStats();
    } catch {
      toast.error("Bulk QR failed");
    }
  };

  const handleSuspendInactive = async () => {
    try {
      const res = await fetch(`${API_URL}/suspend-inactive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();
      toast.success(`Suspended ${result.suspended} inactive users`);

      fetchUsers();
      fetchAllUsersStats();
    } catch {
      toast.error("Failed suspending users");
    }
  };

  // ============================================================
  // UI RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage users, roles, permissions & QR codes.</p>
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Stat label="Total Users" value={globalStats.total} />
          <Stat label="Active" value={globalStats.active} />
          <Stat label="Inactive" value={globalStats.inactive} />
          <Stat label="Suspended" value={globalStats.suspended} />
          <Stat label="With QR" value={globalStats.withQr} />
          <Stat label="No QR" value={globalStats.noQr} />
        </div>

        {/* SEARCH + ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={handleBulkQr}>
              <QrCode className="w-4 h-4 mr-2" /> Generate All QR
            </Button>

            <Button variant="outline" onClick={handleSuspendInactive}>
              Suspend Inactive
            </Button>

            <Button
              onClick={() => {
                setSelectedUser(null);
                setFormData({
                  uuid: "",
                  name: "",
                  email: "",
                  department_id: "",
                  location_id: "",
                  role_id: "",
                  status: "active",
                });
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => fetchUsers(1)}>
            <Filter className="w-4 h-4 mr-2" /> Apply
          </Button>
        </div>

        <Separator />

        {/* TABLE */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              )}

              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>

                  <TableCell>
                    <Badge
                      className="cursor-pointer px-2 py-0.5 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(u.uuid ?? "");
                        toast.success("UUID copied");
                      }}
                    >
                      {u.uuid ?? "-"}
                    </Badge>
                  </TableCell>

                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {departments.find((d) => d.id === u.department_id)?.name ?? "-"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">
                      {locations.find((l) => l.id === u.location_id)?.name ?? "-"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge>
                      {roles.find((r) => r.id === u.role_id)?.name ?? "-"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {u.status === "active" && (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    )}
                    {u.status === "inactive" && (
                      <Badge className="bg-yellow-100 text-yellow-700">Inactive</Badge>
                    )}
                    {u.status === "suspended" && (
                      <Badge className="bg-red-100 text-red-700">Suspended</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button size="icon" variant="outline" onClick={() => handleGenerateQr(u.id)}>
                        <QrCodeIcon className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setFormData({
                            uuid: u.uuid ?? "",
                            name: u.name,
                            email: u.email,
                            department_id: u.department_id ? String(u.department_id) : "",
                            location_id: u.location_id ? String(u.location_id) : "",
                            role_id: u.role_id ? String(u.role_id) : "",
                            status: u.status,
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
                          setSelectedUser(u);
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
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between">
            <p className="text-sm text-gray-600">
              Showing <b>{users.length}</b> of <b>{pagination.total}</b> users
            </p>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <Select value={String(limit)} onValueChange={(v) => fetchUsers(1, Number(v))}>
                <SelectTrigger className="w-40">
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
                      onClick={() => pagination.page > 1 && fetchUsers(pagination.page - 1)}
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pagination.page === i + 1}
                        onClick={() => fetchUsers(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pagination.page < pagination.totalPages &&
                        fetchUsers(pagination.page + 1)
                      }
                    />
                  </PaginationItem>

                </PaginationContent>
              </Pagination>

              <Button variant="outline" size="icon" onClick={() => fetchUsers(pagination.page)}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* CREATE / EDIT MODAL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Edit User" : "Create User"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              {!selectedUser ? (
                <Input
                  placeholder="UUID/NIK"
                  value={formData.uuid}
                  onChange={(e) => setFormData({ ...formData, uuid: e.target.value })}
                />
              ) : (
                <Input value={selectedUser.uuid ?? ""} disabled className="bg-gray-100" />
              )}

              <Input
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />

              <Select
                value={formData.department_id}
                onValueChange={(v) => setFormData({ ...formData, department_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData({ ...formData, location_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.role_id}
                onValueChange={(v) => setFormData({ ...formData, role_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password Option</label>

                <Select value={passwordOption} onValueChange={setPasswordOption}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-generate password</SelectItem>
                    <SelectItem value="default">Use default password</SelectItem>
                    <SelectItem value="manual">Enter password manually</SelectItem>
                  </SelectContent>
                </Select>

                {passwordOption === "manual" && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{selectedUser ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

// ===============================================================
// STAT COMPONENT
// ===============================================================
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-white border rounded-lg shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
