import type { NormalizedVariant } from '../types';

export interface VariantNodeInput {
  id: string;
  title: string;
  sku: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  inventoryQuantity: number;
}

export function inventoryStatus(qty: number): 'in_stock' | 'out_of_stock' | 'partial' {
  if (qty <= 0) return 'out_of_stock';
  if (qty < 10) return 'partial';
  return 'in_stock';
}

export function pickOptionByName(
  opts: Array<{ name: string; value: string }>,
  ...names: string[]
): string | null {
  const lower = names.map((n) => n.toLowerCase());
  const opt = opts.find((o) => lower.includes(o.name.toLowerCase()));
  return opt?.value ?? null;
}

export function normalizeVariant(node: VariantNodeInput): NormalizedVariant {
  const opts = node.selectedOptions ?? [];
  const option1 = opts[0]?.value ?? null;
  const option2 = opts[1]?.value ?? null;
  const option3 = opts[2]?.value ?? null;
  const size = pickOptionByName(opts, 'size', 'Size');
  const color = pickOptionByName(opts, 'color', 'Color', 'Colour');
  const qty = node.inventoryQuantity ?? 0;
  return {
    id: node.id,
    title: node.title,
    sku: node.sku ?? null,
    size,
    color,
    option1,
    option2,
    option3,
    inventoryQuantity: qty,
    inventoryStatus: inventoryStatus(qty),
  };
}
