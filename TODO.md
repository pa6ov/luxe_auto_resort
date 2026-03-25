# 🛠️ Luxe Auto Resort - Project Enhancements

This document tracks the implementation of fixed template-based booking dates and the overhaul of the data validation system for both users and administrators.

---

## 📅 Task 1: Fixed Calendar Template Logic
*Goal: Restrict date selection based on the selected "Template Pack" (Weekend vs. Business).*

### **[ ] Frontend: Dynamic Date Picker Restrictions**
- [ ] **State Integration:** Ensure the DatePicker component listens to the `template_id` or `package_type` state.
- [ ] **Weekend Pack Logic:**
    - Disable all days except Friday, Saturday, and Sunday.
    - If a user picks Friday, automatically set the checkout to Sunday (or enforce a 2-night minimum).
- [ ] **Business Pack Logic:**
    - Disable Saturday and Sunday.
    - Restrict the range to Monday–Friday only.
- [ ] **General Logic:** If no pack is selected, enforce standard rules (no past dates, no same-day bookings if applicable).
- [ ] **UI Feedback:** Gray out invalid dates in the calendar and add a tooltip/label explaining the restriction (e.g., *"Business Pack: Mon-Fri only"*).

### **[ ] Backend: Server-Side Template Enforcement**
- [ ] Create a helper function `validateTemplateDates(checkIn, checkOut, templateType)` to re-verify dates before saving to the DB.
- [ ] Reject any "Weekend" request where the check-in is not a Friday or check-out is not a Sunday.
- [ ] Reject any "Business" request that overlaps with a weekend.

---

## 🔐 Task 2: Robust Data Validation
*Goal: Implement a "Trust No One" policy for incoming data to prevent database errors and security vulnerabilities.*

### **[ ] User Input Validation (Frontend)**
- [ ] **Real-time Form Validation:** Implement library-based validation (e.g., **Zod**, **Yup**, or **Joi**) on all forms.
- [ ] **Sanitization:** Trim whitespace and escape special characters in text inputs (Name, Email, Notes).
- [ ] **Phone/Email Regex:** Ensure strict formatting for contact information.

### **[ ] API/Backend Security & Integrity**
- [ ] **Schema Validation:** Define strict schemas for the `POST /booking` and `PUT /booking` endpoints.
- [ ] **Overlap Check:** Implement a database query to check if the car/resort is already booked for the requested dates *before* confirming the new entry.
- [ ] **Price Integrity:** Ensure the `total_price` is calculated on the server, not passed from the frontend (to prevent price manipulation).

### **[ ] Administrator Dashboard Validation**
- [ ] **Edit Constraints:** Admins editing a booking must still follow template rules (unless an "Override" checkbox is used).
- [ ] **Conflict Resolution:** If an Admin changes a car's status to "Under Maintenance," the system should alert or block overlapping existing bookings.
- [ ] **Audit Trail:** Log which administrator edited which record and what the previous values were.

---

## 🚀 Task 3: UX & Error Handling
- [ ] **Dynamic Error Messages:** Instead of "Invalid Input," return specific messages like:
    - *"The Business Pack must end by Friday 18:00."*
    - *"Selected dates overlap with an existing booking for the Porsche 911."*
- [ ] **Loading States:** Add spinners/skeletons while the backend validates availability to prevent double-booking from "click-spamming."

---

## 📂 Suggested Files for Modification
| Feature | Target File (Example) |
| :--- | :--- |
| **Frontend UI** | `src/components/Booking/Calendar.jsx` |
| **Validation Schema** | `src/utils/validationSchema.js` |
| **Backend Logic** | `api/services/booking_service.py` |
| **Admin Panel** | `src/pages/Admin/EditBooking.jsx` |