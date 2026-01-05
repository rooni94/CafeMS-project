import React from "react";
import StockLevels from "./inventory/StockLevels";
import InventoryAdjustment from "./inventory/InventoryAdjustment";

const InventoryManager: React.FC = () => {
  return (
    <div className="space-y-4">
      <StockLevels />
      <InventoryAdjustment />
    </div>
  );
};

export default InventoryManager;
