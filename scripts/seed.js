import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Add your Neon Postgres URL and rerun npm run db:seed');
}

const sql = postgres(connectionString, { ssl: 'require' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../db/schema.sql');
const schema = await readFile(schemaPath, 'utf8');

const categories = ['All Items', 'Breads', 'Pastries', 'Cakes', 'Beverages', 'Sandwiches'];

const products = [
  {
    name: 'Butter Croissant',
    category: 'Pastries',
    price: 3.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBp1CA5HsKZlq3ro8Sb1p0FfOskyCUsBsV1LGKaOb0NyKSK1VhsxRj7H9xR4EWsmuTyr0p5r9LHgzXkKwQKlgAIuKdBllS-IFG5EptYpWLHyt-6AxV3VuhLPKps8Q24qeVIygCjcAqwuMQIz71IkSyz5G5V-vN6lwc6Xx0esWB7vI905qonX5EsFBGUxako6MSg6pq3xl-wAvnCFWMdtCIUoN0jt1_jxDaxMj6xVC2jqniA7AwJ6obKfGmb_DWeLJuMrQ3_c2rIsyKH'
  },
  {
    name: 'Chocolate Cake',
    category: 'Cakes',
    price: 5.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDqx6LTtqasWpNCcdh1avUsMr-v4tC9grpsu6a88rA-EhwougCh3jiFm4p9x8aukH233yw3DjSTrU0SUceMVxiv0JQUHii7qC2uiXfjE_UxUdyOGoEW6RQSqYDfS9pE440lRGHDcgvn_QyxlootOhTX9du_BWKAJeKamBFax6qhIMHSKdE8n4RPcQIdC_hMDAgWUcQeS8Fv0zw7Ou8sZYaDAoLidT4wa2uN4eNtSD8cLvdWKw5fHAB0YNrmStld5iZGldlz-2WDKTKJ'
  },
  {
    name: 'Sourdough Loaf',
    category: 'Breads',
    price: 7,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCuUHGqh88Vnrt0Fz9Di91m99EZQN5Mh1pZ_A1uCIEFJDw1lP0LX6QDb1_FreKXXVrGZnw_Rh9Dthm92vhc79FFi_22UBc4yYo0yvaKnElNyAIUtHxFZ5QiVFKCwoI34hi1SfVQI72J2c2xvYRGjMG9Qi4b9E6jNIRsiTex3Miga1HQvcLpTOKdiYCSUvO9c0mX9Vil-AQoTUA6kbprX39grg1_pgFirpTAfsXbTlPndBQbq_W4b2lFW9nSS328drhyMwSi2THSsbhY'
  },
  {
    name: 'Blueberry Muffin',
    category: 'Pastries',
    price: 3.25,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCeY8o0TWcBRLu7SufcDrhGMdaB4SuCtAEnUs6pxzYx1oZrQcow2Dewelb6CECiAnQgG3FPZdY06EfGt1e8nDmMuIARcXLEy0rlUErJLLziDb1dUTudALHTHuJL3yxwhasYDkPpT2y78NJ9gzHLDHpKqdkPBQX7CBoCM7_kr1OSA8T7bWLkwmT_pV-0DwQtUBqKfUYNGzUEl8uzrKDzVDtzDsFtWN9qzcFhnf_b6mae6E5Bh3zvrapriV5GCKFUtDdF-OeevS-pcghH'
  },
  {
    name: 'French Baguette',
    category: 'Breads',
    price: 2.75,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCUDcPDX99bjqvzbAeW8AnH_6PAaUPfNiNmz5UFsnCkwnkpXry2d_8X2JQUTgXlTZ0brR9GqKfBOF3EN05nn4WJFmsxuaMGQKQblthFIwgLksOOpE9y7EHr9cQAZ50WnsgekcaFmtDJzczHx8mO3YXK0EuvGkfOK5rSn01NQ-AKD2MFg-P4BhbSAXEjjg0R2RUo7B-823aT0XrmcBAGLqte6dg2out4S4fDqJHVwYt5T7j0TB657Vs-IQkFeLd2oh1anvsjLORgZT3g'
  },
  {
    name: 'Macarons (Box of 6)',
    category: 'Pastries',
    price: 12,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBDEhYrRN9wgFtGXiMmug5TZLh-sGFcUIRDZbIivBOct-EUbfY7BUnAHypRSUgfqcY34l5y1TlbDqtAAg0xpkeGNU65rpKGXpF53tguosAKaDx-_qtz9Y1nf0KdQBFPzfXNbu-TOMOSVxlWLkN3lOh5HwJi5r-K4iZTD8UQy0vtZ8ySbyJWjEs8VWc3u9bL1Exk7hZzX7jk9C-q_qLQwZvx8vQ9tPZ2oQyZkopEiJkSG7APceIeJU91kVQbL2Xr7s39KUL5sDk9HaqH'
  },
  {
    name: 'Caffe Latte',
    category: 'Beverages',
    price: 4.25,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC-QHfl2pprwWqsx8p5TU4ckhlZEh6YMGhMxVQBTH6dfN0dpFnWAfn2SaFsbEE8n_eNrTl1YSMVT1iOpVnVrlIB6sJu2gmwI4BUIGcmCoGxowEbBIXKxCUCPaO0Gb3hGpObw37aUHeLfpdn72Q3RdMbWI6Okn3yfOx0ycw-nXMd3NtLIih8hQ54I2yuNMbtH8DUTUku2kZikKRv7huAqs3CKh-kZ6uOVsh3DGpYKVMIexXHB_OTo-m2meNg7R3HZa5-Pj4A9wr9xNbv'
  },
  {
    name: 'Cinnamon Roll',
    category: 'Pastries',
    price: 4.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBm0ZTPGOplx7_dGB5YNv_8TshQkMSwiZZkWGMjlnp5-zkrngqPxWpZOhiIA4hyS_PGhcJAPJHn8MqFISVSLW9iqfFJkpre_EL5OfIFdmqcwvD3Gm02qbuI61C08cUnmMlBJaZ_mNt5tRvV9UYNDDJd8em1OHyqNhai0Ww1GC5ADupmzBcUQcjViM3QYHSi1IZkd1TuNzQxt8qcYi3LBwRQiEfX4il5qEr8g9tTjG9eomuvkvby_ua0La1LZA6TvwCXWmHancZEZIbb'
  }
];

await sql.begin(async (tx) => {
  await tx.unsafe(schema);

  await tx`delete from sales_order_items;`;
  await tx`delete from sales_orders;`;
  await tx`delete from products;`;
  await tx`delete from categories;`;

  for (const category of categories) {
    await tx`insert into categories (name) values (${category});`;
  }

  for (const product of products) {
    const category = await tx`
      select id from categories where name = ${product.category} limit 1;
    `;
    await tx`
      insert into products (category_id, name, price, image_url, is_active)
      values (${category[0].id}, ${product.name}, ${product.price}, ${product.image}, true);
    `;
  }

  const order = await tx`
    insert into sales_orders(order_no, customer_name, status)
    values ('ORD-8429', 'Walk-in Customer', 'open')
    returning id;
  `;

  const seedItems = [
    { name: 'Butter Croissant', quantity: 2 },
    { name: 'Sourdough Loaf', quantity: 1 },
    { name: 'Caffe Latte', quantity: 1 }
  ];

  for (const item of seedItems) {
    const product = await tx`
      select id, price::text as price
      from products where name = ${item.name} limit 1;
    `;

    const unitPrice = Number(product[0].price);
    await tx`
      insert into sales_order_items(order_id, product_id, quantity, unit_price, line_total)
      values (${order[0].id}, ${product[0].id}, ${item.quantity}, ${unitPrice}, ${unitPrice * item.quantity});
    `;
  }

  const totals = await tx`
    select coalesce(sum(line_total), 0)::text as subtotal
    from sales_order_items
    where order_id = ${order[0].id};
  `;

  const subtotal = Number(totals[0].subtotal);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  await tx`
    update sales_orders
    set subtotal = ${subtotal}, tax = ${tax}, total = ${total}
    where id = ${order[0].id};
  `;
});

await sql.end();
console.log('Neon database seeded successfully.');
