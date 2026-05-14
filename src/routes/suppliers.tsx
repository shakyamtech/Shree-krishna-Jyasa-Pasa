import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import { PartiesPage } from "./customers";

export const Route = createFileRoute("/suppliers")({
  component: () => <AuthGuard><AppLayout><PartiesPage table="suppliers" title="Suppliers" /></AppLayout></AuthGuard>,
});
