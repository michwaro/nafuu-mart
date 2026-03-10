import { useEffect, useRef, useState } from "react";
import {
  authSignInWithOAuth,
  authRequestPasswordReset,
  authResendVerification,
  authSignIn,
  authSignOut,
  authSignUp,
  authUpdatePassword,
  getAuthRuntime,
  isSupabaseMode,
  restoreSession,
} from "./authProvider";
import {
  initiatePesapalPayment,
  checkPesapalPaymentStatus,
  isPesapalConfigured,
} from "./pesapalProvider";

const ORDERS_KEY = "nafuu-orders";
const CART_KEY = "nafuu-cart";
const WISHLIST_KEY = "nafuu-wishlist";
const CATALOG_KEY = "nafuu-catalog";

const PRODUCTS = [
  { id: "p01", brand: "HP", name: "Elitebook 840 G8", spec: "Core i5 11th Gen · 8GB · 256GB · Touch", grade: "A", price: 40000, market: 54000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch"], description: "Business-class HP Elitebook 840 G8 with 11th Gen Core i5, 8GB RAM, 256GB SSD, and responsive FHD touch display.", longDescription: "Overview: Business-class HP Elitebook 840 G8 with 11th Gen Core i5, 8GB RAM, 256GB SSD, and responsive FHD touch display. Specs: Core i5 11th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 40,000 vs market KSh 54,000 (save about KSh 14,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p02", brand: "HP", name: "Elitebook 840 G7", spec: "Core i5 10th Gen · 8GB · 256GB · Touch", grade: "A", price: 38000, market: 49000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch"], description: "Sleek 14-inch business ultrabook with 10th Gen Core i5 and intuitive touchscreen.", longDescription: "Overview: Sleek 14-inch business ultrabook with 10th Gen Core i5 and intuitive touchscreen. Specs: Core i5 10th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 38,000 vs market KSh 49,000 (save about KSh 11,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p03", brand: "HP", name: "Elitebook 830 G8", spec: "Core i7 11th Gen · 16GB · 512GB · Touch", grade: "A", price: 48500, market: 62000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch"], description: "Powerful 13.3-inch ultraportable with 11th Gen Core i7, 16GB RAM, and spacious 512GB SSD.", longDescription: "Overview: Powerful 13.3-inch ultraportable with 11th Gen Core i7, 16GB RAM, and spacious 512GB SSD. Specs: Core i7 11th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 48,500 vs market KSh 62,000 (save about KSh 13,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p04", brand: "HP", name: "Elitebook 830 G8", spec: "Core i7 11th Gen · 16GB · 512GB · No Touch", grade: "A", price: 46000, market: 59000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "High-performance compact laptop with Core i7 11th Gen and generous 16GB RAM for demanding workflows.", longDescription: "Overview: High-performance compact laptop with Core i7 11th Gen and generous 16GB RAM for demanding workflows. Specs: Core i7 11th Gen · 16GB · 512GB · No Touch. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 46,000 vs market KSh 59,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p05", brand: "HP", name: "Elitebook 830 G8", spec: "Core i7 11th Gen · 8GB · 256GB · Touch", grade: "A", price: 43000, market: 55000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch"], description: "Balanced configuration featuring Core i7 processing power with touchscreen convenience at an attractive price point.", longDescription: "Overview: Balanced configuration featuring Core i7 processing power with touchscreen convenience at an attractive price point. Specs: Core i7 11th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 43,000 vs market KSh 55,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p06", brand: "HP", name: "Elitebook 830 G7", spec: "Core i5 10th Gen · 8GB · 256GB · No Touch", grade: "A", price: 32000, market: 42000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Dependable business workhorse with 10th Gen Core i5 delivering smooth performance for everyday tasks.", longDescription: "Overview: Dependable business workhorse with 10th Gen Core i5 delivering smooth performance for everyday tasks. Specs: Core i5 10th Gen · 8GB · 256GB · No Touch. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 32,000 vs market KSh 42,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p07", brand: "HP", name: "Elitebook 1030 G3", spec: "Core i7 8th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 48500, market: 60000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "360", "touch"], description: "Versatile 2-in-1 convertible with 360-degree hinge transforms from laptop to tablet mode instantly.", longDescription: "Overview: Versatile 2-in-1 convertible with 360-degree hinge transforms from laptop to tablet mode instantly. Specs: Core i7 8th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 48,500 vs market KSh 60,000 (save about KSh 11,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p08", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 12th Gen · 16GB · 512GB · Touch", grade: "A", price: 74000, market: 90000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7", "touch"], description: "Flagship ThinkPad X1 Carbon featuring cutting-edge 12th Gen Intel Core i7 with hybrid architecture for exceptional performance.", longDescription: "Overview: Flagship ThinkPad X1 Carbon featuring cutting-edge 12th Gen Intel Core i7 with hybrid architecture for exceptional performance. Specs: Core i7 12th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 74,000 vs market KSh 90,000 (save about KSh 16,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p09", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 11th Gen · 16GB · 512GB · Touch", grade: "A", price: 61000, market: 75000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7", "touch"], description: "Award-winning X1 Carbon business laptop with 11th Gen Core i7 and ample 16GB memory for power users.", longDescription: "Overview: Award-winning X1 Carbon business laptop with 11th Gen Core i7 and ample 16GB memory for power users. Specs: Core i7 11th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 61,000 vs market KSh 75,000 (save about KSh 14,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p10", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 10th Gen · 16GB · 1TB · Touch", grade: "A", price: 56500, market: 70000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7", "touch"], description: "Exceptional storage capacity with full 1TB SSD paired with Core i7 10th Gen and 16GB RAM.", longDescription: "Overview: Exceptional storage capacity with full 1TB SSD paired with Core i7 10th Gen and 16GB RAM. Specs: Core i7 10th Gen · 16GB · 1TB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 56,500 vs market KSh 70,000 (save about KSh 13,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p11", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 10th Gen · 16GB · 512GB · Touch", grade: "A", price: 54000, market: 67000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7", "touch"], description: "Classic X1 Carbon configuration balancing performance, storage, and value.", longDescription: "Overview: Classic X1 Carbon configuration balancing performance, storage, and value. Specs: Core i7 10th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 54,000 vs market KSh 67,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p12", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 10th Gen · 16GB · 512GB · No Touch", grade: "A", price: 51000, market: 63000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7"], description: "Lightweight business ultrabook weighing under 1.2kg without compromising on Core i7 power and 16GB memory.", longDescription: "Overview: Lightweight business ultrabook weighing under 1.2kg without compromising on Core i7 power and 16GB memory. Specs: Core i7 10th Gen · 16GB · 512GB · No Touch. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 51,000 vs market KSh 63,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p13", brand: "Lenovo", name: "X1 Carbon", spec: "Core i7 8th Gen · 16GB · 512GB · Touch", grade: "A", price: 40000, market: 52000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "carbon", "lenovo", "i7", "touch"], description: "Budget-friendly entry into the X1 Carbon lineup with 8th Gen Core i7 still delivering strong performance.", longDescription: "Overview: Budget-friendly entry into the X1 Carbon lineup with 8th Gen Core i7 still delivering strong performance. Specs: Core i7 8th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 40,000 vs market KSh 52,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p14", brand: "Lenovo", name: "X1 Yoga", spec: "Core i7 11th Gen · 32GB · 512GB · Touch · 360°", grade: "A", price: 67000, market: 82000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "yoga", "lenovo", "i7", "360", "touch"], description: "Premium convertible powerhouse with massive 32GB RAM for intensive multitasking and virtualization.", longDescription: "Overview: Premium convertible powerhouse with massive 32GB RAM for intensive multitasking and virtualization. Specs: Core i7 11th Gen · 32GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 67,000 vs market KSh 82,000 (save about KSh 15,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p15", brand: "Lenovo", name: "X1 Yoga", spec: "Core i7 11th Gen · 16GB · 1TB · Touch · 360°", grade: "A", price: 67000, market: 82000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "yoga", "lenovo", "i7", "360", "touch"], description: "Massive 1TB storage meets versatile 2-in-1 design with Core i7 11th Gen performance.", longDescription: "Overview: Massive 1TB storage meets versatile 2-in-1 design with Core i7 11th Gen performance. Specs: Core i7 11th Gen · 16GB · 1TB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 67,000 vs market KSh 82,000 (save about KSh 15,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p16", brand: "Lenovo", name: "X1 Yoga", spec: "Core i7 11th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 62500, market: 78000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "yoga", "lenovo", "i7", "360", "touch"], description: "Well-balanced X1 Yoga with 11th Gen Core i7, 16GB RAM, and fast 512GB SSD in flexible 2-in-1 form.", longDescription: "Overview: Well-balanced X1 Yoga with 11th Gen Core i7, 16GB RAM, and fast 512GB SSD in flexible 2-in-1 form. Specs: Core i7 11th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 62,500 vs market KSh 78,000 (save about KSh 15,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p17", brand: "Lenovo", name: "X1 Yoga", spec: "Core i7 8th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 41500, market: 53000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x1", "yoga", "lenovo", "i7", "360", "touch"], description: "Affordable entry into premium 2-in-1 laptops with 8th Gen Core i7 and 16GB memory.", longDescription: "Overview: Affordable entry into premium 2-in-1 laptops with 8th Gen Core i7 and 16GB memory. Specs: Core i7 8th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 41,500 vs market KSh 53,000 (save about KSh 11,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p18", brand: "Lenovo", name: "P14s", spec: "Core i7 11th Gen · 16GB · 512GB · Touch · 4GB GPU", grade: "A", price: 55500, market: 69000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["p14s", "lenovo", "i7", "graphics"], description: "Mobile workstation with dedicated 4GB GPU perfect for CAD, 3D rendering, and video editing.", longDescription: "Overview: Mobile workstation with dedicated 4GB GPU perfect for CAD, 3D rendering, and video editing. Specs: Core i7 11th Gen · 16GB · 512GB · Touch · 4GB GPU. Best For: design tools, content creation, and heavier multitasking workloads. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 55,500 vs market KSh 69,000 (save about KSh 13,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p19", brand: "Lenovo", name: "P1", spec: "Core i7 9th Gen · 16GB · 512GB · 4GB GPU", grade: "A", price: 53000, market: 65000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["p1", "lenovo", "i7", "graphics"], description: "Professional-grade ThinkPad P1 workstation combining portability with discrete graphics performance.", longDescription: "Overview: Professional-grade ThinkPad P1 workstation combining portability with discrete graphics performance. Specs: Core i7 9th Gen · 16GB · 512GB · 4GB GPU. Best For: design tools, content creation, and heavier multitasking workloads. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 53,000 vs market KSh 65,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p20", brand: "Lenovo", name: "T14s", spec: "Core i7 10th Gen · 16GB · 256GB", grade: "A", price: 40000, market: 50000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["t14s", "lenovo", "i7"], description: "Slim and light ThinkPad T14s with Core i7 10th Gen and ample 16GB memory for efficient multitasking.", longDescription: "Overview: Slim and light ThinkPad T14s with Core i7 10th Gen and ample 16GB memory for efficient multitasking. Specs: Core i7 10th Gen · 16GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 40,000 vs market KSh 50,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p21", brand: "Lenovo", name: "ThinkBook", spec: "Core i7 10th Gen · 16GB · 512GB", grade: "A", price: 45000, market: 57000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["thinkbook", "lenovo", "i7"], description: "Modern business laptop with sleek design combining Core i7 power and generous 512GB storage.", longDescription: "Overview: Modern business laptop with sleek design combining Core i7 power and generous 512GB storage. Specs: Core i7 10th Gen · 16GB · 512GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 45,000 vs market KSh 57,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p22", brand: "Lenovo", name: "T480s", spec: "Core i5 8th Gen · 8GB · 256GB", grade: "B", price: 23500, market: 31000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["t480", "lenovo", "i5"], description: "Budget-friendly ThinkPad workhorse with Core i5 8th Gen delivering solid everyday performance.", longDescription: "Overview: Budget-friendly ThinkPad workhorse with Core i5 8th Gen delivering solid everyday performance. Specs: Core i5 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 23,500 vs market KSh 31,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p23", brand: "Lenovo", name: "X280", spec: "Core i5 8th Gen · 8GB · 256GB", grade: "B", price: 22500, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x280", "lenovo", "i5"], description: "Ultra-portable 12.5-inch ThinkPad perfect for mobile professionals prioritizing lightness.", longDescription: "Overview: Ultra-portable 12.5-inch ThinkPad perfect for mobile professionals prioritizing lightness. Specs: Core i5 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 22,500 vs market KSh 30,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p24", brand: "Lenovo", name: "Yoga 390", spec: "Core i5 8th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 28000, market: 37000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i5", "360", "touch"], description: "Compact convertible laptop with 360-degree hinge and touchscreen for versatile usage modes.", longDescription: "Overview: Compact convertible laptop with 360-degree hinge and touchscreen for versatile usage modes. Specs: Core i5 8th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 28,000 vs market KSh 37,000 (save about KSh 9,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p25", brand: "Lenovo", name: "X260 / X270", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 18000, market: 24000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x260", "x270", "lenovo", "i5"], description: "Reliable and affordable ThinkPad ultraportable in 12-inch form factor ideal for basic computing needs.", longDescription: "Overview: Reliable and affordable ThinkPad ultraportable in 12-inch form factor ideal for basic computing needs. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 18,000 vs market KSh 24,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p26", brand: "Lenovo", name: "X250", spec: "Core i5 5th Gen · 8GB · 256GB", grade: "B", price: 15500, market: 21000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["x250", "lenovo", "i5"], description: "Entry-level ThinkPad offering legendary durability and keyboard at an affordable price point.", longDescription: "Overview: Entry-level ThinkPad offering legendary durability and keyboard at an affordable price point. Specs: Core i5 5th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 15,500 vs market KSh 21,000 (save about KSh 5,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p27", brand: "Lenovo", name: "Yoga 11e", spec: "Core i5 7th Gen · 8GB · 128GB · Touch · 360°", grade: "B", price: 16500, market: 22000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i5", "360"], description: "Education-focused convertible laptop designed for durability and versatility.", longDescription: "Overview: Education-focused convertible laptop designed for durability and versatility. Specs: Core i5 7th Gen · 8GB · 128GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 16,500 vs market KSh 22,000 (save about KSh 5,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p28", brand: "Lenovo", name: "Yoga 300e", spec: "Intel Celeron · 4GB · 128GB · Touch · Stylus", grade: "B", price: 14000, market: 19000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "celeron", "stylus"], description: "Budget-friendly convertible with stylus support perfect for digital note-taking and basic computing.", longDescription: "Overview: Budget-friendly convertible with stylus support perfect for digital note-taking and basic computing. Specs: Intel Celeron · 4GB · 128GB · Touch · Stylus. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 14,000 vs market KSh 19,000 (save about KSh 5,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // Phones & Smartphones
  { id: "p29", brand: "Samsung", name: "Galaxy A54", spec: "128GB · 8GB RAM · 5G · 50MP Camera", grade: "New", price: 38000, market: 45000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["samsung", "galaxy", "5g", "new"], description: "Brand new Samsung Galaxy A54 featuring vibrant 120Hz AMOLED display and powerful 50MP camera system.", longDescription: "Overview: Brand new Samsung Galaxy A54 featuring vibrant 120Hz AMOLED display and powerful 50MP camera system. Specs: 128GB · 8GB RAM · 5G · 50MP Camera. Best For: fast browsing, social apps, streaming, and always-connected daily communication. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 38,000 vs market KSh 45,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p30", brand: "Samsung", name: "Galaxy A34", spec: "128GB · 6GB RAM · 5G · 48MP Camera", grade: "New", price: 32000, market: 38000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["samsung", "galaxy", "5g", "new"], description: "Excellent mid-range 5G smartphone with stunning Super AMOLED screen and capable 48MP camera.", longDescription: "Overview: Excellent mid-range 5G smartphone with stunning Super AMOLED screen and capable 48MP camera. Specs: 128GB · 6GB RAM · 5G · 48MP Camera. Best For: fast browsing, social apps, streaming, and always-connected daily communication. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 32,000 vs market KSh 38,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p31", brand: "Samsung", name: "Galaxy S21", spec: "256GB · 8GB RAM · 5G · Flagship", grade: "A", price: 42000, market: 52000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["samsung", "galaxy", "5g", "flagship"], description: "Former flagship Galaxy S21 with premium features including 120Hz display, powerful Exynos processor, and professional-grade camera trio.", longDescription: "Overview: Former flagship Galaxy S21 with premium features including 120Hz display, powerful Exynos processor, and professional-grade camera trio. Specs: 256GB · 8GB RAM · 5G · Flagship. Best For: fast browsing, social apps, streaming, and always-connected daily communication. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 42,000 vs market KSh 52,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p32", brand: "Apple", name: "iPhone 12", spec: "128GB · 5G · A14 Bionic", grade: "A", price: 48000, market: 58000, category: "phone", image: "https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500&h=500&fit=crop", tags: ["iphone", "apple", "5g"], description: "Popular iPhone 12 with 5G connectivity and powerful A14 Bionic chip supporting latest iOS features.", longDescription: "Overview: Popular iPhone 12 with 5G connectivity and powerful A14 Bionic chip supporting latest iOS features. Specs: 128GB · 5G · A14 Bionic. Best For: fast browsing, social apps, streaming, and always-connected daily communication. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 48,000 vs market KSh 58,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p33", brand: "Apple", name: "iPhone 11", spec: "128GB · Dual Camera · A13 Bionic", grade: "A", price: 38000, market: 47000, category: "phone", image: "https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500&h=500&fit=crop", tags: ["iphone", "apple"], description: "Reliable iPhone 11 featuring excellent dual-camera system and A13 Bionic chip providing smooth iOS experience.", longDescription: "Overview: Reliable iPhone 11 featuring excellent dual-camera system and A13 Bionic chip providing smooth iOS experience. Specs: 128GB · Dual Camera · A13 Bionic. Best For: photos, social content creation, and dependable everyday smartphone use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 38,000 vs market KSh 47,000 (save about KSh 9,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p34", brand: "Tecno", name: "Spark 10 Pro", spec: "256GB · 8GB RAM · 50MP Camera", grade: "New", price: 18500, market: 22000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["tecno", "spark", "new"], description: "Latest Tecno Spark 10 Pro offering impressive value with large 256GB storage and capable 50MP camera.", longDescription: "Overview: Latest Tecno Spark 10 Pro offering impressive value with large 256GB storage and capable 50MP camera. Specs: 256GB · 8GB RAM · 50MP Camera. Best For: photos, social content creation, and dependable everyday smartphone use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 18,500 vs market KSh 22,000 (save about KSh 3,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p35", brand: "Infinix", name: "Note 30", spec: "256GB · 8GB RAM · 108MP Camera", grade: "New", price: 21000, market: 26000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["infinix", "note", "new"], description: "Outstanding camera phone with massive 108MP sensor capturing ultra-detailed photos.", longDescription: "Overview: Outstanding camera phone with massive 108MP sensor capturing ultra-detailed photos. Specs: 256GB · 8GB RAM · 108MP Camera. Best For: photos, social content creation, and dependable everyday smartphone use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 21,000 vs market KSh 26,000 (save about KSh 5,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p36", brand: "Xiaomi", name: "Redmi Note 12", spec: "128GB · 6GB RAM · 5G · 50MP Camera", grade: "New", price: 24000, market: 29000, category: "phone", image: "https://images.unsplash.com/photo-1610945415295-d9bbf7ce3350?w=500&h=500&fit=crop", tags: ["xiaomi", "redmi", "5g", "new"], description: "Popular Redmi Note 12 bringing 5G connectivity to mid-range pricing with reliable performance.", longDescription: "Overview: Popular Redmi Note 12 bringing 5G connectivity to mid-range pricing with reliable performance. Specs: 128GB · 6GB RAM · 5G · 50MP Camera. Best For: fast browsing, social apps, streaming, and always-connected daily communication. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 24,000 vs market KSh 29,000 (save about KSh 5,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // Audio Devices
  { id: "p37", brand: "Apple", name: "AirPods Pro 2", spec: "Active Noise Cancellation · USB-C", grade: "New", price: 28000, market: 35000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["airpods", "apple", "earbuds", "anc", "new"], description: "Premium AirPods Pro 2nd Generation with industry-leading Active Noise Cancellation and Transparency mode.", longDescription: "Overview: Premium AirPods Pro 2nd Generation with industry-leading Active Noise Cancellation and Transparency mode. Specs: Active Noise Cancellation · USB-C. Best For: focused listening during commuting, travel, and busy environments. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 28,000 vs market KSh 35,000 (save about KSh 7,000). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p38", brand: "Apple", name: "AirPods 3", spec: "Spatial Audio · Wireless Charging", grade: "New", price: 19500, market: 24000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["airpods", "apple", "earbuds", "new"], description: "Latest AirPods 3rd Gen with immersive Spatial Audio and improved sound quality.", longDescription: "Overview: Latest AirPods 3rd Gen with immersive Spatial Audio and improved sound quality. Specs: Spatial Audio · Wireless Charging. Best For: music, calls, podcasts, and daily entertainment. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 19,500 vs market KSh 24,000 (save about KSh 4,500). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p39", brand: "Samsung", name: "Galaxy Buds2 Pro", spec: "Active Noise Cancellation · 360 Audio", grade: "New", price: 16000, market: 20000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["samsung", "earbuds", "anc", "new"], description: "Premium Samsung earbuds with intelligent ANC adapting to your environment and immersive 360 Audio.", longDescription: "Overview: Premium Samsung earbuds with intelligent ANC adapting to your environment and immersive 360 Audio. Specs: Active Noise Cancellation · 360 Audio. Best For: focused listening during commuting, travel, and busy environments. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 16,000 vs market KSh 20,000 (save about KSh 4,000). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p40", brand: "Anker", name: "Soundcore Life P3", spec: "ANC · 35hr Playtime · App Control", grade: "New", price: 5500, market: 7500, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["anker", "earbuds", "anc", "new"], description: "Budget-friendly earbuds delivering impressive Active Noise Cancellation and marathon 35-hour battery life.", longDescription: "Overview: Budget-friendly earbuds delivering impressive Active Noise Cancellation and marathon 35-hour battery life. Specs: ANC · 35hr Playtime · App Control. Best For: focused listening during commuting, travel, and busy environments. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 5,500 vs market KSh 7,500 (save about KSh 2,000). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p41", brand: "JBL", name: "Tune 770NC", spec: "Wireless Headphones · ANC · 70hr Battery", grade: "New", price: 9500, market: 13000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["jbl", "headphones", "anc", "new"], description: "Over-ear wireless headphones with legendary JBL Pure Bass sound and effective Noise Cancellation.", longDescription: "Overview: Over-ear wireless headphones with legendary JBL Pure Bass sound and effective Noise Cancellation. Specs: Wireless Headphones · ANC · 70hr Battery. Best For: focused listening during commuting, travel, and busy environments. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 9,500 vs market KSh 13,000 (save about KSh 3,500). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p42", brand: "Sony", name: "WH-CH520", spec: "Wireless Headphones · 50hr Battery", grade: "New", price: 6500, market: 9000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["sony", "headphones", "new"], description: "Affordable Sony wireless headphones with signature clear sound and impressive 50-hour playback.", longDescription: "Overview: Affordable Sony wireless headphones with signature clear sound and impressive 50-hour playback. Specs: Wireless Headphones · 50hr Battery. Best For: extended listening sessions without frequent recharging. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 6,500 vs market KSh 9,000 (save about KSh 2,500). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p43", brand: "Oraimo", name: "FreePods 3", spec: "Wireless Earbuds · 20hr Battery", grade: "New", price: 2800, market: 4000, category: "audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop", tags: ["oraimo", "earbuds", "new"], description: "Entry-level true wireless earbuds offering reliable performance and decent sound quality.", longDescription: "Overview: Entry-level true wireless earbuds offering reliable performance and decent sound quality. Specs: Wireless Earbuds · 20hr Battery. Best For: extended listening sessions without frequent recharging. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 2,800 vs market KSh 4,000 (save about KSh 1,200). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  
  // Accessories
  { id: "p44", brand: "Anker", name: "PowerCore 20000", spec: "20000mAh · Dual USB · Fast Charge", grade: "New", price: 4200, market: 6000, category: "accessory", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop", tags: ["anker", "powerbank", "charger", "new"], description: "High-capacity 20000mAh power bank capable of charging phones 5-6 times or laptops multiple times.", longDescription: "Overview: High-capacity 20000mAh power bank capable of charging phones 5-6 times or laptops multiple times. Specs: 20000mAh · Dual USB · Fast Charge. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 4,200 vs market KSh 6,000 (save about KSh 1,800). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p45", brand: "Anker", name: "PowerCore 10000", spec: "10000mAh · Compact · Fast Charge", grade: "New", price: 2800, market: 4000, category: "accessory", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop", tags: ["anker", "powerbank", "charger", "new"], description: "Ultra-compact 10000mAh power bank fitting easily in pockets while providing 2-3 full phone charges.", longDescription: "Overview: Ultra-compact 10000mAh power bank fitting easily in pockets while providing 2-3 full phone charges. Specs: 10000mAh · Compact · Fast Charge. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 2,800 vs market KSh 4,000 (save about KSh 1,200). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p46", brand: "Anker", name: "PowerPort III 65W", spec: "GaN Charger · 3-Port · Fast Charge", grade: "New", price: 4500, market: 6500, category: "accessory", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop", tags: ["anker", "charger", "gan", "new"], description: "Advanced GaN technology charger delivering 65W power in compact form factor smaller than Apple charger.", longDescription: "Overview: Advanced GaN technology charger delivering 65W power in compact form factor smaller than Apple charger. Specs: GaN Charger · 3-Port · Fast Charge. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 4,500 vs market KSh 6,500 (save about KSh 2,000). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p47", brand: "Baseus", name: "100W GaN Charger", spec: "4-Port · PD 3.0 · GaN Technology", grade: "New", price: 5200, market: 7500, category: "accessory", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop", tags: ["baseus", "charger", "gan", "new"], description: "Powerful 100W 4-port GaN charger supporting PD 3.0 fast charging for multiple devices simultaneously.", longDescription: "Overview: Powerful 100W 4-port GaN charger supporting PD 3.0 fast charging for multiple devices simultaneously. Specs: 4-Port · PD 3.0 · GaN Technology. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 5,200 vs market KSh 7,500 (save about KSh 2,300). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p48", brand: "Ugreen", name: "USB-C Cable 2m", spec: "100W · Braided · Fast Charge", grade: "New", price: 800, market: 1200, category: "accessory", image: "https://images.unsplash.com/photo-1559163853-4b378003ac3e?w=500&h=500&fit=crop", tags: ["ugreen", "cable", "usbc", "new"], description: "Premium braided USB-C cable supporting up to 100W power delivery for fast laptop charging.", longDescription: "Overview: Premium braided USB-C cable supporting up to 100W power delivery for fast laptop charging. Specs: 100W · Braided · Fast Charge. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 800 vs market KSh 1,200 (save about KSh 400). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p49", brand: "Anker", name: "USB-C to Lightning", spec: "1.8m · MFi Certified · Fast Charge", grade: "New", price: 1800, market: 2500, category: "accessory", image: "https://images.unsplash.com/photo-1559163853-4b378003ac3e?w=500&h=500&fit=crop", tags: ["anker", "cable", "lightning", "new"], description: "Apple MFi certified USB-C to Lightning cable ensuring full compatibility and fast charging for iPhone/iPad.", longDescription: "Overview: Apple MFi certified USB-C to Lightning cable ensuring full compatibility and fast charging for iPhone/iPad. Specs: 1.8m · MFi Certified · Fast Charge. Best For: faster charging routines and efficient multi-device power management. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 1,800 vs market KSh 2,500 (save about KSh 700). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p50", brand: "Spigen", name: "iPhone 14 Case", spec: "Ultra Hybrid · Clear · Drop Protection", grade: "New", price: 1500, market: 2200, category: "accessory", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop", tags: ["spigen", "case", "iphone", "new"], description: "Popular Spigen Ultra Hybrid case combining clear back showcasing iPhone design with military-grade drop protection.", longDescription: "Overview: Popular Spigen Ultra Hybrid case combining clear back showcasing iPhone design with military-grade drop protection. Specs: Ultra Hybrid · Clear · Drop Protection. Best For: device protection while keeping daily handling practical and comfortable. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 1,500 vs market KSh 2,200 (save about KSh 700). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p51", brand: "Ringke", name: "Samsung S23 Case", spec: "Fusion · Clear · Military Grade", grade: "New", price: 1400, market: 2000, category: "accessory", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop", tags: ["ringke", "case", "samsung", "new"], description: "Ringke Fusion case offering military-grade drop protection with crystal-clear back and shock-absorbent bumper.", longDescription: "Overview: Ringke Fusion case offering military-grade drop protection with crystal-clear back and shock-absorbent bumper. Specs: Fusion · Clear · Military Grade. Best For: device protection while keeping daily handling practical and comfortable. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 1,400 vs market KSh 2,000 (save about KSh 600). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p52", brand: "amFilm", name: "Tempered Glass", spec: "Universal · 2-Pack · 9H Hardness", grade: "New", price: 600, market: 1000, category: "accessory", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop", tags: ["screen protector", "glass", "new"], description: "Premium tempered glass screen protector with 9H hardness rating resisting scratches and impacts.", longDescription: "Overview: Premium tempered glass screen protector with 9H hardness rating resisting scratches and impacts. Specs: Universal · 2-Pack · 9H Hardness. Best For: device protection while keeping daily handling practical and comfortable. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 600 vs market KSh 1,000 (save about KSh 400). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  
  // Small Electronics
  { id: "p53", brand: "Xiaomi", name: "Smart Standing Fan", spec: "DC Motor · App Control · 20hr Battery", grade: "New", price: 6500, market: 9000, category: "electronics", image: "https://images.unsplash.com/photo-1584622641295-c3ee44989b18?w=500&h=500&fit=crop", tags: ["xiaomi", "fan", "smart", "new"], description: "Smart pedestal fan with energy-efficient DC motor and app/voice control via Mi Home.", longDescription: "Overview: Smart pedestal fan with energy-efficient DC motor and app/voice control via Mi Home. Specs: DC Motor · App Control · 20hr Battery. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 6,500 vs market KSh 9,000 (save about KSh 2,500). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p54", brand: "Honeywell", name: "Table Fan 12\"", spec: "3-Speed · Oscillating · Quiet", grade: "New", price: 3200, market: 4500, category: "electronics", image: "https://images.unsplash.com/photo-1584622641295-c3ee44989b18?w=500&h=500&fit=crop", tags: ["honeywell", "fan", "new"], description: "Classic 12-inch table fan from trusted Honeywell brand with 3-speed settings and oscillation.", longDescription: "Overview: Classic 12-inch table fan from trusted Honeywell brand with 3-speed settings and oscillation. Specs: 3-Speed · Oscillating · Quiet. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 3,200 vs market KSh 4,500 (save about KSh 1,300). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p55", brand: "Philips", name: "LED Bulb 12W", spec: "Cool White · E27 · 3-Pack", grade: "New", price: 900, market: 1400, category: "electronics", image: "https://images.unsplash.com/photo-1588359348347-c716e76e506f?w=500&h=500&fit=crop", tags: ["philips", "led", "bulb", "new"], description: "Energy-efficient 12W LED bulbs equivalent to 100W incandescent providing bright cool white light.", longDescription: "Overview: Energy-efficient 12W LED bulbs equivalent to 100W incandescent providing bright cool white light. Specs: Cool White · E27 · 3-Pack. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 900 vs market KSh 1,400 (save about KSh 500). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p56", brand: "Xiaomi", name: "LED Smart Bulb", spec: "9W · RGB · App Control · Voice", grade: "New", price: 1800, market: 2800, category: "electronics", tags: ["xiaomi", "led", "bulb", "smart", "new"], description: "Smart RGB LED bulb with 16 million colors controlled via Mi Home app or voice assistants.", longDescription: "Overview: Smart RGB LED bulb with 16 million colors controlled via Mi Home app or voice assistants. Specs: 9W · RGB · App Control · Voice. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 1,800 vs market KSh 2,800 (save about KSh 1,000). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p57", brand: "Sony", name: "Pocket Radio ICF-P26", spec: "AM/FM · Speaker · Compact", grade: "New", price: 2400, market: 3500, category: "electronics", tags: ["sony", "radio", "new"], description: "Compact portable AM/FM radio with built-in speaker and headphone jack for private listening.", longDescription: "Overview: Compact portable AM/FM radio with built-in speaker and headphone jack for private listening. Specs: AM/FM · Speaker · Compact. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 2,400 vs market KSh 3,500 (save about KSh 1,100). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  { id: "p58", brand: "Rebeltec", name: "Bluetooth Speaker", spec: "10W · Waterproof · 8hr Battery", grade: "New", price: 2800, market: 4000, category: "electronics", tags: ["speaker", "bluetooth", "new"], description: "Portable Bluetooth speaker delivering 10W powerful sound with IPX7 waterproof rating for poolside use.", longDescription: "Overview: Portable Bluetooth speaker delivering 10W powerful sound with IPX7 waterproof rating for poolside use. Specs: 10W · Waterproof · 8hr Battery. Best For: dependable day-to-day use. Condition: Brand-new unit verified before listing for readiness and authenticity. Value: KSh 2,800 vs market KSh 4,000 (save about KSh 1,200). Purchase Note: Pre-delivery checks are completed before listing for confidence in everyday use." },
  
  // HP ZBook Workstation Series
  { id: "p59", brand: "HP", name: "ZBook G10", spec: "Core i7 13th Gen · 16GB · 512GB · Workstation", grade: "A", price: 68000, market: 82000, category: "laptop", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop", images: ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop"], tags: ["zbook", "hp", "i7", "workstation"], description: "Cutting-edge ZBook mobile workstation with latest 13th Gen Intel Core i7 and professional-grade components.", longDescription: "Overview: Cutting-edge ZBook mobile workstation with latest 13th Gen Intel Core i7 and professional-grade components. Specs: Core i7 13th Gen · 16GB · 512GB · Workstation. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 68,000 vs market KSh 82,000 (save about KSh 14,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p60", brand: "HP", name: "ZBook G10", spec: "Core i7 13th Gen · 16GB · 256GB · Workstation", grade: "A", price: 65000, market: 79000, category: "laptop", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop", tags: ["zbook", "hp", "i7", "workstation"], description: "Professional mobile workstation featuring 13th Gen Core i7 with 16GB RAM for complex engineering and creative tasks.", longDescription: "Overview: Professional mobile workstation featuring 13th Gen Core i7 with 16GB RAM for complex engineering and creative tasks. Specs: Core i7 13th Gen · 16GB · 256GB · Workstation. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 65,000 vs market KSh 79,000 (save about KSh 14,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p61", brand: "HP", name: "ZBook G8 14s", spec: "Core i7 11th Gen · 16GB · 512GB · 4GB GPU", grade: "A", price: 57000, market: 70000, category: "laptop", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop", tags: ["zbook", "hp", "i7", "workstation", "graphics"], description: "Compact workstation with dedicated 4GB professional GPU for CAD, rendering, and video editing workflows.", longDescription: "Overview: Compact workstation with dedicated 4GB professional GPU for CAD, rendering, and video editing workflows. Specs: Core i7 11th Gen · 16GB · 512GB · 4GB GPU. Best For: design tools, content creation, and heavier multitasking workloads. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 57,000 vs market KSh 70,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p62", brand: "HP", name: "ZBook G8 14s", spec: "Core i7 11th Gen · 16GB · 512GB · Workstation", grade: "A", price: 45000, market: 58000, category: "laptop", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&h=500&fit=crop", tags: ["zbook", "hp", "i7", "workstation"], description: "ZBook workstation-class build quality and reliability with Core i7 and 16GB RAM for professional workflows.", longDescription: "Overview: ZBook workstation-class build quality and reliability with Core i7 and 16GB RAM for professional workflows. Specs: Core i7 11th Gen · 16GB · 512GB · Workstation. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 45,000 vs market KSh 58,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p63", brand: "HP", name: "Elitebook 1040 G10", spec: "Core i7 13th Gen · 16GB · 512GB", grade: "A", price: 65000, market: 78000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "Flagship Elitebook 1040 with cutting-edge 13th Gen Core i7 and premium build quality.", longDescription: "Overview: Flagship Elitebook 1040 with cutting-edge 13th Gen Core i7 and premium build quality. Specs: Core i7 13th Gen · 16GB · 512GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 65,000 vs market KSh 78,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p64", brand: "HP", name: "Elitebook 1040 G10", spec: "Core i7 13th Gen · 16GB · 256GB", grade: "A", price: 63000, market: 76000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "Latest-gen Elitebook combining 13th Gen performance with elegant design and all-day battery.", longDescription: "Overview: Latest-gen Elitebook combining 13th Gen performance with elegant design and all-day battery. Specs: Core i7 13th Gen · 16GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 63,000 vs market KSh 76,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // Dell Precision & Latitude Series
  { id: "p65", brand: "Dell", name: "Precision 7560", spec: "Core i7 11th Gen · 16GB · 512GB · RTX 3000 6GB", grade: "A", price: 69000, market: 85000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "precision", "gaming", "i7", "rtx"], description: "Powerful mobile workstation with NVIDIA RTX 3000 6GB GPU perfect for 3D rendering, video editing, and AI workloads.", longDescription: "Overview: Powerful mobile workstation with NVIDIA RTX 3000 6GB GPU perfect for 3D rendering, video editing, and AI workloads. Specs: Core i7 11th Gen · 16GB · 512GB · RTX 3000 6GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 69,000 vs market KSh 85,000 (save about KSh 16,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p66", brand: "Dell", name: "Latitude 7410", spec: "Core i7 10th Gen · 16GB · 512GB", grade: "A", price: 34000, market: 44000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i7"], description: "Solid business laptop with 10th Gen Core i7 and ample 16GB RAM for smooth productivity.", longDescription: "Overview: Solid business laptop with 10th Gen Core i7 and ample 16GB RAM for smooth productivity. Specs: Core i7 10th Gen · 16GB · 512GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 34,000 vs market KSh 44,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p67", brand: "Dell", name: "Latitude 5320", spec: "Core i5 11th Gen · 8GB · 256GB", grade: "A", price: 24500, market: 32000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Compact business laptop with modern 11th Gen Core i5 delivering efficient performance.", longDescription: "Overview: Compact business laptop with modern 11th Gen Core i5 delivering efficient performance. Specs: Core i5 11th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 24,500 vs market KSh 32,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p68", brand: "Dell", name: "Latitude 5410", spec: "Core i5 10th Gen · 8GB · 256GB", grade: "A", price: 23500, market: 31000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Reliable workhorse laptop with 10th Gen Core i5 perfect for everyday business tasks.", longDescription: "Overview: Reliable workhorse laptop with 10th Gen Core i5 perfect for everyday business tasks. Specs: Core i5 10th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 23,500 vs market KSh 31,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p69", brand: "Dell", name: "Latitude 5410", spec: "Core i5 10th Gen · 8GB · 256GB · Touch", grade: "A", price: 24500, market: 32000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5", "touch"], description: "Touchscreen-equipped business laptop adding intuitive interaction to solid Core i5 performance.", longDescription: "Overview: Touchscreen-equipped business laptop adding intuitive interaction to solid Core i5 performance. Specs: Core i5 10th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 24,500 vs market KSh 32,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p70", brand: "Dell", name: "Latitude 7280", spec: "Core i7 7th Gen · 8GB · 256GB", grade: "B", price: 19500, market: 26000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i7"], description: "Compact 12-inch ultraportable with Core i7 7th Gen offering solid performance in pocket-friendly size.", longDescription: "Overview: Compact 12-inch ultraportable with Core i7 7th Gen offering solid performance in pocket-friendly size. Specs: Core i7 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 19,500 vs market KSh 26,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p71", brand: "Dell", name: "Latitude 7280", spec: "Core i7 6th Gen · 8GB · 256GB", grade: "B", price: 18500, market: 25000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i7"], description: "Affordable ultra-compact laptop with Core i7 processing power in 12-inch form factor.", longDescription: "Overview: Affordable ultra-compact laptop with Core i7 processing power in 12-inch form factor. Specs: Core i7 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 18,500 vs market KSh 25,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p72", brand: "Dell", name: "Latitude 7280", spec: "Core i5 7th Gen · 8GB · 256GB", grade: "B", price: 17000, market: 23000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Budget-friendly 12-inch laptop with Core i5 7th Gen suitable for students and basic office work.", longDescription: "Overview: Budget-friendly 12-inch laptop with Core i5 7th Gen suitable for students and basic office work. Specs: Core i5 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 17,000 vs market KSh 23,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p73", brand: "Dell", name: "Latitude 7280", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 16000, market: 22000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Entry-level business laptop offering Core i5 performance and SSD speed at rock-bottom pricing.", longDescription: "Overview: Entry-level business laptop offering Core i5 performance and SSD speed at rock-bottom pricing. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 16,000 vs market KSh 22,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p74", brand: "Dell", name: "Latitude 7490", spec: "Core i5 8th Gen · 8GB · 256GB · Touch", grade: "A", price: 22000, market: 29000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5", "touch"], description: "14-inch business laptop with responsive touchscreen and efficient Core i5 8th Gen processor.", longDescription: "Overview: 14-inch business laptop with responsive touchscreen and efficient Core i5 8th Gen processor. Specs: Core i5 8th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 22,000 vs market KSh 29,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p75", brand: "Dell", name: "Latitude 5490", spec: "Core i5 8th Gen · 8GB · 256GB", grade: "A", price: 21000, market: 28000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Dependable 14-inch business laptop with Core i5 8th Gen delivering smooth Windows 11 performance.", longDescription: "Overview: Dependable 14-inch business laptop with Core i5 8th Gen delivering smooth Windows 11 performance. Specs: Core i5 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 21,000 vs market KSh 28,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p76", brand: "Dell", name: "Latitude 7300", spec: "Core i5 8th Gen · 16GB · 256GB · Touch", grade: "A", price: 23000, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5", "touch"], description: "Enhanced configuration with 16GB RAM enabling smoother multitasking and future-proofing.", longDescription: "Overview: Enhanced configuration with 16GB RAM enabling smoother multitasking and future-proofing. Specs: Core i5 8th Gen · 16GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 23,000 vs market KSh 30,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p77", brand: "Dell", name: "Latitude 7300", spec: "Core i5 8th Gen · 8GB · 256GB", grade: "A", price: 21000, market: 28000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Compact 13-inch business ultraportable with Core i5 8th Gen ideal for mobile professionals.", longDescription: "Overview: Compact 13-inch business ultraportable with Core i5 8th Gen ideal for mobile professionals. Specs: Core i5 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 21,000 vs market KSh 28,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p78", brand: "Dell", name: "Latitude 5300 X360", spec: "Core i5 8th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 24000, market: 31000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5", "touch", "360"], description: "Versatile 2-in-1 convertible with 360-degree hinge transforming from laptop to tablet mode.", longDescription: "Overview: Versatile 2-in-1 convertible with 360-degree hinge transforming from laptop to tablet mode. Specs: Core i5 8th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 24,000 vs market KSh 31,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p79", brand: "Dell", name: "Latitude 7390 X360", spec: "Core i5 8th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 24000, market: 31000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5", "touch", "360"], description: "Premium 7000-series convertible offering superior build quality with 360-degree versatility.", longDescription: "Overview: Premium 7000-series convertible offering superior build quality with 360-degree versatility. Specs: Core i5 8th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 24,000 vs market KSh 31,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p80", brand: "Dell", name: "Latitude 7270", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 14000, market: 20000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Ultra-portable 12-inch laptop with Core i5 6th Gen perfect for basic computing needs.", longDescription: "Overview: Ultra-portable 12-inch laptop with Core i5 6th Gen perfect for basic computing needs. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 14,000 vs market KSh 20,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p81", brand: "Dell", name: "XPS 9350", spec: "Core i5 6th Gen · 8GB · 256GB · Touch", grade: "A", price: 19000, market: 26000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "xps", "i5", "touch"], description: "Premium XPS series featuring stunning InfinityEdge display with minimal bezels and touchscreen.", longDescription: "Overview: Premium XPS series featuring stunning InfinityEdge display with minimal bezels and touchscreen. Specs: Core i5 6th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 19,000 vs market KSh 26,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p82", brand: "Dell", name: "Latitude 7250", spec: "Core i7 5th Gen · 8GB · 256GB", grade: "B", price: 14000, market: 20000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i7"], description: "Compact 12-inch laptop with Core i7 processor delivering better performance than typical budget options.", longDescription: "Overview: Compact 12-inch laptop with Core i7 processor delivering better performance than typical budget options. Specs: Core i7 5th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 14,000 vs market KSh 20,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p83", brand: "Dell", name: "Latitude 7250", spec: "Core i5 5th Gen · 8GB · 256GB", grade: "B", price: 13000, market: 19000, category: "laptop", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&h=500&fit=crop", tags: ["dell", "latitude", "i5"], description: "Affordable ultra-compact business laptop with Core i5 and SSD ensuring responsive everyday use.", longDescription: "Overview: Affordable ultra-compact business laptop with Core i5 and SSD ensuring responsive everyday use. Specs: Core i5 5th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 13,000 vs market KSh 19,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // MacBook Pro Series
  { id: "p84", brand: "Apple", name: "MacBook Pro 13\" 2020", spec: "Core i7 · 32GB · 512GB · Touch Bar", grade: "A", price: 61000, market: 75000, category: "laptop", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop", tags: ["macbook", "apple", "i7", "touchbar"], description: "Powerful MacBook Pro with exceptional 32GB RAM for intensive creative workflows and virtualization.", longDescription: "Overview: Powerful MacBook Pro with exceptional 32GB RAM for intensive creative workflows and virtualization. Specs: Core i7 · 32GB · 512GB · Touch Bar. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 61,000 vs market KSh 75,000 (save about KSh 14,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p85", brand: "Apple", name: "MacBook Pro 13\" 2019", spec: "Core i7 · 16GB · 256GB · Touch Bar", grade: "A", price: 44000, market: 56000, category: "laptop", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop", tags: ["macbook", "apple", "i7", "touchbar"], description: "Classic MacBook Pro with Core i7 and Touch Bar delivering smooth macOS experience.", longDescription: "Overview: Classic MacBook Pro with Core i7 and Touch Bar delivering smooth macOS experience. Specs: Core i7 · 16GB · 256GB · Touch Bar. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 44,000 vs market KSh 56,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p86", brand: "Apple", name: "MacBook Pro 13\" 2018", spec: "Core i7 · 16GB · 256GB · Touch Bar", grade: "A", price: 44000, market: 56000, category: "laptop", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop", tags: ["macbook", "apple", "i7", "touchbar"], description: "Reliable 2018 MacBook Pro with Core i7 and 16GB RAM handling professional applications smoothly.", longDescription: "Overview: Reliable 2018 MacBook Pro with Core i7 and 16GB RAM handling professional applications smoothly. Specs: Core i7 · 16GB · 256GB · Touch Bar. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 44,000 vs market KSh 56,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p87", brand: "Apple", name: "MacBook Air 13\" 2015", spec: "Core i5 · 8GB · 256GB", grade: "B", price: 21000, market: 29000, category: "laptop", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop", tags: ["macbook", "apple", "i5", "air"], description: "Affordable entry into macOS ecosystem with legendary MacBook Air reliability and all-day battery.", longDescription: "Overview: Affordable entry into macOS ecosystem with legendary MacBook Air reliability and all-day battery. Specs: Core i5 · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 21,000 vs market KSh 29,000 (save about KSh 8,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p88", brand: "Apple", name: "MacBook Air 13\" 2015", spec: "Core i5 · 8GB · 128GB", grade: "B", price: 17500, market: 25000, category: "laptop", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop", tags: ["macbook", "apple", "i5", "air"], description: "Classic MacBook Air offering iconic design and macOS experience at very accessible price.", longDescription: "Overview: Classic MacBook Air offering iconic design and macOS experience at very accessible price. Specs: Core i5 · 8GB · 128GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 17,500 vs market KSh 25,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // Additional HP Elitebooks
  { id: "p89", brand: "HP", name: "Elitebook 1040 G8 X360", spec: "Core i7 11th Gen · 32GB · 512GB · Touch · 360°", grade: "A", price: 59000, market: 72000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch", "360"], description: "Flagship 2-in-1 Elitebook with massive 32GB RAM for power users and maximum multitasking.", longDescription: "Overview: Flagship 2-in-1 Elitebook with massive 32GB RAM for power users and maximum multitasking. Specs: Core i7 11th Gen · 32GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 59,000 vs market KSh 72,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p90", brand: "HP", name: "Elitebook 1040 G8 X360", spec: "Core i7 11th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 57000, market: 70000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch", "360"], description: "Premium convertible combining Core i7 11th Gen power with flexible 360-degree design.", longDescription: "Overview: Premium convertible combining Core i7 11th Gen power with flexible 360-degree design. Specs: Core i7 11th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 57,000 vs market KSh 70,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p91", brand: "HP", name: "Elitebook 1040 G7 X360", spec: "Core i7 10th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 42000, market: 54000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch", "360"], description: "Previous-gen flagship convertible still delivering excellent performance with 10th Gen Core i7.", longDescription: "Overview: Previous-gen flagship convertible still delivering excellent performance with 10th Gen Core i7. Specs: Core i7 10th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 42,000 vs market KSh 54,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p92", brand: "HP", name: "Elitebook Dragonfly X360", spec: "Core i7 11th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 58000, market: 71000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "dragonfly", "hp", "i7", "touch", "360"], description: "Ultra-premium Dragonfly edition featuring magnesium chassis weighing under 1kg without sacrificing performance.", longDescription: "Overview: Ultra-premium Dragonfly edition featuring magnesium chassis weighing under 1kg without sacrificing performance. Specs: Core i7 11th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 58,000 vs market KSh 71,000 (save about KSh 13,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p93", brand: "HP", name: "Elitebook Dragonfly X360", spec: "Core i7 8th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 46000, market: 58000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "dragonfly", "hp", "i7", "touch", "360"], description: "Special edition Dragonfly with distinctive design and ultra-lightweight construction.", longDescription: "Overview: Special edition Dragonfly with distinctive design and ultra-lightweight construction. Specs: Core i7 8th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 46,000 vs market KSh 58,000 (save about KSh 12,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p94", brand: "HP", name: "Elitebook Dragonfly X360", spec: "Core i5 8th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 34000, market: 44000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "dragonfly", "hp", "i5", "touch", "360"], description: "Accessible entry into Dragonfly lineup with Core i5 and convertible touchscreen design.", longDescription: "Overview: Accessible entry into Dragonfly lineup with Core i5 and convertible touchscreen design. Specs: Core i5 8th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 34,000 vs market KSh 44,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p95", brand: "HP", name: "Elitebook 840 G5", spec: "Core i7 8th Gen · 16GB · 512GB · Touch", grade: "A", price: 35000, market: 45000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch"], description: "Well-equipped Elitebook with Core i7 8th Gen, ample 16GB RAM, and spacious 512GB storage.", longDescription: "Overview: Well-equipped Elitebook with Core i7 8th Gen, ample 16GB RAM, and spacious 512GB storage. Specs: Core i7 8th Gen · 16GB · 512GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 35,000 vs market KSh 45,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p96", brand: "HP", name: "Elitebook 840 G5", spec: "Core i7 8th Gen · 8GB · 256GB", grade: "A", price: 28500, market: 37000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "Balanced configuration with Core i7 power at affordable price point.", longDescription: "Overview: Balanced configuration with Core i7 power at affordable price point. Specs: Core i7 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 28,500 vs market KSh 37,000 (save about KSh 8,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p97", brand: "HP", name: "Elitebook 840 G5", spec: "Core i5 8th Gen · 8GB · 256GB · Touch", grade: "A", price: 27000, market: 35000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch"], description: "Touchscreen business laptop with Core i5 8th Gen delivering smooth everyday performance.", longDescription: "Overview: Touchscreen business laptop with Core i5 8th Gen delivering smooth everyday performance. Specs: Core i5 8th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 27,000 vs market KSh 35,000 (save about KSh 8,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p98", brand: "HP", name: "Elitebook 840 G5", spec: "Core i5 8th Gen · 8GB · 256GB", grade: "A", price: 24000, market: 32000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Standard Elitebook configuration offering reliable Core i5 performance for business productivity.", longDescription: "Overview: Standard Elitebook configuration offering reliable Core i5 performance for business productivity. Specs: Core i5 8th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 24,000 vs market KSh 32,000 (save about KSh 8,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p99", brand: "HP", name: "Elitebook 840 G4", spec: "Core i7 7th Gen · 8GB · 256GB", grade: "B", price: 23000, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "Budget-friendly Elitebook with Core i7 7th Gen still offering solid performance.", longDescription: "Overview: Budget-friendly Elitebook with Core i7 7th Gen still offering solid performance. Specs: Core i7 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 23,000 vs market KSh 30,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p100", brand: "HP", name: "Elitebook 840 G4", spec: "Core i5 7th Gen · 8GB · 256GB · Touch", grade: "B", price: 20500, market: 27000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch"], description: "Affordable touchscreen business laptop with Core i5 and SSD responsiveness.", longDescription: "Overview: Affordable touchscreen business laptop with Core i5 and SSD responsiveness. Specs: Core i5 7th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 20,500 vs market KSh 27,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p101", brand: "HP", name: "Elitebook 840 G4", spec: "Core i5 7th Gen · 8GB · 256GB", grade: "B", price: 19000, market: 26000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Entry-level Elitebook maintaining brand quality at very accessible price.", longDescription: "Overview: Entry-level Elitebook maintaining brand quality at very accessible price. Specs: Core i5 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 19,000 vs market KSh 26,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p102", brand: "HP", name: "Elitebook 840 G3", spec: "Core i7 6th Gen · 8GB · 256GB · Touch", grade: "B", price: 23500, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch"], description: "Touchscreen Elitebook with Core i7 processor offering enhanced performance at budget pricing.", longDescription: "Overview: Touchscreen Elitebook with Core i7 processor offering enhanced performance at budget pricing. Specs: Core i7 6th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 23,500 vs market KSh 30,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p103", brand: "HP", name: "Elitebook 840 G3", spec: "Core i7 6th Gen · 8GB · 256GB", grade: "B", price: 21000, market: 28000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7"], description: "Core i7-powered business laptop offering better performance than typical budget options.", longDescription: "Overview: Core i7-powered business laptop offering better performance than typical budget options. Specs: Core i7 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 21,000 vs market KSh 28,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p104", brand: "HP", name: "Elitebook 840 G3", spec: "Core i5 6th Gen · 8GB · 256GB · Touch", grade: "B", price: 20000, market: 27000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch"], description: "Budget touchscreen laptop with Core i5 and Elitebook build quality.", longDescription: "Overview: Budget touchscreen laptop with Core i5 and Elitebook build quality. Specs: Core i5 6th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 20,000 vs market KSh 27,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p105", brand: "HP", name: "Elitebook 840 G3", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 18500, market: 25000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Affordable business laptop with Core i5 and fast SSD ensuring responsive daily use.", longDescription: "Overview: Affordable business laptop with Core i5 and fast SSD ensuring responsive daily use. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 18,500 vs market KSh 25,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p106", brand: "HP", name: "Elitebook 820 G4", spec: "Core i5 7th Gen · 8GB · 256GB", grade: "B", price: 18500, market: 25000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Compact 12-inch Elitebook perfect for mobile professionals prioritizing portability.", longDescription: "Overview: Compact 12-inch Elitebook perfect for mobile professionals prioritizing portability. Specs: Core i5 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 18,500 vs market KSh 25,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p107", brand: "HP", name: "Elitebook 820 G3", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 17500, market: 24000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5"], description: "Budget-friendly 12-inch laptop with Core i5 and SSD in ultra-portable form.", longDescription: "Overview: Budget-friendly 12-inch laptop with Core i5 and SSD in ultra-portable form. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 17,500 vs market KSh 24,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p108", brand: "HP", name: "Elitebook 1030 G2 X360", spec: "Core i7 7th Gen · 16GB · 512GB · Touch · 360°", grade: "A", price: 34000, market: 44000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch", "360"], description: "Premium convertible with Core i7 and generous 16GB RAM in elegant 2-in-1 design.", longDescription: "Overview: Premium convertible with Core i7 and generous 16GB RAM in elegant 2-in-1 design. Specs: Core i7 7th Gen · 16GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 34,000 vs market KSh 44,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p109", brand: "HP", name: "Elitebook 1030 G2 X360", spec: "Core i7 7th Gen · 8GB · 512GB · Touch · 360°", grade: "A", price: 35000, market: 45000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i7", "touch", "360"], description: "Convertible Elitebook with Core i7 and spacious 512GB storage in flexible 360-degree chassis.", longDescription: "Overview: Convertible Elitebook with Core i7 and spacious 512GB storage in flexible 360-degree chassis. Specs: Core i7 7th Gen · 8GB · 512GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 35,000 vs market KSh 45,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p110", brand: "HP", name: "Elitebook 1030 G2 X360", spec: "Core i5 7th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 29000, market: 38000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["elitebook", "hp", "i5", "touch", "360"], description: "Affordable convertible with Core i5 and touchscreen in premium Elitebook chassis.", longDescription: "Overview: Affordable convertible with Core i5 and touchscreen in premium Elitebook chassis. Specs: Core i5 7th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 29,000 vs market KSh 38,000 (save about KSh 9,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // HP Probook Series
  { id: "p111", brand: "HP", name: "Probook 640 G8", spec: "Core i5 11th Gen · 16GB · 256GB", grade: "A", price: 32000, market: 42000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["probook", "hp", "i5"], description: "Modern Probook with 11th Gen Core i5 and enhanced 16GB RAM for efficient multitasking.", longDescription: "Overview: Modern Probook with 11th Gen Core i5 and enhanced 16GB RAM for efficient multitasking. Specs: Core i5 11th Gen · 16GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 32,000 vs market KSh 42,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p112", brand: "HP", name: "Probook 430 G7", spec: "Core i7 10th Gen · 8GB · 256GB", grade: "A", price: 32000, market: 42000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["probook", "hp", "i7"], description: "Compact Probook with Core i7 10th Gen delivering strong performance in portable package.", longDescription: "Overview: Compact Probook with Core i7 10th Gen delivering strong performance in portable package. Specs: Core i7 10th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 32,000 vs market KSh 42,000 (save about KSh 10,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p113", brand: "HP", name: "Probook 640 G5", spec: "Core i5 7th Gen · 8GB · 256GB", grade: "B", price: 20000, market: 27000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["probook", "hp", "i5"], description: "Budget business laptop with Core i5 7th Gen and SSD speed for everyday tasks.", longDescription: "Overview: Budget business laptop with Core i5 7th Gen and SSD speed for everyday tasks. Specs: Core i5 7th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 20,000 vs market KSh 27,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p114", brand: "HP", name: "Probook 430 G3", spec: "Core i5 6th Gen · 8GB · 256GB · Touch", grade: "B", price: 17000, market: 23000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["probook", "hp", "i5", "touch"], description: "Affordable touchscreen laptop with Core i5 and SSD in compact form.", longDescription: "Overview: Affordable touchscreen laptop with Core i5 and SSD in compact form. Specs: Core i5 6th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 17,000 vs market KSh 23,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p115", brand: "HP", name: "Probook 430 G3", spec: "Core i5 6th Gen · 8GB · 256GB", grade: "B", price: 15500, market: 22000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["probook", "hp", "i5"], description: "Entry-level business laptop with Core i5 and fast SSD at rock-bottom pricing.", longDescription: "Overview: Entry-level business laptop with Core i5 and fast SSD at rock-bottom pricing. Specs: Core i5 6th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 15,500 vs market KSh 22,000 (save about KSh 6,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  
  // Additional Lenovo Models
  { id: "p116", brand: "Lenovo", name: "Yoga 380", spec: "Core i5 8th Gen · 8GB · 256GB · Touch · 360°", grade: "A", price: 22500, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i5", "touch", "360"], description: "Compact convertible Yoga with Core i5 8th Gen and flexible 360-degree hinge.", longDescription: "Overview: Compact convertible Yoga with Core i5 8th Gen and flexible 360-degree hinge. Specs: Core i5 8th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade A: clean cosmetics with strong overall presentation after testing. Value: KSh 22,500 vs market KSh 30,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p117", brand: "Lenovo", name: "Yoga 370", spec: "Core i7 7th Gen · 8GB · 256GB · Touch · 360°", grade: "B", price: 22500, market: 30000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i7", "touch", "360"], description: "Core i7-powered convertible with 360-degree flexibility and touchscreen.", longDescription: "Overview: Core i7-powered convertible with 360-degree flexibility and touchscreen. Specs: Core i7 7th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 22,500 vs market KSh 30,000 (save about KSh 7,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p118", brand: "Lenovo", name: "Yoga 370", spec: "Core i5 7th Gen · 8GB · 256GB · Touch · 360°", grade: "B", price: 21000, market: 28000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i5", "touch", "360"], description: "Affordable 2-in-1 convertible with Core i5 and touchscreen in tested Grade B condition.", longDescription: "Overview: Affordable 2-in-1 convertible with Core i5 and touchscreen in tested Grade B condition. Specs: Core i5 7th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 21,000 vs market KSh 28,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p119", brand: "Lenovo", name: "Yoga 260", spec: "Core i7 6th Gen · 8GB · 256GB · Touch · 360°", grade: "B", price: 20000, market: 27000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["yoga", "lenovo", "i7", "touch", "360"], description: "Budget convertible with Core i7 processor offering enhanced performance in 2-in-1 form.", longDescription: "Overview: Budget convertible with Core i7 processor offering enhanced performance in 2-in-1 form. Specs: Core i7 6th Gen · 8GB · 256GB · Touch · 360°. Best For: presentations, note-taking, hybrid work, and flexible laptop-to-tablet use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 20,000 vs market KSh 27,000 (save about KSh 7,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p120", brand: "Lenovo", name: "X270", spec: "Core i5 6th Gen · 8GB · 256GB · Touch", grade: "B", price: 16000, market: 22000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["lenovo", "i5", "touch"], description: "Ultra-portable 12-inch ThinkPad with touchscreen and legendary keyboard.", longDescription: "Overview: Ultra-portable 12-inch ThinkPad with touchscreen and legendary keyboard. Specs: Core i5 6th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 16,000 vs market KSh 22,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p121", brand: "Lenovo", name: "X250", spec: "Core i5 5th Gen · 8GB · 256GB · Touch", grade: "B", price: 13500, market: 19000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["lenovo", "i5", "touch"], description: "Entry-level ThinkPad with touchscreen and SSD offering responsive basic computing.", longDescription: "Overview: Entry-level ThinkPad with touchscreen and SSD offering responsive basic computing. Specs: Core i5 5th Gen · 8GB · 256GB · Touch. Best For: interactive workflows, visual review tasks, and day-to-day productivity. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 13,500 vs market KSh 19,000 (save about KSh 5,500). Purchase Note: Return support is available if delivered condition differs from approved photos." },
  { id: "p122", brand: "Lenovo", name: "X240", spec: "Core i7 4th Gen · 8GB · 256GB", grade: "B", price: 13000, market: 19000, category: "laptop", image: "https://images.unsplash.com/photo-1588872657360-3a85f2e3fa34?w=500&h=500&fit=crop", tags: ["lenovo", "i7"], description: "Budget ultra-portable with Core i7 processor offering better performance than typical entry-level options.", longDescription: "Overview: Budget ultra-portable with Core i7 processor offering better performance than typical entry-level options. Specs: Core i7 4th Gen · 8GB · 256GB. Best For: office productivity, school tasks, remote work, and reliable daily use. Condition: Grade B: light cosmetic wear may be visible, but functionality is fully tested. Value: KSh 13,000 vs market KSh 19,000 (save about KSh 6,000). Purchase Note: Return support is available if delivered condition differs from approved photos." },
];

const CATEGORIES = [
  { key: "all", label: "All Products" },
  { key: "laptop", label: "Laptops" },
  { key: "phone", label: "Phones" },
  { key: "audio", label: "Audio" },
  { key: "accessory", label: "Accessories" },
  { key: "electronics", label: "Electronics" },
];

const CATEGORY_MENU = [
  { 
    key: "laptop", 
    label: "Laptops", 
    desc: "Ex-UK refurbished & brand new",
    icon: "💻",
    color: "#e8f8ed",
    count: () => PRODUCTS.filter(p => p.category === "laptop").length
  },
  { 
    key: "phone", 
    label: "Phones", 
    desc: "Smartphones from trusted brands",
    icon: "📱",
    color: "#f0f7ff",
    count: () => PRODUCTS.filter(p => p.category === "phone").length
  },
  { 
    key: "audio", 
    label: "Audio", 
    desc: "Earbuds, headphones & speakers",
    icon: "🎧",
    color: "#fef3f2",
    count: () => PRODUCTS.filter(p => p.category === "audio").length
  },
  { 
    key: "accessory", 
    label: "Accessories", 
    desc: "Chargers, cables & protection",
    icon: "🔌",
    color: "#fef9e8",
    count: () => PRODUCTS.filter(p => p.category === "accessory").length
  },
  { 
    key: "electronics", 
    label: "Electronics", 
    desc: "Fans, bulbs & home essentials",
    icon: "⚡",
    color: "#f5f3ff",
    count: () => PRODUCTS.filter(p => p.category === "electronics").length
  },
];

const TESTIMONIALS = [
  {
    name: "Amina R.",
    quote: "I ordered an Elitebook and it looked almost brand new. Tracking updates were clear all the way to delivery.",
    item: "HP Elitebook 840 G8",
  },
  {
    name: "Kelvin M.",
    quote: "Price was way lower than what I was seeing in town. Photo confirmation before dispatch gave me confidence.",
    item: "Lenovo X1 Carbon",
  },
  {
    name: "Fatma A.",
    quote: "Fast delivery and honest grading. Exactly what Nafuu promised.",
    item: "Lenovo Yoga 390",
  },
];

const AS_SEEN_IN = ["Mombasa Tech Weekly", "Coast Business Daily", "Nairobi Gadget Journal", "Smart Shopper KE"];

const GRADE_INFO = {
  New: { label: "Brand New", desc: "Sealed box, never used, full warranty", color: "#2563eb" },
  A: { label: "Grade A", desc: "Looks brand new, zero visible scratches", color: "#22c55e" },
  B: { label: "Grade B", desc: "Minor cosmetic marks, fully functional", color: "#f59e0b" },
};

const fmt = (n) => `KSH ${Number(n).toLocaleString()}`;
const genRef = () => "NFU-" + Math.random().toString(36).substring(2, 7).toUpperCase();

const G = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
:root{--paper:#fafaf9;--card:#ffffff;--ink:#3d3d3d;--ink-soft:#606060;--muted:#8a8a8a;--line:#e6e4e0;--accent:#2ac769;--accent-dark:#0b8f41;--sun:#ffd84d;--cherry:#d94444;--text:var(--ink);--text-mid:var(--ink-soft);--text-dim:var(--muted);--border:var(--line);--ocean:var(--ink);--green:var(--accent-dark)}
html,body,#root{width:100%;min-height:100%;}
body{font-family:'Space Grotesk',sans-serif;background:var(--paper);color:var(--ink)}
input,select,textarea,button{font-family:'Space Grotesk',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseCard{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
`;

const storageApi = {
  async get(key) {
    if (window.storage?.get) return window.storage.get(key, true);
    const value = window.localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key, value) {
    if (window.storage?.set) return window.storage.set(key, value, true);
    window.localStorage.setItem(key, value);
    return true;
  },
};

const getStockMeta = (status = "in_stock") => {
  if (status === "out_of_stock") {
    return { label: "Out of stock", color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" };
  }
  if (status === "low_stock") {
    return { label: "Low stock", color: "#92400e", bg: "#ffedd5", border: "#fed7aa" };
  }
  return { label: "In stock", color: "#166534", bg: "#dcfce7", border: "#bbf7d0" };
};

const isAvailable = (product) => (product?.stockStatus || "in_stock") !== "out_of_stock";

export default function App() {
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [navSearch, setNavSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [priceBand, setPriceBand] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [selected, setSelected] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", location: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [pesapalOrderTracking, setPesapalOrderTracking] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [paying, setPaying] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [trackRef, setTrackRef] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [heroVisible, setHeroVisible] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [infoPage, setInfoPage] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [authPanel, setAuthPanel] = useState("form");
  const [authStep, setAuthStep] = useState("email");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [authErrors, setAuthErrors] = useState({});
  const [authMsg, setAuthMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [catalog, setCatalog] = useState(PRODUCTS);
  const [adminEditId, setAdminEditId] = useState(null);
  const [adminMsg, setAdminMsg] = useState("");
  const [adminForm, setAdminForm] = useState({
    brand: "",
    name: "",
    spec: "",
    category: "laptop",
    grade: "A",
    price: "",
    market: "",
    image: "",
    images: [],
    stockStatus: "in_stock",
    stockQuantity: "10",
    tags: "",
  });
  const [openProductFaq, setOpenProductFaq] = useState(0);
  const [authRuntime, setAuthRuntime] = useState({ mode: "local", detail: "Offline-first local auth active." });
  const searchRef = useRef();

  useEffect(() => {
    const id = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const type = params.get("type");
    if (type === "recovery") {
      setPage("auth");
      setAuthPanel("reset");
      setAuthMode("signin");
      setAuthErrors({});
      setAuthMsg("Create a new password for your account.");
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setNavSearch(search);
  }, [search]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setOpenProductFaq(0);
  }, [selected?.id]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(id);
  }, [search]);

  const isMobileFilters = viewportWidth < 980;

  const loadOrders = async () => {
    try {
      const res = await storageApi.get(ORDERS_KEY);
      if (res?.value) setOrders(JSON.parse(res.value));
      else setOrders([]);
    } catch {
      setOrders([]);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await storageApi.get(CATALOG_KEY);
      if (res?.value) {
        const parsed = JSON.parse(res.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCatalog(parsed.map((p) => ({ ...p, stockStatus: p.stockStatus || "in_stock" })));
          return;
        }
      }
      setCatalog(PRODUCTS.map((p) => ({ ...p, stockStatus: p.stockStatus || "in_stock" })));
    } catch {
      setCatalog(PRODUCTS.map((p) => ({ ...p, stockStatus: p.stockStatus || "in_stock" })));
    }
  };

  const loadCart = async () => {
    try {
      const res = await storageApi.get(CART_KEY);
      if (res?.value) setCart(JSON.parse(res.value));
      else setCart([]);
    } catch {
      setCart([]);
    }
  };

  const loadWishlist = async () => {
    try {
      const res = await storageApi.get(WISHLIST_KEY);
      if (res?.value) setWishlist(JSON.parse(res.value));
      else setWishlist([]);
    } catch {
      setWishlist([]);
    }
  };

  const saveCart = async (items) => {
    try {
      await storageApi.set(CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  };

  const saveWishlist = async (items) => {
    try {
      await storageApi.set(WISHLIST_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save wishlist:", error);
    }
  };

  const saveCatalog = async (items) => {
    try {
      await storageApi.set(CATALOG_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save catalog:", error);
    }
  };

  const addToCart = (product) => {
    if (!isAvailable(product)) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const updated = prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
        saveCart(updated);
        return updated;
      }
      const updated = [...prev, { ...product, quantity: 1 }];
      saveCart(updated);
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== productId);
      saveCart(updated);
      return updated;
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => {
      const target = prev.find((item) => item.id === productId);
      if (target && !isAvailable(target)) return prev;
      const updated = prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      saveCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
  };

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      const updated = exists
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, product];
      saveWishlist(updated);
      return updated;
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const checkoutItems = (selected
    ? [{ ...selected, quantity: selected.quantity || 1 }]
    : cart).filter(isAvailable);
  const checkoutItemCount = checkoutItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const checkoutSavings = checkoutItems.reduce((sum, item) => sum + (item.market - item.price) * (item.quantity || 1), 0);

  useEffect(() => {
    loadOrders();
    loadCart();
    loadWishlist();
    loadCatalog();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const runtime = getAuthRuntime();
        if (mounted) setAuthRuntime(runtime);

        const session = await restoreSession();
        if (mounted && session?.user?.email) {
          setCurrentUser(session.user);
        }
      } catch {
        if (mounted) setCurrentUser(null);
      }
    };
    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadOrders();
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trackedOrder?.id) return;
    const next = orders.find((o) => o.id === trackedOrder.id);
    if (next) setTrackedOrder(next);
  }, [orders, trackedOrder?.id]);

  // Handle Pesapal payment callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderTrackingId = urlParams.get("OrderTrackingId");
    const merchantReference = urlParams.get("OrderMerchantReference");
    
    if (orderTrackingId) {
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check payment status
      checkPesapalPaymentStatus(orderTrackingId)
        .then((statusResponse) => {
          // Find the order with this tracking ID
          const orderToUpdate = orders.find(
            (o) => o.pesapalOrderTrackingId === orderTrackingId
          );
          
          if (orderToUpdate) {
            const statusCode = statusResponse.payment_status_description || statusResponse.statusCode || 0;
            const isPaid = statusCode === 1 || statusCode === "1" || 
                          statusResponse.status === "completed" || 
                          statusResponse.status === "Completed";
            
            // Update order status
            const updatedOrder = {
              ...orderToUpdate,
              status: isPaid ? "confirmed" : "payment_failed",
              paymentStatus: isPaid ? "paid" : "failed",
              pesapalPaymentStatusCode: statusCode,
              pesapalPaymentMethod: statusResponse.payment_method || statusResponse.paymentMethod,
            };
            
            const updatedOrders = orders.map((o) =>
              o.id === orderToUpdate.id ? updatedOrder : o
            );
            
            setOrders(updatedOrders);
            storageApi.set(ORDERS_KEY, JSON.stringify(updatedOrders));
            
            // Send confirmation email if payment successful
            if (isPaid && updatedOrder.customerEmail) {
              sendEmailNotification("orderConfirmation", {
                email: updatedOrder.customerEmail,
                customerName: updatedOrder.customer,
                orderId: updatedOrder.id,
                total: updatedOrder.total,
                itemCount: updatedOrder.itemCount,
                paymentMethod: updatedOrder.paymentMethod
              });
            }
            
            // Reduce stock quantities if payment successful
            if (isPaid) {
              const updatedCatalog = catalog.map(product => {
                const orderItem = updatedOrder.items.find(item => item.id === product.id);
                if (orderItem) {
                  const newQuantity = (product.stockQuantity ?? 10) - (orderItem.quantity || 1);
                  const newStockStatus = newQuantity <= 0 ? "out_of_stock" : newQuantity <= 3 ? "low_stock" : "in_stock";
                  return { ...product, stockQuantity: Math.max(0, newQuantity), stockStatus: newStockStatus };
                }
                return product;
              });
              setCatalog(updatedCatalog);
              saveCatalog(updatedCatalog);
            }
            
            // Show order confirmation or error
            setLastOrder(updatedOrder);
            if (isPaid) {
              clearCart();
              setPage("confirm");
            } else {
              alert("Payment was not successful. Please try again or use M-Pesa.");
              setPage("checkout");
            }
          }
        })
        .catch((error) => {
          console.error("Error checking Pesapal payment status:", error);
          alert("Failed to verify payment status. Please contact support with your order reference.");
        });
    }
  }, []);

  const filtered = catalog.filter((p) => {
    const query = page === "products" ? debouncedSearch : search;
    const q = query.trim().toLowerCase();
    const matchCat = category === "all" || p.category === category;
    const matchGrade = gradeFilter === "all" || p.grade === gradeFilter;
    const matchPrice =
      priceBand === "all" ||
      (priceBand === "budget" && p.price < 25000) ||
      (priceBand === "mid" && p.price >= 25000 && p.price <= 50000) ||
      (priceBand === "premium" && p.price > 50000);
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.spec.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    return matchCat && matchGrade && matchPrice && matchQ;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "saving") return b.market - b.price - (a.market - a.price);
    if (sortBy === "name-az") return a.name.localeCompare(b.name);
    if (sortBy === "name-za") return b.name.localeCompare(a.name);
    if (sortBy === "brand") return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
    return 0;
  });

  const withStockStatus = (product) => ({
    ...product,
    stockStatus: product.stockStatus || "in_stock",
  });

  const categoryCount = (categoryKey) => catalog.filter((p) => p.category === categoryKey).length;

  const sendEmailNotification = async (type, data) => {
    // Email notification framework - integrate with email service (e.g., SendGrid, Resend, AWS SES)
    console.log(`📧 Email notification: ${type}`, data);
    
    // Simulated email templates
    const templates = {
      orderConfirmation: {
        to: data.email,
        subject: `Order Confirmed - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nYour order ${data.orderId} has been confirmed!\n\nTotal: KSh ${data.total.toLocaleString()}\nItems: ${data.itemCount}\n\nPayment: ${data.paymentMethod}\n\nWe'll send you photos for approval before dispatch.\n\nTrack your order: https://nafuumart.co.ke/track/${data.orderId}\n\nThank you!\nNafuu Mart Team`
      },
      orderShipped: {
        to: data.email,
        subject: `Order Dispatched - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nYour order ${data.orderId} has been dispatched!\n\nCourier Reference: ${data.courierRef}\n\nExpected delivery: Next business day\n\nTrack: https://nafuumart.co.ke/track/${data.orderId}`
      },
      photoApproval: {
        to: data.email,
        subject: `Photos Ready - ${data.orderId}`,
        body: `Hello ${data.customerName},\n\nWe've sent live photos of your device for approval.\n\nPlease review and confirm: https://nafuumart.co.ke/orders/${data.orderId}/photos\n\nYou have 24 hours to approve or request a different unit.`
      }
    };

    const template = templates[type];
    if (!template) {
      console.warn(`Unknown email type: ${type}`);
      return;
    }

    // TODO: Integrate with actual email service
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to: template.to, from: 'orders@nafuumart.co.ke', subject: template.subject, text: template.body });

    // For now, just log
    console.log(`Would send email to ${template.to}:`, template.subject);
    
    return { success: true, type, timestamp: Date.now() };
  };

  const handleImageUpload = async (file, isMainImage = false) => {
    if (!file || !file.type.startsWith("image/")) {
      setAdminMsg("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAdminMsg("Image size must be less than 5MB.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        if (isMainImage) {
          setAdminForm((s) => ({ ...s, image: base64 }));
        } else {
          setAdminForm((s) => ({ ...s, images: [...s.images, base64] }));
        }
        setAdminMsg("");
      };
      reader.onerror = () => {
        setAdminMsg("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAdminMsg("Error uploading image.");
    }
  };

  const removeAdditionalImage = (index) => {
    setAdminForm((s) => ({
      ...s,
      images: s.images.filter((_, i) => i !== index),
    }));
  };

  const resetAdminForm = () => {
    setAdminForm({
      brand: "",
      name: "",
      spec: "",
      category: "laptop",
      grade: "A",
      price: "",
      market: "",
      image: "",
      images: [],
      stockStatus: "in_stock",
      stockQuantity: "10",
      tags: "",
    });
    setAdminEditId(null);
  };

  const startEditProduct = (product) => {
    setAdminEditId(product.id);
    setAdminForm({
      brand: product.brand || "",
      name: product.name || "",
      spec: product.spec || "",
      category: product.category || "laptop",
      grade: product.grade || "A",
      price: String(product.price || ""),
      market: String(product.market || ""),
      image: product.image || "",
      images: Array.isArray(product.images) ? product.images : [],
      stockStatus: product.stockStatus || "in_stock",
      stockQuantity: String(product.stockQuantity ?? 10),
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    });
    setAdminMsg("");
    setPage("admin");
  };

  const submitAdminProduct = async () => {
    const brand = adminForm.brand.trim();
    const name = adminForm.name.trim();
    const spec = adminForm.spec.trim();
    const price = Number(adminForm.price);
    const market = Number(adminForm.market);
    if (!brand || !name || !spec || !Number.isFinite(price) || !Number.isFinite(market)) {
      setAdminMsg("Fill brand, name, spec, price, and market price correctly.");
      return;
    }

    const stockQuantity = Number(adminForm.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setAdminMsg("Stock quantity must be a valid number (0 or more).");
      return;
    }

    const payload = {
      brand,
      name,
      spec,
      category: adminForm.category,
      grade: adminForm.grade,
      price,
      market,
      image: adminForm.image.trim() || (adminForm.images.length > 0 ? adminForm.images[0] : ""),
      images: adminForm.images.length > 0 ? adminForm.images : undefined,
      stockStatus: adminForm.stockStatus,
      stockQuantity,
      tags: adminForm.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    };

    const updated = adminEditId
      ? catalog.map((p) => (p.id === adminEditId ? { ...p, ...payload } : p))
      : [{ id: "p" + Math.random().toString(36).slice(2, 8), ...payload }, ...catalog];

    setCatalog(updated);
    await saveCatalog(updated);
    setAdminMsg(adminEditId ? "Product updated." : "Product added.");
    if (!adminEditId) resetAdminForm();
  };

  const setProductStockStatus = async (productId, stockStatus) => {
    const updated = catalog.map((p) => (p.id === productId ? { ...p, stockStatus } : p));
    setCatalog(updated);
    await saveCatalog(updated);
  };

  const userOrders = currentUser?.email
    ? orders.filter((o) => (o.customerEmail || "").toLowerCase() === currentUser.email.toLowerCase())
    : [];

  const submitSearch = (query = navSearch) => {
    setSearch(query);
    setPage("products");
    setIsFilterOpen(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!/^0[7][0-9]{8}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Enter a valid Kenyan phone number";
    if (!form.location.trim()) e.location = "Delivery location is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    setFormErrors((prev) => ({ ...prev, checkout: undefined }));
    if (!checkoutItems.length || !validate()) return;
    if (!checkoutItems.some(isAvailable)) {
      setFormErrors((prev) => ({
        ...prev,
        checkout: "All items in this checkout are currently out of stock.",
      }));
      return;
    }

    // Check if sufficient stock is available
    const stockCheck = checkoutItems.map(item => {
      const product = catalog.find(p => p.id === item.id);
      const requestedQty = item.quantity || 1;
      const availableQty = product?.stockQuantity ?? 10;
      return { id: item.id, name: `${item.brand} ${item.name}`, requestedQty, availableQty, sufficient: availableQty >= requestedQty };
    });

    const insufficientStock = stockCheck.filter(s => !s.sufficient);
    if (insufficientStock.length > 0) {
      const errorMsg = insufficientStock.length === 1
        ? `Only ${insufficientStock[0].availableQty} unit(s) available for ${insufficientStock[0].name}`
        : `Insufficient stock for ${insufficientStock.length} item(s)`;
      setFormErrors((prev) => ({ ...prev, checkout: errorMsg }));
      return;
    }

    setPaying(true);

    // Handle Pesapal payment flow
    if (paymentMethod === "pesapal") {
      if (!isPesapalConfigured()) {
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "Pesapal payment is not configured. Please contact support.",
        }));
        return;
      }

      const firstItem = checkoutItems[0];
      const normalizedItems = checkoutItems.map((item) => ({
        id: item.id,
        brand: item.brand,
        name: item.name,
        spec: item.spec,
        grade: GRADE_INFO[item.grade]?.label || item.grade,
        quantity: item.quantity || 1,
        price: item.price,
        market: item.market,
        image: item.image || "",
      }));

      const orderData = {
        id: genRef(),
        customer: form.name.trim(),
        customerEmail: currentUser?.email || "",
        phone: form.phone.trim(),
        location: form.location.trim(),
        product:
          checkoutItemCount === 1
            ? `${firstItem.brand} ${firstItem.name} ${firstItem.spec}`
            : `${checkoutItemCount} items`,
        total: checkoutSubtotal,
        items: normalizedItems,
      };

      try {
        const pesapalResponse = await initiatePesapalPayment(orderData);
        
        if (pesapalResponse.redirect_url) {
          // Store pending order with Pesapal tracking ID
          const pendingOrder = {
            ...orderData,
            grade:
              checkoutItemCount === 1
                ? GRADE_INFO[firstItem.grade]?.label || firstItem.grade
                : "Mixed",
            price: checkoutSubtotal,
            itemCount: checkoutItemCount,
            status: "pending_payment",
            paymentStatus: "pending",
            paymentMethod: "Pesapal",
            pesapalOrderTrackingId: pesapalResponse.order_tracking_id,
            pesapalMerchantReference: pesapalResponse.merchant_reference,
            timestamp: Date.now(),
            courierRef: "",
            notes: form.notes.trim(),
          };

          // Save pending order
          const updated = [pendingOrder, ...orders];
          await storageApi.set(ORDERS_KEY, JSON.stringify(updated));
          setOrders(updated);

          // Store tracking ID and redirect
          setPesapalOrderTracking(pesapalResponse.order_tracking_id);
          window.location.href = pesapalResponse.redirect_url;
          return;
        } else {
          throw new Error("Failed to get Pesapal payment URL");
        }
      } catch (error) {
        console.error("Pesapal payment error:", error);
        setPaying(false);
        setFormErrors((prev) => ({
          ...prev,
          checkout: "Failed to initiate Pesapal payment. Please try again or use M-Pesa.",
        }));
        return;
      }
    }

    // M-Pesa payment flow (simulated)
    await new Promise((r) => setTimeout(r, 2000));

    const firstItem = checkoutItems[0];
    const normalizedItems = checkoutItems.map((item) => ({
      id: item.id,
      brand: item.brand,
      name: item.name,
      spec: item.spec,
      grade: GRADE_INFO[item.grade]?.label || item.grade,
      quantity: item.quantity || 1,
      price: item.price,
      market: item.market,
      image: item.image || "",
    }));

    const order = {
      id: genRef(),
      customer: form.name.trim(),
      customerEmail: currentUser?.email || "",
      phone: form.phone.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      product:
        checkoutItemCount === 1
          ? `${firstItem.brand} ${firstItem.name} ${firstItem.spec}`
          : `${checkoutItemCount} items`,
      grade:
        checkoutItemCount === 1
          ? GRADE_INFO[firstItem.grade]?.label || firstItem.grade
          : "Mixed",
      price: checkoutSubtotal,
      total: checkoutSubtotal,
      itemCount: checkoutItemCount,
      items: normalizedItems,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "M-Pesa",
      timestamp: Date.now(),
      courierRef: "",
    };

    // Reduce stock quantities
    const updatedCatalog = catalog.map(product => {
      const orderItem = checkoutItems.find(item => item.id === product.id);
      if (orderItem) {
        const newQuantity = (product.stockQuantity ?? 10) - (orderItem.quantity || 1);
        const newStockStatus = newQuantity <= 0 ? "out_of_stock" : newQuantity <= 3 ? "low_stock" : "in_stock";
        return { ...product, stockQuantity: Math.max(0, newQuantity), stockStatus: newStockStatus };
      }
      return product;
    });

    setCatalog(updatedCatalog);
    await saveCatalog(updatedCatalog);

    const updated = [order, ...orders];
    await storageApi.set(ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);

    // Send order confirmation email
    if (order.customerEmail) {
      await sendEmailNotification("orderConfirmation", {
        email: order.customerEmail,
        customerName: order.customer,
        orderId: order.id,
        total: order.total,
        itemCount: order.itemCount,
        paymentMethod: order.paymentMethod
      });
    }

    setPaying(false);
    setLastOrder(order);
    if (!selected) clearCart();
    setForm({ name: "", phone: "", location: "", notes: "" });
    setPage("confirm");
  };

  const STATUS_STEPS = [
    { key: "confirmed", label: "Order Confirmed", detail: "Payment received and order created." },
    { key: "sourced", label: "Sourced in Nairobi", detail: "Device reserved from trusted supplier." },
    { key: "photo_sent", label: "Photos Sent", detail: "Live photos shared for your approval." },
    { key: "approved", label: "Approved", detail: "Customer approved the exact device." },
    { key: "dispatched", label: "Dispatched", detail: "Handed to courier for Mombasa delivery." },
    { key: "delivered", label: "Delivered", detail: "Order successfully delivered." },
  ];

  const LEGACY_STATUS_MAP = {
    new: "confirmed",
    sourcing: "sourced",
    inspected: "sourced",
  };

  const normalizeStatus = (status) => {
    if (!status) return "confirmed";
    return LEGACY_STATUS_MAP[status] || status;
  };

  const stepIdx = (status) => STATUS_STEPS.findIndex((s) => s.key === normalizeStatus(status));

  const computeLiveStatus = (order) => {
    const normalized = normalizeStatus(order?.status);
    if (normalized !== "confirmed") return normalized;

    const elapsed = Date.now() - (order?.timestamp || Date.now());
    if (elapsed > 1000 * 60 * 120) return "dispatched";
    if (elapsed > 1000 * 60 * 45) return "approved";
    if (elapsed > 1000 * 60 * 20) return "photo_sent";
    if (elapsed > 1000 * 60 * 8) return "sourced";
    return "confirmed";
  };

  const trackOrder = () => {
    const found = orders.find((o) => o.id.toLowerCase() === trackRef.trim().toLowerCase());
    if (found) {
      setTrackedOrder(found);
      setTrackError("");
    } else {
      setTrackedOrder(null);
      setTrackError("Order not found. Check your reference number.");
    }
  };

  const handleNewsletterSignup = () => {
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMsg("Enter a valid email address.");
      return;
    }
    setNewsletterMsg("Asante! You are now subscribed for hot drops.");
    setNewsletterEmail("");
  };

  const openAuth = (mode = "signin") => {
    setAuthMode(mode);
    setAuthPanel("form");
    setAuthStep("email");
    setAuthErrors({});
    setAuthMsg("");
    setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
    setResetForm({ password: "", confirmPassword: "" });
    setPage("auth");
  };

  const signOut = async () => {
    setCurrentUser(null);
    await authSignOut();
    setPage("home");
  };

  const proceedToPassword = () => {
    const email = authForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthErrors({ email: "Enter a valid email address." });
      return;
    }
    setAuthErrors({});
    setAuthStep("password");
  };

  const submitAuth = async () => {
    const nextErrors = {};
    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;
    const name = authForm.name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (authMode === "signup" && name.length < 2) nextErrors.name = "Enter your full name.";
    if (authMode === "signup" && password !== authForm.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    if (Object.keys(nextErrors).length > 0) {
      setAuthErrors(nextErrors);
      return;
    }

    setAuthErrors({});

    try {
      if (authMode === "signup") {
        const created = await authSignUp({ name, email, password });
        if (created.pendingConfirmation) {
          setVerificationEmail(email);
          setAuthPanel("verify");
          setAuthMsg("Account created. Check your inbox to verify your email before signing in.");
          return;
        }

        setCurrentUser(created.user);
        setAuthMsg("");
        setPage("home");
        return;
      }

      const signedIn = await authSignIn({ email, password });
      setCurrentUser(signedIn.user);
      setAuthMsg("");
      setPage("home");
    } catch (err) {
      setAuthMsg(err?.message || "Authentication failed. Check your details or try again.");
    }
  };

  const requestPasswordReset = async () => {
    const email = recoveryEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthErrors({ email: "Enter a valid email address." });
      return;
    }

    setAuthErrors({});
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const result = await authRequestPasswordReset({ email, redirectTo });
      if (result.provider === "local") {
        setAuthMsg("Offline mode: reset requested. Continue below to set a new password.");
        setAuthPanel("reset");
        return;
      }
      setAuthMsg("Password reset email sent. Check your inbox and open the reset link.");
    } catch (err) {
      setAuthMsg(err?.message || "Unable to send reset email.");
    }
  };

  const submitPasswordReset = async () => {
    const password = resetForm.password;
    if (password.length < 8) {
      setAuthErrors({ password: "Use at least 8 characters." });
      return;
    }
    if (password !== resetForm.confirmPassword) {
      setAuthErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setAuthErrors({});
    try {
      await authUpdatePassword({ password });
      setAuthPanel("form");
      setAuthMode("signin");
      setResetForm({ password: "", confirmPassword: "" });
      setAuthMsg("Password updated. Sign in with your new password.");
    } catch (err) {
      setAuthMsg(err?.message || "Could not reset password.");
    }
  };

  const resendVerification = async () => {
    const email = verificationEmail.trim().toLowerCase() || authForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthErrors({ email: "Enter a valid email to resend verification." });
      return;
    }

    setAuthErrors({});
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const result = await authResendVerification({ email, redirectTo });
      if (result.provider === "local") {
        setAuthMsg("Offline mode does not send real verification emails. You can continue testing locally.");
        return;
      }
      setAuthMsg("Verification email sent. Check your inbox.");
    } catch (err) {
      setAuthMsg(err?.message || "Could not resend verification email.");
    }
  };

  const continueWithSocial = async (provider) => {
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      await authSignInWithOAuth({ provider, redirectTo });
      setAuthMsg(`Redirecting to ${provider === "google" ? "Google" : "Apple"}...`);
    } catch (err) {
      setAuthMsg(err?.message || "Social sign-in is not available right now.");
    }
  };

  const openInfoPage = (title, summary, points = []) => {
    setInfoPage({ title, summary, points });
    setPage("info");
  };

  const handleFooterLink = (item) => {
    if (item === "Track order") {
      setTrackedOrder(null);
      setTrackRef("");
      setPage("track");
      return;
    }
    if (item === "Trade-in") {
      setSortBy("saving");
      setCategory("all");
      setPage("products");
      return;
    }
    if (item === "Tech Journal") {
      openInfoPage("Tech Journal", "Weekly guides and market updates from the Nafuu team.", [
        "Best laptop picks by budget",
        "Phone buying guide for Kenya",
        "How to verify genuine accessories",
      ]);
      return;
    }

    const docs = {
      "About Nafuu Mart": ["About Nafuu Mart", "Nafuu delivers authentic Nairobi market prices to Mombasa with full transparency and next-day delivery. We bridge the coast-capital price gap by sourcing direct from trusted Nairobi agents.", ["Buy-to-order ensures zero old stock", "Live photo approval before dispatch shows genuine condition", "Transparent grading: New (unopened), Grade A (original box, minimal use), Grade B (no box, full function)"]],
      "Contact us": ["Contact us", "Reach the Nafuu Mombasa team Monday–Friday 8 AM–8 PM EAT. For urgent orders outside support hours, leave a message.", ["WhatsApp Business: +254 7XX XXX XXX (responds 30 mins)", "Email: support@nafuumart.co.ke", "In-app chat during support hours"]],
      "Help Center": ["Help Center", "Answers to Kenyan customer questions on M-Pesa payment, STK push, tracking, and returns.", ["Step 1: Search products and confirm specs. Step 2: Add to cart and check savings. Step 3: Proceed to checkout.", "Step 4: Enter name, phone (07X format), Mombasa location. Step 5: Approve M-Pesa STK, complete payment.", "Track with reference NFU-XXXXX. Once sourced (1-2h), you receive live photos. Approve, then dispatch same-day."]],
      "Shipping": ["Shipping", "Mombasa-bound orders placed before 12 noon are dispatched same-day via Buscar courier. Doorstep delivery by next morning.", ["Nairobi stock confirmed by 1 PM same-day", "Overnight courier: freezer box + tracking number provided", "Mombasa delivery: 8 AM–2 PM next business day with customer contact"]],
      "Returns and refunds": ["Returns and refunds", "If delivered item doesn't match the approval photos or condition, Nafuu issues a full refund within 2 business days.", ["Condition mismatch: Contact support within 24 hours with photos, full refund issued", "Wrong item (rare): Priority return and replacement at no cost", "Damage in transit: Documented before handover; Nafuu covers via courier insurance"]],
      "Terms of service": ["Nafuu Mart Terms of Service", "These Terms govern your use of Nafuu Mart's platform and purchase of products. By placing an order, you agree to these Terms, our Privacy Policy, and Kenya's Consumer Protection Act, 2012.", [
        "1. WHO WE ARE: Nafuu Mart Ltd operates an e-commerce platform connecting Mombasa buyers with Nairobi-sourced electronics at transparent prices. We are registered in Kenya and operate under Kenyan law.",
        "2. DEFINITIONS: 'Platform' means this website/app. 'Product(s)' means electronics listed for sale. 'Buyer' means any person 18+ ordering for personal use. 'Order' means confirmed purchase after M-Pesa payment.",
        "3. ACCEPTANCE: By using Nafuu, you confirm you are 18+, have legal capacity to contract, accept these Terms, and will provide accurate information (name, phone, delivery address).",
        "4. SERVICES WE OFFER: Product sourcing from Nairobi agents, live photo approval before dispatch, M-Pesa payment processing, overnight courier delivery to Mombasa, order tracking, customer support Mon-Fri 8AM-8PM EAT.",
        "5. HOW TO ORDER: Browse products → Add to cart → Enter delivery details → Pay via M-Pesa STK push. We source within 1-2 hours, send live photos for approval, then dispatch same-day if confirmed before 12 noon.",
        "6. PAYMENT TERMS: Full upfront payment required via M-Pesa. No cash-on-delivery. Payment authorization held until we confirm stock availability. If item unavailable within 24 hours, full refund issued automatically.",
        "7. DELIVERY: Orders confirmed before 12 noon dispatch same-day via Buscar courier. Delivery next business day 8AM-2PM to your Mombasa address. You must be available to receive or designate someone. Risk passes to you upon delivery.",
        "8. PRICING: All prices in KES, inclusive of VAT where applicable. Prices may change without notice but confirmed orders honor the agreed price. We reserve right to cancel orders with obvious pricing errors and provide full refund.",
        "9. RETURNS: 7-day return window from delivery date. Returns accepted if: (a) item doesn't match approval photos, (b) wrong item delivered, or (c) damage in transit. Contact support within 24 hours with photos. Return shipping at our cost for our errors; your cost if you changed your mind.",
        "10. REFUNDS: Full refund within 2 business days to your M-Pesa if: item unavailable, wrong/damaged item, or condition mismatch. Refunds exclude shipping if you changed your mind. No refunds on opened software or accessories where seal is broken.",
        "11. WARRANTIES: All products carry our 12-month quality promise covering manufacturing defects. Grade A/B items inspected and certified functional. New items carry manufacturer warranty where applicable. Warranty doesn't cover misuse, drops, water damage, or unauthorized repairs.",
        "12. PRODUCT GRADING: 'New' = unopened, factory sealed. 'Grade A' = original box, minimal cosmetic wear, full function. 'Grade B' = no box, visible wear, full function. All grades tested and approved before dispatch.",
        "13. PHOTO APPROVAL: Once we source your item, you receive live photos showing actual condition. You have 2 hours to approve or request alternative. Approval is binding and confirms you accept the item as shown.",
        "14. USER OBLIGATIONS: Provide accurate info, use platform lawfully, don't create multiple accounts, keep login credentials secure, don't resell products commercially without written permission, respond promptly to photo approvals.",
        "15. INTELLECTUAL PROPERTY: All content, logos, designs on this platform are owned by Nafuu Mart Ltd and protected under Kenyan IP law. You may not copy, scrape, or reproduce without written consent.",
        "16. LIABILITY: We are not liable for: delays beyond our control (strikes, weather, customs), M-Pesa system downtime, courier delays on public holidays, minor cosmetic differences in Grade A/B items, data loss from your device. Max liability limited to order value.",
        "17. DATA PROTECTION: We comply with Kenya Data Protection Act, 2019. We collect only necessary data (name, phone, address, payment ref) to fulfill orders. We don't sell your data. See Privacy Policy for details. You have right to access, correct, or delete your data.",
        "18. DISPUTE RESOLUTION: Governed by laws of Kenya. Disputes resolved through: (1) Direct contact with support@nafuumart.co.ke, (2) Mediation at our Mombasa office, (3) Kenya Small Claims Court (for claims under KES 1,000,000), (4) High Court of Kenya for larger claims.",
        "19. ACCOUNT CLOSURE: You may close your account anytime via email. We may close accounts for: Terms violations, fraudulent activity, or with 30 days notice. You remain liable for outstanding orders after closure.",
        "20. MODIFICATIONS: We may update these Terms with notice on the platform. Continued use after changes means acceptance. Material changes notified via email/SMS 7 days before taking effect.",
        "21. CONTACT: Questions? Email support@nafuumart.co.ke, WhatsApp +254 7XX XXX XXX (Mon-Fri 8AM-8PM), or visit our Help Center. Physical address: [Mombasa Office Address], Kenya.",
        "22. SEVERABILITY: If any provision is unenforceable, remaining Terms stay valid. No waiver of any Term unless in writing. These Terms constitute entire agreement between you and Nafuu Mart Ltd.",
        "Last updated: March 2026. Nafuu Mart Ltd, registered in Kenya."
      ]],
      "Trade-in terms": ["Nafuu Mart Trade-in Terms", "These Trade-in Terms apply when you exchange your current device for Nafuu credit or a direct discount on a new purchase. By submitting a trade-in request, you agree to the inspection and valuation process below.", [
        "1. ELIGIBILITY: Trade-in is available for phones, tablets, laptops, and select accessories accepted by Nafuu. Device must be legally owned by you, unlocked from iCloud/Google/MDM, and free from finance or carrier lock where applicable.",
        "2. QUOTE VALIDITY: Instant or manual quotes are estimates valid for 48 hours unless otherwise stated. Final value is confirmed only after physical inspection.",
        "3. CONDITION REQUIREMENTS: You must disclose device model, storage, battery health (if known), screen/body condition, and known defects. Missing disclosures may reduce final value.",
        "4. DATA AND RESET: Before handover, back up your data and perform factory reset. Remove all accounts and passcodes. Nafuu is not responsible for data remaining on devices submitted without reset.",
        "5. INSPECTION PROCESS: Device is inspected for power-on status, display quality, battery, ports, cameras, sensors, and tamper indicators. We may open service menus to verify authenticity and component health.",
        "6. FINAL VALUATION: If actual condition differs from submitted details, we issue an updated valuation. You may accept revised value or request return of the device.",
        "7. REJECTED DEVICES: Nafuu may reject devices that are counterfeit, blacklisted, reported stolen, heavily modified, or unsafe (for example swollen battery). Rejected devices are returned or handled per legal requirements.",
        "8. CREDIT APPLICATION: Accepted trade-in value can be applied as checkout discount, wallet credit, or M-Pesa payout where offered. Wallet credit is non-transferable and linked to your Nafuu account.",
        "9. PAYOUT TIMELINE: Where M-Pesa payout is selected and approved, payment is processed within 2 business days after inspection and acceptance.",
        "10. CANCELLATION AND RETURN: If you decline revised valuation, we return the device to your provided address. Return courier costs may apply unless the mismatch is due to our inspection error.",
        "11. OWNERSHIP TRANSFER: On acceptance of final valuation, ownership transfers to Nafuu and submitted devices are non-returnable except where required by Kenyan law.",
        "12. FRAUD AND ILLEGAL PROPERTY: If a device appears stolen, tampered, or linked to unlawful activity, Nafuu may hold the device and report to relevant authorities under applicable law.",
        "13. LIABILITY LIMIT: Nafuu's liability for trade-in processing is limited to the agreed final valuation amount for that device.",
        "14. GOVERNING LAW: These Trade-in Terms are governed by the laws of Kenya and read together with the main Nafuu Terms of Service and Privacy Policy.",
        "Last updated: March 2026."
      ]],
      "Privacy policy": ["Nafuu Mart Privacy Policy", "This Privacy Policy explains what personal data we collect, how we use it, who we share it with, and your rights under the Kenya Data Protection Act, 2019.", [
        "1. DATA CONTROLLER: Nafuu Mart Ltd is the data controller for data collected through our website, mobile channels, and customer support interactions.",
        "2. DATA WE COLLECT: Identity and contact data (name, phone, email), order data (items, amounts, references), delivery data (address and receiver details), and support records.",
        "3. PAYMENT DATA: M-Pesa confirmations and reference metadata are stored for reconciliation and fraud prevention. We do not store your M-Pesa PIN.",
        "4. DEVICE AND USAGE DATA: We collect limited technical data such as IP address, browser type, pages visited, and session timestamps to secure and improve the platform.",
        "5. WHY WE PROCESS DATA: We process data to fulfill orders, provide support, send transactional updates, prevent fraud, comply with legal obligations, and improve service quality.",
        "6. LEGAL BASIS: Processing is based on contract performance, legal compliance, legitimate interest (platform security and quality), and consent where required.",
        "7. DATA SHARING: We share only necessary data with logistics providers, payment processors, and service partners strictly for order fulfillment and platform operations.",
        "8. MARKETING COMMUNICATIONS: Promotional messages are optional. You may opt out anytime via account settings, unsubscribe links, or support channels.",
        "9. RETENTION: Order and accounting records are retained as required by law and internal policy. Non-essential records are deleted or anonymized when no longer needed.",
        "10. YOUR RIGHTS: Subject to law, you may request access, correction, deletion, restriction, objection, and portability of your personal data.",
        "11. CHILDREN'S DATA: Our services are intended for users 18 years and above. We do not knowingly collect children's data for independent use of the platform.",
        "12. SECURITY CONTROLS: We apply technical and organizational safeguards including role-based access, encrypted transport, and controlled retention workflows.",
        "13. CROSS-BORDER PROCESSING: Where service tools process limited data outside Kenya, we apply contractual and operational safeguards consistent with applicable law.",
        "14. CONTACT AND COMPLAINTS: Privacy requests can be sent to support@nafuumart.co.ke. You may also lodge complaints with the Office of the Data Protection Commissioner (Kenya).",
        "15. POLICY UPDATES: Material changes are published on this page with an updated revision date.",
        "Last updated: March 2026."
      ]],
      "Cookie policy": ["Nafuu Mart Cookie Policy", "This Cookie Policy explains how Nafuu uses cookies and similar technologies to keep the site secure, improve performance, and provide a smoother shopping experience.", [
        "1. WHAT COOKIES ARE: Cookies are small text files saved on your browser that help websites remember settings and activity.",
        "2. ESSENTIAL COOKIES: Required for core functions such as cart state, login session continuity, security checks, and order flow integrity.",
        "3. FUNCTIONAL COOKIES: Remember preferences like viewed categories, preferred region, and interface settings for a faster repeat experience.",
        "4. PERFORMANCE COOKIES: Collect aggregated traffic and interaction metrics to help us improve navigation, page speed, and product discovery.",
        "5. FRAUD AND SECURITY TAGS: Used to detect unusual behavior, prevent abuse, and protect customer accounts and payment workflows.",
        "6. THIRD-PARTY TECHNOLOGIES: Some analytics or embedded services may place limited cookies under strict contractual controls.",
        "7. CONSENT CHOICES: Non-essential cookies can be accepted, declined, or changed from your browser settings and future cookie preference tools.",
        "8. COOKIE DURATION: Some cookies expire when your session ends; others persist for defined periods to remember preferences.",
        "9. MANAGING COOKIES: You can clear or block cookies from browser settings, but some features (cart/session) may not work correctly.",
        "10. DO-NOT-TRACK: Browser DNT signals are considered where technically supported, but not all systems interpret DNT identically.",
        "11. POLICY CHANGES: We may update this policy as features evolve and will post changes with a revised date.",
        "Last updated: March 2026."
      ]],
      "Gift Cards": ["Gift Cards", "Send tech gifts to friends, family, and colleagues across Mombasa. Redeemable instantly on any product.", ["Physical card (Nairobi pickup) or digital code (instant email)", "KES 5,000 to KES 100,000 denominations", "Bulk corporate gifting for schools, SMEs, teams: contact support@nafuumart.co.ke"]],
      "Compare devices": ["Compare devices", "Side-by-side specs, prices, and Nafuu savings. Find the best device for your needs before ordering.", ["CPU, RAM, storage, battery, screen size, weight side-by-side", "Nafuu price vs Mombasa retail: see your exact savings", "Grade comparison: New vs Grade A vs Grade B condition and price difference"]],
      "Nafuu for Business": ["Nafuu for Business", "Bulk sourcing for schools, offices, NGOs, and retail shops. Fixed pricing, priority sourcing, dedicated support.", ["Bulk discount on 5+ units of same device", "Invoicing and payment terms (net 30 for registered businesses)", "Priority agent: dedicated WhatsApp line, sourcing within 4 hours"]],
      "Data protection (Kenya DPA)": ["Data Protection (Kenya DPA)", "Nafuu's data handling program is aligned with Kenya's Data Protection Act, 2019. This section summarizes our data governance controls and your rights as a data subject.", [
        "1. FAIR AND LAWFUL PROCESSING: Personal data is processed for clear and lawful purposes communicated at collection.",
        "2. DATA MINIMIZATION: We only collect data required to verify orders, complete delivery, support after-sales service, and comply with statutory duties.",
        "3. PURPOSE LIMITATION: Data collected for order fulfillment is not reused for unrelated purposes without proper legal basis or consent.",
        "4. ACCURACY: Customers can update details through support channels to ensure records remain accurate and current.",
        "5. STORAGE LIMITATION: Personal data is retained only for legitimate business and legal periods, then deleted or anonymized.",
        "6. SECURITY SAFEGUARDS: Access controls, encryption in transit, logging, and internal approvals reduce unauthorized use or disclosure.",
        "7. PROCESSOR MANAGEMENT: Vendors handling personal data are assessed, contractually bound, and monitored for compliance.",
        "8. INCIDENT RESPONSE: Suspected data incidents are investigated promptly with mitigation, documentation, and notifications where required.",
        "9. DATA SUBJECT RIGHTS: You may request access, correction, deletion, objection, or processing restriction by contacting support@nafuumart.co.ke.",
        "10. COMPLAINT ESCALATION: Unresolved privacy concerns may be escalated to the Office of the Data Protection Commissioner in Kenya.",
        "11. ACCOUNTABILITY: Nafuu maintains internal records and governance practices to demonstrate ongoing compliance.",
        "Last updated: March 2026."
      ]],
      "Report illicit content": ["Report Illicit Content", "Nafuu prohibits listings, messages, and activity that involve unlawful, harmful, or prohibited content. This page explains what to report and how we respond.", [
        "1. WHAT TO REPORT: Suspected counterfeit products, stolen devices, fraudulent listings, illegal software, harmful instructions, harassment, impersonation, and rights-infringing content.",
        "2. HOW TO REPORT: Send details to support@nafuumart.co.ke with order/listing reference, screenshots, and a short description of concern.",
        "3. URGENT SAFETY CASES: If there is immediate risk to people or property, contact local authorities first, then share incident reference with Nafuu.",
        "4. REVIEW PROCESS: Reports are triaged by trust and support teams. We may temporarily restrict listings or accounts while investigating.",
        "5. EVIDENCE CHECK: We assess metadata, account history, sourcing records, and communications to verify the report objectively.",
        "6. POSSIBLE ACTIONS: Content removal, listing suppression, account warnings, account suspension, payment hold, or permanent account closure.",
        "7. LAW ENFORCEMENT COOPERATION: Where legally required, Nafuu may preserve evidence and cooperate with competent authorities.",
        "8. FALSE REPORTING: Intentionally false or malicious reports may lead to account restrictions.",
        "9. STATUS UPDATES: We share outcome updates where appropriate, subject to privacy and legal constraints.",
        "10. APPEALS: Affected users may submit additional context for reconsideration within 7 days of enforcement notice.",
        "11. POLICY ALIGNMENT: This process works alongside our Terms of Service, Privacy Policy, and Kenyan legal obligations.",
        "Last updated: March 2026."
      ]],
    };

    if (docs[item]) {
      const [title, summary, points] = docs[item];
      openInfoPage(title, summary, points);
      return;
    }

    openInfoPage(item, `This ${item.toLowerCase()} section is being prepared for launch.`, [
      "Content will be available soon",
      "Core shopping and tracking are already live",
      "Contact support for immediate help",
    ]);
  };

  const Nav = () => {
    const compact = viewportWidth < 900;
    const rail = [
      { key: "hot", label: "Great Deals", action: () => { setCategory("all"); setSortBy("saving"); setPage("products"); } },
      ...CATEGORIES.filter((c) => c.key !== "all").map((c) => ({
        key: c.key,
        label: c.label,
        action: () => { setCategory(c.key); setPage("products"); },
      })),
      ...(currentUser?.isAdmin ? [{ key: "admin", label: "Admin", action: () => setPage("admin") }] : []),
      ...(currentUser ? [{ key: "my-orders", label: "My Orders", action: () => setPage("my-orders") }] : []),
      { key: "track", label: "Track Order", action: () => { setPage("track"); setTrackedOrder(null); } },
    ];

    return (
      <nav style={{ position: "sticky", top: 0, zIndex: 120, background: "rgba(247,247,242,.96)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        {!compact && (
          <div style={{ borderBottom: "1px solid var(--line)", background: "#f5f5f3" }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40, padding: "0 20px" }}>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <button onClick={() => setPage("home")} style={topLink}>The Nafuu Promise</button>
                <button onClick={() => { setPage("products"); setSearch("warranty"); }} style={topLink}>Repair & Care</button>
                <button onClick={() => { setPage("products"); setSortBy("saving"); }} style={topLink}>End Fast Tech</button>
                <button onClick={() => setPage("products")} style={topLink}>Tech Journal</button>
              </div>
              <button style={{ ...topLink, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>🇰🇪 KE</button>
            </div>
          </div>
        )}

        <div style={{ borderBottom: "1px solid var(--line)", background: "#fafaf9" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: compact ? "1fr" : "auto 1fr auto", gap: 16, alignItems: "center", padding: "14px 20px" }}>
            <button onClick={() => { setPage("home"); setSearch(""); setCategory("all"); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifySelf: compact ? "start" : "auto" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--ink)", color: "var(--sun)", fontWeight: 800, display: "grid", placeItems: "center", fontSize: 18 }}>N</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>Nafuu Mart</div>
                {!compact && <div style={{ fontSize: 9, letterSpacing: 1.3, color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>BEI NAFUU. MLANGONI MWAKO.</div>}
              </div>
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(navSearch);
              }}
              style={{ width: "100%", display: "grid", gridTemplateColumns: viewportWidth < 520 ? "1fr" : "1fr auto", gap: 8, background: "#fff", borderRadius: 14, border: "1px solid var(--line)", padding: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <div style={{ width: "100%", display: "flex", alignItems: "center", minHeight: 44, padding: "0 10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, marginRight: 10, flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  value={navSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNavSearch(value);
                    if (page === "products") setSearch(value);
                  }}
                  placeholder="Search for a laptop, phone, or audio..."
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--ink)" }}
                />
              </div>
              <button type="submit" style={{ border: "none", background: "var(--ink)", color: "#fff", borderRadius: 10, minHeight: 44, padding: "0 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all .2s ease" }}>
                Search
              </button>
            </form>

            <div style={{ display: "flex", gap: 10, alignItems: "center", justifySelf: compact ? "start" : "end", position: "relative" }}>
              {currentUser?.isAdmin && <button onClick={() => setPage("admin")} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>Admin</button>}
              {currentUser && <button onClick={() => setPage("my-orders")} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>My Orders</button>}
              <button onClick={() => { setPage("products"); setSortBy("saving"); }} style={actionBtn}>Trade-in</button>
              <button onClick={() => { setPage("track"); setTrackedOrder(null); }} style={{ ...actionBtn, display: compact ? "none" : "flex", alignItems: "center", gap: 6 }}>Need help?</button>
              {currentUser && <button onClick={signOut} style={{ ...actionBtn, display: compact ? "none" : "inline-flex" }}>Sign out</button>}
              <button onClick={() => openAuth(currentUser ? "signin" : "signup")} style={iconBtn} title={currentUser ? currentUser.email : "Sign in / Sign up"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                </svg>
              </button>
              <button onClick={() => setPage("wishlist")} style={{ ...iconBtn, position: "relative" }} title="Wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {wishlist.length > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--cherry)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>
                    {wishlist.length}
                  </span>
                )}
              </button>
              <button onClick={() => setPage("cart")} style={{ ...iconBtn, position: "relative" }} title="Shopping Cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "var(--accent-dark)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 5px" }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: "#fafaf9", borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px", position: "relative" }}>
            <div style={{ display: "flex", gap: 28, alignItems: "center", overflowX: "auto", minHeight: 50, whiteSpace: "nowrap", scrollbarWidth: "none" }}>
              {rail.map((item) => (
                <button
                  key={item.key}
                  onMouseEnter={() => {
                    if (item.key === "all") setCategoryDropdown(true);
                  }}
                  onClick={item.action}
                  style={{
                    ...topNavItem,
                    color: item.key === category ? "var(--cherry)" : "var(--ink)",
                  }}
                >
                  {item.label}
                </button>
              ))}
              <div
                onMouseEnter={() => setCategoryDropdown(true)}
                onMouseLeave={() => setCategoryDropdown(false)}
                style={{ position: "relative", marginLeft: "auto" }}
              >
                <button style={{ ...topNavItem, display: "flex", alignItems: "center", gap: 6 }}>
                  Browse categories
                  <span style={{ fontSize: 10, transform: categoryDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▼</span>
                </button>
                {categoryDropdown && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: 16, width: compact ? 330 : 560, boxShadow: "0 14px 34px rgba(0,0,0,.14)", display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
                    {CATEGORY_MENU.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => {
                          setCategory(cat.key);
                          setPage("products");
                          setCategoryDropdown(false);
                        }}
                        style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 10, border: "1px solid #e8e8df", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left", overflow: "hidden" }}
                      >
                        <div style={{ background: cat.color, display: "grid", placeItems: "center", fontSize: 30 }}>{cat.icon}</div>
                        <div style={{ padding: "10px 10px 10px 0" }}>
                          <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{cat.label}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 5 }}>{cat.desc}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>{categoryCount(cat.key)} products</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  const Footer = () => (
    <footer style={{ background: "#efefef", borderTop: "1px solid #d8d8d8", marginTop: 32 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "38px 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 980 ? "1fr" : "1.1fr 1.3fr", gap: 20, alignItems: "start", marginBottom: 26 }}>
          <div>
            <h3 style={{ fontSize: viewportWidth < 640 ? 24 : 34, lineHeight: 1.08, marginBottom: 10, color: "#3d3d3d", fontFamily: "'Fraunces',serif", fontWeight: 700 }}>Stay in the loop with hot drops</h3>
            <p style={{ color: "#5a5a5a", fontSize: viewportWidth < 640 ? 14 : 15, lineHeight: 1.6, maxWidth: 520 }}>
              Be first to know about Nairobi-price arrivals, Mombasa delivery updates, and weekly tech deals from trusted Kenyan suppliers.
            </p>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 640 ? "1fr" : "1fr auto", gap: 10 }}>
              <div style={{ border: "1px solid #bdbdbd", borderRadius: 12, background: "#fff", height: 64, display: "flex", alignItems: "center", padding: "0 14px" }}>
                <input
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterMsg) setNewsletterMsg("");
                  }}
                  placeholder="Email"
                  style={{ flex: 1, border: "none", outline: "none", fontSize: viewportWidth < 640 ? 16 : 18, background: "transparent" }}
                />
                <span style={{ fontSize: 20, color: "#6f6f6f" }}>✉</span>
              </div>
              <button onClick={handleNewsletterSignup} style={{ background: "#3d3d3d", color: "#fff", border: "none", borderRadius: 12, padding: "0 22px", height: 64, fontWeight: 700, fontSize: viewportWidth < 640 ? 14 : 15, cursor: "pointer" }}>
                Sign up
              </button>
            </div>
            {newsletterMsg && <p style={{ marginTop: 8, color: newsletterMsg.startsWith("Asante") ? "#0b8f41" : "#b91c1c", fontSize: 13 }}>{newsletterMsg}</p>}
            <button onClick={() => handleFooterLink("Help Center")} style={{ marginTop: 16, border: "none", background: "none", textDecoration: "underline", color: "#1f1f1f", fontWeight: 600, cursor: "pointer", padding: 0 }}>Learn more</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 26, paddingTop: 26, borderTop: "1px solid #d4d4d4" }}>
          <div>
            <h4 style={footerHeading}>About</h4>
            {[
              "About Nafuu Mart",
              "Press",
              "Our impact",
              "Mombasa pickup point",
              "Accessibility",
              "We are hiring",
              "Trustpilot",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {[
                { key: "instagram", icon: "📷", label: "Instagram" },
                { key: "tiktok", icon: "♪", label: "TikTok" },
                { key: "youtube", icon: "▶", label: "YouTube" },
                { key: "linkedin", icon: "in", label: "LinkedIn" },
                { key: "facebook", icon: "f", label: "Facebook" },
                { key: "twitter", icon: "𝕏", label: "X/Twitter" }
              ].map((s) => (
                <button 
                  key={s.key} 
                  onClick={() => handleFooterLink("Contact us")} 
                  title={s.label}
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 999, 
                    border: "1px solid #bdbdbd", 
                    background: "#fff", 
                    fontWeight: 700, 
                    color: "#5d5d5d", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: s.icon.length === 1 ? 16 : 18,
                    transition: "all .2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#999";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#bdbdbd";
                  }}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={footerHeading}>Help</h4>
            {["Contact us", "Help Center", "Shipping", "Returns and refunds", "Track order"].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Services</h4>
            {[
              "1-year warranty",
              "Protection plan",
              "Trade-in",
              "Student program",
              "SME bulk supply",
              "Seller portal",
              "Nafuu for Business",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
            <div style={{ marginTop: 8, fontSize: 13, color: "#444", fontWeight: 700 }}>Payments 100% secured</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {["M-PESA", "Airtel Money", "VISA", "Mastercard", "KCB", "Equity"].map((p) => (
                <span key={p} style={{ border: "1px solid #c6c6c6", borderRadius: 8, padding: "5px 8px", background: "#fff", fontSize: 11, fontWeight: 700, color: "#444" }}>{p}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={footerHeading}>Resources</h4>
            {["Gift Cards", "Tech Journal", "Compare devices", "Gift ideas", "Back to School", "Black Friday"].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Law and order</h4>
            {[
              "Terms of service",
              "Trade-in terms",
              "Cookie policy",
              "Privacy policy",
              "Data protection (Kenya DPA)",
              "Report illicit content",
            ].map((item) => <button key={item} onClick={() => handleFooterLink(item)} style={footerLink}>{item}</button>)}
          </div>

          <div>
            <h4 style={footerHeading}>Certified</h4>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>KEBS</div>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>CAK</div>
              <div style={{ width: 72, height: 92, border: "2px solid #222", borderRadius: 8, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontWeight: 800 }}>BRS</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #d4d4d4", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#5a5a5a", fontSize: 13 }}>
          <span>© 2026 Nafuu Mart - nafuumart.co.ke</span>
          <span>M-Pesa Paybill Name: Nafuu Mart | Delivering Nairobi prices to Mombasa</span>
        </div>
      </div>
    </footer>
  );

  if (page === "home") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <section style={{ color: "var(--ink)", minHeight: 420, display: "flex", alignItems: "center", background: "linear-gradient(135deg, #e8f8ed 0%, #f0f7ff 50%, #fff9f5 100%)", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", background: "radial-gradient(circle at 80% 40%, rgba(107,142,113,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px", width: "100%", opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(20px)", transition: "all .7s ease", display: "grid", gridTemplateColumns: viewportWidth < 960 ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center", position: "relative", zIndex: 1 }}>
            {/* Left Content */}
            <div>
              <div style={{ display: "inline-flex", marginBottom: 14, borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", padding: "8px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--accent-dark)" }}>🚀 Nairobi Prices to Mombasa</div>
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(32px,6vw,56px)", lineHeight: 1.1, marginBottom: 14, color: "#3d3d3d", fontWeight: 900 }}>Big savings,<br/>zero surprises.</h1>
              <p style={{ maxWidth: 540, color: "#5a5a5a", fontSize: 18, lineHeight: 1.7, marginBottom: 22 }}>The Nairobi price gap, closed. We source, inspect, and deliver to your Mombasa door with live photo approval and guaranteed next-day arrival.</p>
              
              {/* CTA Buttons */}
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                <button onClick={() => setPage("products")} style={{ background: "var(--ink)", color: "white", border: "none", borderRadius: 12, padding: "16px 28px", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all .25s ease", boxShadow: "0 8px 20px rgba(61,61,61,0.15)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(61,61,61,0.25)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(61,61,61,0.15)"; }}>Shop Now</button>
                <button onClick={() => handleFooterLink("Tech Journal")} style={{ background: "#fff", color: "var(--ink)", border: "2px solid var(--ink)", borderRadius: 12, padding: "14px 28px", fontWeight: 700, fontSize: 16, cursor: "pointer", transition: "all .25s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--ink)"; }}>Learn How It Works</button>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(search);
                }}
                style={{ display: "grid", gridTemplateColumns: viewportWidth < 520 ? "1fr" : "1fr auto", gap: 8, background: "#fff", borderRadius: 14, padding: 6, border: "1px solid var(--line)", marginBottom: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              >
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a laptop, phone, or audio..." style={{ minHeight: 44, border: "none", outline: "none", padding: "0 12px", background: "transparent", fontSize: 14 }} />
                <button type="submit" style={{ background: "var(--ink)", color: "white", border: "none", borderRadius: 10, minHeight: 44, padding: "0 18px", fontWeight: 700, cursor: "pointer" }}>Search</button>
              </form>

              {/* Quick Chips */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["HP Elitebook", "iPhone 14", "AirPods Pro", "Samsung Galaxy"].map((chip) => (
                  <button key={chip} onClick={() => { setSearch(chip); setPage("products"); }} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "var(--line)"; }}>Trending: {chip}</button>
                ))}
              </div>
            </div>

            {/* Right: Featured Card */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Top Savings Card */}
              <div style={{ background: "linear-gradient(135deg, #6b8e71 0%, #8ba88f 100%)", borderRadius: 20, padding: "28px 24px", color: "white", boxShadow: "0 12px 32px rgba(107,142,113,0.2)", animation: `fadeUp .7s .2s both` }}>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>AVERAGE SAVINGS</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 48, fontWeight: 900, marginBottom: 4 }}>KES 18,400</div>
                <div style={{ fontSize: 14, opacity: 0.95 }}>Per device vs Mombasa retail</div>
                <div style={{ fontSize: 12, marginTop: 16, opacity: 0.8, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>✓ 5,200+ happy customers<br/>✓ Average 42% price drop<br/>✓ Next-day delivery</div>
              </div>

              {/* Trust Badges */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "✓", label: "100-point checks", text: "Every device", color: "#f0f7ff" },
                  { icon: "↩️", label: "30-day returns", text: "No questions", color: "#fef9f0" },
                  { icon: "📸", label: "Live photos", text: "Before dispatch", color: "#f5f9f0" },
                  { icon: "⏱️", label: "Next-day delivery", text: "To your door", color: "#fffaf5" },
                ].map((badge, i) => (
                  <div key={badge.label} style={{ background: badge.color, borderRadius: 14, padding: "16px 12px", textAlign: "center", animation: `fadeUp .7s ${.3 + i * 0.08}s both` }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{badge.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3d3d3d", marginBottom: 2 }}>{badge.label}</div>
                    <div style={{ fontSize: 11, color: "#5a5a5a" }}>{badge.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "#fafaf8" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2, marginBottom: 26 }}>Shop by Category</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {CATEGORY_MENU.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategory(cat.key);
                    setPage("products");
                  }}
                  style={{
                    background: cat.color,
                    border: "1px solid transparent",
                    borderRadius: 16,
                    padding: "28px 24px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .25s ease",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{cat.icon}</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 12 }}>
                    {cat.desc}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "var(--accent-dark)", 
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    Browse {categoryCount(cat.key)} products →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={h2}>Why Nafuu?</h2>
            <div style={grid4}>
              {[
                ["Nairobi Prices", "Save KSH 5,000 to 15,000 per laptop in Mombasa."],
                ["Photo Approval", "See your exact unit before dispatch."],
                ["Next-Day Delivery", "Order before noon, receive next day."],
                ["Honest Grading", "Clear Grade A/B condition descriptions."],
              ].map((x) => (
                <div key={x[0]} style={featureCard}><h3 style={h3}>{x[0]}</h3><p style={pMuted}>{x[1]}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={h2}>Hot Drops</h2>
              <button onClick={() => setPage("products")} style={outlineBtn}>View All</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18 }}>
                {catalog.slice(0, 6).map((p, i) => (
                <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "#121212", color: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ ...h2, color: "white" }}>How it works</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {[
                "1. Search and compare",
                "2. Pay by M-Pesa",
                "3. Approve live photo",
                "4. Agent dispatches",
                "5. Track to delivery",
              ].map((step) => (
                <div key={step} style={{ border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.04)", borderRadius: 14, padding: 16, fontWeight: 700 }}>{step}</div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "70px 24px", background: "white" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={h2}>What customers say</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
              {TESTIMONIALS.map((t, i) => (
                <article key={t.name} style={{ ...panel, animation: `fadeUp .45s ${i * 0.08}s both` }}>
                  <div style={{ color: "#f1b400", marginBottom: 8 }}>★★★★★</div>
                  <p style={{ ...pMuted, marginBottom: 10 }}>{t.quote}</p>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{t.item}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "36px 24px", background: "var(--paper)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>As seen in</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              {AS_SEEN_IN.map((name) => (
                <div key={name} style={{ border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: "var(--ink-soft)" }}>{name}</div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </>
    );
  }

  if (page === "products") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={h2}>Shop / Products</h1>
          {isMobileFilters && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setIsFilterOpen(true)} style={{ ...outlineBtn, width: "100%" }}>Open Filters & Sort</button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isMobileFilters ? "1fr" : "minmax(220px,260px) 1fr", gap: 16 }}>
            {!isMobileFilters && (
              <aside style={{ ...panel, height: "fit-content", position: "sticky", top: 82 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Filters</div>
                <label style={filterLabel}>Category</label>
                <div style={chipWrap}>
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCategory(c.key)} style={chipBtn(category === c.key)}>{c.label}</button>
                  ))}
                </div>

                <label style={filterLabel}>Grade</label>
                <div style={chipWrap}>
                  {["all", "New", "A", "B"].map((g) => (
                    <button key={g} onClick={() => setGradeFilter(g)} style={chipBtn(gradeFilter === g)}>
                      {g === "all" ? "All" : g === "New" ? "Brand New" : `Grade ${g}`}
                    </button>
                  ))}
                </div>

                <label style={filterLabel}>Price Band</label>
                <div style={chipWrap}>
                  <button onClick={() => setPriceBand("all")} style={chipBtn(priceBand === "all")}>All</button>
                  <button onClick={() => setPriceBand("budget")} style={chipBtn(priceBand === "budget")}>Under 25k</button>
                  <button onClick={() => setPriceBand("mid")} style={chipBtn(priceBand === "mid")}>25k - 50k</button>
                  <button onClick={() => setPriceBand("premium")} style={chipBtn(priceBand === "premium")}>50k+</button>
                </div>

                <button
                  onClick={() => {
                    setCategory("all");
                    setGradeFilter("all");
                    setPriceBand("all");
                    setSortBy("featured");
                    setSearch("");
                  }}
                  style={{ ...outlineBtn, width: "100%", marginTop: 12 }}
                >
                  Reset Filters
                </button>
              </aside>
            )}

            {isMobileFilters && isFilterOpen && (
              <>
                <div onClick={() => setIsFilterOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 150 }} />
                <aside style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, border: "1px solid var(--line)", maxHeight: "78vh", overflowY: "auto", zIndex: 160, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>Filters & Sort</div>
                    <button onClick={() => setIsFilterOpen(false)} style={{ ...linkBtn, marginBottom: 0 }}>Close</button>
                  </div>

                  <label style={filterLabel}>Category</label>
                  <div style={chipWrap}>
                    {CATEGORIES.map((c) => (
                      <button key={c.key} onClick={() => setCategory(c.key)} style={chipBtn(category === c.key)}>{c.label}</button>
                    ))}
                  </div>

                  <label style={filterLabel}>Grade</label>
                  <div style={chipWrap}>
                    {["all", "New", "A", "B"].map((g) => (
                      <button key={g} onClick={() => setGradeFilter(g)} style={chipBtn(gradeFilter === g)}>
                        {g === "all" ? "All" : g === "New" ? "Brand New" : `Grade ${g}`}
                      </button>
                    ))}
                  </div>

                  <label style={filterLabel}>Price Band</label>
                  <div style={chipWrap}>
                    <button onClick={() => setPriceBand("all")} style={chipBtn(priceBand === "all")}>All</button>
                    <button onClick={() => setPriceBand("budget")} style={chipBtn(priceBand === "budget")}>Under 25k</button>
                    <button onClick={() => setPriceBand("mid")} style={chipBtn(priceBand === "mid")}>25k - 50k</button>
                    <button onClick={() => setPriceBand("premium")} style={chipBtn(priceBand === "premium")}>50k+</button>
                  </div>

                  <label style={filterLabel}>Sort</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 10px", background: "white" }}>
                    <option value="featured">Featured</option>
                    <option value="saving">Biggest Saving</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name-az">Name: A to Z</option>
                    <option value="name-za">Name: Z to A</option>
                    <option value="brand">Brand</option>
                  </select>

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      onClick={() => {
                        setCategory("all");
                        setGradeFilter("all");
                        setPriceBand("all");
                        setSortBy("featured");
                        setSearch("");
                        setNavSearch("");
                      }}
                      style={{ ...outlineBtn, flex: 1 }}
                    >
                      Reset
                    </button>
                    <button onClick={() => setIsFilterOpen(false)} style={{ ...solidBtn, flex: 1 }}>Apply</button>
                  </div>
                </aside>
              </>
            )}

            <div>
              <div style={{ ...panel, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={search} onChange={(e) => { setSearch(e.target.value); setNavSearch(e.target.value); }} placeholder="Search brand, model, spec, keyword" style={{ flex: 1, minWidth: 260, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }} />
                  {!isMobileFilters && (
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 10px", background: "white" }}>
                      <option value="featured">Featured</option>
                      <option value="saving">Biggest Saving</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name-az">Name: A to Z</option>
                      <option value="name-za">Name: Z to A</option>
                      <option value="brand">Brand</option>
                    </select>
                  )}
                </div>
                <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 13 }}>{sortedFiltered.length} matching products</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 18 }}>
                {sortedFiltered.map((p, i) => (
                  <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "product" && selected) {
    const saving = selected.market - selected.price;
    const grade = GRADE_INFO[selected.grade] || GRADE_INFO.A;
    const stockMeta = getStockMeta(selected.stockStatus);
    const available = isAvailable(selected);
    const galleryImages = Array.isArray(selected.images) && selected.images.length > 0
      ? selected.images
      : selected.image
      ? [selected.image]
      : [];
    const activeImage = galleryImages[Math.min(selectedImageIndex, Math.max(galleryImages.length - 1, 0))] || "";
    const relatedProducts = catalog
      .filter((p) => p.id !== selected.id && p.category === selected.category)
      .slice(0, 3)
      .map(withStockStatus);
    const productReviews = [
      { name: "Nadia K.", text: "Device matched the photos exactly. Battery health was great and delivery was next day.", rating: 5 },
      { name: "Brian O.", text: "Clean machine and fair price. Support team called before dispatch to confirm details.", rating: 5 },
      { name: "Aisha M.", text: "Condition was as described and setup was smooth. Would buy again.", rating: 4 },
    ];
    const productFaqs = [
      { q: "How fast is delivery to Mombasa?", a: "Orders confirmed before noon are usually dispatched same day and delivered the next business day." },
      { q: "What does this grade mean?", a: `${grade.label}: ${grade.desc}` },
      { q: "Can I return if it differs from photos?", a: "Yes. If condition does not match approved photos, you can request return and refund under policy." },
    ];
    const avgRating = (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1);
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage("products")} style={linkBtn}>Back</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
            <div style={panel}>
              {activeImage && (
                <>
                  <div style={{ width: "100%", height: 300, background: "#f5f5f0", borderRadius: 12, marginBottom: 12, overflow: "hidden", display: "grid", placeItems: "center" }}>
                    <img src={activeImage} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                  </div>
                  {galleryImages.length > 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(70px,1fr))", gap: 8, marginBottom: 20 }}>
                      {galleryImages.map((img, idx) => (
                        <button
                          key={`${selected.id}-img-${idx}`}
                          onClick={() => setSelectedImageIndex(idx)}
                          style={{ width: "100%", height: 70, borderRadius: 8, overflow: "hidden", border: idx === selectedImageIndex ? "2px solid var(--ink)" : "1px solid var(--line)", padding: 0, background: "#fff", cursor: "pointer" }}
                          title={`Image ${idx + 1}`}
                        >
                          <img loading="lazy" src={img} alt={`${selected.name} ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <h1 style={h2}>{selected.brand} {selected.name}</h1>
              <p style={pMuted}>{selected.spec}</p>
              {(selected.longDescription || selected.description) && (
                <p style={{ marginTop: 14, padding: 12, background: "#fafaf9", borderRadius: 10, color: "var(--text-mid)", lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-line" }}>
                  {(selected.longDescription || selected.description).replace(/ (Specs:|Best For:|Condition:|Value:|Purchase Note:)/g, "\n$1")}
                </p>
              )}
              <div style={{ marginTop: 8, display: "inline-block", border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "4px 10px", color: stockMeta.color, background: stockMeta.bg, fontWeight: 700, fontSize: 12 }}>
                {stockMeta.label}
              </div>
              <div style={{ marginTop: 12, display: "inline-block", border: `1px solid ${grade.color}`, borderRadius: 999, padding: "4px 10px", color: grade.color, fontWeight: 700 }}>{grade.label}</div>
              <p style={{ marginTop: 8, color: "var(--text-mid)" }}>{grade.desc}</p>
              <ul style={{ marginTop: 14, paddingLeft: 18, color: "var(--text-mid)", lineHeight: 1.8 }}>
                {selected.spec.split(" · ").map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div style={panel}>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Nafuu Price</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 36, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>{fmt(selected.price)}</div>
              <div style={{ color: "var(--text-dim)", textDecoration: "line-through", marginBottom: 12 }}>Mombasa market: {fmt(selected.market)}</div>
              <div style={{ background: "rgba(26,122,74,.1)", border: "1px solid rgba(26,122,74,.25)", borderRadius: 10, padding: 12, marginBottom: 18, color: "var(--green)", fontWeight: 700 }}>You save {fmt(saving)}</div>
              
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                  onClick={() => addToCart(selected)}
                  disabled={!available}
                  style={{ flex: 1, border: "none", borderRadius: 10, background: available ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", padding: "14px 18px", fontWeight: 700, fontSize: 15, cursor: available ? "pointer" : "not-allowed", transition: "all .2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  {available ? "Add to Cart" : "Out of Stock"}
                </button>
                <button
                  onClick={() => toggleWishlist(selected)}
                  style={{ width: 52, height: 52, borderRadius: 10, background: isInWishlist(selected.id) ? "var(--cherry)" : "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", cursor: "pointer", transition: "all .2s ease" }}
                  title={isInWishlist(selected.id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist(selected.id) ? "#fff" : "none"} stroke={isInWishlist(selected.id) ? "#fff" : "currentColor"} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
              
              <button onClick={() => available && setPage("checkout")} disabled={!available} style={{ width: "100%", ...solidBtn, opacity: available ? 1 : 0.6, cursor: available ? "pointer" : "not-allowed" }}>{available ? "Buy Now" : "Currently Unavailable"}</button>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: viewportWidth < 960 ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div style={panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>Customer Reviews</h3>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>★ {avgRating} ({productReviews.length})</div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {productReviews.map((r) => (
                  <div key={r.name} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong style={{ color: "var(--ink)", fontSize: 13 }}>{r.name}</strong>
                      <span style={{ color: "#f1b400", fontSize: 12 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    </div>
                    <p style={{ color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Frequently Asked Questions</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {productFaqs.map((faq, idx) => (
                  <div key={faq.q} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenProductFaq((prev) => (prev === idx ? -1 : idx))}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "#fff", color: "var(--ink)", padding: "12px 14px", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: 12 }}>{openProductFaq === idx ? "−" : "+"}</span>
                    </button>
                    {openProductFaq === idx && (
                      <div style={{ borderTop: "1px solid var(--line)", background: "#fafaf9", padding: "10px 14px", color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div style={{ marginTop: 20, ...panel }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>You might also like</h3>
                <button onClick={() => setPage("products")} style={outlineBtn}>View more</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                {relatedProducts.map((item) => {
                  const itemAvailable = isAvailable(item);
                  return (
                    <div key={item.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "#fff" }}>
                      <button onClick={() => { setSelected(item); setPage("product"); }} style={{ border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
                        {item.image && <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
                        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{item.brand} {item.name}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{item.spec}</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, color: "var(--ink)", fontSize: 20, marginTop: 6 }}>{fmt(item.price)}</div>
                      </button>
                      <button onClick={() => addToCart(item)} disabled={!itemAvailable} style={{ width: "100%", marginTop: 8, border: "none", borderRadius: 8, padding: "10px 12px", background: itemAvailable ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", fontWeight: 700, cursor: itemAvailable ? "pointer" : "not-allowed" }}>
                        {itemAvailable ? "Add to Cart" : "Out of Stock"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "checkout" && (selected || cart.length > 0)) {
    const deliveryFee = 0;
    const total = checkoutSubtotal + deliveryFee;
    
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage(selected ? "product" : "cart")} style={linkBtn}>
            {selected ? "← Back to product" : "← Back to cart"}
          </button>
          
          <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 380px", gap: 32, marginTop: 24 }}>
            {/* Left: Checkout Form */}
            <div>
              <h1 style={{ ...h2, marginBottom: 6, fontSize: 32 }}>Checkout</h1>
              <p style={pMuted}>Complete your order in 2 minutes for {checkoutItemCount} item{checkoutItemCount !== 1 ? "s" : ""}</p>
              
              {/* Customer Information */}
              <div style={{ ...panel, marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Your Information</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Full name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Njeri"
                    style={{ width: "100%", border: `1px solid ${formErrors.name ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.name && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.name}</div>}
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Phone number *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="0712345678"
                    style={{ width: "100%", border: `1px solid ${formErrors.phone ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.phone && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.phone}</div>}
                </div>
              </div>
              
              {/* Delivery Information */}
              <div style={{ ...panel, marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Delivery Address</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Delivery location *</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g., Mombasa CBD, Tudor, Mvita"
                    style={{ width: "100%", border: `1px solid ${formErrors.location ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15 }}
                  />
                  {formErrors.location && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{formErrors.location}</div>}
                </div>
                
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Special instructions</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Gate code, building name, delivery preferences..."
                    rows="3"
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", fontSize: 15, resize: "vertical" }}
                  />
                </div>
              </div>
              
              {/* Payment Method */}
              <div style={{ ...panel, marginTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--ink)" }}>Payment Method</h3>
                
                {/* M-Pesa Option */}
                <button 
                  onClick={() => setPaymentMethod("mpesa")}
                  style={{ width: "100%", border: `2px solid ${paymentMethod === "mpesa" ? "var(--green)" : "var(--line)"}`, borderRadius: 10, padding: 14, background: paymentMethod === "mpesa" ? "#f0fdf4" : "#f9f9f7", display: "flex", alignItems: "center", gap: 12, marginBottom: 10, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ width: 40, height: 40, background: "#0ca856", borderRadius: 8, display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 18 }}>M</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>M-Pesa</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Pay via STK push to your phone</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${paymentMethod === "mpesa" ? "var(--green)" : "var(--line)"}`, background: paymentMethod === "mpesa" ? "var(--green)" : "transparent", display: "grid", placeItems: "center" }}>
                    {paymentMethod === "mpesa" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>

                {/* Pesapal Option (Cards + Mobile Money) */}
                <button 
                  onClick={() => setPaymentMethod("pesapal")}
                  style={{ width: "100%", border: `2px solid ${paymentMethod === "pesapal" ? "var(--green)" : "var(--line)"}`, borderRadius: 10, padding: 14, background: paymentMethod === "pesapal" ? "#f0fdf4" : "#f9f9f7", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ width: 40, height: 40, background: "#1a73e8", borderRadius: 8, display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 18 }}>💳</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>Pesapal (Cards + Airtel)</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Visa, Mastercard, Airtel Money via Pesapal</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${paymentMethod === "pesapal" ? "var(--green)" : "var(--line)"}`, background: paymentMethod === "pesapal" ? "var(--green)" : "transparent", display: "grid", placeItems: "center" }}>
                    {paymentMethod === "pesapal" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>

                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
                  {paymentMethod === "mpesa" 
                    ? "M-Pesa STK prompt will be sent to your phone number. Enter your PIN to complete payment." 
                    : "You'll be redirected to Pesapal's secure payment page for card or Airtel Money payment."}
                </p>
              </div>

              {/* Place Order Button */}
              <button 
                onClick={placeOrder} 
                disabled={paying}
                style={{ ...solidBtn, width: "100%", marginTop: 24, padding: "16px 14px", fontSize: 16, fontWeight: 700, opacity: paying ? 0.7 : 1, cursor: paying ? "not-allowed" : "pointer" }}
              >
                {paying ? "Processing Payment..." : `Complete Order - ${fmt(total)}`}
              </button>
              {formErrors.checkout && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{formErrors.checkout}</div>}
              
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>
                By ordering, you agree to our <button onClick={() => { openInfoPage("Terms of Service", "Our commitment to you", ["Fair pricing on all devices", "30-day money-back guarantee", "100-point quality checks", "Next-day delivery in Mombasa"]); }} style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Terms of Service</button>. Next-day delivery to your Mombasa location guaranteed.
              </p>
            </div>
            
            {/* Right: Order Summary (sticky on desktop) */}
            <div style={{ position: viewportWidth < 900 ? "static" : "sticky", top: viewportWidth < 900 ? "auto" : 100 }}>
              <div style={{ ...panel, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)" }}>Order Summary</h3>
                
                {/* Product Card */}
                <div style={{ background: "#fafaf9", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  {checkoutItems.map((item) => (
                    <div key={item.id} style={{ display: "flex", gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #ecece7" }}>
                      <div style={{ width: 60, height: 60, background: "#f5f5f0", borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center", fontSize: 24, flexShrink: 0 }}>
                        {item.image ? (
                          <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; e.target.parentElement.textContent = "📦"; }} />
                        ) : (
                          "📦"
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{item.brand} {item.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{item.spec}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Qty: {item.quantity || 1}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}>{fmt(item.price * (item.quantity || 1))}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Price Breakdown */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                    <span>Subtotal ({checkoutItemCount} items)</span>
                    <span style={{ fontWeight: 600 }}>{fmt(checkoutSubtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
                    <span>Delivery Fee</span>
                    <span style={{ fontWeight: 600, color: deliveryFee === 0 ? "var(--green)" : "var(--ink)" }}>
                      {deliveryFee === 0 ? "FREE" : fmt(deliveryFee)}
                    </span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                    <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--ink)" }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
              
              {/* Savings Card */}
              <div style={{ background: "linear-gradient(135deg, rgba(26,122,74,.08) 0%, rgba(26,122,74,.05) 100%)", border: "1px solid rgba(26,122,74,.2)", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>You Save</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 900, color: "var(--green)", marginBottom: 6 }}>{fmt(checkoutSavings)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>vs Mombasa retail prices</div>
              </div>
              
              {/* Trust Badges */}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {[
                  { icon: "✓", text: "100-point checks" },
                  { icon: "↩️", text: "30-day returns" },
                  { icon: "📸", text: "Live photos before dispatch" },
                ].map((badge) => (
                  <div key={badge.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                    <span style={{ fontSize: 16 }}>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "cart") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8, fontSize: 32 }}>Shopping Cart</h1>
          <p style={pMuted}>
            {cartCount === 0 ? "Your cart is empty" : `${cartCount} item${cartCount !== 1 ? "s" : ""} in your cart`}
          </p>

          {cart.length === 0 ? (
            <div style={{ ...panel, marginTop: 32, textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>Your cart is empty</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Add some products to get started!</p>
              <button onClick={() => setPage("products")} style={solidBtn}>
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 900 ? "1fr" : "1fr 380px", gap: 32, marginTop: 24 }}>
              {/* Cart Items */}
              <div>
                {cart.map((item) => {
                  const saving = item.market - item.price;
                  const grade = GRADE_INFO[item.grade] || GRADE_INFO.A;
                  return (
                    <div key={item.id} style={{ ...panel, marginBottom: 16, display: "grid", gridTemplateColumns: viewportWidth < 600 ? "1fr" : "120px 1fr auto", gap: 16, alignItems: "start" }}>
                      {item.image && (
                        <div style={{ width: viewportWidth < 600 ? "100%" : 120, height: viewportWidth < 600 ? 200 : 120, background: "#f5f5f0", borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => { setSelected(item); setPage("product"); }}>
                          <img loading="lazy" src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>{item.brand}</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 4, cursor: "pointer" }} onClick={() => { setSelected(item); setPage("product"); }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{item.spec}</div>
                        <div style={{ display: "inline-block", border: `1px solid ${grade.color}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: grade.color, fontWeight: 700, marginBottom: 12 }}>
                          {grade.label}
                        </div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 900, color: "var(--ink)", marginBottom: 4 }}>{fmt(item.price)}</div>
                        <div style={{ fontSize: 11, color: "var(--accent-dark)", fontWeight: 700 }}>Save {fmt(saving)} vs market price</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: viewportWidth < 600 ? "row" : "column", gap: 12, alignItems: viewportWidth < 600 ? "center" : "end" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f5f0", borderRadius: 8, padding: "6px 8px" }}>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16 }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16 }}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--cherry)", fontSize: 13, fontWeight: 600, textDecoration: "underline" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div style={{ position: viewportWidth < 900 ? "static" : "sticky", top: viewportWidth < 900 ? "auto" : 100 }}>
                <div style={panel}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--ink)" }}>Order Summary</h3>
                  
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                      <span>Subtotal ({cartCount} items)</span>
                      <span style={{ fontWeight: 600 }}>{fmt(cartTotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
                      <span>Delivery Fee</span>
                      <span style={{ fontWeight: 600, color: "var(--green)" }}>FREE</span>
                    </div>
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--ink)" }}>{fmt(cartTotal)}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelected(null);
                      setPage("checkout");
                    }}
                    style={{ width: "100%", border: "none", borderRadius: 10, background: "var(--accent-dark)", color: "#fff", padding: "14px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 12 }}
                  >
                    Proceed to Checkout
                  </button>
                  
                  <button
                    onClick={() => setPage("products")}
                    style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", color: "var(--ink)", padding: "14px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    Continue Shopping
                  </button>
                </div>
                
                <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(26,122,74,.08) 0%, rgba(26,122,74,.05) 100%)", border: "1px solid rgba(26,122,74,.2)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>💰 Total Savings</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 900, color: "var(--green)" }}>
                    {fmt(cart.reduce((sum, item) => sum + (item.market - item.price) * item.quantity, 0))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>vs Mombasa retail prices</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "wishlist") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8, fontSize: 32 }}>My Wishlist</h1>
          <p style={pMuted}>
            {wishlist.length === 0 ? "No items saved yet" : `${wishlist.length} product${wishlist.length !== 1 ? "s" : ""} saved`}
          </p>

          {wishlist.length === 0 ? (
            <div style={{ ...panel, marginTop: 32, textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>❤️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>Your wishlist is empty</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24 }}>Save products you love for later!</p>
              <button onClick={() => setPage("products")} style={solidBtn}>
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 24 }}>
              {wishlist.map((p, i) => (
                <ProductCard key={p.id} p={withStockStatus(p)} i={i} onSelect={() => { setSelected(withStockStatus(p)); setPage("product"); }} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />
              ))}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "order" && selected) {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px" }}>
          <button onClick={() => setPage("product")} style={linkBtn}>Back</button>
          <h1 style={h2}>Order Flow</h1>
          <p style={pMuted}>Fill your details and trigger M-Pesa STK simulation.</p>
          <div style={panel}>
            <div style={{ marginBottom: 14, fontWeight: 700 }}>{selected.brand} {selected.name} - {fmt(selected.price)}</div>
            <Field label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} error={formErrors.name} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} error={formErrors.phone} />
            <Field label="Delivery Location" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} error={formErrors.location} />
            <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} multiline />
            <button onClick={placeOrder} disabled={paying} style={{ ...solidBtn, width: "100%", marginTop: 10, opacity: paying ? 0.75 : 1, cursor: paying ? "not-allowed" : "pointer" }}>
              {paying ? "Sending M-Pesa STK..." : `Pay with M-Pesa - ${fmt(selected.price)}`}
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "confirm" && lastOrder) {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "50px 24px" }}>
          <div style={panel}>
            <h1 style={h2}>Order Confirmed</h1>
            <p style={pMuted}>Reference generated and written to shared storage.</p>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: "12px 0" }}>{lastOrder.id}</div>
            <p style={{ ...pMuted, marginBottom: 6 }}>
              {lastOrder.itemCount || 1} item{(lastOrder.itemCount || 1) !== 1 ? "s" : ""} · Total {fmt(lastOrder.total || lastOrder.price)}
            </p>
            <p style={pMuted}>Use this reference in Order Tracking.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button onClick={() => { setPage("track"); setTrackRef(lastOrder.id); setTimeout(trackOrder, 50); }} style={solidBtn}>Track Order</button>
              <button onClick={() => { setPage("home"); setLastOrder(null); }} style={outlineBtn}>Back Home</button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "admin") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>Admin Catalog</h1>
          {!currentUser?.isAdmin ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 12 }}>{!currentUser ? "Sign in with an admin account to manage products." : "Access denied. Admin privileges required."}</p>
              {!currentUser && <button onClick={() => openAuth("signin")} style={solidBtn}>Sign in</button>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 980 ? "1fr" : "380px 1fr", gap: 18, marginTop: 14 }}>
              <aside style={panel}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: "var(--ink)", fontWeight: 700 }}>{adminEditId ? "Edit product" : "Add product"}</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <input value={adminForm.brand} onChange={(e) => setAdminForm((s) => ({ ...s, brand: e.target.value }))} placeholder="Brand" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <input value={adminForm.name} onChange={(e) => setAdminForm((s) => ({ ...s, name: e.target.value }))} placeholder="Model name" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <input value={adminForm.spec} onChange={(e) => setAdminForm((s) => ({ ...s, spec: e.target.value }))} placeholder="Spec" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <select value={adminForm.category} onChange={(e) => setAdminForm((s) => ({ ...s, category: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    {CATEGORIES.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select value={adminForm.grade} onChange={(e) => setAdminForm((s) => ({ ...s, grade: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                    {Object.keys(GRADE_INFO).map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input value={adminForm.price} onChange={(e) => setAdminForm((s) => ({ ...s, price: e.target.value }))} placeholder="Price" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                    <input value={adminForm.market} onChange={(e) => setAdminForm((s) => ({ ...s, market: e.target.value }))} placeholder="Market price" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Main Image</label>
                    <input value={adminForm.image} onChange={(e) => setAdminForm((s) => ({ ...s, image: e.target.value }))} placeholder="Image URL (or upload below)" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", width: "100%", marginBottom: 8 }} />
                    <div style={{ position: "relative" }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                      />
                      <button type="button" style={{ width: "100%", border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fafaf9", color: "var(--text-mid)", fontSize: 13, cursor: "pointer" }}>
                        📁 Upload Main Image
                      </button>
                    </div>
                    {adminForm.image && (
                      <div style={{ marginTop: 8, position: "relative" }}>
                        <img src={adminForm.image} alt="Main preview" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} onError={(e) => { e.target.style.display = "none"; }} />
                        <button onClick={() => setAdminForm((s) => ({ ...s, image: "" }))} style={{ position: "absolute", top: 4, right: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Remove</button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Additional Images</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => handleImageUpload(file, false));
                          e.target.value = "";
                        }}
                        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                      />
                      <button type="button" style={{ width: "100%", border: "1px dashed var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fafaf9", color: "var(--text-mid)", fontSize: 13, cursor: "pointer" }}>
                        📁 Upload Additional Images ({adminForm.images.length})
                      </button>
                    </div>
                    {adminForm.images.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                        {adminForm.images.map((img, idx) => (
                          <div key={idx} style={{ position: "relative" }}>
                            <img src={img} alt={`Additional ${idx + 1}`} style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                            <button onClick={() => removeAdditionalImage(idx)} style={{ position: "absolute", top: 2, right: 2, background: "#fff", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input value={adminForm.tags} onChange={(e) => setAdminForm((s) => ({ ...s, tags: e.target.value }))} placeholder="Tags (comma separated)" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select value={adminForm.stockStatus} onChange={(e) => setAdminForm((s) => ({ ...s, stockStatus: e.target.value }))} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                      <option value="in_stock">In stock</option>
                      <option value="low_stock">Low stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                    <input value={adminForm.stockQuantity} onChange={(e) => setAdminForm((s) => ({ ...s, stockQuantity: e.target.value }))} placeholder="Stock quantity" type="number" min="0" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
                  </div>
                </div>
                {adminMsg && <div style={{ fontSize: 12, color: adminMsg.includes("updated") || adminMsg.includes("added") ? "#0b8f41" : "#b91c1c", marginTop: 8 }}>{adminMsg}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={submitAdminProduct} style={{ ...solidBtn, flex: 1 }}>{adminEditId ? "Update" : "Add"}</button>
                  <button onClick={resetAdminForm} style={{ ...outlineBtn, flex: 1 }}>Clear</button>
                </div>
              </aside>

              <section style={{ ...panel, maxHeight: "70vh", overflow: "auto" }}>
                <h3 style={{ fontSize: 16, marginBottom: 10, color: "var(--ink)", fontWeight: 700 }}>Products ({catalog.length})</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {catalog.map((p) => {
                    const stockMeta = getStockMeta(p.stockStatus);
                    return (
                      <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>{p.brand} {p.name}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.spec}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
                            <span style={{ border: "1px solid #e5e7eb", borderRadius: 999, padding: "3px 8px", background: "#f9fafb", color: "var(--text-mid)", fontSize: 11, fontWeight: 700 }}>Qty: {p.stockQuantity ?? 10}</span>
                            <span style={{ border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "3px 8px", background: stockMeta.bg, color: stockMeta.color, fontSize: 11, fontWeight: 700 }}>{stockMeta.label}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-mid)" }}>Nafuu: {fmt(p.price)} · Market: {fmt(p.market)} · {p.category}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => startEditProduct(p)} style={outlineBtn}>Edit</button>
                          <button onClick={() => setProductStockStatus(p.id, "in_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>In stock</button>
                          <button onClick={() => setProductStockStatus(p.id, "low_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Low</button>
                          <button onClick={() => setProductStockStatus(p.id, "out_of_stock")} style={{ ...outlineBtn, padding: "6px 10px", fontSize: 12 }}>Out</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "my-orders") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "44px 24px" }}>
          <h1 style={{ ...h2, marginBottom: 8 }}>My Orders</h1>
          {!currentUser ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 12 }}>Sign in to view orders tied to your account.</p>
              <button onClick={() => openAuth("signin")} style={solidBtn}>Sign in</button>
            </div>
          ) : userOrders.length === 0 ? (
            <div style={{ ...panel, marginTop: 16 }}>
              <p style={{ ...pMuted, marginBottom: 8 }}>No orders yet for <strong>{currentUser.email}</strong>.</p>
              <button onClick={() => setPage("products")} style={solidBtn}>Start Shopping</button>
            </div>
          ) : (
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              {userOrders.map((order) => {
                const statusKey = computeLiveStatus(order);
                const step = STATUS_STEPS[stepIdx(statusKey)] || STATUS_STEPS[0];
                return (
                  <div key={order.id} style={{ ...panel, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Reference</div>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>{order.id}</div>
                      </div>
                      <span style={{ border: "1px solid #d8ece0", background: "#f3faf5", color: "var(--green)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, alignSelf: "start" }}>
                        {step.label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: viewportWidth < 700 ? "1fr" : "1fr 1fr 1fr", gap: 8, color: "var(--text-mid)", fontSize: 13 }}>
                      <div>Items: <strong style={{ color: "var(--ink)" }}>{order.itemCount || 1}</strong></div>
                      <div>Total: <strong style={{ color: "var(--ink)" }}>{fmt(order.total || order.price)}</strong></div>
                      <div>Placed: <strong style={{ color: "var(--ink)" }}>{new Date(order.timestamp).toLocaleDateString()}</strong></div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-mid)" }}>{step.detail}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <button onClick={() => { setTrackRef(order.id); setPage("track"); setTimeout(trackOrder, 50); }} style={solidBtn}>Track</button>
                      <button onClick={() => setPage("products")} style={outlineBtn}>Shop again</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "info" && infoPage) {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px" }}>
          <button onClick={() => setPage("home")} style={linkBtn}>Back to Home</button>
          <article style={{ ...panel, padding: 24 }}>
            <h1 style={{ ...h2, marginBottom: 14 }}>{infoPage.title}</h1>
            <p style={{ ...pMuted, marginBottom: 14 }}>{infoPage.summary}</p>
            {Array.isArray(infoPage.points) && infoPage.points.length > 0 && (
              <ul style={{ paddingLeft: 18, color: "var(--ink-soft)", lineHeight: 1.9 }}>
                {infoPage.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setPage("products")} style={solidBtn}>Continue Shopping</button>
              <button onClick={() => { setTrackedOrder(null); setTrackRef(""); setPage("track"); }} style={outlineBtn}>Track Order</button>
            </div>
          </article>
        </div>
        <Footer />
      </>
    );
  }

  if (page === "track") {
    return (
      <>
        <style>{G}</style>
        {Nav()}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "50px 24px" }}>
          <h1 style={h2}>Order Tracking</h1>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={trackRef} onChange={(e) => setTrackRef(e.target.value.toUpperCase())} placeholder="NFU-XXXXX" style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontWeight: 700, letterSpacing: 1 }} />
            <button onClick={trackOrder} style={solidBtn}>Track</button>
          </div>
          {trackError && <div style={{ color: "#b91c1c", marginBottom: 10 }}>{trackError}</div>}
          {trackedOrder && (
            <div style={panel}>
              <div style={{ marginBottom: 14, color: "var(--text-mid)" }}>
                Ref: <strong>{trackedOrder.id}</strong>
              </div>
              <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  Items: <strong style={{ color: "var(--ink)" }}>{trackedOrder.itemCount || 1}</strong>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  Total: <strong style={{ color: "var(--ink)" }}>{fmt(trackedOrder.total || trackedOrder.price)}</strong>
                </div>
              </div>
              {(() => {
                const liveStatus = computeLiveStatus(trackedOrder);
                const idx = stepIdx(liveStatus);
                const currentStep = STATUS_STEPS[idx] || STATUS_STEPS[0];
                return (
                  <>
                    <div style={{ marginBottom: 14, padding: "10px 12px", background: "#f3faf5", border: "1px solid #d8ece0", borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Current Status</div>
                      <div style={{ fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{currentStep.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 2 }}>{currentStep.detail}</div>
                    </div>

                    <div style={{ position: "relative", paddingLeft: 4 }}>
                      {STATUS_STEPS.map((s, i) => {
                        const done = i <= idx;
                        const active = i === idx;
                        return (
                          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, alignItems: "start", marginBottom: i === STATUS_STEPS.length - 1 ? 0 : 12 }}>
                            <div style={{ display: "grid", justifyItems: "center" }}>
                              <span style={{ width: 14, height: 14, borderRadius: 999, border: done ? "2px solid var(--green)" : "2px solid #cfcfc9", background: active ? "var(--green)" : done ? "#e7f6ed" : "#fff", marginTop: 2 }} />
                              {i < STATUS_STEPS.length - 1 && (
                                <span style={{ width: 2, height: 26, background: done ? "#7ecf9f" : "#e1e1db", marginTop: 3 }} />
                              )}
                            </div>
                            <div style={{ paddingBottom: 6 }}>
                              <div style={{ color: done ? "var(--ink)" : "var(--text-dim)", fontWeight: active ? 800 : 600, fontSize: 14 }}>
                                {s.label} {active ? "(Current)" : ""}
                              </div>
                              <div style={{ color: "var(--text-mid)", fontSize: 12, marginTop: 2 }}>{s.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        <Footer />
      </>
    );
  }

  if (page === "auth") {
    const showAuthPromo = viewportWidth >= 920;
    const authTitle = authPanel === "forgot"
      ? "Reset your password"
      : authPanel === "reset"
      ? "Choose a new password"
      : authPanel === "verify"
      ? "Verify your email"
      : authStep === "email"
      ? "Who goes there?"
      : authMode === "signin"
      ? "Welcome back"
      : "Create your account";
    const authSubtitle = authPanel === "forgot"
      ? "Enter your email and we will send you a secure reset link."
      : authPanel === "reset"
      ? "Set a fresh password to secure your Nafuu account."
      : authPanel === "verify"
      ? "Confirm your inbox to activate full account access."
      : authStep === "email"
      ? ""
      : authMode === "signin"
      ? "Sign in to track orders faster and keep your details ready at checkout."
      : "Join Nafuu to save preferences, follow deliveries, and shop quicker next time.";

    return (
      <>
        <style>{G}</style>
        <div style={{ height: "100svh", overflow: "hidden", background: "linear-gradient(145deg,#f7f9f4 0%,#edf5ff 55%,#fff7ef 100%)", display: "grid", placeItems: "center", padding: "10px" }}>
          <div style={{ width: "100%", maxWidth: 940, maxHeight: "calc(100svh - 20px)", display: "grid", gridTemplateColumns: showAuthPromo ? "0.95fr 1.05fr" : "1fr", background: "#fff", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.12)" }}>
            {showAuthPromo && <section style={{ padding: "26px 24px", background: "linear-gradient(165deg,#1f4338 0%,#2d5a4d 52%,#4f7669 100%)", color: "#f4f8f5", position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#ffd84d", color: "#1f4338", fontWeight: 800, display: "grid", placeItems: "center" }}>N</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700 }}>Nafuu Account</div>
              </div>
              <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 34, lineHeight: 1.08, marginBottom: 10 }}>Shop smarter from Mombasa</h2>
              <p style={{ color: "rgba(244,248,245,.88)", lineHeight: 1.65, maxWidth: 420 }}>
                One account for order history, warranty tracking, photo approvals, and faster checkout.
              </p>
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {[
                  "Track every order with one tap",
                  "Auto-fill delivery details at checkout"
                ].map((line) => (
                  <div key={line} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "9px 11px", fontSize: 13 }}>{line}</div>
                ))}
              </div>
            </section>}

            <section style={{ padding: showAuthPromo ? "22px 24px" : "18px 16px", overflowY: "auto", maxHeight: "calc(100svh - 20px)" }}>
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: showAuthPromo ? 30 : 24, lineHeight: 1.08, marginBottom: 6, color: "var(--ink)" }}>{authTitle}</h1>
              {authSubtitle && <p style={{ color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 8, fontSize: 13 }}>{authSubtitle}</p>}
              
              {authPanel === "form" && authStep === "email" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, color: "var(--ink)", fontWeight: 600, marginBottom: 8 }}>Email *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        value={authForm.email}
                        onChange={(e) => { setAuthForm((s) => ({ ...s, email: e.target.value })); setAuthErrors({}); }}
                        onKeyDown={(e) => e.key === "Enter" && proceedToPassword()}
                        placeholder="you@example.com"
                        style={{ width: "100%", border: `1px solid ${authErrors.email ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "14px 42px 14px 14px", fontSize: 15, background: "#fafafa" }}
                      />
                      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#999" }}>✉</span>
                    </div>
                    {authErrors.email && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.email}</div>}
                  </div>

                  <button 
                    onClick={proceedToPassword}
                    style={{ width: "100%", border: "none", borderRadius: 11, background: "var(--ink)", color: "#fff", padding: "15px 14px", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 16 }}
                  >
                    Next
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  </div>

                  <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                    <button
                      onClick={() => continueWithSocial("google")}
                      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 11, background: "#fff", color: "var(--ink)", padding: "13px 14px", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "conic-gradient(#ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0 100%)" }} />
                      Continue with Google
                    </button>
                    <button
                      onClick={() => continueWithSocial("apple")}
                      style={{ width: "100%", border: "1px solid #151515", borderRadius: 11, background: "#151515", color: "#fff", padding: "13px 14px", fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}></span>
                      Continue with Apple
                    </button>
                  </div>

                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button 
                      onClick={() => setPage("home")}
                      style={{ background: "none", border: "none", color: "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Privacy Policy
                    </button>
                  </div>
                </>
              )}

              {authPanel === "form" && authStep === "password" && (
                <>
                  <button 
                    onClick={() => { setAuthStep("email"); setAuthErrors({}); }}
                    style={{ background: "none", border: "none", padding: 0, marginBottom: 12, color: "#2d5a4d", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    ← Back
                  </button>

                  <div style={{ display: "flex", gap: 8, background: "#f3f2ee", borderRadius: 12, padding: 5, marginBottom: 12 }}>
                    <button onClick={() => { setAuthMode("signin"); setAuthErrors({}); setAuthMsg(""); }} style={{ flex: 1, border: "none", borderRadius: 9, padding: "9px 12px", fontWeight: 700, cursor: "pointer", background: authMode === "signin" ? "#fff" : "transparent", color: "var(--ink)", boxShadow: authMode === "signin" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>Sign in</button>
                    <button onClick={() => { setAuthMode("signup"); setAuthErrors({}); setAuthMsg(""); }} style={{ flex: 1, border: "none", borderRadius: 9, padding: "9px 12px", fontWeight: 700, cursor: "pointer", background: authMode === "signup" ? "#fff" : "transparent", color: "var(--ink)", boxShadow: authMode === "signup" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>Sign up</button>
                  </div>

                  <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #d8e5da", background: "#f2f8f3", borderRadius: 999, padding: "5px 9px", fontSize: 11, color: "#2d5a4d", fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d5a4d" }} />
                    Auth mode: {authRuntime.mode === "supabase" ? "Supabase" : "Local Offline"}
                  </div>
                  {showAuthPromo && <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 12 }}>{authRuntime.detail}</p>}

                  {authMode === "signup" && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Full name</label>
                      <input
                        value={authForm.name}
                        onChange={(e) => setAuthForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Jane Njeri"
                        style={{ width: "100%", border: `1px solid ${authErrors.name ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                      />
                      {authErrors.name && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.name}</div>}
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Email</label>
                    <input
                      value={authForm.email}
                      disabled
                      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 13px", fontSize: 14, background: "#f5f5f5", color: "var(--muted)" }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Password</label>
                    <input
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder="At least 8 characters"
                      style={{ width: "100%", border: `1px solid ${authErrors.password ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                    />
                    {authErrors.password && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.password}</div>}
                  </div>

                  {authMode === "signup" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Confirm password</label>
                      <input
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                        placeholder="Repeat password"
                        style={{ width: "100%", border: `1px solid ${authErrors.confirmPassword ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                      />
                      {authErrors.confirmPassword && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.confirmPassword}</div>}
                    </div>
                  )}

                  {authMode === "signin" && (
                    <button onClick={() => { setAuthPanel("forgot"); setAuthErrors({}); setAuthMsg(""); setRecoveryEmail(authForm.email || ""); }} style={{ background: "none", border: "none", padding: 0, marginBottom: 12, color: "#2d5a4d", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Forgot your password?
                    </button>
                  )}

                  {authMsg && <div style={{ marginBottom: 12, borderRadius: 10, padding: "10px 12px", background: "#fff7e6", color: "#8a5a00", border: "1px solid #f2dfb2", fontSize: 13 }}>{authMsg}</div>}

                  <button onClick={submitAuth} style={{ width: "100%", border: "none", borderRadius: 11, background: "var(--ink)", color: "#fff", padding: "13px 14px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                    {authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </>
              )}

              {authPanel === "forgot" && (
                <>
                  <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #d8e5da", background: "#f2f8f3", borderRadius: 999, padding: "5px 9px", fontSize: 11, color: "#2d5a4d", fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d5a4d" }} />
                    Auth mode: {authRuntime.mode === "supabase" ? "Supabase" : "Local Offline"}
                  </div>
                  {showAuthPromo && <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 12 }}>{authRuntime.detail}</p>}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Account email</label>
                    <input
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{ width: "100%", border: `1px solid ${authErrors.email ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                    />
                    {authErrors.email && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.email}</div>}
                  </div>
                  {authMsg && <div style={{ marginBottom: 12, borderRadius: 10, padding: "10px 12px", background: "#fff7e6", color: "#8a5a00", border: "1px solid #f2dfb2", fontSize: 13 }}>{authMsg}</div>}
                  <button onClick={requestPasswordReset} style={{ width: "100%", border: "none", borderRadius: 11, background: "var(--ink)", color: "#fff", padding: "13px 14px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                    Send reset link
                  </button>
                </>
              )}

              {authPanel === "reset" && (
                <>
                  <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #d8e5da", background: "#f2f8f3", borderRadius: 999, padding: "5px 9px", fontSize: 11, color: "#2d5a4d", fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d5a4d" }} />
                    Auth mode: {authRuntime.mode === "supabase" ? "Supabase" : "Local Offline"}
                  </div>
                  {showAuthPromo && <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 12 }}>{authRuntime.detail}</p>}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>New password</label>
                    <input
                      type="password"
                      value={resetForm.password}
                      onChange={(e) => setResetForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder="At least 8 characters"
                      style={{ width: "100%", border: `1px solid ${authErrors.password ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                    />
                    {authErrors.password && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.password}</div>}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Confirm new password</label>
                    <input
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                      placeholder="Repeat new password"
                      style={{ width: "100%", border: `1px solid ${authErrors.confirmPassword ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                    />
                    {authErrors.confirmPassword && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.confirmPassword}</div>}
                  </div>
                  {authMsg && <div style={{ marginBottom: 12, borderRadius: 10, padding: "10px 12px", background: "#fff7e6", color: "#8a5a00", border: "1px solid #f2dfb2", fontSize: 13 }}>{authMsg}</div>}
                  <button onClick={submitPasswordReset} style={{ width: "100%", border: "none", borderRadius: 11, background: "var(--ink)", color: "#fff", padding: "13px 14px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                    Update password
                  </button>
                </>
              )}

              {authPanel === "verify" && (
                <>
                  <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #d8e5da", background: "#f2f8f3", borderRadius: 999, padding: "5px 9px", fontSize: 11, color: "#2d5a4d", fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d5a4d" }} />
                    Auth mode: {authRuntime.mode === "supabase" ? "Supabase" : "Local Offline"}
                  </div>
                  {showAuthPromo && <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 12 }}>{authRuntime.detail}</p>}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Verification email</label>
                    <input
                      value={verificationEmail}
                      onChange={(e) => setVerificationEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{ width: "100%", border: `1px solid ${authErrors.email ? "#dc2626" : "var(--line)"}`, borderRadius: 10, padding: "12px 13px", fontSize: 14 }}
                    />
                    {authErrors.email && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5 }}>{authErrors.email}</div>}
                  </div>
                  {authMsg && <div style={{ marginBottom: 12, borderRadius: 10, padding: "10px 12px", background: "#fff7e6", color: "#8a5a00", border: "1px solid #f2dfb2", fontSize: 13 }}>{authMsg}</div>}
                  <button onClick={resendVerification} style={{ width: "100%", border: "none", borderRadius: 11, background: "var(--ink)", color: "#fff", padding: "13px 14px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
                    Resend verification email
                  </button>
                </>
              )}

              {authPanel !== "form" && <button onClick={() => { setAuthPanel("form"); setAuthMode("signin"); setAuthStep("email"); setAuthErrors({}); setAuthMsg(""); }} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 11, background: "#fff", color: "var(--ink)", padding: "12px 14px", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
                Back to sign in
              </button>}

              {authPanel === "form" && authStep === "password" && (
                <>
                  <button onClick={() => setPage("home")} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 11, background: "#fff", color: "var(--ink)", padding: "12px 14px", fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 8 }}>
                    Continue as guest
                  </button>

                  <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 11, lineHeight: 1.5, textAlign: "center" }}>
                    By continuing, you agree to Nafuu Terms of Service and acknowledge our Privacy Policy.
                  </p>
                  {showAuthPromo && isSupabaseMode() && <p style={{ marginTop: 6, color: "var(--muted)", fontSize: 10, lineHeight: 1.4 }}>
                    Supabase email templates should use your app URL as redirect for recovery and confirmation.
                  </p>}
                </>
              )}
            </section>
          </div>
        </div>
      </>
    );
  }

  return null;
}

function ProductCard({
  p,
  i,
  onSelect,
  addToCart = () => {},
  toggleWishlist = () => {},
  isInWishlist = () => false,
}) {
  const saving = p.market - p.price;
  const drop = Math.round((saving / p.market) * 100);
  const grade = GRADE_INFO[p.grade] || GRADE_INFO.A;
  const inWishlist = isInWishlist(p.id);
  const stockMeta = getStockMeta(p.stockStatus);
  const available = isAvailable(p);
  
  return (
    <div
      style={{ textAlign: "left", background: "white", border: "1px solid var(--line)", borderRadius: 18, padding: 18, cursor: "pointer", animation: `fadeUp .45s ${Math.min(i, 8) * 0.06}s both`, boxShadow: "0 5px 22px rgba(0,0,0,.04)", transition: "transform .22s ease, box-shadow .22s ease, border-color .22s ease", position: "relative" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 26px rgba(0,0,0,.1)";
        e.currentTarget.style.borderColor = "#b8b8a8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 22px rgba(0,0,0,.04)";
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      <button
        onClick={() => toggleWishlist(p)}
        style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: inWishlist ? "var(--cherry)" : "rgba(255,255,255,0.9)", border: "1px solid var(--line)", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 10, transition: "all .2s ease" }}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={inWishlist ? "#fff" : "none"} stroke={inWishlist ? "#fff" : "currentColor"} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      
      <div onClick={onSelect} style={{ cursor: "pointer" }}>
        {p.image && (
          <div style={{ width: "100%", height: 200, background: "#f5f5f0", borderRadius: 12, marginBottom: 12, overflow: "hidden", display: "grid", placeItems: "center" }}>
            <img loading="lazy" src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ink)", fontSize: 12, fontWeight: 700 }}>{p.brand}</span>
          <span style={{ background: "var(--cherry)", color: "white", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>{drop}% price drop</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>Rated 4.6/5</span>
          <span style={{ color: grade.color, fontSize: 12, fontWeight: 700 }}>{grade.label}</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ border: `1px solid ${stockMeta.border}`, borderRadius: 999, padding: "3px 9px", background: stockMeta.bg, color: stockMeta.color, fontSize: 11, fontWeight: 700 }}>
            {stockMeta.label}
          </span>
        </div>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: "var(--ink)", fontSize: 18 }}>{p.name}</div>
        <div style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 12px", minHeight: 34 }}>{p.spec}</div>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, color: "var(--ink)", fontSize: 22 }}>{fmt(p.price)}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through" }}>New in Mombasa: {fmt(p.market)}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent-dark)", fontWeight: 700 }}>You save {fmt(saving)}</div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          addToCart(p);
        }}
        disabled={!available}
        style={{ width: "100%", marginTop: 16, border: "none", borderRadius: 10, background: available ? "var(--accent-dark)" : "#a8a8a8", color: "#fff", padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: available ? "pointer" : "not-allowed", transition: "all .2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        onMouseEnter={(e) => {
          if (available) e.currentTarget.style.background = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = available ? "var(--accent-dark)" : "#a8a8a8";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        {available ? "Add to Cart" : "Out of Stock"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, error, multiline = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-mid)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: `1px solid ${error ? "#dc2626" : "var(--border)"}`, borderRadius: 10, padding: "10px 12px" }} />
      )}
      {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const navBtn = { background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", fontWeight: 600, padding: "8px 12px", borderRadius: 8 };
const topLink = { background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, fontSize: 14, padding: 0 };
const topNavItem = { background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, fontSize: 15, padding: "10px 0", borderBottom: "2px solid transparent", transition: "all .2s ease" };
const actionBtn = { background: "white", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 14, color: "var(--ink)", cursor: "pointer", transition: "all .2s ease" };
const iconBtn = { background: "white", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 11px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .2s ease" };
const footerHeading = { fontSize: 15, color: "#3d3d3d", fontWeight: 700, marginBottom: 10, fontFamily: "'Fraunces',serif" };
const footerLink = { display: "block", border: "none", background: "none", padding: "0", marginBottom: 7, color: "#5a5a5a", fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.6 };
const solidBtn = { background: "var(--ink)", color: "white", border: "none", borderRadius: 10, padding: "12px 16px", cursor: "pointer", fontWeight: 700 };
const outlineBtn = { background: "white", color: "var(--ink)", border: "1px solid var(--ink)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 };
const linkBtn = { background: "none", border: "none", color: "var(--muted)", marginBottom: 10, cursor: "pointer" };
const panel = { background: "white", border: "1px solid var(--line)", borderRadius: 14, padding: 18 };
const h2 = { fontFamily: "'Fraunces',serif", color: "var(--ink)", fontWeight: 700, fontSize: 32, marginBottom: 12 };
const h3 = { fontFamily: "'Fraunces',serif", color: "var(--ink)", fontWeight: 700, fontSize: 16, marginBottom: 8 };
const pMuted = { color: "var(--ink-soft)", lineHeight: 1.7 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const featureCard = { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 };
const filterLabel = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };
const chipWrap = { display: "flex", flexWrap: "wrap", gap: 8 };
const chipBtn = (active) => ({
  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
  background: active ? "var(--ink)" : "white",
  color: active ? "white" : "var(--ink)",
  borderRadius: 999,
  padding: "7px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
});
