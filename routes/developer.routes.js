const express = require("express");

const {
  createDeveloper,
  getAllDevelopers,
  getDeveloperByIdentifier,
  updateDeveloper,
  deleteDeveloper,
} = require("../controller/developerController");

const developerRouter = express.Router();

// Admin
developerRouter.post("/", createDeveloper);
developerRouter.put("/:id", updateDeveloper);
developerRouter.delete("/:id", deleteDeveloper);

// Public
developerRouter.get("/", getAllDevelopers);
developerRouter.get("/:slug", getDeveloperByIdentifier);

module.exports = developerRouter;
