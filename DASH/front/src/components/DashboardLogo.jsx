import React, { useState, useEffect } from "react";

export default function DashboardLogo({ className = "" }) {
  const [siteName, setSiteName] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("admin_site_name")) || "Thenith"
  );

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setSiteName(e.detail);
      }
    };
    window.addEventListener("site-name-updated", handleUpdate);
    return () => window.removeEventListener("site-name-updated", handleUpdate);
  }, []);

  return (
    <span className={`font-bold text-xl tracking-tight ${className}`}>
      {siteName}
    </span>
  );
}
