import { useState, useEffect } from "react";
import axios from "@/api/axiosInstance";

export function usePushSubscribe() {
  const [granted, setGranted] = useState(false); // popup hide
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 1. cek browser permission
      if (Notification.permission === "granted") {
        setGranted(true);
        setLoading(false);
        return;
      }

      // 2. cek ke backend apakah user sudah subscribe
      try {
        const res = await axios.get("/push/check");
        if (res.data.subscribed) {
          setGranted(true);        // hide popup
        }
      } catch (err) {
        console.error("check push failed", err);
      }

      setLoading(false);
    };

    init();
  }, []);

  const subscribe = async () => {
    // request permission
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    setGranted(true);

    const reg = await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: url64ToUint8(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });

    // save ke backend
    await axios.post("/push/subscribe", sub);
  };

  return { subscribe, granted, loading };
}

function url64ToUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Str = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Str);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
