# Project Requirements Prompt

## Project Overview

Design and develop a web-based vehicle request management platform. The system must support multiple user roles, cost tracking, fleet selection, and collaboration features.

---

## Requirements Checklist

### 1. Technology Analysis
- [ ] Conduct an analysis of technologies suitable for developing web-based applications
- [ ] Evaluate frontend frameworks (e.g., React, Vue, Angular)
- [ ] Evaluate backend frameworks (e.g., Node.js/Express, Django, Laravel)
- [ ] Assess database options (e.g., PostgreSQL, MySQL, MongoDB)
- [ ] Review authentication and authorization solutions
- [ ] Document final technology stack decision with justifications

---

### 2. User Roles & Profiles
- [ ] Implement **Administrator** profile with full system access
  - Manage users, vehicles, templates, and platform settings
- [ ] Implement **User** profile with standard access
  - View, create, and manage personal requests
- [ ] Role-based access control (RBAC) for all features
- [ ] Profile management (edit personal info, change password, upload avatar)

---

### 3. Cost Calculation
- [ ] Ability to calculate total costs per user
  - Cost breakdown by request, vehicle type, and time period
- [ ] Display cost summaries on user dashboard
- [ ] Admin view of costs across all users
- [ ] Export cost reports (CSV / PDF)

---

### 4. Contact Person Linking
- [ ] Ability to link a contact person to a user or request
  - Search and assign a contact from existing users or an external directory
- [ ] Display contact person details (name, phone, email) on the request view
- [ ] Allow updating or removing a linked contact person

---

### 5. Request Creation via Template
- [ ] Ability to create a request using a pre-defined template
  - Select from available templates when initiating a request
- [ ] Vehicle range selection within the request form
  - Filter and pick one or multiple vehicles
- [ ] Time options selection
  - Choose start date/time, end date/time, and duration
- [ ] Save drafts and submit completed requests for approval

---

### 6. Vehicle Filtering & Sorting
- [ ] Ability to filter vehicles by:
  - Type / category
  - Availability (date & time range)
  - Capacity / seats
  - Location
  - Cost range
- [ ] Ability to sort vehicles by:
  - Name / ID
  - Availability
  - Cost (ascending / descending)
  - Type
- [ ] Persist filter/sort preferences per session

---

### 7. Comments & Collaboration
- [ ] Ability to comment on the platform (general/admin announcements)
- [ ] Ability to comment on individual templates
  - Add, edit, delete own comments
  - Admin can moderate all comments
- [ ] Real-time or refresh-based comment updates
- [ ] Notification on new comments related to a user's requests or templates

---

## Deliverables

- [ ] Technology analysis document
- [ ] Database schema / ERD
- [ ] UI/UX wireframes for all major screens
- [ ] Implemented and tested web application
- [ ] Deployment guide and documentation
