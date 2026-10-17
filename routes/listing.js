const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {
  isLoggedIn,
  isVerified,
  isOwner,
  validateListing,
} = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const { upload } = require("../cloudConfig.js");

// Search
router.get(
  "/search",
  wrapAsync(async (req, res) => {
    const rawQuery = (req.query.q || "").trim();

    if (!rawQuery) {
      return res.redirect("/listings");
    }

    const cappedQuery = rawQuery.slice(0, 50);
    const safeRegex = cappedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const listings = await Listing.find({
      $or: [
        { title: { $regex: safeRegex, $options: "i" } },
        { location: { $regex: safeRegex, $options: "i" } },
        { country: { $regex: safeRegex, $options: "i" } },
      ],
    });

    res.render("listings/index.ejs", { listings, searchQuery: cappedQuery });
  })
);

// New Listing Form
router.get(
  "/new",
  isLoggedIn,
  isVerified,
  listingController.renderNewForm
);

// Index & Create
router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    isVerified,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// Edit Form
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

// Show, Update, Delete
router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.destroyListing)
  );

module.exports = router;
