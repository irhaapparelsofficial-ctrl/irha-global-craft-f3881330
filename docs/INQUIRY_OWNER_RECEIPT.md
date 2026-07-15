# Inquiry receipt flow

## Buyer confirmation

A saved inquiry displays `Inquiry received` and an `IRQ-...` reference. The buyer can use that reference in WhatsApp or email follow-up. A red `Submission failed` toast means the request was not saved and must be retried.

## Owner delivery

Every successful inquiry is stored in `public.inquiries` with status `new`. The database trigger creates an unread `New buyer inquiry` entry in `public.crm_notifications`. Authenticated admins see the inquiry in Admin → Buyer Inbox, including the buyer's name, company, email, WhatsApp/phone, country, intent, requirements, product context and private attachment metadata.

Private files stay in the `inquiry-uploads` bucket. The admin UI opens them only through a short-lived signed URL.

## Follow-up sequence

1. Open Admin → Buyer Inbox.
2. Open the newest `New` inquiry or the unread notification.
3. Review requirements and files.
4. Contact the buyer using the saved email or WhatsApp number.
5. Move the CRM status and add the next follow-up date.
