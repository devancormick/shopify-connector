import { inventoryStatus, normalizeVariant } from '../src/data/variant-utils';

describe('variant utils', () => {
  test('inventoryStatus maps quantities', () => {
    expect(inventoryStatus(0)).toBe('out_of_stock');
    expect(inventoryStatus(5)).toBe('partial');
    expect(inventoryStatus(20)).toBe('in_stock');
  });

  test('normalizeVariant maps size and color options', () => {
    const variant = normalizeVariant({
      id: 'gid://shopify/ProductVariant/1',
      title: 'Small / Red',
      sku: 'SKU-RED-S',
      selectedOptions: [
        { name: 'Size', value: 'Small' },
        { name: 'Color', value: 'Red' },
      ],
      inventoryQuantity: 12,
    });

    expect(variant.size).toBe('Small');
    expect(variant.color).toBe('Red');
    expect(variant.option1).toBe('Small');
    expect(variant.option2).toBe('Red');
    expect(variant.inventoryStatus).toBe('in_stock');
  });
});
