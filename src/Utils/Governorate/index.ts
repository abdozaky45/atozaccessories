enum governorate {
  // Upper Egypt (Said) - 75 EGP
  Fayoum = "Fayoum", 
  Minya = "Minya",
  Sohag = "Sohag",
  BeniSuef = "Beni Suef",
  Assiut = "Assiut",
  Qena = "Qena",
  Aswan = "Aswan",
  Luxor = "Luxor",
  // Delta and Canal - 65 EGP
  Qalyubia = "Qalyubia",
  Dakahlia = "Dakahlia",
  Monufia = "Monufia",
  Sharqia = "Sharqia",
  KafrElSheikh = "Kafr El Sheikh",
  Beheira = "Beheira",
  Gharbia = "Gharbia",
  PortSaid = "Port Said",
  Suez = "Suez",
  Ismailia = "Ismailia",
  Damietta = "Damietta",

  // Giza Suburbs - 55 EGP
  AlSaf = "Al Saf",
  AlBadrashein = "Al Badrashein",
  AlAyat = "Al Ayat",
  Atfih = "Atfih",
  Oseem = "Oseem",
  AbuNomros = "Abu Nomros",
  Hawamdeya = "Hawamdeya",
  ElMonib = "El Monib",
  Tanashe = "Tanashe",
  ManshaatAlQanater = "Mansha'at Al Qanater",
  ElBaragil = "El Baragil",
  Bashteel = "Bashteel",
  Kerdasa = "Kerdasa",
  ShubraMant = "Shubra Mant",
  SaftAlLaban = "Saft Al Laban",
  AlOmraniya = "Al Omraniya",
  AlMariouteya = "Al Mariouteya",
  // Cairo and Giza - 50 EGP
  Cairo = "Cairo",
  Giza = "Giza",
  // New Cities - 55 EGP
  ElShorouk = "El Shorouk",
  ElMostakbal = "El Mostakbal",
  ElRehab = "El Rehab",
  Madinaty = "Madinaty",
  October = "October",
  SheikhZayed = "Sheikh Zayed",
  NewCairo = "New Cairo (El Tagamoat)",
}

const governorateArray = Object.values(governorate);
export { governorateArray , governorate };
