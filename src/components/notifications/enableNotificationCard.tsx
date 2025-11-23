import { Portal } from "@/components/notifications/portal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushSubscribe } from "@/hooks/usePushSubscribe";

export function EnableNotificationCard() {
  const { subscribe, granted } = usePushSubscribe();

  if (granted) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-9999 bg-black/40 backdrop-blur flex items-center justify-center"
        style={{ pointerEvents: "auto" }}
      >
        <Card
          className="p-6 w-[90%] max-w-sm rounded-xl bg-white shadow-xl"
          style={{ pointerEvents: "auto" }}
        >
          <h2 className="text-lg font-bold mb-2">Aktifkan Notifikasi</h2>

          <p className="mb-4 text-sm">
            Aktifkan notifikasi untuk menerima pengingat pesanan dan update terbaru.
          </p>

          <Button
            onClick={subscribe}
            className="w-full cursor-pointer"
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              pointerEvents: "auto",
            }}
          >
            Aktifkan Sekarang
          </Button>
        </Card>
      </div>
    </Portal>
  );
}
