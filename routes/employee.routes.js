const express = require("express");
const router = express.Router();

const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  getActiveEmployees,
} = require("../controller/Employee.controller");

/* --------------------------------------------------
   EMPLOYEE ROUTES
---------------------------------------------------*/

// Create Employee
router.post("/", createEmployee);

// Get All Employees (with filters, pagination)
router.get("/", getEmployees);

// Get Active Employees (for dropdowns, assignment)
router.get("/active", getActiveEmployees);

// Get Single Employee
router.get("/:id", getEmployeeById);

// Update Employee
router.put("/:id", updateEmployee);

// Toggle Active/Inactive
router.patch("/:id/toggle-status", toggleEmployeeStatus);

// Soft Delete (Deactivate)
router.delete("/:id", deleteEmployee);

module.exports = router;
