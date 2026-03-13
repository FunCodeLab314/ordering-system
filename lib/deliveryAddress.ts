export type DeliveryAddressSource = "map" | "manual";

export interface DeliveryAddressData {
  address: string;
  lat: number | null;
  lng: number | null;
  source: DeliveryAddressSource;
  regionCode: string | null;
  regionName: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  cityMunicipalityCode: string | null;
  cityMunicipalityName: string | null;
  barangayCode: string | null;
  barangayName: string | null;
  streetAddress: string | null;
  landmark: string | null;
  completeAddress: string | null;
}

export interface SavedDeliveryAddressEntry {
  id: string;
  data: DeliveryAddressData;
}

type DeliveryAddressInput = Omit<Partial<DeliveryAddressData>, "address" | "completeAddress"> & {
  address?: string | null;
  completeAddress?: string | null;
};

export const DEFAULT_CART_ADDRESS = "Tap to set location map";
export const DEFAULT_SAVED_PLACE = "Pin a location to save your place.";
export const SAVED_PLACE_DATA_KEY_PREFIX = "saved_place_data_";
export const SAVED_PLACE_LIST_KEY_PREFIX = "saved_place_list_";

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildCompleteAddress(input: {
  streetAddress?: string | null;
  barangayName?: string | null;
  cityMunicipalityName?: string | null;
  provinceName?: string | null;
  landmark?: string | null;
}) {
  const parts = [
    normalizeString(input.streetAddress),
    normalizeString(input.barangayName),
    normalizeString(input.cityMunicipalityName),
    normalizeString(input.provinceName),
  ].filter((value): value is string => Boolean(value));

  const landmark = normalizeString(input.landmark);
  if (landmark) {
    parts.push(`Landmark: ${landmark}`);
  }

  return parts.join(", ");
}

export function createDeliveryAddressData(input?: DeliveryAddressInput | null): DeliveryAddressData {
  const streetAddress = normalizeString(input?.streetAddress);
  const barangayName = normalizeString(input?.barangayName);
  const cityMunicipalityName = normalizeString(input?.cityMunicipalityName);
  const provinceName = normalizeString(input?.provinceName);
  const landmark = normalizeString(input?.landmark);
  const computedCompleteAddress =
    normalizeString(input?.completeAddress) ??
    buildCompleteAddress({
      streetAddress,
      barangayName,
      cityMunicipalityName,
      provinceName,
      landmark,
    }) ??
    "";

  const resolvedAddress = normalizeString(input?.address) ?? computedCompleteAddress;

  return {
    address: resolvedAddress ?? "",
    lat: normalizeNumber(input?.lat),
    lng: normalizeNumber(input?.lng),
    source: input?.source === "manual" ? "manual" : "map",
    regionCode: normalizeString(input?.regionCode),
    regionName: normalizeString(input?.regionName),
    provinceCode: normalizeString(input?.provinceCode),
    provinceName,
    cityMunicipalityCode: normalizeString(input?.cityMunicipalityCode),
    cityMunicipalityName,
    barangayCode: normalizeString(input?.barangayCode),
    barangayName,
    streetAddress,
    landmark,
    completeAddress: computedCompleteAddress || null,
  };
}

export function parseStoredDeliveryAddress(
  serialized: string | null,
  legacyAddress: string | null,
  fallbackText: string
) {
  const legacyTrimmed = normalizeString(legacyAddress);

  if (serialized) {
    try {
      const parsed = JSON.parse(serialized) as DeliveryAddressInput;
      const normalized = createDeliveryAddressData(parsed);

      if (normalized.address) {
        return normalized;
      }
    } catch {
      // Ignore malformed legacy data and fall back below.
    }
  }

  if (!legacyTrimmed || legacyTrimmed === fallbackText) {
    return null;
  }

  return createDeliveryAddressData({
    address: legacyTrimmed,
    completeAddress: legacyTrimmed,
    source: "map",
  });
}

export function hasSavedDeliveryAddress(addressData: DeliveryAddressData | null, fallbackText: string) {
  return Boolean(addressData?.address.trim() && addressData.address.trim() !== fallbackText);
}

export function createSavedDeliveryAddressEntry(
  addressData: DeliveryAddressData,
  id?: string | null
): SavedDeliveryAddressEntry {
  return {
    id:
      normalizeString(id) ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    data: createDeliveryAddressData(addressData),
  };
}

export function parseStoredDeliveryAddressList(
  serialized: string | null,
  fallbackEntry: DeliveryAddressData | null,
  fallbackText: string
) {
  if (serialized) {
    try {
      const parsed = JSON.parse(serialized) as Array<{ id?: string | null; data?: DeliveryAddressInput | null }>;
      const normalized = parsed
        .map((entry) => {
          const data = createDeliveryAddressData(entry?.data);
          if (!hasSavedDeliveryAddress(data, fallbackText)) {
            return null;
          }

          return createSavedDeliveryAddressEntry(data, entry?.id);
        })
        .filter((entry): entry is SavedDeliveryAddressEntry => Boolean(entry));

      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      // Ignore malformed list storage and fall back below.
    }
  }

  if (!hasSavedDeliveryAddress(fallbackEntry, fallbackText)) {
    return [];
  }

  return fallbackEntry ? [createSavedDeliveryAddressEntry(fallbackEntry)] : [];
}
