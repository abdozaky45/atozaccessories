// Importance order for shipping governorates, used to sort GET /shipping.
// The strings here MUST match exactly what is stored in the Shipping documents'
// `category` field (NOT the names in GovernorateEnum, which differ in spelling).
// Order: Greater Cairo → Delta → Canal → Upper Egypt. Any governorate not listed
// here is pushed to the end (temporary, until it is added to this list).
export const governorateShippingOrder = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Qalubia",
  "Sharqia",
  "Dakahlia",
  "Gharbia",
  "Monufia",
  "Bahira",
  "Kafr al shiekh",
  "Damitta",
  "Port saied",
  "Ismailia",
  "Suez",
  "Fayoum",
  "Bani swief",
  "Menia",
  "Asyot",
  "Sohag",
  "Qena",
  "Luxor",
  "Aswan",
];
