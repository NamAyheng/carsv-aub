/** Match records to the signed-in customer. */
export function belongsToCurrentCustomer(
  currentUser: { id?: string; email?: string; name?: string } | undefined,
  rec: {
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
    email?: string;
  }
): boolean {
  if (!currentUser) return false;

  const userEmail = (currentUser.email || '').toLowerCase();
  if (String(currentUser.id || '').startsWith('api-')) {
    return rec.customerId === currentUser.id;
  }
  const recEmail = (rec.customerEmail || rec.email || '').toLowerCase();
  if (userEmail && recEmail && userEmail === recEmail) return true;

  if (
    rec.customerName &&
    currentUser.name &&
    rec.customerName.toLowerCase() === currentUser.name.toLowerCase()
  ) {
    return true;
  }

  return false;
}

export function demoCustomerId(currentUser?: { id?: string; email?: string }): string {
  if (String(currentUser?.id || '').startsWith('api-')) return currentUser?.id || '';
  return currentUser?.id || '';
}
