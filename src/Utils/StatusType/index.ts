enum StatusEnum {
  Online = "online",
  Offline = "offline",
  Deleted = "deleted",
  Blocked = "blocked",
}
const statusType = Object.values(StatusEnum);
export { statusType, StatusEnum };
