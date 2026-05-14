const {
  appendLeadToEmployeeSheet,
} = require("../services/sheetsService.js");
const mongoose = require("mongoose");
const Employee = require("../models/Employee.model");
const Lead = require("../models/lead.model");

// Utility
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* --------------------------------------------------
   CREATE LEAD
---------------------------------------------------*/
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, purpose, message, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      purpose,
      message,
      source,
    });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create lead",
    });
  }
};

/* --------------------------------------------------
   GET ALL LEADS
---------------------------------------------------*/
exports.getLeads = async (req, res) => {
  try {
    const { status, source } = req.query;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const query = {};
    if (status) query.status = status;
    if (source) query.source = source;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Lead.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: leads,
    });
  } catch (error) {
    console.error("Get Leads Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

/* --------------------------------------------------
   GET SINGLE LEAD
---------------------------------------------------*/
exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const lead = await Lead.findById(id).populate("assignedTo", "name email");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
    });
  }
};

/* --------------------------------------------------
   UPDATE STATUS
---------------------------------------------------*/
exports.updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};


/* --------------------------------------------------
   ASSIGN LEAD
---------------------------------------------------*/



function formatIndianDate(date) {
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, '0');

  return `${day}/${month}/${year} ${hh}:${mins} ${ampm}`;
}

const prepareLeadRow = (lead) => [
  formatIndianDate(lead.createdAt),             // from timestamps: true
  formatIndianDate(lead.assignedAt || new Date()),
  lead.name || '',
  lead.phone || '',
  lead.email || '',
  lead.city || '',
  lead.purpose || '',
  lead.adminNote || '',
  lead.source || 'website',
];

// export const assignLead = async (req, res) => {
//     try {
//         const { employeeId } = req.body;
//         const { id } = req.params;

//         if (!employeeId || !id) {
//             return res.status(400).json({ success: false, message: "Employee ID and Lead ID are required" });
//         }

//         validateObjectId(id);
//         validateObjectId(employeeId);

//         const employee = await Employee.findById(employeeId);
//         if (!employee || !employee.isActive) {
//             return res.status(404).json({ success: false, message: "Employee not found or inactive" });
//         }

//         // ✅ Fetch lead BEFORE using it
//         const lead = await Lead.findById(id).populate("assignedTo", "name email phone");
//         if (!lead) {
//             return res.status(404).json({ success: false, message: "Lead not found" });
//         }

//         const rowData = prepareLeadRow(lead);

//         lead.assignedTo  = employeeId;
//         lead.assignedAt  = new Date();
//         lead.status      = "assigned";
//         lead.sheetSynced = true;

//         // employee.sheetId stores the full URL — already handled by getSheetIdFromUrl
//         await appendLeadToEmployeeSheet(employee.sheetId, rowData);

//         await lead.save();

//         return res.json({ success: true, message: "Lead assigned successfully", data: lead });

//     } catch (error) {
//         console.error("Assign Lead Error:", error);
//         if (error.message === "Invalid ID format") {
//             return res.status(400).json({ success: false, message: error.message });
//         }
//         res.status(500).json({ success: false, message: "Assignment failed" });
//     }
// };


exports.assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!isValidId(id) || !isValidId(employeeId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee || !employee.isActive) {
      return res.status(404).json({ success: false, message: "Employee not found or inactive" });
    }

    // ✅ Fetch lead BEFORE using it
    const lead = await Lead.findById(id).populate("assignedTo", "name email phone");
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const rowData = prepareLeadRow(lead);

    lead.assignedTo = employeeId;
    lead.assignedAt = new Date();
    lead.status = "assigned";
    lead.sheetSynced = true;

    // employee.sheetId stores the full URL — already handled by getSheetIdFromUrl
    console.log("here")
    await appendLeadToEmployeeSheet(employee.sheetId, rowData);
    console.log("here2")

    await lead.save();

    return res.status(200).json({ success: true, message: "Lead assigned successfully", data: lead });
  } catch (error) {
    console.log("here3")
    console.log(error.message)

    console.error("Assign Lead Error:", error);
    if (error.message === "Invalid ID format") {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error && error.code == 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Assignment failed" });
  }
};

/* --------------------------------------------------
   ADD NOTE
---------------------------------------------------*/
exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!text || text.trim().length < 2) {
      return res.status(400).json({ message: "Note text is required" });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead.notes = {
      text,
      addedBy: req.user?._id || null,
    };

    await lead.save();

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Add Note Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
};

/* --------------------------------------------------
   DELETE LEAD
---------------------------------------------------*/
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lead",
    });
  }
};
