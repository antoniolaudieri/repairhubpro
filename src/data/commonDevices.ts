// Database di dispositivi comuni per l'auto-completamento
export const commonBrands = [
  "Apple",
  "Samsung",
  "Huawei",
  "Xiaomi",
  "OPPO",
  "Vivo",
  "OnePlus",
  "Realme",
  "Google",
  "Motorola",
  "Nokia",
  "Sony",
  "LG",
  "Asus",
  "Lenovo",
  "Honor",
  "Redmi",
  "Poco",
  "Nothing",
  "Fairphone",
];

export const commonModels: Record<string, string[]> = {
  Apple: [
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 13 mini",
    "iPhone 12 Pro Max",
    "iPhone 12 Pro",
    "iPhone 12",
    "iPhone 12 mini",
    "iPhone 11 Pro Max",
    "iPhone 11 Pro",
    "iPhone 11",
    "iPhone SE (2022)",
    "iPhone SE (2020)",
    "iPhone XS Max",
    "iPhone XS",
    "iPhone XR",
    "iPhone X",
  ],
  Samsung: [
    "Galaxy S24 Ultra",
    "Galaxy S24+",
    "Galaxy S24",
    "Galaxy S23 Ultra",
    "Galaxy S23+",
    "Galaxy S23",
    "Galaxy S22 Ultra",
    "Galaxy S22+",
    "Galaxy S22",
    "Galaxy S21 Ultra",
    "Galaxy S21+",
    "Galaxy S21",
    "Galaxy S20 Ultra",
    "Galaxy S20+",
    "Galaxy S20",
    "Galaxy Z Fold 5",
    "Galaxy Z Fold 4",
    "Galaxy Z Fold 3",
    "Galaxy Z Flip 5",
    "Galaxy Z Flip 4",
    "Galaxy Z Flip 3",
    "Galaxy A54",
    "Galaxy A53",
    "Galaxy A52",
    "Galaxy A34",
    "Galaxy A33",
    "Galaxy A14",
    "Galaxy A13",
  ],
  Xiaomi: [
    "14 Pro",
    "14",
    "13 Pro",
    "13",
    "12 Pro",
    "12",
    "11T Pro",
    "11T",
    "Mi 11",
    "Mi 10T Pro",
    "Mi 10T",
    "Redmi Note 13 Pro",
    "Redmi Note 13",
    "Redmi Note 12 Pro",
    "Redmi Note 12",
    "Redmi Note 11",
    "Redmi 12",
    "Redmi 11",
  ],
  Huawei: [
    "P60 Pro",
    "P60",
    "P50 Pro",
    "P50",
    "P40 Pro",
    "P40",
    "P30 Pro",
    "P30",
    "Mate 60 Pro",
    "Mate 50 Pro",
    "Mate 40 Pro",
    "Nova 11 Pro",
    "Nova 11",
  ],
  Google: [
    "Pixel 8 Pro",
    "Pixel 8",
    "Pixel 7 Pro",
    "Pixel 7",
    "Pixel 7a",
    "Pixel 6 Pro",
    "Pixel 6",
    "Pixel 6a",
    "Pixel 5",
    "Pixel 4a",
  ],
  OnePlus: [
    "12",
    "11",
    "10 Pro",
    "10T",
    "9 Pro",
    "9",
    "8T",
    "8 Pro",
    "Nord 3",
    "Nord 2T",
    "Nord CE 3",
  ],
  OPPO: [
    "Find X6 Pro",
    "Find X5 Pro",
    "Reno 10 Pro",
    "Reno 9 Pro",
    "Reno 8 Pro",
    "A98",
    "A78",
  ],
  Motorola: [
    "Edge 40 Pro",
    "Edge 40",
    "Edge 30 Ultra",
    "Edge 30",
    "Moto G84",
    "Moto G73",
    "Moto G52",
  ],
  Sony: [
    "Xperia 1 V",
    "Xperia 5 V",
    "Xperia 10 V",
    "Xperia 1 IV",
    "Xperia 5 IV",
  ],
  Nothing: [
    "Phone (2)",
    "Phone (1)",
  ],
};

// Funzione per ottenere suggerimenti di marca
export const getBrandSuggestions = (input: string): string[] => {
  if (!input.trim()) return commonBrands.slice(0, 10);
  
  const searchTerm = input.toLowerCase();
  return commonBrands
    .filter(brand => brand.toLowerCase().includes(searchTerm))
    .slice(0, 10);
};

// Funzione per ottenere suggerimenti di modello
export const getModelSuggestions = (brand: string, input: string): string[] => {
  const models = commonModels[brand] || [];
  
  if (!input.trim()) return models.slice(0, 10);
  
  const searchTerm = input.toLowerCase();
  return models
    .filter(model => model.toLowerCase().includes(searchTerm))
    .slice(0, 10);
};
