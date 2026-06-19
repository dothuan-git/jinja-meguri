"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, MapPin, X } from "lucide-react";
import { useShrineEdit } from "@/components/shrineEdit/context";
import type { Coordinates } from "@/lib/types";

export default function LocationEditPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const edit = useShrineEdit();
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // Seed local state from the draft whenever the popup opens.
  useEffect(() => {
    if (!open || !edit) return;
    setAddress((edit.getValue("address") as string | null) ?? "");
    const coords = edit.getValue("coordinates") as Coordinates | null;
    setLat(coords?.lat != null ? String(coords.lat) : "");
    setLng(coords?.lng != null ? String(coords.lng) : "");
  }, [open, edit]);

  if (!edit) return null;

  function handleApply() {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const valid = !isNaN(latNum) && !isNaN(lngNum);
    edit!.setValue("address", address.trim() || null);
    edit!.setValue("coordinates", valid ? { lat: latNum, lng: lngNum } : null);
    onClose();
  }

  const coordsPartial = (lat || lng) && (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)));

  const inputBase =
    "w-full rounded-sm border border-dashed border-torii/30 bg-torii/[0.04] px-2 py-1.5 text-xs font-mono text-stone/80 outline-none placeholder:text-stone/30 focus:border-torii transition-colors";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute top-2 right-2 z-20 w-72 rounded-xl border border-torii/20 bg-sand/97 backdrop-blur-md shadow-lg p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-torii select-none">
              <MapPin size={11} />
              Location Data
            </span>
            <button
              type="button"
              aria-label="Close location editor"
              onClick={onClose}
              className="rounded-full p-0.5 text-stone/40 hover:text-stone transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full street address…"
              aria-label="Address"
              className={inputBase}
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="35.0000"
                aria-label="Latitude"
                className={inputBase}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-moss/50 select-none">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="135.0000"
                aria-label="Longitude"
                className={inputBase}
              />
            </div>
          </div>

          {coordsPartial && (
            <p className="text-[9px] font-mono text-red-500/80 select-none">
              Both lat and lng must be valid numbers, or leave both empty.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-moss/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-stone/60 hover:border-stone/40 hover:text-stone transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={Boolean(coordsPartial)}
              className="flex items-center gap-1 rounded-full bg-torii px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white hover:bg-torii-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={11} />
              Apply
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
