const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

/* =========================
   🔍 SEARCH ROUTE (SABSE UPAR) dddd
   ========================= */
router.get("/search", wrapAsync(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.redirect("/listings");
  }

  const listings = await Listing.find({
    $or: [
      { title: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { country: { $regex: q, $options: "i" } },
    ],
  });

  res.render("listings/index.ejs", { listings });
}));

/* =========================
   📃 INDEX + CREATE
   ========================= */
router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

/* =========================
   ➕ NEW LISTING FORM
   ========================= */
router.get("/new", isLoggedIn, listingController.renderNewForm);

/* =========================
   ✏️ EDIT FORM
   ========================= */
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

/* =========================
   📌 SHOW / UPDATE / DELETE
   (DYNAMIC ROUTE — HAMESHA LAST)
   ========================= */
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
