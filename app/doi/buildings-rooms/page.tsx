import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { BuildingsRoomsWithScope } from "@/components/admin/BuildingsRoomsWithScope";

export default function DoiBuildingsRoomsPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Buildings & Rooms"
        subtitle="Assign facilities to departments for scheduling (not Campus Navigation)"
      />
      <BuildingsRoomsWithScope />
    </div>
  );
}
