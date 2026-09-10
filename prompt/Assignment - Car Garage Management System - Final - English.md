# 🚗 Car Garage Management System Assignment

> A structured and well-formatted version of the original document.

> Car Garage Management System is designed for practicing the development of Software Application related to Customer Management, Vehicle Management, Service Management, Service Booking, Vehicle Check-in, Diagnosis, Repair Job / Work Order, Mechanic Management, Spare Parts Management, Estimate / Quotation, Cost Calculation, Invoice, Payment, Vehicle Checkout, Maintenance Reminder, Notification, Reporting and KPI Dashboard. This Application is intended to understand the key Workflows of Garage Service and Vehicle Repair Management and can correctly implement Business Logic, Data Modeling, State Management, Navigation, Validation, Authentication, Authorization and User Experience.

## 1. 📖 System Overview

> Application supports operations from User Login, Customer Registration, Vehicle Registration, Service Selection, Service Booking, Vehicle Check-in, Initial Inspection, Diagnosis, Repair Job Creation, Mechanic Assignment, Spare Parts Usage, Repair Progress, Quality Check, Invoice Generation, Payment, Vehicle Checkout through Service History and Report Generation. These Workflows are arranged in sequence so that Receptionist, Mechanic, Cashier, Manager and Administrator can manage Garage Operations effectively.

## 2. 👤 User & Authentication

- Application must be able to manage User Information such as User ID, Full Name, Email, Phone Number, Position, Department, Profile Photo, Role and Account Status. User can View Profile, Edit Profile, Change Password and Logout according to the defined functions.

- Application must support Login and Authentication by using Username or Email and Password. Authentication must be used to verify the User's identity while Authorization must be used to determine the extent to which User can View, Create, Edit, Delete, Assign, Update Status, Generate Invoice, Record Payment or Generate Report.

- Application must be able to manage Role such as Administrator, Receptionist, Mechanic, Cashier, Manager and Customer. Each Role must be able to have different Permissions to ensure that User can use only functions that are allowed.

## 3. 📊 Dashboard

- Application must have Dashboard to display summary information such as Total Customers, Total Vehicles, Today Bookings, Active Repair Jobs, Completed Services, Waiting for Parts, Ready for Pickup, Pending Payments and Total Revenue.

## 4. 👥 Customer Management

- Application must be able to manage Customer Information such as Customer ID, Full Name, Gender, Phone Number, Email, Address, Profile Photo and Status.

- Application must be able to create Unique Customer ID for each Customer to make Search, Tracking and linking to Vehicles, Bookings, Repair Jobs and Invoices easier.

- Application must have Customer Profile to display Personal Information, Contact Information, Vehicles, Recent Bookings, Active Repairs and Service History.

- Application must support Customer Search & Filter by Search by Customer ID, Full Name, Phone Number or Email and Filter by Customer Status.

- Application must have Customer Service History to display Bookings, Repair Jobs, Services, Payments and Vehicles that Customer has previously used.

## 5. 🚗 Vehicle Management

- Application must be able to manage Vehicle Information where one Vehicle must be linked to the Customer who owns the vehicle.

- Vehicle Information may include Vehicle ID, Plate Number, Brand, Model, Year, Color, Vehicle Type, VIN / Chassis Number, Engine Number, Current Mileage and Status.

- Application must implement Vehicle Validation to check Plate Number, VIN or Vehicle Information before creating a new Vehicle to reduce Duplicate Vehicle.

- Application must support Vehicle Search by Search by Plate Number, Customer, Brand, Model, VIN or Vehicle ID.

- Application must have Vehicle Detail to display Customer Owner, Vehicle Information, Current Mileage, Booking History, Repair Jobs, Parts Used and Service History.

- Application must store Vehicle Service History which contains Service Date, Mileage, Service Type, Mechanic, Parts Used, Labor Cost, Total Cost and Next Maintenance Information.

- Application must be able to manage Service Category such as Engine, Brake, Tire, Electrical, Air Conditioning, Maintenance, Body Repair and General Service.

- Application must be able to manage Service Information such as Service ID, Service Name, Category, Description, Standard Price, Estimated Duration and Status.

- Service List may include Oil Change, Engine Repair, Brake Service, Tire Service, Battery Service, Air Conditioning Service, Car Wash and General Maintenance as an example.

- Application must support Search & Filter for Service by Service Name, Category, Price Range, Estimated Duration and Status.

- Application must have Service Booking to allow Customer or Receptionist to create Booking before bringing the Vehicle to the Garage.

- Booking must store Booking ID, Customer, Vehicle, Service, Booking Date, Booking Time, Problem Description, Booking Note and Status.

- Application must have Booking Form for Select Customer, Vehicle, Service, Date, Time and enter Problem Description before Submit.

- Application must have Booking Confirmation to display Customer, Vehicle, Service, Date, Time and Note for the User to review before Confirm.

- Booking Status may include Pending, Confirmed, Checked-in, In Service, Completed and Cancelled.

- Application must support Booking Search & Filter by Booking ID, Customer, Vehicle, Service, Booking Date and Status.

- Application must implement Booking Conflict Prevention to prevent booking the same Service Bay, Mechanic or Resource at the same Date and Time if Project Scope has Resource Scheduling.

- Application must allow Cancel Booking that is not yet Completed and store Cancellation Reason, Cancelled Date and Cancelled By.

- Application must have Vehicle Check-in when Customer brings the Vehicle to the Garage by Booking or Walk-in Service.

- Vehicle Check-in must be able to Update Booking Status to Checked-in and store Check-in Date, Check-in Time and Staff who receives the Vehicle.

- Application must have Initial Inspection to record Current Mileage, Fuel Level, Vehicle Condition, Existing Damage, Customer Complaint and Inspection Note.

- Application can support Vehicle Photo at Check-in to take photos of Front, Rear, Left, Right or Existing Damage before Repair as an example.

- Application must be able to create Repair Job or Work Order after Vehicle Check-in and Initial Inspection.

- Repair Job may include Repair Job ID, Work Order Number, Customer, Vehicle, Problem Description, Diagnosis, Assigned Mechanic, Services, Spare Parts, Start Date, Estimated Completion Date and Status.

- Application must have Repair Job Detail to display Vehicle, Customer Complaint, Diagnosis, Mechanic, Services, Parts Usage, Repair Progress, Cost and Status History.

- Application must have Diagnosis Management to allow the Mechanic to record issues found, Root Cause, Recommended Repair and Required Parts.

- Repair Status may include Waiting, Diagnosing, Waiting for Approval, Repairing, Waiting for Parts, Quality Check, Ready for Pickup and Completed.

- Application must implement Status Validation to prevent changes to Repair Status that are not appropriate according to the Workflow.

### A. Repair Workflow can be implemented as:

> Waiting → Diagnosing → Waiting for Approval → Repairing → Quality Check → Ready for Pickup → Completed

- If Spare Parts are not sufficient, Repair Job can move to Waiting for Parts before returning to Repairing.

- Application must be able to display Repair Progress as Percentage, Progress Bar, Status Badge or Timeline so that Staff and Customer understand the Repair status.

- Application must store Repair Status History which contains Previous Status, New Status, Updated By, Updated Date and Note.

- Application must be able to manage Mechanic Information such as Mechanic ID, Full Name, Phone Number, Skill, Specialization, Availability, Current Workload and Status.

- Application must have Mechanic Profile to display Mechanic Information, Skills, Current Repair Jobs and Completed Jobs.

- Application must allow Manager or Authorized Staff Assign Mechanic to Repair Job.

- Application must allow Reassign Mechanic when necessary and store Assignment History so that it can be tracked which Mechanic was previously responsible.

- Application must be able to display Mechanic Workload by calculating Active Repair Jobs, Waiting Jobs, Completed Jobs and Estimated Work Hours of each Mechanic.

- Application must be able to manage Spare Parts that the Garage has in Stock.

- Spare Part Information may include Part ID, Part Number, Part Name, Category, Brand, Unit Price, Current Quantity, Minimum Stock and Status.

- Application must support Search & Filter Spare Parts by Part Number, Part Name, Category, Brand and Stock Status.

- Application must be able to display Parts Stock such as Current Quantity, Low Stock, Out of Stock and Inventory Value as an example.

- Application must have Parts Usage to record Spare Parts used in the Repair Job.

- Parts Usage must store Repair Job, Spare Part, Quantity, Unit Price, Total Cost, Used Date and Mechanic/Staff who recorded it.

- Application must implement Stock Deduction by Quantity of the Spare Part must decrease when Parts Usage is Confirmed.

- Application must implement Stock Validation to not allow Mechanic or Staff to use Spare Parts exceeding the available Quantity.

- Application must have Low Stock Alert when Current Quantity equals or is lower than Minimum Stock.

- Application can support Supplier Management to manage Supplier that supplies Spare Parts.

- Supplier Information may include Supplier ID, Supplier Name, Contact Person, Phone Number, Email, Address and Status.

- Application may include Parts Purchase Prototype to record the purchase Spare Parts from Supplier and add Quantity to Stock.

- Application must be able to create Estimate / Quotation before starting the Repair to display Estimated Cost for the Customer to review.

- Estimate must be able to have Estimate Number, Customer, Vehicle, Recommended Services, Labor Cost, Service Cost, Spare Parts Cost, Discount, Tax Prototype and Estimated Total.

- Application can support Customer Approval where the Customer can Approve or Reject Quotation before starting the repair as an example.

- Application must be able to manage Service Cost which includes Labor Cost, Service Fee, Spare Parts Cost, Discount and Tax Prototype.

### B. Application must be able to calculate Subtotal by:

> Subtotal = Labor Cost + Service Cost + Spare Parts Cost

### C. Application must be able to calculate Grand Total by:

> Grand Total = Subtotal − Discount + Tax

- Application must implement Cost Validation to check Labor Cost, Service Price, Parts Price, Quantity, Discount and Tax before Generate Invoice.

- Application must have Invoice Management for creating Invoice after Repair Job or Service has been completed.

- Invoice Information may include Invoice Number, Customer, Vehicle, Repair Job, Service Items, Parts Items, Labor Cost, Subtotal, Discount, Tax, Grand Total, Invoice Date and Status.

- Invoice Status may include Draft, Unpaid, Partially Paid, Paid and Cancelled.

- Application must have Invoice Detail to display all Cost information that the Customer must pay.

- Application must have Payment Management to record Customer payments for the Invoice.

- Payment Information may include Payment ID, Invoice Number, Customer, Amount, Payment Method, Payment Date, Reference Number, Received By and Status.

- Payment Method may include Cash, Bank Transfer, Card and QR Payment Prototype.

- Payment Status may include Unpaid, Partially Paid, Paid, Failed and Refunded as an example.

- Application can support Partial Payment where Customer can pay part of the Invoice and pay the remaining Amount later.

### D. Application must be able to calculate Remaining Invoice Balance such as:

> Remaining Balance = Grand Total − Total Paid

- Application must store all Payment History related to the Invoice.

- Application must be able to create Payment Receipt which contains Receipt Number, Payment ID, Invoice Number, Customer, Vehicle, Amount, Payment Method and Payment Date.

- Application must have Vehicle Checkout when Repair Completed, Quality Check has been completed and Vehicle is ready to hand over to Customer.

- Application must have Final Inspection or Quality Check so that Staff can record that Repairs have been checked and Vehicle is in proper condition before Checkout.

- Application must be able to set the Repair Job as Ready for Pickup after the Final Inspection is successful.

- Application must have Ready for Pickup Notification to notify Customer that their Vehicle is ready for pickup.

- Application must be able to set Service Completion after the Customer has received the Vehicle and the Required Workflow is completed.

- When Repair Job is Completed, Application must enter Record into Vehicle Service History automatically according to Business Logic.

- Application must be able to set Maintenance Schedule such as Next Service Date or Next Service Mileage for each Vehicle.

- For example, after Oil Change Application can set Next Service Mileage = Current Mileage + 5,000 km as an example.

- Application must have Maintenance Reminder to notify Customer about Oil Change, Brake Inspection, Tire Rotation, Battery Check or Periodic Maintenance that are approaching.

- Application may include Warranty Management Prototype to set Warranty Period for Service or Spare Parts that were used.

- Application may include Warranty Claim Prototype to record cases where the Customer returns due to an issue covered by the Warranty.

- Application must have Notification Management for Booking Created, Booking Confirmed, Vehicle Checked-in, Repair Started, Waiting for Parts, Repair Completed, Ready for Pickup, Invoice Generated, Payment Recorded and Maintenance Reminder.

- Application must have Booking Notification when the Booking is Created, Confirmed, Updated or Cancelled.

- Application must have Repair Status Notification to notify Customer when the Repair Job changes important Statuses.

- Application must have Invoice & Payment Notification when the Invoice is Generated, Payment is Recorded or the Invoice is Paid.

- Application must have Dashboard Statistics to display Total Customers, Vehicles, Bookings, Repair Jobs, Completed Services, Pending Payments and Revenue.

- Application must be able to display Today Bookings for Receptionist and Manager to know which Vehicle needs to come for Service today.

- Application must be able to display Active Repair Jobs with Status such as Diagnosing, Repairing, Waiting for Parts and Quality Check.

- Application must be able to display Completed Services by Daily, Weekly, Monthly or Custom Date Range.

- Application must be able to display Pending Payments for Invoices that are Unpaid or Partially Paid.

- Application must be able to display Revenue Summary by Daily, Weekly, Monthly and Yearly.

- Application must be able to display Popular Services to identify Services that Customers use most frequently.

- Application must be able to display Most Used Spare Parts to identify Spare Parts that are used the most in Repair Jobs.

- Application must be able to calculate KPI such as Total Bookings, Completed Services, Active Repair Jobs, Average Repair Time, Total Revenue and Customer Return Rate Prototype.

### E. Average Repair Time can be calculated as an example:

> Average Repair Time = Total Repair Duration ÷ Number of Completed Repair Jobs

### F. Customer Return Rate can be calculated as an example:

> Customer Return Rate (%) = Returning Customers ÷ Total Customers × 100

- Application must be able to create Booking Report by displaying Booking ID, Customer, Vehicle, Service, Date, Time and Status.

- Application must be able to create Repair Job Report by filtering by Mechanic, Vehicle, Service, Repair Status and Date Range.

- Application must be able to create Completed Service Report that displays Customer, Vehicle, Service, Completion Date and Total Cost.

- Application must be able to create Mechanic Workload Report to display Active Jobs, Completed Jobs and Current Workload of each Mechanic.

- Application must be able to create Spare Parts Usage Report that displays Spare Part, Quantity Used, Repair Job, Vehicle and Cost.

- Application must be able to create Low Stock Report for Spare Parts whose Current Quantity equals or is lower than Minimum Stock.

- Application must be able to create Invoice Report by Customer, Vehicle, Invoice Date, Amount and Invoice Status.

- Application must be able to create Payment Report by Payment Date, Payment Method, Invoice, Customer and Amount.

- Application must be able to create Revenue Report by Daily, Weekly, Monthly and Yearly.

- Application must be able to create Customer Service History Report and Vehicle Service History Report to display previous Repair and Maintenance Records.

- Application can support Export Reports as PDF or Excel as an example.

- Application must consider Authentication, Authorization and Session Management to protect Customer, Vehicle, Repair, Invoice and Payment Data.

- Customer can view Booking and Vehicle Service Information of their own only while Receptionist, Mechanic, Cashier, Manager and Administrator can access Modules according to Permission.

- Application must implement Form Validation on Customer Information, Vehicle Information, Booking, Repair Job, Spare Parts, Cost and Payment Data before Save.

- Application must implement Booking Validation to check Customer, Vehicle, Service, Booking Date and Booking Time before Confirm Booking.

- Application must implement Quantity Validation before Spare Parts Usage to prevent Zero Quantity, Negative Quantity and Quantity exceeding Available Stock.

- Application must implement Price Validation for Labor Cost, Service Price, Spare Part Price, Discount and Tax.

- Application must implement Payment Validation to check Payment Amount, Invoice Balance, Duplicate Reference and Invoice Status before Record Payment.

- Application must have Error Handling for Login Failed, Customer Not Found, Duplicate Vehicle, Invalid Booking, Booking Conflict, Spare Part Out of Stock, Invalid Repair Status, Cost Calculation Error and Payment Error.

- UI must display Loading Indicator, Success Message, Error Message, Warning Message, Empty State, Confirmation Dialog and Retry Action according to the defined state.

- Application must support Search & Filter for Customers, Vehicles, Bookings, Repair Jobs, Mechanics, Spare Parts, Invoices and Payments.

- Application must have Activity Log to record important activities such as Customer Created, Vehicle Registered, Booking Created, Vehicle Checked-in, Mechanic Assigned, Parts Used, Repair Completed and Invoice Generated.

- Application must have Audit Log to record which User has Create, Edit, Delete, Assign or Update Status and when.

- Application may include Data Backup and Data Recovery for Customer, Vehicle, Repair, Parts, Invoice and Payment Data.

- Application must have Responsive UI that can be used well on Desktop, Tablet or Mobile according to the platform selected by the student for development.

- Application must have State Management to manage Data and UI State. For example, when Spare Part is used, Current Stock, Repair Job Cost and Dashboard Low Stock Count must be updated consistently.

> Application must have Navigation Management that can be implemented as Dashboard → Customer → Vehicle → Booking → Check-in → Repair Job → Invoice → Payment → Checkout.

- Application must define Data Models for User Model, Role Model, Customer Model, Vehicle Model, Service Category Model, Service Model, Booking Model, Inspection Model, Repair Job Model, Mechanic Model, Spare Part Model, Parts Usage Model, Supplier Model, Estimate Model, Invoice Model, Payment Model, Notification Model and Service History Model as an example.

- Application must implement CRUD Operations such as Create, Read, Update and Delete on Customer, Vehicle, Service, Mechanic, Spare Parts and other Data by Permission.

- Booking Business Logic must manage Booking Creation, Conflict Checking, Booking Status and Vehicle Check-in Workflow.

- Repair Business Logic must manage Diagnosis, Mechanic Assignment, Repair Status, Repair Progress, Quality Check and Repair Completion.

- Spare Parts Business Logic must manage Parts Usage, Stock Deduction, Stock Validation and Low Stock Detection.

- Cost Calculation Logic must calculate Labor Cost, Service Cost, Spare Parts Cost, Discount, Tax, Subtotal and Grand Total accurately.

- Invoice Business Logic must create Invoice from Repair Job, Update Invoice Balance and Synchronize Payment Status.

- Application must implement Functional Testing on Login, Customer, Vehicle, Booking, Check-in, Repair Job, Spare Parts, Invoice and Payment.

- Customer CRUD Testing must Test Add, View, Edit, Search and Disable/Delete Customer according to Scope.

- Vehicle CRUD Testing must Test Vehicle Registration, Owner Relationship, Search, Update and Duplicate Vehicle Validation.

### G. Booking Testing must Test Workflow:

> Select Customer → Select Vehicle → Select Service → Select Date/Time → Confirm Booking

- Vehicle Check-in Testing must Test Mileage, Fuel Level, Vehicle Condition, Inspection Note and Booking Status Update.

### H. Repair Job Testing must Test Workflow:

> Check-in → Diagnosis → Mechanic Assignment → Repairing → Quality Check → Ready for Pickup → Completed

> Spare Parts Testing must Test Parts Usage → Quantity Validation → Stock Deduction → Low Stock Update.

### I. Cost Calculation Testing must Test:

- Labor Cost + Service Cost + Parts Cost − Discount + Tax = Grand Total

- Invoice Testing must Test Invoice Generation, Service Items, Parts Items and Grand Total.

- Payment Testing must Test Full Payment, Partial Payment, Payment Method, Invalid Payment and Invoice Status Update.

- Service History Testing must Test that the Completed Repair Job must be added to Vehicle Service History correctly.

- Notification Testing must Test Booking Notification, Repair Status, Ready for Pickup, Invoice, Payment and Maintenance Reminder.

- Permission Testing must Test that Receptionist, Mechanic, Cashier, Manager, Administrator and Customer can use only Actions for which their Role has Permission.

- UI & Navigation Testing must Test Screens, Forms, Buttons, Cards, Tables, Search, Filter and Navigation between Modules.

### J. Application must implement End-to-End Testing by testing the complete Workflow:

- Login → Register Customer → Add Vehicle → Create Booking → Vehicle Check-in → Initial Inspection → Diagnosis → Create Repair Job → Assign Mechanic → Use Spare Parts → Update Repair Progress → Quality Check → Generate Invoice → Record Payment → Vehicle Checkout → Update Service History

- Application must implement Debugging to find and fix errors related to Booking, Vehicle Check-in, Repair Workflow, Spare Parts Stock, Cost Calculation, Invoice, Payment, Validation and UI.

- Application must have Project Documentation which includes Problem Statement, Objectives, Scope, Requirements, User Roles, Functional Requirements, Non-Functional Requirements, Garage Workflow, Repair Workflow, User Flow, UI/UX Design, Data Model, Application Architecture, Business Logic, Calculation Logic and Test Cases.

- At the end of the Assignment, the student must give a Final Presentation to explain Problem Statement, Objectives, System Features, User Roles, Garage Workflow, Repair Workflow, Spare Parts Logic, Cost Calculation, UI/UX, Data Model, Application Architecture and Testing.

- The student must conduct a Live Demo by demonstrating the actual Workflow from Customer Registration, Vehicle Registration, Service Booking, Vehicle Check-in, Repair Job, Mechanic Assignment, Spare Parts Usage, Repair Completion, Invoice, Payment through Vehicle Checkout and Service History.

---

## 1. 🔄 Core Workflow

> Login → Customer Registration → Vehicle Registration → Service Booking → Vehicle Check-in → Initial Inspection → Diagnosis → Repair Job → Mechanic Assignment → Spare Parts Usage → Repair Progress → Quality Check → Invoice → Payment → Vehicle Checkout → Service History

---

## 2. 📋 Required Functions

1. Login & Logout
2. User Profile
3. Role & Permission
4. Dashboard
5. Customer Management
6. Customer Profile
7. Vehicle Management
8. Vehicle Detail
9. Vehicle Service History
10. Service Category
11. Service Management
12. Service Booking
13. Booking Status
14. Booking Search & Filter
15. Vehicle Check-in
16. Initial Inspection
17. Repair Job / Work Order
18. Diagnosis Management
19. Mechanic Management
20. Mechanic Assignment
21. Repair Status
22. Repair Progress
23. Spare Parts Management
24. Parts Usage
25. Stock Validation
26. Low Stock Detection
27. Estimate / Quotation
28. Customer Approval Prototype
29. Cost Calculation
30. Invoice Management
31. Payment Management
32. Payment Receipt
33. Vehicle Checkout
34. Service History
35. Maintenance Reminder
36. Notification Management
37. KPI & Dashboard
38. Reports
39. Validation & Error Handling
40. State Management
41. CRUD Implementation
42. Functional Testing
43. End-to-End Testing
44. Project Documentation
45. Final Presentation
46. Live Demo