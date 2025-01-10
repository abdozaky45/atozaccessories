enum orderStatusType {
    under_review = 'under_review',
    confirmed = 'confirmed',
    deleted = 'deleted',
    ordered = 'ordered',
    shipped = 'shipped',
    delivered = 'delivered',
    cancelled = 'cancelled',
}
const orderStatusArray = Object.values(orderStatusType);
export { orderStatusArray, orderStatusType };