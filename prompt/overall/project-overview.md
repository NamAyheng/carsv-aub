# 1. Project Overview

**CarSV** is a web-based digital platform developed to improve the management of daily operations in an automotive repair garage. The system is designed to replace traditional paper-based records and spreadsheets with a centralized database, allowing users to organize, record, monitor, and manage garage activities more efficiently, accurately, and securely.

A modern garage handles numerous daily operations, including customer and vehicle management, appointment scheduling, repair and maintenance services, task assignment, technician management, inventory control, billing, and payment processing. Managing these activities manually often results in misplaced records, data duplication, communication issues, delayed services, and reduced productivity.

To address these challenges, the system provides a centralized management platform where **Admin, Manager, Staff, and Technician** can collaborate according to their assigned roles and permissions. Each user has different access rights to ensure data security and proper system administration through role-based access control.

The system enables managers to monitor daily operations through an interactive dashboard, assign and track repair tasks, and evaluate technician performance. Staff can efficiently manage customer information, vehicle records, appointments, and service requests, while technicians can view, update, and complete assigned repair tasks. In addition, the system maintains complete repair histories, service records, payment information, and related documents, allowing garage staff to retrieve historical data quickly and provide better customer service in the future.

---

# 1.1 Problem Statement

Many automotive repair garages still rely on manual record-keeping using paper documents, notebooks, or Microsoft Excel spreadsheets. As the number of customers, vehicles, and repair jobs continues to grow, this traditional approach becomes increasingly inefficient and prone to errors. Manual management often leads to data loss, duplicate records, communication problems, scheduling conflicts, delayed repairs, and difficulties in tracking overall garage operations.

The main problems can be categorized into the following areas:

## 1. Customer & Vehicle Management

- Customer information is manually recorded, increasing the risk of data entry errors and lost records.
- Vehicle information such as brand, model, license plate, manufacturing year, mileage, and ownership is difficult to manage accurately.
- Repair and maintenance histories are scattered across paper documents or spreadsheets, making them difficult to retrieve.
- Appointment scheduling may result in conflicts, missed appointments, or poor maintenance planning.
- Vehicle inspection records before and after repairs are often incomplete or inconsistent.

## 2. Task & Technician Management

- Repair tasks are manually recorded, making it difficult to organize and retrieve task information.
- Task assignment is usually communicated verbally, leading to misunderstandings and unclear responsibilities.
- There is no standardized priority management, causing urgent repairs to be delayed.
- Managers have difficulty monitoring task progress throughout the repair workflow (Pending → Assigned → In Progress → Completed).
- Technician workloads and performance cannot be effectively monitored, resulting in unbalanced task distribution.

## 3. Service, Payment, Security & Reporting

- Service records and spare parts usage are manually documented, increasing the possibility of missing or inaccurate information.
- Manual calculation of service costs and invoices may produce billing errors and incomplete payment records.
- Historical information such as repair records, task history, and payment history is difficult to store and retrieve.
- Searching and filtering data becomes inefficient as the database grows.
- Without proper authentication and role-based access control, unauthorized users may gain access to sensitive information or modify system configurations.

---

# 1.2 Objectives

The primary objective of **CarSV** is to develop a web-based application that enhances the efficiency of daily garage operations by reducing manual work, improving data accuracy, strengthening communication among staff, and providing better management of repair services.

The system aims to achieve the following objectives:

## 1. User, Customer & Vehicle Management

- Develop a secure login system with role-based access control for **Admin, Manager, Staff, and Technician**.
- Provide complete customer and vehicle management, including creating, updating, deleting, and viewing records.
- Record vehicle inspection results before and after repairs while maintaining complete customer and vehicle histories.
- Implement search, filtering, and activity log features for efficient data management.

## 2. Appointment, Service & Repair Management

- Manage customer appointments and garage service requests efficiently.
- Create repair estimates and work orders containing vehicle information, reported issues, required services, and assigned tasks.
- Assign repair tasks to technicians and monitor repair progress through each workflow stage (**Pending → Assigned → In Progress → Completed**).
- Maintain repair history records and provide notifications for appointments and task status updates.

## 3. Inventory, Billing & Financial Management

- Manage spare parts inventory, stock quantities, pricing, and inventory usage with low-stock notifications.
- Maintain supplier information and purchase records for spare parts procurement.
- Generate invoices, calculate repair costs, and record customer payments accurately.
- Monitor the garage's financial performance, including revenue, expenses, and inventory costs.

## 4. Security, Monitoring & Reporting

- Implement secure authentication, authorization, user access control, data backup, and recovery mechanisms.
- Support CCTV repair monitoring with controlled customer access to monitor repair progress remotely.
- Provide dashboards and analytical reports for appointments, completed repairs, inventory status, and financial performance.
- Store customer feedback, repair documents, and related images for future reference and service improvement.
