enum orderStatusType {
    under_review = 'under_review',
    placed = 'placed',
    ordered = 'ordered',
    shipped = 'shipped',
    delivered = 'delivered',
}
const orderStatusArray = Object.values(orderStatusType);
export { orderStatusArray, orderStatusType };