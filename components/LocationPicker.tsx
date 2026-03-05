"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { ArrowLeft, Loader2, LocateFixed, MapPin } from "lucide-react";

interface LocationPickerProps {
    onLocationSelect: (address: string, lat: number, lng: number) => void;
    initialAddress?: string;
    initialLat?: number;
    initialLng?: number;
}

interface ResolvedAddressParts {
    barangay: string;
    city: string;
}

interface LatLng {
    latitude: number;
    longitude: number;
}

const DEFAULT_LOCATION: LatLng = {
    longitude: 121.0223,
    latitude: 14.5547,
};

function firstNonEmpty(values: Array<string | undefined>): string {
    return values.find((value) => Boolean(value?.trim()))?.trim() ?? "";
}

function extractAddressParts(results: google.maps.GeocoderResult[]): ResolvedAddressParts {
    const components = results[0]?.address_components ?? [];
    const findByType = (types: string[]) =>
        components.find((component) => types.some((type) => component.types.includes(type)))?.long_name?.trim() ?? "";

    const barangay = firstNonEmpty([
        findByType(["sublocality_level_1"]),
        findByType(["sublocality", "neighborhood"]),
        findByType(["administrative_area_level_4"]),
        findByType(["administrative_area_level_3"]),
    ]);

    const city = firstNonEmpty([
        findByType(["locality"]),
        findByType(["administrative_area_level_2"]),
        findByType(["administrative_area_level_1"]),
    ]);

    return { barangay, city };
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) {
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    const { isLoaded, loadError } = useJsApiLoader({
        id: "ordering-system-google-maps",
        googleMapsApiKey,
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const [zoom, setZoom] = useState(14);
    const [center, setCenter] = useState<LatLng>({
        longitude: initialLng ?? DEFAULT_LOCATION.longitude,
        latitude: initialLat ?? DEFAULT_LOCATION.latitude,
    });
    const [marker, setMarker] = useState<LatLng>({
        longitude: initialLng ?? DEFAULT_LOCATION.longitude,
        latitude: initialLat ?? DEFAULT_LOCATION.latitude,
    });

    const [isMoving, setIsMoving] = useState(false);
    const [step, setStep] = useState<"map" | "form">("map");
    const [isLocating, setIsLocating] = useState(false);
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [detectedArea, setDetectedArea] = useState("");

    const [street, setStreet] = useState("");
    const [subdivision, setSubdivision] = useState("");
    const [barangay, setBarangay] = useState("");
    const [city, setCity] = useState("");

    const syncCenterFromMap = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        const mapCenter = map.getCenter();
        if (!mapCenter) return;

        const latitude = mapCenter.lat();
        const longitude = mapCenter.lng();
        const nextZoom = map.getZoom();

        setCenter({ latitude, longitude });
        setMarker({ latitude, longitude });
        if (typeof nextZoom === "number") {
            setZoom(nextZoom);
        }
    }, []);

    const reverseGeocodeCoordinates = useCallback(async (lat: number, lng: number) => {
        if (!isLoaded || !window.google) return;

        setIsResolvingAddress(true);
        setLocationError(null);

        try {
            const geocoder = new window.google.maps.Geocoder();
            const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
                geocoder.geocode({ location: { lat, lng } }, (response, status) => {
                    if (status === "OK" && response) {
                        resolve(response);
                        return;
                    }
                    reject(new Error(status));
                });
            });

            const resolvedAddress = extractAddressParts(results);
            setBarangay(resolvedAddress.barangay);
            setCity(resolvedAddress.city);
            setDetectedArea(results[0]?.formatted_address ?? "");
        } catch {
            setLocationError("We could not detect barangay/city from this pin. You can still fill them manually.");
            setDetectedArea("");
        } finally {
            setIsResolvingAddress(false);
        }
    }, [isLoaded]);

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

                setCenter({ latitude, longitude });
                setMarker({ latitude, longitude });
                setZoom((previous) => Math.max(previous, 16));

                if (mapRef.current) {
                    mapRef.current.panTo({ lat: latitude, lng: longitude });
                    mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 14, 16));
                }

                void reverseGeocodeCoordinates(latitude, longitude);
                setIsLocating(false);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    setLocationError("Location permission denied. Allow it to auto-detect your barangay and city.");
                } else {
                    setLocationError("Unable to get your current location.");
                }
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [reverseGeocodeCoordinates]);

    useEffect(() => {
        if (!isLoaded) return;
        void locateCurrentPosition();
    }, [isLoaded, locateCurrentPosition]);

    const handlePinConfirmed = async () => {
        await reverseGeocodeCoordinates(marker.latitude, marker.longitude);
        setStep("form");
    };

    const confirmFinalLocation = () => {
        const parts = [street, subdivision, barangay, city].filter(Boolean);
        const addressString =
            parts.length > 0
                ? parts.join(", ")
                : `Pinned Location (${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)})`;

        onLocationSelect(addressString, marker.latitude, marker.longitude);
    };

    if (!googleMapsApiKey) {
        return (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center p-6 text-center">
                <div>
                    <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-bold mb-2">Google Maps API Key Required</h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                        Please paste your public key into <code>.env.local</code> as <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
                    </p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center p-6 text-center">
                <div>
                    <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-bold mb-2">Google Maps failed to load</h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                        Please verify your API key and allowed referrers, then try again.
                    </p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 text-slate-600 text-sm font-semibold">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading map...
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-slate-50 flex flex-col">
            {step === "map" ? (
                <>
                    <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={{ lat: center.latitude, lng: center.longitude }}
                        zoom={zoom}
                        onLoad={(map) => {
                            mapRef.current = map;
                        }}
                        onDragStart={() => setIsMoving(true)}
                        onZoomChanged={() => setIsMoving(true)}
                        onIdle={() => {
                            syncCenterFromMap();
                            setIsMoving(false);
                        }}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            gestureHandling: "greedy",
                        }}
                    />

                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 transition-transform duration-200"
                        style={{ transform: `translate(-50%, ${isMoving ? "-120%" : "-100%"})` }}
                    >
                        <div className="relative flex flex-col items-center">
                            {!isMoving && (
                                <div className="absolute bottom-full mb-1 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-lg whitespace-nowrap">
                                    Pin Delivery Location
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-solid border-4 border-transparent border-t-slate-900" />
                                </div>
                            )}
                            <MapPin
                                className={`w-12 h-12 ${isMoving ? "text-emerald-500" : "text-emerald-700"} drop-shadow-xl`}
                                strokeWidth={2.5}
                                fill="white"
                            />
                        </div>
                    </div>

                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-black/15 rounded-lg blur-[2px] pointer-events-none transition-opacity duration-200"
                        style={{ opacity: isMoving ? 0.3 : 0.8 }}
                    />

                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        <button
                            onClick={locateCurrentPosition}
                            disabled={isLocating}
                            className="self-start inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                            {isLocating ? "Locating..." : "Use My Current Location"}
                        </button>
                        {locationError && (
                            <p className="max-w-[220px] rounded-lg bg-red-50/95 px-3 py-2 text-[11px] font-medium leading-tight text-red-600 shadow-sm">
                                {locationError}
                            </p>
                        )}
                    </div>

                    <div className="absolute bottom-6 left-4 right-4 z-10 flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-slate-100 text-center mx-auto w-full md:w-auto">
                            <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">Coordinates</p>
                            <p className="text-sm font-semibold text-slate-800 font-mono tracking-tight">
                                {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                            </p>
                        </div>
                        <button
                            onClick={handlePinConfirmed}
                            disabled={isResolvingAddress}
                            className="w-full bg-emerald-700 text-white font-bold rounded-lg py-4 shadow-xl hover:bg-emerald-800 transition-colors shadow-emerald-900/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isResolvingAddress ? "Confirming..." : "Confirm Address Area"}
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col bg-white overflow-y-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3 shrink-0 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                        <button
                            onClick={() => setStep("map")}
                            className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <h3 className="font-bold text-slate-900 text-lg">Address Details</h3>
                    </div>

                    <div className="p-5 flex flex-col gap-4 flex-1">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                            <p className="font-semibold">
                                {isResolvingAddress
                                    ? "Detecting barangay and city from your pinned location..."
                                    : "Barangay and city are auto-detected from the pinned location."}
                            </p>
                            {detectedArea && <p className="mt-1 text-[11px] text-emerald-700">{detectedArea}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Street Name *</label>
                            <input
                                type="text"
                                value={street}
                                onChange={(event) => setStreet(event.target.value)}
                                placeholder="e.g. Rizal Avenue"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Subdivision / Block / Lot</label>
                            <input
                                type="text"
                                value={subdivision}
                                onChange={(event) => setSubdivision(event.target.value)}
                                placeholder="e.g. Block 1 Lot 1, Phase 2"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Barangay *</label>
                                <input
                                    type="text"
                                    value={barangay}
                                    onChange={(event) => setBarangay(event.target.value)}
                                    placeholder="e.g. San Jose"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">City/Nav *</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(event) => setCity(event.target.value)}
                                    placeholder="e.g. Santa Cruz"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-500 transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                        <button
                            onClick={confirmFinalLocation}
                            disabled={!street || !barangay || !city}
                            className="w-full bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl py-4 shadow-lg hover:bg-emerald-800 transition-colors shadow-emerald-900/20 active:scale-[0.98]"
                        >
                            Save Location
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
