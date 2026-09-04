// Shared valid setup for tests whose subject is downstream of List validation.
export function confirmDelivery(c) {
  if (!c.state.deliveryEditor || c.state.deliveryEditor.key) return;
  for (const step of [2, 3, 4]) c.goDeliveryWizardStep(step);
}
