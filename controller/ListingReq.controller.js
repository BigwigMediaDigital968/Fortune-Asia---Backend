const mongoose = require("mongoose");
const Listing = require("../models/listing.model");

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid ID format");
    error.statusCode = 400;
    throw error;
  }
};

exports.getListingReqById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const lead = await Listing.findById(id).populate(
      "assignedTo",
      "name email",
    );

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
exports.updateListingReqStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const lead = await Listing.findByIdAndUpdate(
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
exports.assignListingReq = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!isValidId(id) || !isValidId(userId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const lead = await Listing.findByIdAndUpdate(
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

exports.deleteListingReq = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const listing = await Listing.findByIdAndDelete(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing req not found",
      });
    }

    return res.json({
      success: true,
      message: "Listing deleted.",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};
