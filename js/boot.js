// Keep the experience usable when WebGL cannot start on a device.
import("./g3/main3d.js").catch((error) => {
  console.warn(
    "La 3D ne peut pas démarrer, passage à la version 2D.",
    error.message,
  );
  const fallback = new URL("classic.html", location.href);
  fallback.search = location.search;
  fallback.searchParams.set("fallback", "1");
  location.replace(fallback.href);
});
