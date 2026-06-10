import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

interface PlatformInfo {
  isNative: boolean;
  isMobile: boolean;
}

export function usePlatform(): PlatformInfo {
  return { isNative, isMobile: isNative };
}
