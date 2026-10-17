if (
  typeof mapboxgl !== "undefined" &&
  mapToken &&
  Array.isArray(listing?.geometry?.coordinates) &&
  listing.geometry.coordinates.length === 2
) {
  mapboxgl.accessToken = mapToken;

  const coordinates = listing.geometry.coordinates;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: coordinates,
    zoom: 9,
  });

  // Add zoom and rotation controls
  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  // Handle window resizing and orientation change smoothly
  window.addEventListener("resize", () => {
    map.resize();
  });

  const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
    `<h6 class="fw-bold mb-1">${listing.title || "Listing Location"}</h6><p class="mb-0 text-muted small">Exact location provided after booking.</p>`
  );

  new mapboxgl.Marker({ color: "#fe424d" })
    .setLngLat(coordinates)
    .setPopup(popup)
    .addTo(map);
}
