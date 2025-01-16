enum sortProductEnum {
  newest = "Newest",
  priceLowToHigh = "High to Low",
  priceHighToLow = "Low to High",
  priceUnder100 = "Under $100",
  priceBetween100and500 = "$100 - $500",
  priceBetween500and1000 = "$500 - $1000",
  priceAbove1000 = "Above $1000",
}
const sortProduct = Object.values(sortProductEnum);
export { sortProduct, sortProductEnum };
