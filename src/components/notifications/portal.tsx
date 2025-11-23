import { createPortal } from "react-dom";

export const Portal = ({ children }: { children: React.ReactNode }) => {
  const root = document.getElementById("root");
  return createPortal(children, root!);
};
