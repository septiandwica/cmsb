import { useState, useEffect } from "react";
import { vendorApi } from "@/api/vendorApi";

export const useVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await vendorApi.getAll();
      setVendors(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    vendors,
    loading,
    reload: load,
  };
};
