const mongoose = require('mongoose');
const Offer = require('../Model/Offers/OfferModel').default;

// â”€â”€â”€ Replace all PRODUCT_ID_* and CATEGORY_ID_* before running â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const seeds = [

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. buy_x_get_free
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Buy 3 items (any category) â€” get a specific free product
  {
    title: 'Buy 3 Get 1 Free',
    description: 'Add 3 items to your cart and get 1 specific item for free',
    isActive: true,
    image: {
      mediaKey: 'offers/buy-3-get-1-free.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/buy-3-get-1-free.jpg',
    },
    offerType: 'buy_x_get_free',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: '69dd1d2ba8e689407a12cfd3', maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: Buy 5 items (any category) â€” get a different specific free product
  {
    title: 'Buy 5 Get 1 Free',
    description: 'Add 5 items to your cart and get 1 specific item for free',
    isActive: false,
    image: {
      mediaKey: 'offers/buy-5-get-1-free.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/buy-5-get-1-free.jpg',
    },
    offerType: 'buy_x_get_free',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: '69dd1d2ba8e689407a12cfd3', maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. percentage_discount
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: 10% off orders above 500 EGP â€” all categories
  {
    title: '10% Off Orders Above 500 EGP',
    description: 'Get 10% discount on all orders above 500 EGP',
    isActive: true,
    image: {
      mediaKey: 'offers/10-percent-off-500.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/10-percent-off-500.jpg',
    },
    offerType: 'percentage_discount',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 500, categories: [] },
    reward: {
      discountPercentage: 10,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: 20% off orders above 1000 EGP â€” all categories
  {
    title: '20% Off Orders Above 1000 EGP',
    description: 'Get 20% discount on all orders above 1000 EGP',
    isActive: true,
    image: {
      mediaKey: 'offers/20-percent-off-1000.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/20-percent-off-1000.jpg',
    },
    offerType: 'percentage_discount',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 1000, categories: [] },
    reward: {
      discountPercentage: 20,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. free_shipping_amount
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Free shipping above 300 EGP
  {
    title: 'Free Shipping on Orders Above 300 EGP',
    description: 'Enjoy free shipping when you spend 300 EGP or more',
    isActive: true,
    image: {
      mediaKey: 'offers/free-shipping-300.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/free-shipping-300.jpg',
    },
    offerType: 'free_shipping_amount',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 300, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: Free shipping above 150 EGP (lower threshold)
  {
    title: 'Free Shipping on Orders Above 150 EGP',
    description: 'Enjoy free shipping when you spend 150 EGP or more',
    isActive: false,
    image: {
      mediaKey: 'offers/free-shipping-150.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/free-shipping-150.jpg',
    },
    offerType: 'free_shipping_amount',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 150, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 4. free_shipping_quantity
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Buy 5 items from a single specific category â€” free shipping
  {
    title: 'Free Shipping on 5 Pajama Items',
    description: 'Buy 5 items from the Pajama category and get free shipping',
    isActive: true,
    image: {
      mediaKey: 'offers/free-shipping-5-pajama.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/free-shipping-5-pajama.jpg',
    },
    offerType: 'free_shipping_quantity',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: ['69dd1b18a8e689407a12cf84'] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: Buy 5 items from multiple specific categories â€” free shipping
  {
    title: 'Free Shipping on 5 Pajama or Robe Items',
    description: 'Buy 5 items from the Pajama or Robe categories and get free shipping',
    isActive: true,
    image: {
      mediaKey: 'offers/free-shipping-5-pajama-robe.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/free-shipping-5-pajama-robe.jpg',
    },
    offerType: 'free_shipping_quantity',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 5, minAmount: null, categories: ['69dd1b18a8e689407a12cf84', '69dd1b18a8e689407a12cf84'] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case C: Buy 3 items from any category â€” free shipping
  {
    title: 'Free Shipping on Any 3 Items',
    description: 'Buy any 3 items and get free shipping',
    isActive: true,
    image: {
      mediaKey: 'offers/free-shipping-3-any.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/free-shipping-3-any.jpg',
    },
    offerType: 'free_shipping_quantity',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 5. deal_of_day
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: 40% off on multiple specific products
  {
    title: 'Deal of the Day â€” 40% Off Selected Items',
    description: 'Grab 40% off on selected products today only',
    isActive: true,
    image: {
      mediaKey: 'offers/deal-of-day-40.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/deal-of-day-40.jpg',
    },
    offerType: 'deal_of_day',
    timing: {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: {
      discountPercentage: 40,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: ['69dd1d2ba8e689407a12cfd3', '69dd1d2ba8e689407a12cfd3', '69dd1d2ba8e689407a12cfd3'],
  },

  // Case B: 60% off on a single specific product
  {
    title: 'Deal of the Day â€” 60% Off One Item',
    description: 'Today only! Get 60% off this specially selected item',
    isActive: false,
    image: {
      mediaKey: 'offers/deal-of-day-60.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/deal-of-day-60.jpg',
    },
    offerType: 'deal_of_day',
    timing: {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: {
      discountPercentage: 60,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: ['69dd1d2ba8e689407a12cfd3'],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 6. flash_sale
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Flash sale on a single specific category
  {
    title: 'Flash Sale â€” 30% Off Pajamas',
    description: '30% off all Pajama items for a limited time',
    isActive: true,
    image: {
      mediaKey: 'offers/flash-sale-pajama-30.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/flash-sale-pajama-30.jpg',
    },
    offerType: 'flash_sale',
    timing: {
      startDate: new Date(new Date().setHours(10, 0, 0, 0)),
      endDate: new Date(new Date().setHours(12, 0, 0, 0)),
    },
    condition: { minQuantity: null, minAmount: null, categories: ['69dd1b18a8e689407a12cf84'] },
    reward: {
      discountPercentage: 30,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: Flash sale on multiple specific categories
  {
    title: 'Flash Sale â€” 25% Off Pajamas & Robes',
    description: '25% off all Pajama and Robe items for a limited time',
    isActive: false,
    image: {
      mediaKey: 'offers/flash-sale-pajama-robe-25.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/flash-sale-pajama-robe-25.jpg',
    },
    offerType: 'flash_sale',
    timing: {
      startDate: new Date(new Date().setHours(14, 0, 0, 0)),
      endDate: new Date(new Date().setHours(17, 0, 0, 0)),
    },
    condition: { minQuantity: null, minAmount: null, categories: ['69dd1b18a8e689407a12cf84', '69dd1b18a8e689407a12cf84'] },
    reward: {
      discountPercentage: 25,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case C: Flash sale on all categories (no category filter)
  {
    title: 'Flash Sale â€” 20% Off Everything',
    description: '20% off all items across all categories for a limited time',
    isActive: false,
    image: {
      mediaKey: 'offers/flash-sale-all-20.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/flash-sale-all-20.jpg',
    },
    offerType: 'flash_sale',
    timing: {
      startDate: new Date(new Date().setHours(18, 0, 0, 0)),
      endDate: new Date(new Date().setHours(20, 0, 0, 0)),
    },
    condition: { minQuantity: null, minAmount: null, categories: [] },
    reward: {
      discountPercentage: 20,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 7. buy_x_get_half_price
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Buy 1 item â€” get a specific item at half price
  {
    title: 'Buy 1 Get 1 at Half Price',
    description: 'Buy any item and get a selected item at half the original price',
    isActive: true,
    image: {
      mediaKey: 'offers/buy-1-half-price.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/buy-1-half-price.jpg',
    },
    offerType: 'buy_x_get_half_price',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 1, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: '69dd1d2ba8e689407a12cfd3' },
    },
    targetProducts: [],
  },

  // Case B: Buy 2 items â€” get a specific item at half price
  {
    title: 'Buy 2 Get 1 at Half Price',
    description: 'Buy any 2 items and get a selected item at half the original price',
    isActive: false,
    image: {
      mediaKey: 'offers/buy-2-half-price.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/buy-2-half-price.jpg',
    },
    offerType: 'buy_x_get_half_price',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 2, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: '69dd1d2ba8e689407a12cfd3' },
    },
    targetProducts: [],
  },

  // Case C: Buy 3 items â€” get a specific item at half price
  {
    title: 'Buy 3 Get 1 at Half Price',
    description: 'Buy any 3 items and get a selected item at half the original price',
    isActive: false,
    image: {
      mediaKey: 'offers/buy-3-half-price.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/buy-3-half-price.jpg',
    },
    offerType: 'buy_x_get_half_price',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: 3, minAmount: null, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: null },
      halfPriceItem: { product: '69dd1d2ba8e689407a12cfd3' },
    },
    targetProducts: [],
  },

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 8. spend_x_get_free
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Case A: Spend 1000 EGP â€” customer picks any free item worth up to 300 EGP
  {
    title: 'Spend 1000 EGP Get a Free Gift Worth up to 300 EGP',
    description: 'Shop for 1000 EGP or more and choose any free item worth up to 300 EGP',
    isActive: true,
    image: {
      mediaKey: 'offers/spend-1000-free-300.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/spend-1000-free-300.jpg',
    },
    offerType: 'spend_x_get_free',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 1000, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: null, maxValue: 300 },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },

  // Case B: Spend 500 EGP â€” admin picks a specific free product
  {
    title: 'Spend 500 EGP Get a Free Gift',
    description: 'Shop for 500 EGP or more and get this specific free item',
    isActive: true,
    image: {
      mediaKey: 'offers/spend-500-free-product.jpg',
      mediaUrl: 'https://YOUR_CDN/offers/spend-500-free-product.jpg',
    },
    offerType: 'spend_x_get_free',
    timing: { startDate: null, endDate: null },
    condition: { minQuantity: null, minAmount: 500, categories: [] },
    reward: {
      discountPercentage: null,
      freeItem: { product: '69dd1d2ba8e689407a12cfd3', maxValue: null },
      halfPriceItem: { product: null },
    },
    targetProducts: [],
  },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Placeholder detection
// Replace all PRODUCT_ID_* and CATEGORY_ID_* with real ObjectIds before running.
//
// Placeholder reference:
//   69dd1d2ba8e689407a12cfd3   â†’ free gift product for buy_x_get_free (3 items)
//   69dd1d2ba8e689407a12cfd3   â†’ free gift product for buy_x_get_free (5 items)
//   69dd1d2ba8e689407a12cfd3   â†’ deal of the day product 1
//   69dd1d2ba8e689407a12cfd3   â†’ deal of the day product 2
//   69dd1d2ba8e689407a12cfd3   â†’ deal of the day product 3
//   69dd1d2ba8e689407a12cfd3   â†’ deal of the day single product (60% off)
//   69dd1d2ba8e689407a12cfd3   â†’ half-price product for buy 1 get 1
//   69dd1d2ba8e689407a12cfd3   â†’ half-price product for buy 2 get 1
//   69dd1d2ba8e689407a12cfd3   â†’ half-price product for buy 3 get 1
//   69dd1d2ba8e689407a12cfd3  â†’ specific free product for spend_x_get_free (500 EGP case)
//   69dd1b18a8e689407a12cf84 â†’ Pajama category ObjectId
//   69dd1b18a8e689407a12cf84   â†’ Robe category ObjectId
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function seedOffers() {
  const hasPlaceholders = seeds.some((offer) => {
    return /(PRODUCT_ID_|CATEGORY_ID_)\w+/.test(JSON.stringify(offer));
  });

  if (hasPlaceholders) {
    console.warn('âš ï¸  Seed aborted: placeholder IDs found. Replace all PRODUCT_ID_* and CATEGORY_ID_* with real ObjectIds before running.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await Offer.deleteMany({});
  await Offer.insertMany(seeds);
  console.log(`âœ… ${seeds.length} offers seeded successfully`);
  await mongoose.disconnect();
}

seedOffers().catch((err) => {
  console.error('âŒ Seed failed:', err);
  process.exit(1);
});

