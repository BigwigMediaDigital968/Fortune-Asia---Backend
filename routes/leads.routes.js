const express = require("express");
const router = express.Router();

const leadController = require("../controller/lead.controller");

/* --------------------------------------------------
   LEAD ROUTES
---------------------------------------------------*/

// Create Lead (Public - from website form)
router.post("/", leadController.createLead);

// Get All Leads (Admin)
router.get("/", leadController.getLeads);

// Get Single Lead
router.get("/:id", leadController.getLeadById);

// Update Lead Status
router.patch("/:id/status", leadController.updateLeadStatus);

// Assign Lead to User
router.patch("/:id/assign", leadController.assignLead);

// Add Note to Lead
router.patch("/:id/notes", leadController.addNote);

// Delete Lead
router.delete("/:id", leadController.deleteLead);

module.exports = router;
