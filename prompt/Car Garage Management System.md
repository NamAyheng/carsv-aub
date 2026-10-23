Car Garage Management System


Car Garage Management System ត្រូវបានរៀបចំឡើងសម្រាប់អនុវត្តការអភិវឌ្ឍ Software Application ដែលពាក់ព័ន្ធនឹង Customer Management, Vehicle Management, Service Management, Service Booking, Vehicle Check-in, Diagnosis, Repair Job / Work Order, Mechanic Management, Spare Parts Management, Estimate / Quotation, Cost Calculation, Invoice, Payment, Vehicle Checkout, Maintenance Reminder, Notification, Reporting និង KPI Dashboard។ Application នេះមានគោលបំណងឱ្យយល់ពី Workflow សំខាន់ៗនៃ Garage Service និង Vehicle Repair Management ព្រមទាំងអាចអនុវត្ត Business Logic, Data Modeling, State Management, Navigation, Validation, Authentication, Authorization និង User Experience បានយ៉ាងត្រឹមត្រូវ។

Application គាំទ្រប្រតិបត្តិការចាប់ពី User Login, Customer Registration, Vehicle Registration, Service Selection, Service Booking, Vehicle Check-in, Initial Inspection, Diagnosis, Repair Job Creation, Mechanic Assignment, Spare Parts Usage, Repair Progress, Quality Check, Invoice Generation, Payment, Vehicle Checkout រហូតដល់ Service History និង Report Generation។ Workflow ទាំងនេះត្រូវបានរៀបចំជាលំដាប់ដើម្បីឱ្យ Receptionist, Mechanic, Cashier, Manager និង Administrator អាចគ្រប់គ្រង Garage Operations បានយ៉ាងមានប្រសិទ្ធភាព។

1. Login & Logout


Login & Logout ជាមុខងារសម្រាប់គ្រប់គ្រងការចូល និងចាកចេញពី System។ Login ប្រើសម្រាប់ផ្ទៀងផ្ទាត់ User ខណៈ Logout ប្រើសម្រាប់បញ្ចប់ Session និងការពារទិន្នន័យ Customer, Vehicle, Repair និង Payment។


Login Screen → Enter Username/Email & Password → Validation → Authentication → Check Account Status → Load Role & Permission → Dashboard → Logout → Clear Session → Login Screen



1. Login Screen – User បើកទំព័រចូល System។
2. Enter Username/Email & Password – បញ្ចូលព័ត៌មាន Account។
3. Validation – ពិនិត្យ Required Fields។
4. Authentication – ផ្ទៀងផ្ទាត់ Username/Email និង Password។
5. Check Account Status – ពិនិត្យថា Account Active ឬអត់។
6. Load Role & Permission – ទាញ Role និង Permission។
7. Dashboard – ចូលទៅ Dashboard។
8. Logout – User ចាកចេញពី System។
9. Clear Session – បញ្ចប់ Login Session។
10. Login Screen – ត្រឡប់ទៅ Login។

---

2. User Profile


User Profile ប្រើសម្រាប់មើល និងកែព័ត៌មានរបស់ Staff ឬ User ដូចជា Full Name, Email, Phone, Position, Department និង Profile Photo។


Dashboard → User Profile → View Profile → Edit Profile → Update Information → Validation → Save → Profile Updated



1. User ចូល Dashboard។
2. ជ្រើស User Profile។
3. មើលព័ត៌មានបច្ចុប្បន្ន។
4. ចុច Edit។
5. កែព័ត៌មាន។
6. Validate។
7. Save។
8. System Update Profile។

---

3. Role & Permission


Role & Permission ប្រើសម្រាប់កំណត់ថា Administrator, Receptionist, Mechanic, Cashier, Manager និង Customer អាចប្រើមុខងារណាខ្លះ។


Administrator → Role Management → Create/Edit Role → Select Permissions → Assign Role → Save → User Login → Permission Check → Allow/Deny



1. Admin បង្កើត ឬកែ Role។
2. កំណត់ View, Create, Edit, Delete, Assign, Payment និង Report។
3. Assign Role ទៅ User។
4. Save។
5. User Login។
6. System Check Permission។
7. Allow ឬ Deny Action។

---

4. Dashboard


Dashboard ជាទំព័រសង្ខេបសម្រាប់មើលស្ថានភាព Garage ដូចជា Customers, Vehicles, Bookings, Repair Jobs, Payments និង Revenue។


Login → Dashboard → Load Customer/Vehicle Data → Load Booking Data → Load Repair Jobs → Load Payment Data → Calculate KPI → Display Cards/Charts



1. User Login។
2. Load Customer និង Vehicle Data។
3. Load Today Bookings។
4. Load Active Repair Jobs។
5. Load Pending Payments។
6. គណនា Revenue និង KPI។
7. Display Dashboard។

---

5. Customer Management


Customer Management ប្រើសម្រាប់គ្រប់គ្រងព័ត៌មានម្ចាស់យានយន្ត។


Customer List → Add Customer → Enter Personal Information → Contact Information → Generate Customer ID → Validation → Save → Customer Created



1. បើក Customer List។
2. Add Customer។
3. បញ្ចូល Full Name, Gender។
4. បញ្ចូល Phone, Email, Address។
5. Generate Unique Customer ID។
6. Validate Data។
7. Save។
8. Customer អាចភ្ជាប់ទៅ Vehicle និង Booking។

---

6. Customer Profile


Customer Profile បង្ហាញព័ត៌មានពេញលេញរបស់ Customer រួមទាំង Vehicles, Bookings, Active Repairs និង Service History។


Customer List → Select Customer → View Profile → Personal Info → Vehicles → Bookings → Active Repairs → Service History



1. ជ្រើស Customer។
2. បើក Profile។
3. មើល Personal Information។
4. មើល Vehicles។
5. មើល Booking History។
6. មើល Active Repairs។
7. មើល Service History។

---

7. Vehicle Management


Vehicle Management ប្រើសម្រាប់គ្រប់គ្រងព័ត៌មានយានយន្តរបស់ Customer។


Customer → Add Vehicle → Enter Plate Number → Brand/Model/Year → VIN/Engine Number → Mileage → Validate Duplicate → Save



1. ជ្រើស Customer Owner។
2. Add Vehicle។
3. បញ្ចូល Plate Number។
4. បញ្ចូល Brand, Model, Year, Color។
5. បញ្ចូល VIN និង Engine Number។
6. បញ្ចូល Current Mileage។
7. Check Duplicate Vehicle។
8. Save។

---

8. Vehicle Detail


Vehicle Detail បង្ហាញព័ត៌មានលម្អិតរបស់ Vehicle និងប្រវត្តិ Service/Repair ទាំងអស់។


Vehicle List → Select Vehicle → Load Owner → Vehicle Information → Mileage → Bookings → Repair Jobs → Parts Used → Service History



1. ជ្រើស Vehicle។
2. បង្ហាញ Customer Owner។
3. បង្ហាញ Vehicle Information។
4. បង្ហាញ Current Mileage។
5. បង្ហាញ Booking History។
6. បង្ហាញ Repair Jobs។
7. បង្ហាញ Parts Used។
8. បង្ហាញ Service History។

---

9. Vehicle Service History


Vehicle Service History រក្សាទុកប្រវត្តិ Repair និង Maintenance របស់ Vehicle មួយៗ។


Vehicle → Service History → Load Completed Repair Jobs → Services → Parts Used → Cost → Mileage → Next Maintenance



1. បើក Vehicle។
2. ចូល Service History។
3. Load Completed Repairs។
4. បង្ហាញ Service Type។
5. បង្ហាញ Parts Used។
6. បង្ហាញ Labor/Total Cost។
7. បង្ហាញ Mileage។
8. បង្ហាញ Next Maintenance។

---

10. Service Category


Service Category ប្រើសម្រាប់ចាត់ថ្នាក់ Services ដូចជា Engine, Brake, Tire, Electrical និង Maintenance។


Admin → Service Category → Add Category → Enter Name/Description → Set Status → Save → Use in Service



1. Admin ចូល Service Category។
2. Add Category។
3. បញ្ចូល Name និង Description។
4. Set Active/Inactive។
5. Save។
6. Category អាចប្រើពេល Create Service។

---

11. Service Management


Service Management ប្រើសម្រាប់គ្រប់គ្រង Services ដែល Garage ផ្តល់ជូន។


Service List → Add Service → Select Category → Enter Service Name → Description → Standard Price → Estimated Duration → Status → Save



1. Add Service។
2. Select Category។
3. Enter Service Name។
4. Enter Description។
5. Set Standard Price។
6. Set Estimated Duration។
7. Set Status។
8. Save។

---

12. Service Booking


Service Booking ប្រើសម្រាប់កក់ពេលយក Vehicle មក Service ឬ Repair។


Create Booking → Select Customer → Select Vehicle → Select Service → Date/Time → Problem Description → Conflict Check → Confirmation → Save



1. Create Booking។
2. Select Customer។
3. Select Vehicle។
4. Select Service។
5. Set Booking Date/Time។
6. Enter Problem Description។
7. Check Resource/Time Conflict។
8. Show Confirmation។
9. Save Booking។

---

13. Booking Status


Booking Status បង្ហាញដំណាក់កាលរបស់ Booking ចាប់ពីការកក់រហូតដល់ Service បញ្ចប់។


Pending → Confirmed → Checked-in → In Service → Completed / Cancelled



1. Pending – ទើបបង្កើត Booking។
2. Confirmed – Garage បានបញ្ជាក់ Booking។
3. Checked-in – Vehicle បានមកដល់។
4. In Service – Vehicle កំពុង Repair/Service។
5. Completed – Service បានបញ្ចប់។
6. Cancelled – Booking ត្រូវបានលុបចោល។

---

14. Booking Search & Filter


ប្រើសម្រាប់ស្វែងរក Booking តាម Customer, Vehicle, Service, Date និង Status។


Booking List → Enter Keyword → Select Date/Status/Service → Apply Filter → Search → Display Results → Clear Filter



1. បើក Booking List។
2. បញ្ចូល Customer/Vehicle/Booking ID។
3. Filter Date/Service/Status។
4. Apply។
5. System Search។
6. Display Matching Bookings។
7. Clear Filter ប្រសិនបើចាំបាច់។

---

15. Vehicle Check-in


Vehicle Check-in ជាការកត់ត្រាថា Vehicle បានមកដល់ Garage និងត្រៀមចូល Service Process។


Booking/Walk-in → Select Customer & Vehicle → Check Booking → Record Check-in Date/Time → Update Mileage → Status = Checked-in



1. Vehicle មកដល់ Garage។
2. Search Booking ឬ Create Walk-in។
3. Verify Customer/Vehicle។
4. Record Check-in Date/Time។
5. Update Current Mileage។
6. Booking Status = Checked-in។

---

16. Initial Inspection


Initial Inspection ប្រើសម្រាប់ពិនិត្យស្ថានភាព Vehicle មុន Repair ដើម្បីកត់បញ្ហា និងការខូចខាតដែលមានស្រាប់។


Check-in → Record Mileage → Fuel Level → Vehicle Condition → Existing Damage → Customer Complaint → Photos → Inspection Note → Save



1. Vehicle Check-in។
2. Record Mileage។
3. Record Fuel Level។
4. Check Vehicle Condition។
5. Record Existing Damage។
6. Record Customer Complaint។
7. អាចថត Vehicle Photos។
8. Add Inspection Note។
9. Save Inspection។

---

17. Repair Job / Work Order


Repair Job ឬ Work Order ជាឯកសារស្នូលសម្រាប់គ្រប់គ្រងការជួសជុល Vehicle មួយ។


Check-in → Initial Inspection → Create Repair Job → Generate Work Order Number → Add Problem → Services → Estimated Completion → Assign Mechanic → Save



1. Vehicle បាន Check-in។
2. Initial Inspection Completed។
3. Create Repair Job។
4. Generate Work Order Number។
5. Add Problem Description។
6. Add Services។
7. Set Estimated Completion Date។
8. Assign Mechanic។
9. Save Work Order។

---

18. Diagnosis Management


Diagnosis Management ប្រើសម្រាប់ Mechanic កត់ត្រាបញ្ហាពិតប្រាកដ និងមូលហេតុរបស់ Vehicle។


Repair Job → Mechanic Inspection → Record Problem Found → Root Cause → Recommended Repair → Required Parts → Diagnosis Note → Save



1. Mechanic បើក Repair Job។
2. ពិនិត្យ Vehicle។
3. Record Problem Found។
4. Identify Root Cause។
5. Recommend Repair។
6. List Required Parts។
7. Add Diagnosis Note។
8. Save។

---

19. Mechanic Management


Mechanic Management ប្រើសម្រាប់គ្រប់គ្រងព័ត៌មាន និងជំនាញរបស់ Mechanic។


Mechanic List → Add Mechanic → Enter Information → Skills/Specialization → Availability → Status → Save



1. Add Mechanic។
2. Enter Name និង Phone។
3. Define Skills។
4. Define Specialization។
5. Set Availability។
6. Set Status។
7. Save។

---

20. Mechanic Assignment


Mechanic Assignment ប្រើសម្រាប់ចែក Repair Job ទៅ Mechanic ដែលសមស្រប។


Repair Job → Check Required Skill → View Available Mechanics → Check Workload → Select Mechanic → Assign → Notify Mechanic → Save History



1. Review Repair Job។
2. Determine Required Skill។
3. View Available Mechanics។
4. Check Workload។
5. Select Mechanic។
6. Assign។
7. Notify Mechanic។
8. Save Assignment History។

---

21. Repair Status


Repair Status បង្ហាញដំណាក់កាលបច្ចុប្បន្នរបស់ Repair Job។


Waiting → Diagnosing → Waiting for Approval → Repairing → Waiting for Parts if Needed → Quality Check → Ready for Pickup → Completed



1. Waiting – រង់ចាំចាប់ផ្តើម។
2. Diagnosing – កំពុងពិនិត្យបញ្ហា។
3. Waiting for Approval – រង់ចាំ Customer Approve Estimate។
4. Repairing – កំពុងជួសជុល។
5. Waiting for Parts – រង់ចាំ Spare Parts។
6. Quality Check – ពិនិត្យគុណភាពក្រោយ Repair។
7. Ready for Pickup – Vehicle រួចរាល់។
8. Completed – Process បញ្ចប់។

---

22. Repair Progress


Repair Progress បង្ហាញកម្រិតការងារដែលបានបញ្ចប់របស់ Repair Job។


Repair Job → Load Tasks/Services → Update Service Status → Calculate Progress → Update Status → Display Progress Bar/Timeline



1. Load Repair Job។
2. Load Services/Tasks។
3. Update Status របស់ការងារនីមួយៗ។
4. Calculate Completion Percentage។
5. Update Repair Status។
6. Display Progress Bar ឬ Timeline។

---

23. Spare Parts Management


Spare Parts Management ប្រើសម្រាប់គ្រប់គ្រង Parts ដែល Garage មានក្នុង Stock។


Parts List → Add Part → Enter Part Number/Name → Category/Brand → Unit Price → Quantity → Minimum Stock → Validation → Save



1. Add Spare Part។
2. Enter Part Number និង Name។
3. Select Category/Brand។
4. Enter Unit Price។
5. Enter Current Quantity។
6. Set Minimum Stock។
7. Validate Duplicate/Price/Quantity។
8. Save។

---

24. Parts Usage


Parts Usage ប្រើសម្រាប់កត់ត្រា Spare Parts ដែលត្រូវបានប្រើក្នុង Repair Job។


Repair Job → Add Parts Usage → Select Part → Enter Quantity → Check Stock → Calculate Cost → Confirm → Deduct Stock → Update Repair Cost



1. បើក Repair Job។
2. Add Parts Usage។
3. Select Part។
4. Enter Quantity។
5. Check Available Stock។
6. Calculate Quantity × Unit Price។
7. Confirm Usage។
8. Deduct Stock។
9. Update Repair Job Cost។

---

25. Stock Validation


Stock Validation ប្រើសម្រាប់ការពារមិនឱ្យប្រើ Spare Parts លើស Quantity ដែលមាន។


Select Part → Enter Quantity → Check Current Stock → Quantity Valid? → Allow Usage / Show Insufficient Stock Error



1. Select Part។
2. Enter Quantity។
3. System Check Current Quantity។
4. Check Quantity > 0។
5. Check Quantity ≤ Available Stock។
6. បើ Valid → Allow Usage។
7. បើ Invalid → Show Error។

---

26. Low Stock Detection


Low Stock Detection ប្រើសម្រាប់រក Spare Parts ដែលជិតអស់។


Stock Updated → Compare Current Quantity with Minimum Stock → Quantity ≤ Minimum? → Mark Low Stock → Alert → Add to Low Stock Report



1. Parts Stock Update។
2. Compare Current Quantity និង Minimum Stock។
3. បើ Quantity ទាបជាង ឬស្មើ Minimum។
4. Mark Low Stock។
5. Notify Manager/Store Staff។
6. Add to Low Stock Report។

---

27. Estimate / Quotation


Estimate / Quotation ជាឯកសារប៉ាន់ស្មានតម្លៃ Service និង Repair មុនចាប់ផ្តើមការងារ។


Diagnosis → Recommended Services → Add Labor Cost → Add Service Cost → Add Parts Cost → Discount/Tax → Calculate Estimate → Generate Quotation → Send to Customer



1. Diagnosis Completed។
2. Determine Services Required។
3. Add Labor Cost។
4. Add Service Cost។
5. Add Spare Parts Cost។
6. Apply Discount/Tax។
7. Calculate Estimated Total។
8. Generate Quotation។
9. Send/Show Customer។

---

28. Customer Approval Prototype


Customer Approval ប្រើសម្រាប់ឱ្យ Customer អនុម័ត ឬបដិសេធ Estimate មុន Repair ចាប់ផ្តើម។


Quotation Created → Customer Reviews → Approve / Reject → Record Decision → Approved? → Start Repair / Revise or Cancel



1. Generate Quotation។
2. Customer Review Services និង Cost។
3. Select Approve ឬ Reject។
4. Record Decision Date/Note។
5. បើ Approve → Repairing។
6. បើ Reject → Revise Estimate ឬ Cancel។

---

29. Cost Calculation


Cost Calculation ប្រើសម្រាប់គណនាតម្លៃសរុបរបស់ Repair Job។


Labor Cost → Service Cost → Parts Cost → Calculate Subtotal → Apply Discount → Add Tax → Calculate Grand Total → Validate



1. Sum Labor Cost។
2. Sum Service Cost។
3. Sum Spare Parts Cost។
4. Calculate Subtotal។
5. Subtract Discount។
6. Add Tax។
7. Calculate Grand Total។
8. Validate Cost មុន Invoice។

Formula៖
`Subtotal = Labor Cost + Service Cost + Spare Parts Cost`

`Grand Total = Subtotal − Discount + Tax`

---

30. Invoice Management


Invoice Management ប្រើសម្រាប់បង្កើតវិក្កយបត្របន្ទាប់ពី Service ឬ Repair បានបញ្ចប់។


Repair Job Completed → Generate Invoice → Load Services → Load Parts → Labor Cost → Calculate Total → Set Invoice Status → Save → Send to Customer



1. Repair Job ជិត Completed។
2. Generate Invoice។
3. Load Service Items។
4. Load Parts Items។
5. Load Labor Cost។
6. Calculate Subtotal/Grand Total។
7. Set Status = Unpaid។
8. Save Invoice។
9. Show Customer។

---

31. Payment Management


Payment Management ប្រើសម្រាប់កត់ត្រាការបង់ប្រាក់របស់ Customer លើ Invoice។


Select Invoice → Load Grand Total/Remaining Balance → Enter Payment Amount → Select Method → Reference → Validate → Confirm → Update Invoice Balance/Status



1. Select Invoice។
2. Load Remaining Balance។
3. Enter Payment Amount។
4. Select Cash, Bank, Card ឬ QR។
5. Enter Reference Number។
6. Validate Amount។
7. Confirm Payment។
8. Update Total Paid។
9. Update Invoice Status = Partially Paid/Paid។

Formula៖
`Remaining Balance = Grand Total − Total Paid`

---

32. Payment Receipt


Payment Receipt ជាឯកសារបញ្ជាក់ថា Customer បានបង់ប្រាក់។


Payment Confirmed → Generate Receipt Number → Load Invoice/Customer/Vehicle → Payment Amount/Method → Generate Receipt → Print/Export



1. Payment Success។
2. Generate Receipt Number។
3. Load Invoice Number។
4. Load Customer និង Vehicle។
5. Load Amount និង Method។
6. Generate Receipt។
7. Print ឬ Export។

---

33. Vehicle Checkout


Vehicle Checkout ជាដំណើរការប្រគល់ Vehicle ទៅ Customer បន្ទាប់ពី Repair, Quality Check និង Payment Workflow បានបញ្ចប់តាម Rule។


Repair Completed → Final Inspection → Quality Check Passed → Ready for Pickup → Customer Arrives → Verify Payment → Checkout → Record Pickup Date/Time



1. Repair Completed។
2. Final Inspection។
3. Quality Check Passed។
4. Status = Ready for Pickup។
5. Notify Customer។
6. Customer មកទទួល Vehicle។
7. Verify Invoice/Payment។
8. Confirm Checkout។
9. Record Pickup Date/Time។

---

34. Service History


Service History រក្សាប្រវត្តិ Service និង Repair ដែល Vehicle បានធ្វើនៅ Garage។


Repair Job Completed → Collect Service Data → Parts Used → Mechanic → Mileage → Cost → Completion Date → Save to Vehicle Service History



1. Repair Job Completed។
2. Collect Service Items។
3. Collect Parts Used។
4. Record Mechanic។
5. Record Mileage។
6. Record Total Cost។
7. Record Completion Date។
8. Save in Service History។

---

35. Maintenance Reminder


Maintenance Reminder ប្រើសម្រាប់រំលឹក Customer ពេល Vehicle ជិតដល់ពេល Maintenance បន្ទាប់។


Service Completed → Set Next Service Date/Mileage → Monitor Current Date/Mileage → Due Soon? → Generate Reminder → Notify Customer



1. Service Completed។
2. Set Next Maintenance Date។
3. អាច Set Next Mileage។
4. System Monitor។
5. Compare Current Date/Mileage។
6. បើជិតដល់ពេល → Generate Reminder។
7. Notify Customer។

---

36. Notification Management


Notification Management ប្រើសម្រាប់ជូនដំណឹងអំពី Booking, Repair Status, Invoice, Payment និង Maintenance។


System Event → Check Notification Rule → Select Recipient → Generate Message → Send Notification → Save Status → User Reads



1. មាន Event ដូចជា Booking Confirmed។
2. Check Notification Rule។
3. Select Customer/Staff។
4. Generate Message។
5. Send Notification។
6. Save Delivery/Read Status។
7. User មើល Notification។

---

37. KPI & Dashboard


KPI & Dashboard ប្រើសម្រាប់វាស់ប្រសិទ្ធភាព Garage Operations។


Collect Garage Data → Count Bookings → Active Repairs → Completed Services → Pending Payments → Calculate Revenue → Average Repair Time → Customer Return Rate → Display KPI



1. Collect Booking Data។
2. Count Active Repair Jobs។
3. Count Completed Services។
4. Count Pending Payments។
5. Calculate Revenue។
6. Calculate Average Repair Time។
7. Calculate Customer Return Rate។
8. Display KPI/Charts។

Formula គំរូ៖
`Average Repair Time = Total Repair Duration ÷ Number of Completed Repair Jobs`

`Customer Return Rate = Returning Customers ÷ Total Customers × 100`

---

38. Reports


Reports ប្រើសម្រាប់បង្កើតរបាយការណ៍អំពី Booking, Repair, Parts, Invoice, Payment, Revenue និង Service History។


Reports → Select Report Type → Set Date Range → Apply Filters → Load Data → Calculate Summary → Generate Report → View → Export PDF/Excel



1. Open Reports។
2. Select Booking, Repair, Parts, Invoice, Payment ឬ Revenue Report។
3. Set Date Range។
4. Apply Filters។
5. Load Data។
6. Calculate Summary។
7. Generate Report។
8. View។
9. Export PDF/Excel។

---

39. Validation & Error Handling


Validation ប្រើសម្រាប់ធានាថា Data និង Workflow ត្រឹមត្រូវ ខណៈ Error Handling ប្រើសម្រាប់គ្រប់គ្រងបញ្ហា។


User Input/Action → Required Validation → Duplicate Check → Date Validation → Stock Validation → Cost/Payment Validation → Business Rule Check → Save / Show Error → Retry



1. Check Required Fields។
2. Check Duplicate Vehicle។
3. Validate Booking Date/Time។
4. Validate Spare Parts Quantity។
5. Validate Cost និង Payment។
6. Check Repair Status Workflow។
7. បើ Valid → Save។
8. បើ Invalid → Show Error។
9. User Corrects និង Retry។

---

40. State Management


State Management ធានាថា Data នៅ Screen ផ្សេងៗ Update ស្របគ្នា។


User Action → Business Logic → Update Data → Update State → Refresh Related Modules → Dashboard/Reports Update



ឧទាហរណ៍ Parts Usage 2 Units → Parts Stock ថយ 2 → Repair Cost កើន → Low Stock Status អាច Update → Dashboard Low Stock Count Update → Reports Update។

---

41. CRUD Implementation


CRUD ជាប្រតិបត្តិការមូលដ្ឋាន Create, Read, Update និង Delete សម្រាប់គ្រប់គ្រង Data។


List → Create → Validate → Save → Read/View → Edit → Update → Delete/Disable → Confirm → Refresh



1. បើក List។
2. Create Data។
3. Validate។
4. Save។
5. View Detail។
6. Edit។
7. Update។
8. Delete ឬ Disable។
9. Confirm។
10. Refresh List។

---

42. Functional Testing


Functional Testing ជាការសាកល្បង Function នីមួយៗថាដំណើរការត្រឹមត្រូវតាម Requirement។


Requirement → Test Case → Test Data → Execute → Expected Result → Actual Result → Pass/Fail → Fix → Retest



1. Select Requirement។
2. Create Test Case។
3. Prepare Test Data។
4. Execute Function។
5. Define Expected Result។
6. Compare Actual Result។
7. Pass/Fail។
8. Fix Error។
9. Retest។

Functions គួរ Test៖ Customer, Vehicle, Booking, Check-in, Diagnosis, Repair Job, Parts Usage, Cost, Invoice និង Payment។

---

43. End-to-End Testing


End-to-End Testing ជាការសាកល្បង Garage Workflow ទាំងមូលពី Customer Registration រហូតដល់ Vehicle Checkout។


Login → Register Customer → Add Vehicle → Create Booking → Check-in → Initial Inspection → Diagnosis → Create Repair Job → Assign Mechanic → Use Spare Parts → Update Repair Progress → Quality Check → Invoice → Payment → Checkout → Service History



1. Login។
2. Register Customer។
3. Add Vehicle។
4. Create Booking។
5. Check-in Vehicle។
6. Perform Inspection។
7. Diagnose Problem។
8. Create Repair Job។
9. Assign Mechanic។
10. Use Spare Parts។
11. Update Repair Progress។
12. Quality Check។
13. Generate Invoice។
14. Record Payment។
15. Vehicle Checkout។
16. Update Service History។

---

44. Project Documentation


Project Documentation ជាឯកសារពេញលេញដែលពិពណ៌នា Garage System ចាប់ពី Problem Statement រហូតដល់ Testing។


Problem Statement → Objectives → Scope → Requirements → User Roles → Functional Requirements → Garage Workflow → Repair Workflow → UI/UX → Data Model → Architecture → Business Logic → Calculation Logic → Testing → Final Document



1. រៀប Problem Statement។
2. កំណត់ Objectives។
3. កំណត់ Scope។
4. រៀប Requirements។
5. កំណត់ User Roles។
6. Functional Requirements។
7. Design Garage Workflow។
8. Design Repair Workflow។
9. UI/UX Design។
10. Data Model។
11. Application Architecture។
12. Business Logic។
13. Cost Calculation Logic។
14. Test Cases។
15. Final Documentation។

---

45. Final Presentation


Final Presentation ជាការបង្ហាញ Project ទាំងមូលដល់គ្រូ ឬគណៈកម្មការ។


Introduction → Problem Statement → Objectives → Scope → User Roles → Garage Workflow → Repair Workflow → Spare Parts Logic → Cost Calculation → UI/UX → Data Model → Architecture → Testing → Results → Conclusion → Q&A



1. Introduction។
2. Problem Statement។
3. Objectives។
4. Scope។
5. User Roles។
6. Garage Workflow។
7. Repair Workflow។
8. Spare Parts Logic។
9. Cost Calculation។
10. UI/UX។
11. Data Model។
12. Architecture។
13. Testing។
14. Results។
15. Conclusion។
16. Q&A។

---

46. Live Demo


Live Demo ជាការបង្ហាញ Car Garage Management System ដំណើរការជាក់ស្តែងពីដើមដល់ចប់។


Login → Dashboard → Register Customer → Add Vehicle → Create Booking → Confirm Booking → Vehicle Check-in → Initial Inspection → Create Repair Job → Diagnosis → Generate Estimate → Customer Approval → Assign Mechanic → Use Spare Parts → Update Repair Status → Quality Check → Generate Invoice → Record Payment → Payment Receipt → Ready for Pickup → Vehicle Checkout → Service History → Maintenance Reminder → Reports → KPI Dashboard → Logout



1. Login – បង្ហាញ Authentication។
2. Dashboard – បង្ហាញ Garage Statistics។
3. Register Customer – បង្កើត Customer។
4. Add Vehicle – ភ្ជាប់ Vehicle ទៅ Customer។
5. Create Booking – កក់ Service។
6. Confirm Booking – បញ្ជាក់ Date/Time។
7. Vehicle Check-in – កត់ Vehicle មកដល់។
8. Initial Inspection – ពិនិត្យស្ថានភាពដំបូង។
9. Create Repair Job – បង្កើត Work Order។
10. Diagnosis – កំណត់បញ្ហា និង Root Cause។
11. Generate Estimate – ប៉ាន់ស្មាន Cost។
12. Customer Approval – Customer Approve Repair។
13. Assign Mechanic – ចែក Repair Job ទៅ Mechanic។
14. Use Spare Parts – Record Parts Usage និង Deduct Stock។
15. Update Repair Status – Diagnosing → Repairing → Quality Check។
16. Quality Check – ពិនិត្យការជួសជុល។
17. Generate Invoice – គណនា Cost និង Generate Invoice។
18. Record Payment – កត់ Payment។
19. Payment Receipt – Generate Receipt។
20. Ready for Pickup – Notify Customer។
21. Vehicle Checkout – ប្រគល់ Vehicle។
22. Service History – Save Repair Record។
23. Maintenance Reminder – Set Next Service។
24. Reports – Generate Garage Reports។
25. KPI Dashboard – បង្ហាញ Revenue, Repairs និង Bookings។
26. Logout – បញ្ចប់ Demo។


