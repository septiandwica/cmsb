import { useEffect, useState } from "react";
import { locationApi } from "@/api/locationApi";

export const useLocations = () => {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    locationApi.getAll().then(res => setLocations(res.data.data || []));
  }, []);

  return locations;
};
