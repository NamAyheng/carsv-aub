/** Match records to the signed-in customer. Demo user John Doe is cust-1. */
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
  const recEmail = (rec.customerEmail || rec.email || '').toLowerCase();
  if (userEmail && recEmail && userEmail === recEmail) return true;

  if (
    rec.customerName &&
    currentUser.name &&
    rec.customerName.toLowerCase() === currentUser.name.toLowerCase()
  ) {
    return true;
  }

  const isJohnDemo =
    userEmail === 'john.doe@example.com' || currentUser.id === 'user-customer-demo';
  if (isJohnDemo) {
    return rec.customerId === 'cust-1' || rec.customerName === 'John Doe';
  }

  return false;
}

export function demoCustomerId(currentUser?: { id?: string; email?: string }): string {
  if (
    currentUser?.email?.toLowerCase() === 'john.doe@example.com' ||
    currentUser?.id === 'user-customer-demo'
  ) {
    return 'cust-1';
  }
  return currentUser?.id || 'cust-1';
}
