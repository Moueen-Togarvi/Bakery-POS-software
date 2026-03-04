import type { CartSummary, Category, Product } from './types';

export const mockCategories: Category[] = [
  { id: 0, name: 'All Items' },
  { id: 1, name: 'Breads' },
  { id: 2, name: 'Pastries' },
  { id: 3, name: 'Cakes' },
  { id: 4, name: 'Beverages' },
  { id: 5, name: 'Sandwiches' }
];

let nextMockCategoryId = 6;
let nextMockProductId = 105;

export const mockProducts: Product[] = [
  {
    id: 101,
    name: 'Butter Croissant',
    price: '280',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBp1CA5HsKZlq3ro8Sb1p0FfOskyCUsBsV1LGKaOb0NyKSK1VhsxRj7H9xR4EWsmuTyr0p5r9LHgzXkKwQKlgAIuKdBllS-IFG5EptYpWLHyt-6AxV3VuhLPKps8Q24qeVIygCjcAqwuMQIz71IkSyz5G5V-vN6lwc6Xx0esWB7vI905qonX5EsFBGUxako6MSg6pq3xl-wAvnCFWMdtCIUoN0jt1_jxDaxMj6xVC2jqniA7AwJ6obKfGmb_DWeLJuMrQ3_c2rIsyKH',
    categoryId: 2,
    categoryName: 'Pastries'
  },
  {
    id: 102,
    name: 'Sourdough Loaf',
    price: '500',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCuUHGqh88Vnrt0Fz9Di91m99EZQN5Mh1pZ_A1uCIEFJDw1lP0LX6QDb1_FreKXXVrGZnw_Rh9Dthm92vhc79FFi_22UBc4yYo0yvaKnElNyAIUtHxFZ5QiVFKCwoI34hi1SfVQI72J2c2xvYRGjMG9Qi4b9E6jNIRsiTex3Miga1HQvcLpTOKdiYCSUvO9c0mX9Vil-AQoTUA6kbprX39grg1_pgFirpTAfsXbTlPndBQbq_W4b2lFW9nSS328drhyMwSi2THSsbhY',
    categoryId: 1,
    categoryName: 'Breads'
  },
  {
    id: 103,
    name: 'Chocolate Cake',
    price: '450',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDqx6LTtqasWpNCcdh1avUsMr-v4tC9grpsu6a88rA-EhwougCh3jiFm4p9x8aukH233yw3DjSTrU0SUceMVxiv0JQUHii7qC2uiXfjE_UxUdyOGoEW6RQSqYDfS9pE440lRGHDcgvn_QyxlootOhTX9du_BWKAJeKamBFax6qhIMHSKdE8n4RPcQIdC_hMDAgWUcQeS8Fv0zw7Ou8sZYaDAoLidT4wa2uN4eNtSD8cLvdWKw5fHAB0YNrmStld5iZGldlz-2WDKTKJ',
    categoryId: 3,
    categoryName: 'Cakes'
  },
  {
    id: 104,
    name: 'Caffe Latte',
    price: '200',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC-QHfl2pprwWqsx8p5TU4ckhlZEh6YMGhMxVQBTH6dfN0dpFnWAfn2SaFsbEE8n_eNrTl1YSMVT1iOpVnVrlIB6sJu2gmwI4BUIGcmCoGxowEbBIXKxCUCPaO0Gb3hGpObw37aUHeLfpdn72Q3RdMbWI6Okn3yfOx0ycw-nXMd3NtLIih8hQ54I2yuNMbtH8DUTUku2kZikKRv7huAqs3CKh-kZ6uOVsh3DGpYKVMIexXHB_OTo-m2meNg7R3HZa5-Pj4A9wr9xNbv',
    categoryId: 4,
    categoryName: 'Beverages'
  }
];

export const mockCart: CartSummary = {
  orderId: 1,
  orderNo: 'ORD-8429',
  customerName: 'Walk-in Customer',
  paymentMethod: 'Cash',
  receiptNo: 'RCPT-ORD-8429',
  receiptIssuedAt: new Date().toISOString(),
  items: [
    {
      productId: 101,
      name: 'Butter Croissant',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCTqxeG0EW1uiR5-ipsTR8d7k_cAgySZQj-nif9P8wSv-tmvbSDkPf0qoMN75vycmAkeH79NPNhU2JZVjWwYEo7wCFBT9HJkZCnRE0mp-TxYOx6L8kIEDhUrZ3xCh9ELVy58ywtCl87UWl3CB88sZN4WRuCQoxkZiurRTGdH8ZUDFKOUthI09ZlbstkonUqXQor1f0n0757v5DSTIdArFITua5WRtp1eaE49qNKFcIs_wJRR7FzuwUCF_hM9DeQa5nr6TvByke4z63E',
      quantity: 2,
      unitPrice: 280,
      lineTotal: 560
    },
    {
      productId: 102,
      name: 'Sourdough Loaf',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAH88LsF0_41JBdngDeBeyjoEG1IXP-6NZMnvAVjkR4sftzIhKFCeXt2vX229wwkTM5852krnC7iNYVoThqRcmrKmTefGLolQ1fgz76pFXWjOS6JfIhR9Pop9YuMLvX6gSVo58y3h1c60pDvgrV-bQN6QbL2tYoAZwIscMgR10guH7r06MdUM7E9A-x8hCLQryoEYO3EuCHV6ijW9pctzZvfSv4TQmw1c_UhFjCx0XGE6XlD-phBneP6JGSEtVsXiHLDH-GzYsvMEQr',
      quantity: 1,
      unitPrice: 500,
      lineTotal: 500
    },
    {
      productId: 104,
      name: 'Caffe Latte',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuByuf4nCVVb8IE7N2DMjQlcYp3AcowqmsHR_-p2Kb1ghfmnvJ36g0VSzoegAEEZYA_s8Y9Nz8qRPXxC4_0Z8KtLuptkGFLV_i8Bsu6ykDp61stHjB-MxsnynLDFCq1jYMQNTaVJYrND4r-2C1oVJQPPnBnmtgUBHt0gniLx6gyyIUy5FKFvITxlAvFKDCWGrU2NNabf6LzVPeXKPRZwpHA1pbHzBbP8h_909HRW2YMCxc8callJOXdl2J2u2UiDlLvJ0vuS6qRDOdSN',
      quantity: 1,
      unitPrice: 200,
      lineTotal: 200
    }
  ],
  subtotal: 1260,
  tax: 100.80,
  total: 1360.80
};

export function filterMockProducts(categoryId?: number) {
  if (!categoryId || categoryId === 0) {
    return mockProducts;
  }
  return mockProducts.filter((item) => item.categoryId === categoryId);
}

export function createMockCategory(name: string): Category {
  const normalized = name.trim();
  const existing = mockCategories.find((category) => category.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;

  const created = { id: nextMockCategoryId++, name: normalized };
  mockCategories.push(created);
  return created;
}

export function createMockProduct(input: {
  name: string;
  categoryId: number;
  price: number;
  imageUrl?: string;
}): Product {
  const category = mockCategories.find((item) => item.id === input.categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  const created: Product = {
    id: nextMockProductId++,
    name: input.name.trim(),
    price: input.price.toFixed(2),
    imageUrl: input.imageUrl?.trim() ? input.imageUrl.trim() : null,
    categoryId: category.id,
    categoryName: category.name
  };
  mockProducts.push(created);
  return created;
}
