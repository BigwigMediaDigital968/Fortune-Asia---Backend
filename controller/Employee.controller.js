const mongoose = require("mongoose");
const Employee = require("../models/Employee.model");

// --------------------
// Helpers
// --------------------
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid ID format");
    error.statusCode = 400;
    throw error;
  }
};

const sanitizeString = (str) => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, "");
};

// --------------------
// CREATE EMPLOYEE
// --------------------
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, phone, sheetId } = req.body;

    if (!name || !email || !sheetId) {
      return res.status(400).json({
        success: false,
        message: "Name, email and sheetId are required",
      });
    }

    const normalizedEmail = sanitizeString(email).toLowerCase();
    const normalizedSheetId = sanitizeString(sheetId);

    const [existingEmail, existingSheet] = await Promise.all([
      Employee.findOne({ email: normalizedEmail }),
      Employee.findOne({ sheetId: normalizedSheetId }),
    ]);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Employee with this email already exists",
      });
    }

    if (existingSheet) {
      return res.status(409).json({
        success: false,
        message: "Sheet ID already in use",
      });
    }

    const employee = await Employee.create({
      name: sanitizeString(name),
      email: normalizedEmail,
      phone: sanitizeString(phone),
      sheetId: normalizedSheetId,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Create Employee Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate field value",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
};

// --------------------
// GET ALL EMPLOYEES
// --------------------
exports.getEmployees = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      isActive,
      sort = "desc",
      sortBy = "createdAt",
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));

    const skip = (page - 1) * limit;

    const query = {};

    if (isActive !== undefined && isActive !== "all") {
      query.isActive = isActive === "true";
    }

    if (search) {
      const term = sanitizeString(search);
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { sheetId: { $regex: term, $options: "i" } },
      ];
    }

    const sortOrder = sort === "asc" ? 1 : -1;

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

// --------------------
// GET SINGLE EMPLOYEE
// --------------------
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get Employee Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// UPDATE EMPLOYEE
// --------------------
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, sheetId } = req.body;

    validateObjectId(id);

    const updateData = {};

    if (name) updateData.name = sanitizeString(name);
    if (phone !== undefined) updateData.phone = sanitizeString(phone);

    if (email) {
      const normalizedEmail = sanitizeString(email).toLowerCase();

      const exists = await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }

      updateData.email = normalizedEmail;
    }

    if (sheetId) {
      const exists = await Employee.findOne({
        sheetId,
        _id: { $ne: id },
      });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Sheet ID already in use",
        });
      }

      updateData.sheetId = sanitizeString(sheetId);
    }

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.json({
      success: true,
      message: "Updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

// --------------------
// TOGGLE STATUS
// --------------------
exports.toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    return res.json({
      success: true,
      message: `Employee ${employee.isActive ? "activated" : "deactivated"}`,
      data: employee,
    });
  } catch (error) {
    console.error("Toggle Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// --------------------
// DELETE (SOFT)
// --------------------
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.json({
      success: true,
      message: "Employee deactivated",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

// --------------------
// GET ACTIVE EMPLOYEES
// --------------------
exports.getActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select("name email phone sheetId")
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Active Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};
