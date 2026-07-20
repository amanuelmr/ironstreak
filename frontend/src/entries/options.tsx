import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";

import { Options } from "../components/Options";
import { createQueryClient } from "../lib/queryClient";
import "../styles/index.css";

const queryClient = createQueryClient();

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Options />
    </QueryClientProvider>
  </React.StrictMode>,
);
