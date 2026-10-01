const Database = require("better-sqlite3");
const db = new Database("bytevault.sqlite");

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  capacity TEXT NOT NULL,
  interface TEXT NOT NULL,
  type TEXT NOT NULL,
  condition TEXT NOT NULL,
  health INTEGER,
  power_on_hours INTEGER,
  bad_sectors INTEGER,
  drive_status TEXT,
  tested INTEGER DEFAULT 0,
  rpm INTEGER,
  read_speed TEXT,
  write_speed TEXT,
  warranty TEXT,
  price INTEGER NOT NULL,
  old_price INTEGER,
  stock INTEGER DEFAULT 0,
  image TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  customer_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;

if (count === 0) {
  const seed = db.prepare(`
    INSERT INTO products
    (name,category,brand,capacity,interface,type,condition,health,power_on_hours,bad_sectors,drive_status,tested,rpm,read_speed,write_speed,warranty,price,old_price,stock,image)
    VALUES (@name,@category,@brand,@capacity,@interface,@type,@condition,@health,@power_on_hours,@bad_sectors,@drive_status,@tested,@rpm,@read_speed,@write_speed,@warranty,@price,@old_price,@stock,@image)
  `);

  const products = [
    {
      name:"WD Blue 1TB HDD", category:"HDD", brand:"Western Digital", capacity:"1TB", interface:"SATA III",
      type:"HDD", condition:"Used", health:100, power_on_hours:1840, bad_sectors:0, drive_status:"Good", tested:1,
      rpm:7200, read_speed:"150 MB/s", write_speed:"145 MB/s", warranty:"30 Days", price:1399, old_price:1699, stock:8,
      image:"/assets/hdd.svg"
    },
    {
      name:"Seagate Barracuda 2TB", category:"HDD", brand:"Seagate", capacity:"2TB", interface:"SATA III",
      type:"HDD", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:7200, read_speed:"190 MB/s", write_speed:"180 MB/s", warranty:"1 Year", price:4299, old_price:4799, stock:5,
      image:"/assets/hdd.svg"
    },
    {
      name:"Crucial BX500 1TB SSD", category:"SSD", brand:"Crucial", capacity:"1TB", interface:"SATA III",
      type:"SSD", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"540 MB/s", write_speed:"500 MB/s", warranty:"3 Years", price:4899, old_price:5599, stock:7,
      image:"/assets/ssd.svg"
    },
    {
      name:"Samsung 980 1TB NVMe", category:"SSD", brand:"Samsung", capacity:"1TB", interface:"PCIe 3.0 NVMe",
      type:"SSD", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"3500 MB/s", write_speed:"3000 MB/s", warranty:"5 Years", price:6199, old_price:6999, stock:4,
      image:"/assets/ssd.svg"
    },
    {
      name:"Kingston Fury Beast 16GB", category:"RAM", brand:"Kingston", capacity:"16GB", interface:"DDR4 3200MHz",
      type:"RAM", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"—", write_speed:"—", warranty:"Lifetime", price:3299, old_price:3799, stock:12,
      image:"/assets/ram.svg"
    },
    {
      name:"Corsair Vengeance 16GB", category:"Desktop RAM", brand:"Corsair", capacity:"16GB", interface:"DDR5 5200MHz",
      type:"RAM", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"—", write_speed:"—", warranty:"Lifetime", price:4999, old_price:5599, stock:6,
      image:"/assets/ram.svg"
    },
    {
      name:"Kingston Laptop RAM 8GB", category:"Laptop RAM", brand:"Kingston", capacity:"8GB", interface:"DDR4 3200MHz",
      type:"RAM", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"—", write_speed:"—", warranty:"Lifetime", price:1799, old_price:2099, stock:10,
      image:"/assets/ram.svg"
    },
    {
      name:"ByteVault Portable SSD 1TB", category:"External Storage", brand:"ByteVault", capacity:"1TB", interface:"USB 3.2 Gen 2",
      type:"External SSD", condition:"New", health:null, power_on_hours:null, bad_sectors:null, drive_status:null, tested:1,
      rpm:null, read_speed:"1050 MB/s", write_speed:"1000 MB/s", warranty:"2 Years", price:6999, old_price:7499, stock:3,
      image:"/assets/ssd.svg"
    }
  ];

  const insertMany = db.transaction(items => items.forEach(item => seed.run(item)));
  insertMany(products);
}

function getProducts() {
  return db.prepare("SELECT * FROM products ORDER BY datetime(created_at) DESC").all();
}
function getProduct(id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
}
function createOrder(order) {
  const stmt = db.prepare(`
    INSERT INTO orders
    (order_id, customer_json, items_json, subtotal, delivery, total, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    stmt.run(
      order.orderId,
      JSON.stringify(order.customer),
      JSON.stringify(order.items),
      order.subtotal,
      order.delivery,
      order.total,
      order.paymentMethod,
      order.notes
    );
    for (const item of order.items) {
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.productId);
    }
  });
  tx();
}

module.exports = { getProducts, getProduct, createOrder };
