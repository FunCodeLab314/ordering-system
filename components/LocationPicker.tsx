"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { ArrowLeft, Loader2, LocateFixed, MapPin } from "lucide-react";
import {
    buildCompleteAddress,
    createDeliveryAddressData,
    type DeliveryAddressData,
} from "@/lib/deliveryAddress";

interface LocationPickerProps {
    onLocationSelect: (selection: DeliveryAddressData) => void;
    initialValue?: DeliveryAddressData | null;
}

interface ResolvedAddressParts {
    barangay: string;
    city: string;
}

interface LatLng {
    latitude: number;
    longitude: number;
}

interface MapboxContextItem {
    id?: string;
    text?: string;
}

interface MapboxFeature {
    place_type?: string[];
    text?: string;
    place_name?: string;
    context?: MapboxContextItem[];
}

interface MapboxReverseGeocodeResponse {
    features?: MapboxFeature[];
}

interface PsgcRegion {
    code: string;
    name: string;
}

interface PsgcProvince {
    code: string;
    name: string;
}

interface PsgcCityMunicipality {
    code: string;
    name: string;
}

interface PsgcBarangay {
    code: string;
    name: string;
}

interface ManualAddressFormState {
    regionCode: string;
    regionName: string;
    provinceCode: string;
    provinceName: string;
    cityMunicipalityCode: string;
    cityMunicipalityName: string;
    barangayCode: string;
    barangayName: string;
    streetAddress: string;
    landmark: string;
}

type PickerView = "map" | "details" | "manual";

const DEFAULT_LOCATION: LatLng = {
    longitude: 121.0223,
    latitude: 14.5547,
};

const PSGC_BASE_URL = "https://psgc.gitlab.io/api";

function firstNonEmpty(values: Array<string | undefined>): string {
    return values.find((value) => Boolean(value?.trim()))?.trim() ?? "";
}

function findContextText(feature: MapboxFeature, prefixes: string[]): string {
    return (
        feature.context?.find((item) => prefixes.some((prefix) => item.id?.startsWith(prefix)))?.text?.trim() ?? ""
    );
}

function extractAddressParts(features: MapboxFeature[]): ResolvedAddressParts {
    const candidateFeatures = features ?? [];

    const barangay = firstNonEmpty([
        candidateFeatures.find((feature) => feature.place_type?.includes("neighborhood"))?.text,
        candidateFeatures.find((feature) => feature.place_type?.includes("locality"))?.text,
        candidateFeatures.find((feature) => feature.place_type?.includes("district"))?.text,
        ...candidateFeatures.map((feature) => findContextText(feature, ["neighborhood.", "locality.", "district."])),
    ]);

    const city = firstNonEmpty([
        candidateFeatures.find((feature) => feature.place_type?.includes("place"))?.text,
        candidateFeatures.find((feature) => feature.place_type?.includes("locality"))?.text,
        ...candidateFeatures.map((feature) => findContextText(feature, ["place.", "region."])),
    ]);

    return { barangay, city };
}

async function fetchPsgcJson<T>(path: string) {
    const response = await fetch(`${PSGC_BASE_URL}${path}`, {
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("PSGC_REQUEST_FAILED");
    }

    return (await response.json()) as T[];
}

export default function LocationPicker({ onLocationSelect, initialValue = null }: LocationPickerProps) {
    const initialSelection = createDeliveryAddressData(initialValue);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY ?? "";
    const hasMapAvailable = Boolean(mapboxToken);

    const initialCenterRef = useRef<[number, number]>([
        initialSelection.lng ?? DEFAULT_LOCATION.longitude,
        initialSelection.lat ?? DEFAULT_LOCATION.latitude,
    ]);
    const initialZoomRef = useRef(14);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [isMapReady, setIsMapReady] = useState(false);
    const [marker, setMarker] = useState<LatLng>({
        longitude: initialSelection.lng ?? DEFAULT_LOCATION.longitude,
        latitude: initialSelection.lat ?? DEFAULT_LOCATION.latitude,
    });

    const [isMoving, setIsMoving] = useState(false);
    const [view, setView] = useState<PickerView>(
        !hasMapAvailable || initialSelection.source === "manual" ? "manual" : "map"
    );
    const [isLocating, setIsLocating] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [detectedArea, setDetectedArea] = useState(initialSelection.address);
    const [mapFormError, setMapFormError] = useState<string | null>(null);
    const [manualError, setManualError] = useState<string | null>(null);

    const [streetAddress, setStreetAddress] = useState(initialSelection.streetAddress ?? "");
    const [landmark, setLandmark] = useState(initialSelection.landmark ?? "");
    const [barangay, setBarangay] = useState(initialSelection.barangayName ?? "");
    const [city, setCity] = useState(initialSelection.cityMunicipalityName ?? "");

    const [manualAddress, setManualAddress] = useState<ManualAddressFormState>({
        regionCode: initialSelection.regionCode ?? "",
        regionName: initialSelection.regionName ?? "",
        provinceCode: initialSelection.provinceCode ?? "",
        provinceName: initialSelection.provinceName ?? "",
        cityMunicipalityCode: initialSelection.cityMunicipalityCode ?? "",
        cityMunicipalityName: initialSelection.cityMunicipalityName ?? "",
        barangayCode: initialSelection.barangayCode ?? "",
        barangayName: initialSelection.barangayName ?? "",
        streetAddress: initialSelection.streetAddress ?? "",
        landmark: initialSelection.landmark ?? "",
    });
    const [regions, setRegions] = useState<PsgcRegion[]>([]);
    const [provinces, setProvinces] = useState<PsgcProvince[]>([]);
    const [cities, setCities] = useState<PsgcCityMunicipality[]>([]);
    const [barangays, setBarangays] = useState<PsgcBarangay[]>([]);
    const [isLoadingRegions, setIsLoadingRegions] = useState(false);
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
    const [provinceOptional, setProvinceOptional] = useState(false);

    useEffect(() => {
        if (!mapboxToken || !mapContainerRef.current || mapRef.current || view === "manual") return;

        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: initialCenterRef.current,
            zoom: initialZoomRef.current,
            attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
            setIsMapReady(true);
        });

        map.on("movestart", () => {
            setIsMoving(true);
        });

        map.on("moveend", () => {
            const mapCenter = map.getCenter();
            setMarker({ latitude: mapCenter.lat, longitude: mapCenter.lng });
            setIsMoving(false);
        });

        return () => {
            map.remove();
            mapRef.current = null;
            setIsMapReady(false);
        };
    }, [mapboxToken, view]);

    const reverseGeocodeCoordinates = useCallback(
        async (lat: number, lng: number) => {
            if (!mapboxToken) return;

            setIsResolvingAddress(true);
            setLocationError(null);

            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,neighborhood,locality,district,place,region&limit=10`
                );

                if (!response.ok) {
                    throw new Error("GEOCODING_FAILED");
                }

                const data = (await response.json()) as MapboxReverseGeocodeResponse;
                const features = data.features ?? [];
                const resolvedAddress = extractAddressParts(features);

                setBarangay(resolvedAddress.barangay);
                setCity(resolvedAddress.city);
                setDetectedArea(features[0]?.place_name ?? "");

                if (!resolvedAddress.barangay || !resolvedAddress.city) {
                    setLocationError("We could not detect barangay/city from this pin. You can still use Add manually.");
                }
            } catch {
                setLocationError("We could not detect barangay/city from this pin. You can still use Add manually.");
                setDetectedArea("");
            } finally {
                setIsResolvingAddress(false);
            }
        },
        [mapboxToken]
    );

    const locateCurrentPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported in this browser.");
            return;
        }

        setIsLocating(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                setMarker({ latitude, longitude });

                if (mapRef.current) {
                    mapRef.current.easeTo({ center: [longitude, latitude], zoom: Math.max(mapRef.current.getZoom(), 16) });
                }

                void reverseGeocodeCoordinates(latitude, longitude);
                setIsLocating(false);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationError("Location permission denied. You can still tap Add manually.");
                } else {
                    setLocationError("Unable to get your current location.");
                }
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [reverseGeocodeCoordinates]);

    useEffect(() => {
        if (!isMapReady || view !== "map") return;
        void locateCurrentPosition();
    }, [isMapReady, locateCurrentPosition, view]);

    const ensureRegionsLoaded = useCallback(async () => {
        if (regions.length > 0) {
            return regions;
        }

        setIsLoadingRegions(true);
        try {
            const nextRegions = await fetchPsgcJson<PsgcRegion>("/regions.json");
            setRegions(nextRegions);
            return nextRegions;
        } finally {
            setIsLoadingRegions(false);
        }
    }, [regions]);

    const loadProvincesForRegion = useCallback(async (regionCode: string) => {
        setIsLoadingProvinces(true);
        try {
            const nextProvinces = await fetchPsgcJson<PsgcProvince>(`/regions/${regionCode}/provinces.json`);
            setProvinces(nextProvinces);
            return nextProvinces;
        } finally {
            setIsLoadingProvinces(false);
        }
    }, []);

    const loadCitiesForRegion = useCallback(async (regionCode: string) => {
        setIsLoadingCities(true);
        try {
            const nextCities = await fetchPsgcJson<PsgcCityMunicipality>(`/regions/${regionCode}/cities-municipalities.json`);
            setCities(nextCities);
            return nextCities;
        } finally {
            setIsLoadingCities(false);
        }
    }, []);

    const loadCitiesForProvince = useCallback(async (provinceCode: string) => {
        setIsLoadingCities(true);
        try {
            const nextCities = await fetchPsgcJson<PsgcCityMunicipality>(`/provinces/${provinceCode}/cities-municipalities.json`);
            setCities(nextCities);
            return nextCities;
        } finally {
            setIsLoadingCities(false);
        }
    }, []);

    const loadBarangaysForCity = useCallback(async (cityCode: string) => {
        setIsLoadingBarangays(true);
        try {
            const nextBarangays = await fetchPsgcJson<PsgcBarangay>(`/cities-municipalities/${cityCode}/barangays.json`);
            setBarangays(nextBarangays);
            return nextBarangays;
        } finally {
            setIsLoadingBarangays(false);
        }
    }, []);

    useEffect(() => {
        if (view !== "manual") return;

        let active = true;

        const hydrateManualState = async () => {
            try {
                const loadedRegions = await ensureRegionsLoaded();
                if (!active || !manualAddress.regionCode) return;

                const selectedRegion = loadedRegions.find((region) => region.code === manualAddress.regionCode);
                if (selectedRegion) {
                    setManualAddress((current) => ({
                        ...current,
                        regionName: current.regionName || selectedRegion.name,
                    }));
                }

                const nextProvinces = await loadProvincesForRegion(manualAddress.regionCode);
                if (!active) return;

                const noProvinceLevel = nextProvinces.length === 0;
                setProvinceOptional(noProvinceLevel);

                if (noProvinceLevel) {
                    const nextCities = await loadCitiesForRegion(manualAddress.regionCode);
                    if (!active || !manualAddress.cityMunicipalityCode) return;

                    const selectedCity = nextCities.find((item) => item.code === manualAddress.cityMunicipalityCode);
                    if (selectedCity) {
                        setManualAddress((current) => ({
                            ...current,
                            cityMunicipalityName: current.cityMunicipalityName || selectedCity.name,
                        }));
                    }

                    const nextBarangays = await loadBarangaysForCity(manualAddress.cityMunicipalityCode);
                    if (!active || !manualAddress.barangayCode) return;

                    const selectedBarangay = nextBarangays.find((item) => item.code === manualAddress.barangayCode);
                    if (selectedBarangay) {
                        setManualAddress((current) => ({
                            ...current,
                            barangayName: current.barangayName || selectedBarangay.name,
                        }));
                    }
                    return;
                }

                if (!manualAddress.provinceCode) return;

                const selectedProvince = nextProvinces.find((province) => province.code === manualAddress.provinceCode);
                if (selectedProvince) {
                    setManualAddress((current) => ({
                        ...current,
                        provinceName: current.provinceName || selectedProvince.name,
                    }));
                }

                const nextCities = await loadCitiesForProvince(manualAddress.provinceCode);
                if (!active || !manualAddress.cityMunicipalityCode) return;

                const selectedCity = nextCities.find((item) => item.code === manualAddress.cityMunicipalityCode);
                if (selectedCity) {
                    setManualAddress((current) => ({
                        ...current,
                        cityMunicipalityName: current.cityMunicipalityName || selectedCity.name,
                    }));
                }

                const nextBarangays = await loadBarangaysForCity(manualAddress.cityMunicipalityCode);
                if (!active || !manualAddress.barangayCode) return;

                const selectedBarangay = nextBarangays.find((item) => item.code === manualAddress.barangayCode);
                if (selectedBarangay) {
                    setManualAddress((current) => ({
                        ...current,
                        barangayName: current.barangayName || selectedBarangay.name,
                    }));
                }
            } catch {
                if (active) {
                    setManualError("We could not load the address list right now. Please try again.");
                }
            }
        };

        void hydrateManualState();

        return () => {
            active = false;
        };
    }, [
        ensureRegionsLoaded,
        loadBarangaysForCity,
        loadCitiesForProvince,
        loadCitiesForRegion,
        loadProvincesForRegion,
        manualAddress.barangayCode,
        manualAddress.cityMunicipalityCode,
        manualAddress.provinceCode,
        manualAddress.regionCode,
        view,
    ]);

    const openManualForm = async () => {
        setManualError(null);
        setView("manual");

        try {
            await ensureRegionsLoaded();
        } catch {
            setManualError("We could not load the address list right now. Please try again.");
        }
    };

    const handlePinConfirmed = async () => {
        await reverseGeocodeCoordinates(marker.latitude, marker.longitude);
        setMapFormError(null);
        setView("details");
    };

    const confirmPinnedLocation = () => {
        if (!streetAddress.trim() || !barangay.trim() || !city.trim()) {
            setMapFormError("Please complete the street, barangay, and city before saving.");
            return;
        }

        const addressString =
            buildCompleteAddress({
                streetAddress,
                barangayName: barangay,
                cityMunicipalityName: city,
                landmark,
            }) || `Pinned Location (${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)})`;

        onLocationSelect(
            createDeliveryAddressData({
                address: addressString,
                completeAddress: addressString,
                lat: marker.latitude,
                lng: marker.longitude,
                source: "map",
                streetAddress,
                landmark,
                barangayName: barangay,
                cityMunicipalityName: city,
            })
        );
    };

    const handleRegionChange = async (regionCode: string) => {
        setManualError(null);

        const loadedRegions = regions.length > 0 ? regions : await ensureRegionsLoaded();
        const selectedRegion = loadedRegions.find((region) => region.code === regionCode);

        setManualAddress((current) => ({
            ...current,
            regionCode,
            regionName: selectedRegion?.name ?? "",
            provinceCode: "",
            provinceName: "",
            cityMunicipalityCode: "",
            cityMunicipalityName: "",
            barangayCode: "",
            barangayName: "",
        }));
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setProvinceOptional(false);

        if (!regionCode) {
            return;
        }

        try {
            const nextProvinces = await loadProvincesForRegion(regionCode);
            const noProvinceLevel = nextProvinces.length === 0;
            setProvinceOptional(noProvinceLevel);

            if (noProvinceLevel) {
                await loadCitiesForRegion(regionCode);
            }
        } catch {
            setManualError("We could not load provinces for that region. Please try another one.");
        }
    };

    const handleProvinceChange = async (provinceCode: string) => {
        setManualError(null);
        const selectedProvince = provinces.find((province) => province.code === provinceCode);

        setManualAddress((current) => ({
            ...current,
            provinceCode,
            provinceName: selectedProvince?.name ?? "",
            cityMunicipalityCode: "",
            cityMunicipalityName: "",
            barangayCode: "",
            barangayName: "",
        }));
        setCities([]);
        setBarangays([]);

        if (!provinceCode) {
            return;
        }

        try {
            await loadCitiesForProvince(provinceCode);
        } catch {
            setManualError("We could not load cities and municipalities for that province.");
        }
    };

    const handleCityChange = async (cityCode: string) => {
        setManualError(null);
        const selectedCity = cities.find((item) => item.code === cityCode);

        setManualAddress((current) => ({
            ...current,
            cityMunicipalityCode: cityCode,
            cityMunicipalityName: selectedCity?.name ?? "",
            barangayCode: "",
            barangayName: "",
        }));
        setBarangays([]);

        if (!cityCode) {
            return;
        }

        try {
            await loadBarangaysForCity(cityCode);
        } catch {
            setManualError("We could not load barangays for that city or municipality.");
        }
    };

    const handleBarangayChange = (barangayCode: string) => {
        setManualError(null);
        const selectedBarangay = barangays.find((item) => item.code === barangayCode);

        setManualAddress((current) => ({
            ...current,
            barangayCode,
            barangayName: selectedBarangay?.name ?? "",
        }));
    };

    const provinceIsRequired = provinces.length > 0 && !provinceOptional;
    const manualPreview = buildCompleteAddress({
        streetAddress: manualAddress.streetAddress,
        barangayName: manualAddress.barangayName,
        cityMunicipalityName: manualAddress.cityMunicipalityName,
        provinceName: manualAddress.provinceName,
        landmark: manualAddress.landmark,
    });

    const confirmManualLocation = () => {
        if (!manualAddress.regionCode || !manualAddress.cityMunicipalityCode || !manualAddress.barangayCode || !manualAddress.streetAddress.trim()) {
            setManualError("Please complete the region, city or municipality, barangay, and street address.");
            return;
        }

        if (provinceIsRequired && !manualAddress.provinceCode) {
            setManualError("Please select a province to continue.");
            return;
        }

        if (!manualPreview) {
            setManualError("Please complete the manual address before saving.");
            return;
        }

        onLocationSelect(
            createDeliveryAddressData({
                address: manualPreview,
                completeAddress: manualPreview,
                source: "manual",
                lat: null,
                lng: null,
                regionCode: manualAddress.regionCode,
                regionName: manualAddress.regionName,
                provinceCode: manualAddress.provinceCode || null,
                provinceName: manualAddress.provinceName || null,
                cityMunicipalityCode: manualAddress.cityMunicipalityCode,
                cityMunicipalityName: manualAddress.cityMunicipalityName,
                barangayCode: manualAddress.barangayCode,
                barangayName: manualAddress.barangayName,
                streetAddress: manualAddress.streetAddress,
                landmark: manualAddress.landmark || null,
            })
        );
    };

    if (view === "manual") {
        return (
            <div className="flex h-full flex-col bg-white">
                <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 p-4 backdrop-blur-md">
                    {hasMapAvailable && (
                        <button
                            onClick={() => setView("map")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Add Address Manually</h3>
                        <p className="text-xs text-slate-500">Fill in your delivery address if you prefer not to use the map.</p>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
                        <p className="font-semibold">Choose your address from PSGC dropdowns, then add the street and landmark.</p>
                        <p className="mt-1 text-[11px] text-emerald-700">Format preview: House/Building No., Street, Barangay, City/Municipality, Province, Landmark</p>
                    </div>

                    {manualError && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {manualError}
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Region *</label>
                        <select
                            value={manualAddress.regionCode}
                            onChange={(event) => void handleRegionChange(event.target.value)}
                            disabled={isLoadingRegions}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <option value="">{isLoadingRegions ? "Loading regions..." : "Select region"}</option>
                            {regions.map((region) => (
                                <option key={region.code} value={region.code}>
                                    {region.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Province *</label>
                        <select
                            value={provinceOptional ? "__NOT_APPLICABLE__" : manualAddress.provinceCode}
                            onChange={(event) => void handleProvinceChange(event.target.value)}
                            disabled={!manualAddress.regionCode || isLoadingProvinces || provinceOptional}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {!manualAddress.regionCode && <option value="">Select region first</option>}
                            {manualAddress.regionCode && !provinceOptional && (
                                <option value="">{isLoadingProvinces ? "Loading provinces..." : "Select province"}</option>
                            )}
                            {provinceOptional && <option value="__NOT_APPLICABLE__">Not applicable for this region</option>}
                            {!provinceOptional &&
                                provinces.map((province) => (
                                    <option key={province.code} value={province.code}>
                                        {province.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">City / Municipality *</label>
                        <select
                            value={manualAddress.cityMunicipalityCode}
                            onChange={(event) => void handleCityChange(event.target.value)}
                            disabled={
                                !manualAddress.regionCode ||
                                (!provinceOptional && !manualAddress.provinceCode) ||
                                isLoadingCities
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {!manualAddress.regionCode && <option value="">Select region first</option>}
                            {manualAddress.regionCode && !provinceOptional && !manualAddress.provinceCode && <option value="">Select province first</option>}
                            {(provinceOptional || manualAddress.provinceCode) && (
                                <option value="">{isLoadingCities ? "Loading cities/municipalities..." : "Select city or municipality"}</option>
                            )}
                            {cities.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Barangay *</label>
                        <select
                            value={manualAddress.barangayCode}
                            onChange={(event) => handleBarangayChange(event.target.value)}
                            disabled={!manualAddress.cityMunicipalityCode || isLoadingBarangays}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {!manualAddress.cityMunicipalityCode && <option value="">Select city or municipality first</option>}
                            {manualAddress.cityMunicipalityCode && (
                                <option value="">{isLoadingBarangays ? "Loading barangays..." : "Select barangay"}</option>
                            )}
                            {barangays.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Street / House / Building No. *</label>
                        <input
                            type="text"
                            value={manualAddress.streetAddress}
                            onChange={(event) =>
                                setManualAddress((current) => ({
                                    ...current,
                                    streetAddress: event.target.value,
                                }))
                            }
                            placeholder="e.g. Blk 7 Lot 14, Rizal Street"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Landmark</label>
                        <input
                            type="text"
                            value={manualAddress.landmark}
                            onChange={(event) =>
                                setManualAddress((current) => ({
                                    ...current,
                                    landmark: event.target.value,
                                }))
                            }
                            placeholder="e.g. Near covered court"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Complete Address</label>
                        <div className="min-h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                            {manualPreview || "Your full delivery address preview will appear here."}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-4">
                    <button
                        onClick={confirmManualLocation}
                        className="w-full rounded-xl bg-emerald-700 py-4 font-bold text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-800 active:scale-[0.98]"
                    >
                        Save Manual Address
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-full w-full flex-col bg-slate-50">
            {view === "map" ? (
                <>
                    <div ref={mapContainerRef} className="absolute inset-0" />
                    {!isMapReady && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading map...
                            </div>
                        </div>
                    )}

                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full transition-transform duration-200"
                        style={{ transform: `translate(-50%, ${isMoving ? "-120%" : "-100%"})` }}
                    >
                        <div className="relative flex flex-col items-center">
                            {!isMoving && (
                                <div className="absolute bottom-full mb-1 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                                    Pin Delivery Location
                                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-solid border-transparent border-t-slate-900" />
                                </div>
                            )}
                            <MapPin
                                className={`h-12 w-12 ${isMoving ? "text-emerald-500" : "text-emerald-700"} drop-shadow-xl`}
                                strokeWidth={2.5}
                                fill="white"
                            />
                        </div>
                    </div>

                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/15 blur-[2px] transition-opacity duration-200"
                        style={{ opacity: isMoving ? 0.3 : 0.8 }}
                    />

                    <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
                        <div className="flex max-w-[240px] flex-col gap-2">
                            <button
                                onClick={locateCurrentPosition}
                                disabled={isLocating}
                                className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                                {isLocating ? "Locating..." : "Use My Current Location"}
                            </button>
                            {locationError && (
                                <p className="rounded-lg bg-red-50/95 px-3 py-2 text-[11px] font-medium leading-tight text-red-600 shadow-sm">
                                    {locationError}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => void openManualForm()}
                            className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                        >
                            Add manually
                        </button>
                    </div>

                    <div className="absolute bottom-6 left-4 right-4 z-10 flex flex-col gap-2">
                        <div className="mx-auto w-full rounded-xl border border-slate-100 bg-white/90 px-4 py-3 text-center shadow-lg backdrop-blur-md md:w-auto">
                            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Coordinates</p>
                            <p className="font-mono text-sm font-semibold tracking-tight text-slate-800">
                                {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                            </p>
                        </div>
                        <button
                            onClick={() => void handlePinConfirmed()}
                            disabled={isResolvingAddress}
                            className="w-full rounded-lg bg-emerald-700 py-4 font-bold text-white shadow-xl shadow-emerald-900/20 transition-colors hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isResolvingAddress ? "Confirming..." : "Confirm Address Area"}
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex flex-1 flex-col overflow-y-auto bg-white">
                    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/80 p-4 backdrop-blur-md">
                        <button
                            onClick={() => setView("map")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900">Pinned Address Details</h3>
                            <button
                                onClick={() => void openManualForm()}
                                className="mt-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                                Add manually instead
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                            <p className="font-semibold">
                                {isResolvingAddress
                                    ? "Detecting barangay and city from your pinned location..."
                                    : "Barangay and city are auto-detected from your pin, but you can still edit them before saving."}
                            </p>
                            {detectedArea && <p className="mt-1 text-[11px] text-emerald-700">{detectedArea}</p>}
                        </div>

                        {mapFormError && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {mapFormError}
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Street / House / Building No. *</label>
                            <input
                                type="text"
                                value={streetAddress}
                                onChange={(event) => {
                                    setStreetAddress(event.target.value);
                                    setMapFormError(null);
                                }}
                                placeholder="e.g. Blk 7 Lot 14, Rizal Street"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Landmark</label>
                            <input
                                type="text"
                                value={landmark}
                                onChange={(event) => {
                                    setLandmark(event.target.value);
                                    setMapFormError(null);
                                }}
                                placeholder="e.g. Near covered court"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Barangay *</label>
                                <input
                                    type="text"
                                    value={barangay}
                                    onChange={(event) => {
                                        setBarangay(event.target.value);
                                        setMapFormError(null);
                                    }}
                                    placeholder="e.g. San Jose"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">City / Municipality *</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(event) => {
                                        setCity(event.target.value);
                                        setMapFormError(null);
                                    }}
                                    placeholder="e.g. Santa Cruz"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Complete Address</label>
                            <div className="min-h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                                {buildCompleteAddress({
                                    streetAddress,
                                    barangayName: barangay,
                                    cityMunicipalityName: city,
                                    landmark,
                                }) || "Your pinned delivery address preview will appear here."}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-slate-100 bg-white p-4">
                        <button
                            onClick={confirmPinnedLocation}
                            className="w-full rounded-xl bg-emerald-700 py-4 font-bold text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-800 active:scale-[0.98]"
                        >
                            Save Pinned Location
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
