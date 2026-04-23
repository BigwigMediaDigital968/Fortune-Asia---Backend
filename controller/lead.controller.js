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
exports.assignLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!isValidId(id) || !isValidId(userId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        assignedTo: userId,
        status: "assigned",
      },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Assign Lead Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign lead",
    });
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
