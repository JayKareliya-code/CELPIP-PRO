# CELPIPBRO Billing Store Redesign — Business Model and User Stories

## Existing Pattern Followed

This proposal follows the existing `BillingPageClient` billing orchestrator pattern. The billing page should continue to own the current user plan, billing status, checkout initiation, and child billing components.

It also follows the existing `PlanCard`, `PlanGrid`, and `CurrentPlanBanner` component structure. Plan selection should remain modular, testable, and easy to extend.

For the shopping-cart behaviour, the implementation should follow the existing frontend state-management rule: React Query handles server data, while local UI state should stay isolated and predictable. If a cart store is introduced, it should follow the pure-action Zustand pattern used in the app stores: no API calls and no side effects inside the store.

## Business Model

CELPIPBRO should move toward a simple hybrid billing model:

1. A free starter plan for users who want to explore the platform.
2. A paid Pro plan for serious CELPIP preparation.
3. Optional practice add-ons that users can buy when they need more focused practice.
4. A cart-based checkout experience that allows users to combine a plan upgrade and add-ons before payment.

The goal is to keep the billing model understandable. Users should not need to compare too many confusing options. The page should clearly answer three questions:

- What do I currently have?
- What can I upgrade to?
- What am I about to pay for?

## Proposed Plan

### Free Plan

The Free plan remains the entry point.

Free users should be able to:

- View the app.
- Understand the value of practice and reports.
- See locked Pro features.
- Upgrade when they are ready.

The Free plan should not show unnecessary billing complexity. The current plan banner should show that the user is on Free and should present one clear upgrade action.

### Pro Plan

The Pro plan should be the main paid plan.

Pro should include:

- Detailed AI reports.
- Strengths and weaknesses.
- Improvement tips.
- Sample responses.
- Analytics.
- More practice access.
- Access to add-on purchases.

The Pro card should stay visually highlighted but should not feel aggressive. It should use the app’s primary indigo styling, subtle glow, and clean spacing.

### Practice Add-ons

Practice add-ons should be shown below the plan cards.

Recommended add-ons:

- Writing Pack.
- Speaking Pack.
- Custom Task Bundle.

Each add-on should be simple to understand. The card should show:

- Add-on name.
- Price.
- Quantity included.
- Short description.
- Add to cart button.

The custom task bundle should allow task selection before adding to cart.

### Cart-Based Checkout

The cart should support quantity controls for every item.

Each cart item should include:

- Product name.
- Short subtitle.
- Unit price.
- Quantity stepper.
- Remove action.
- Line total.

The quantity stepper should include:

- Decrease button.
- Quantity value.
- Increase button.

If quantity reaches zero, the item should be removed from the cart.

The cart should update subtotal, tax, and total immediately after quantity changes. The checkout button should remain disabled when the cart is empty.

## What Should Be Removed

The bottom balance strip should be removed from the billing page.

Remove these items from the billing page layout:

- Speaking credits.
- Writing credits.
- Task bundle balance.

These balances create visual noise on the billing page. They are better suited for the dashboard, practice module pages, or account usage summary.

The billing page should focus only on plans, add-ons, cart contents, and checkout.

## User Stories

### Current Plan

As a signed-in user, I want to see my current plan at the top of the billing page, so that I understand what I already have.

Acceptance criteria:

- The current plan banner is visible near the top.
- The banner shows the plan name.
- The banner shows the main benefit or limitation.
- The upgrade action is visible when the user is on Free.
- The portal or receipt action is visible only when supported by billing status.

### Plan Upgrade

As a Free user, I want to upgrade to Pro from the billing page, so that I can unlock detailed CELPIP feedback.

Acceptance criteria:

- The Pro plan card is visually highlighted.
- The Pro card has one clear upgrade button.
- Only the selected plan button shows a loading state during checkout.
- The page does not trigger checkout until the user confirms through the checkout button or plan action.

### Add Practice Pack

As a Pro user, I want to add a practice pack to my cart, so that I can buy more practice without changing my plan.

Acceptance criteria:

- Each add-on card has an Add to cart button.
- Adding the same add-on again increases its quantity.
- The cart updates immediately.
- The cart total updates immediately.

### Adjust Cart Quantity

As a user, I want to increase or decrease item quantities in the cart, so that I can control exactly what I am buying.

Acceptance criteria:

- Each cart item has a quantity stepper.
- The decrease button reduces quantity by one.
- The increase button adds one.
- Quantity cannot go below zero.
- Quantity zero removes the item.
- Subtotal, tax, and total recalculate after every change.

### Remove Cart Item

As a user, I want to remove an item from the cart, so that I can clean up mistakes before checkout.

Acceptance criteria:

- Each cart item has a remove action.
- Removing an item updates the subtotal.
- Empty cart state appears when the last item is removed.
- Checkout is disabled when the cart is empty.

### Promo Code

As a user, I want to apply a promo code, so that I can receive a valid discount.

Acceptance criteria:

- Promo input appears inside the cart panel.
- Apply button has a loading state.
- Invalid promo code shows a clear error.
- Valid promo code updates the total.
- Promo code does not use bright or dense styling.

### Secure Checkout

As a user, I want to see trust information before payment, so that I feel safe checking out.

Acceptance criteria:

- Security copy appears below the checkout button.
- Stripe-powered checkout copy is visible.
- Trust items are short and subtle.
- Trust items do not overpower the cart.

## UI Direction

The billing page should match the overall CELPIPBRO app style.

The UI should use a simple dark theme. Avoid dense background colours, heavy gradients, and loud decorative effects.

### Theme Rules

Use the existing app styling:

- Page background: `bg-[#0D0F17]` or `bg-muted`.
- Cards: `bg-surface`, `border-border`, `rounded-2xl`, `shadow-card`.
- Primary actions: `bg-primary`, `hover:bg-primary-hover`.
- Text: clear hierarchy with foreground, muted, and subtle text.
- Success: emerald only for confirmed or safe states.
- Warning: amber only for attention states.
- Danger: rose only for destructive or error states.

### Layout

The page should use a two-column desktop layout:

Left column:

- Page title.
- Current plan banner.
- Plan cards.
- Add-on cards.

Right column:

- Sticky cart panel.
- Cart items.
- Promo code input.
- Subtotal, tax, total.
- Checkout button.
- Trust notes.

On mobile, the cart should stack below the plan and add-on sections. The cart should remain easy to scan and should not feel like a modal.

### Visual Style

Keep the design clean and restrained.

Use:

- Soft borders.
- Rounded cards.
- Clear spacing.
- Minimal shadows.
- Small icons only where helpful.
- Simple typography.

Avoid:

- Dense colour blocks.
- Bright background gradients.
- Large decorative icons.
- Emoji.
- Multiple competing accent colours.
- Complex font pairings.

### Typography

Use the app’s existing sans-serif UI font.

Headings should be clear and simple. Body text should be short. Price text should be easy to scan.

Do not introduce new font styles for this page. Do not use serif text in billing UI.

### Cart Item UI

Each cart item should look compact but clear.

Recommended structure:

- Icon or small product marker on the left.
- Name and subtitle in the middle.
- Quantity controls and price on the right.
- Remove action placed near the item but not visually dominant.

The quantity stepper should be small and consistent:

- Rounded buttons.
- Border using `border-border`.
- Hover state using `bg-muted`.
- Primary focus ring.
- Accessible labels.

### Add-on Cards

Add-on cards should align with the plan cards but be smaller.

Each card should include:

- Icon.
- Add-on title.
- Price.
- Quantity included.
- One-line description.
- Add to cart button.

The custom task bundle card should include a task selector. The selector should use the same dark input styling as the rest of the app.

### Empty Cart State

When the cart is empty, show a minimal empty state.

Suggested copy:

Your cart is empty. Choose a plan or add a practice pack to continue.

The empty state should not use illustrations or emoji. A simple muted icon is enough.

## Data and State Requirements

### Cart Item Shape

Each cart item should support:

- `id`
- `type`
- `name`
- `subtitle`
- `unitPrice`
- `currency`
- `quantity`
- `metadata`

The `metadata` field can store task number, bundle type, or Stripe price reference.

### Cart Actions

The cart should support these actions:

- Add item.
- Increase quantity.
- Decrease quantity.
- Remove item.
- Clear cart.
- Apply promo code.
- Recalculate totals.

Actions should be pure if they live in Zustand. Checkout, promo validation, and Stripe redirects should live in hooks or service functions, not inside the store.

### Checkout Payload

The checkout request should send the final cart state to the backend.

The backend should validate:

- Price IDs.
- Quantities.
- Product availability.
- Promo code.
- User plan eligibility.
- Currency.
- Tax rules.

The client should never be trusted as the source of truth for prices.

## Suggested Component Structure

Recommended frontend components:

- `BillingPageClient`
- `CurrentPlanBanner`
- `PlanGrid`
- `PlanCard`
- `AddonGrid`
- `AddonCard`
- `BillingCartPanel`
- `BillingCartItem`
- `QuantityStepper`
- `PromoCodeForm`
- `BillingTrustStrip`

Recommended hooks:

- `useBilling`
- `useBillingCart`
- `useApplyPromoCode`
- `useCreateCheckoutSession`

If a new Zustand cart store is created, keep it focused only on local cart state.

## Test Automation Requirements

Every interactive element should have a unique id.

Recommended ids:

- `billing-addon-writing-pack-add`
- `billing-addon-speaking-pack-add`
- `billing-addon-custom-bundle-add`
- `billing-custom-task-select`
- `billing-cart-item-{itemId}-increase`
- `billing-cart-item-{itemId}-decrease`
- `billing-cart-item-{itemId}-remove`
- `billing-promo-input`
- `billing-promo-apply`
- `billing-checkout-button`

## Success Metrics

The redesign should improve:

- Checkout clarity.
- Add-on discoverability.
- Cart usability.
- Mobile readability.
- Billing page focus.
- Conversion from Free to Pro.
- Add-on purchase completion.

## Implementation Notes

Start with the UI and local cart behaviour before changing backend checkout logic.

Recommended implementation sequence:

1. Remove the bottom balance strip from the billing page.
2. Add cart item quantity controls.
3. Create or update cart state.
4. Add subtotal, tax, and total recalculation.
5. Connect checkout payload to backend validation.
6. Add promo code handling.
7. Add tests for cart quantity changes.
8. Add tests for empty cart and checkout disabled states.

## Final Design Principle

The billing page should feel calm, premium, and trustworthy. It should not feel like a noisy store page. The main job of the UI is to make plan choice and checkout clear.
