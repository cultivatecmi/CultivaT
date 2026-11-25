"use client";

import { useEffect, useRef } from "react";
import { onTourEvent, type TourEvent } from "@/lib/tour";

/** Escucha una orden del tour (p. ej. "aphid") y ejecuta el handler más reciente */
export function useTourEvent(type: TourEvent, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onTourEvent(type, () => ref.current()), [type]);
}
