const express = require("express");
const router = express.Router();
const Opportunity = require("../models/opportunity.model");

// ✅ Create a new opportunity
router.post("/", async (req, res) => {
  try {
    const { title, description, location, type } = req.body;

    const newOpportunity = new Opportunity({
      title,
      description,
      location,
      type,
    });

    const savedOpportunity = await newOpportunity.save();
    res.status(201).json(savedOpportunity);
  } catch (err) {
    console.error("Error creating opportunity:", err);
    res.status(500).json({ error: "Failed to create opportunity" });
  }
});

// ✅ Get all opportunities
router.get("/", async (req, res) => {
  try {
    const opportunities = await Opportunity.find().sort({ postedAt: -1 });
    res.status(200).json(opportunities);
  } catch (err) {
    console.error("Error fetching opportunities:", err);
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

// ✅ Update an opportunity
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, type } = req.body;

    const updatedOpportunity = await Opportunity.findByIdAndUpdate(
      id,
      { title, description, location, type },
      { new: true },
    );

    if (!updatedOpportunity) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    res.status(200).json(updatedOpportunity);
  } catch (err) {
    console.error("Error updating opportunity:", err);
    res.status(500).json({ error: "Failed to update opportunity" });
  }
});

// ✅ Delete an opportunity
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOpportunity = await Opportunity.findByIdAndDelete(id);

    if (!deletedOpportunity) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    res.status(200).json({ message: "Opportunity deleted successfully" });
  } catch (err) {
    console.error("Error deleting opportunity:", err);
    res.status(500).json({ error: "Failed to delete opportunity" });
  }
});

module.exports = router;
