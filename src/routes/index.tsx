import { createFileRoute } from "@tanstack/react-router";
import { NepaliJewelleryHome } from "@/components/NepaliJewelleryHome";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return <NepaliJewelleryHome />;
}

