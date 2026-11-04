import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { AppText, Icon, Avatar } from '@/components/atoms';
import { trackingService, TrackingStatusResponse, TrackingStatus } from '@/services/trackingService';
import {
  routingService,
  RouteResult,
  formatRouteDuration,
  formatRouteDistance,
  getGoogleMapsNavigationUrl,
} from '@/services/routingService';
import { useAuth } from '@/context/AuthContext';

// ─── Static HTML: Leaflet Map ────────────────────────────────────────────────
// Constant defined outside component — prevents WebView reload on re-render.

const TRACKER_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%;  }
    // .pin-me { background: #3b82f6; }
    // .pin-partner { background: #22c55e; }
    // .pin-target { background: #ffff; }
    .accuracy-circle { stroke: #3b82f6; stroke-width: 1; fill: #3b82f6; fill-opacity: 0.1; }
    .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
    .popup-label { font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; }
    .popup-sub { font-family: system-ui, sans-serif; font-size: 11px; color: #64748b; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    function makeIcon(cls, emoji) {
      return L.divIcon({
        className: '',
        html: '<div class="custom-pin ' + cls + '" style="width:38px;height:38px;font-size:18px;">' + emoji + '</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22]
      });
    }

    var markers = {};
    var accuracyCircle = null;
    var routeLayer = null;
    var initialized = false;

    function updateMarker(id, lat, lng, icon, popup) {
      if (markers[id]) {
        markers[id].setLatLng([lat, lng]);
        if (popup) markers[id].setPopupContent(popup);
      } else {
        markers[id] = L.marker([lat, lng], { icon: icon })
          .addTo(map);
        if (popup) markers[id].bindPopup(popup);
      }
    }

    function removeMarker(id) {
      if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }

    function drawRoute(latlngs) {
      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }
      if (!latlngs || latlngs.length === 0) return;

      // Google Maps-like route styling: dark blue casing + bright blue core
      var casing = L.polyline(latlngs, {
        color: '#1d4ed8',
        weight: 7,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });
      var core = L.polyline(latlngs, {
        color: '#60a5fa',
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      });

      routeLayer = L.featureGroup([casing, core]).addTo(map);
    }

    function fitAll() {
      var allLayers = Object.values(markers);
      if (routeLayer) {
        allLayers.push(routeLayer);
      }
      if (allLayers.length === 0) return;
      if (allLayers.length === 1 && !routeLayer) {
        map.setView(allLayers[0].getLatLng(), 16);
        return;
      }
      var group = L.featureGroup(allLayers);
      map.fitBounds(group.getBounds().pad(0.18));
    }

    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch(_) {}
    });

    document.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch(_) {}
    });

    function handleMessage(msg) {
      if (msg.type === 'update') {
        var data = msg.data;

        // Meeting point (red pin)
        if (data.target) {
          updateMarker('target', data.target.lat, data.target.lng,
            makeIcon('pin-target', '<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#ff0040" d="M32,0C18.746,0,8,10.746,8,24c0,5.219,1.711,10.008,4.555,13.93c0.051,0.094,0.059,0.199,0.117,0.289l16,24 C29.414,63.332,30.664,64,32,64s2.586-0.668,3.328-1.781l16-24c0.059-0.09,0.066-0.195,0.117-0.289C54.289,34.008,56,29.219,56,24 C56,10.746,45.254,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z"></path> </g></svg>'),
            '<div class="popup-label">' + (data.target.name || 'Titik Temu') + '</div>' +
            (data.target.address ? '<div class="popup-sub">' + data.target.address + '</div>' : '')
          );
        }

        // My position (blue pin)
        if (data.me) {
          updateMarker('me', data.me.lat, data.me.lng,
            makeIcon('pin-me', '<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#0000ff" d="M32,0C18.746,0,8,10.746,8,24c0,5.219,1.711,10.008,4.555,13.93c0.051,0.094,0.059,0.199,0.117,0.289l16,24 C29.414,63.332,30.664,64,32,64s2.586-0.668,3.328-1.781l16-24c0.059-0.09,0.066-0.195,0.117-0.289C54.289,34.008,56,29.219,56,24 C56,10.746,45.254,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z"></path> </g></svg>'),
            '<div class="popup-label"> Posisi Saya</div>'
          );
          // Accuracy circle
          if (data.me.accuracy) {
            if (accuracyCircle) {
              accuracyCircle.setLatLng([data.me.lat, data.me.lng]);
              accuracyCircle.setRadius(data.me.accuracy);
            } else {
              accuracyCircle = L.circle([data.me.lat, data.me.lng], {
                radius: data.me.accuracy,
                className: 'accuracy-circle'
              }).addTo(map);
            }
          }
        } else {
          removeMarker('me');
          if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
        }

        // Partner position (green pin)
        if (data.partner && data.partner.sharing) {
          updateMarker('partner', data.partner.lat, data.partner.lng,
            makeIcon('pin-partner', '<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill="#00ff00" d="M32,0C18.746,0,8,10.746,8,24c0,5.219,1.711,10.008,4.555,13.93c0.051,0.094,0.059,0.199,0.117,0.289l16,24 C29.414,63.332,30.664,64,32,64s2.586-0.668,3.328-1.781l16-24c0.059-0.09,0.066-0.195,0.117-0.289C54.289,34.008,56,29.219,56,24 C56,10.746,45.254,0,32,0z M32,32c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S36.418,32,32,32z"></path> </g></svg>'),
            '<div class="popup-label"> ' + (data.partner.name || 'Lawan Barter') + '</div>'
          );
        } else {
          removeMarker('partner');
        }

        // Fit map to show all markers on first load
        if (!initialized && Object.keys(markers).length > 0) {
          fitAll();
          initialized = true;
        }
      } else if (msg.type === 'set_route') {
        if (msg.coords && msg.coords.length > 0) {
          drawRoute(msg.coords);
          if (msg.fit) {
            fitAll();
          }
        } else if (routeLayer) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
      } else if (msg.type === 'fit') {
        fitAll();
      }
    }

    // Signal ready
    setTimeout(function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
      }
    }, 500);
  </script>
</body>
</html>`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '–';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return '–';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 10) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} dtk lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '–';
  }
}

function statusLabel(status: TrackingStatus | undefined): string {
  switch (status) {
    case 'otw': return 'Dalam Perjalanan';
    case 'arrived': return 'Sudah Tiba';
    default: return '⏸ Menunggu';
  }
}

function statusColor(status: TrackingStatus | undefined): string {
  switch (status) {
    case 'otw': return 'text-blue-600 dark:text-blue-400';
    case 'arrived': return 'text-emerald-600 dark:text-emerald-400';
    default: return 'text-slate-500 dark:text-slate-400';
  }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TrackerScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const webViewRef = useRef<WebView>(null);
  const mapReady = useRef(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUploadedRef = useRef<{ lat: number; lng: number } | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<TrackingStatusResponse | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [statusLoading, setStatusLoading] = useState<TrackingStatus | null>(null);
  const [mapVisible, setMapVisible] = useState(true);

  const lastRoutedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const numericOfferId = parseInt(offerId ?? '0', 10);

  // ── Memoize WebView source to prevent reloads ─────────────────────────────
  const mapSource = useMemo(() => ({ html: TRACKER_MAP_HTML }), []);

  // ── Push update to Leaflet map ────────────────────────────────────────────
  const pushMapUpdate = useCallback((
    data: TrackingStatusResponse,
    myLoc: { lat: number; lng: number; accuracy?: number } | null
  ) => {
    if (!mapReady.current || !webViewRef.current) return;

    const mp = data.meeting_point;
    const partnerTracking = data.partner_tracking;

    const payload = {
      type: 'update',
      data: {
        target: mp ? {
          lat: Number(mp.latitude),
          lng: Number(mp.longitude),
          name: mp.place_name,
          address: mp.address,
        } : null,
        me: myLoc ? {
          lat: myLoc.lat,
          lng: myLoc.lng,
          accuracy: myLoc.accuracy,
        } : null,
        partner: (partnerTracking?.is_sharing && partnerTracking.latitude && partnerTracking.longitude)
          ? {
            sharing: true,
            lat: Number(partnerTracking.latitude),
            lng: Number(partnerTracking.longitude),
            name: data.partner.name,
          }
          : { sharing: false },
      },
    };

    webViewRef.current.injectJavaScript(
      `handleMessage(${JSON.stringify(payload)}); true;`
    );
  }, []);

  // ── Stop all background tasks ─────────────────────────────────────────────
  const stopAll = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
  }, []);

  // ── Fetch driving route from OSRM ─────────────────────────────────────────
  const fetchRoute = useCallback(async (
    myLat: number,
    myLng: number,
    targetLat: number,
    targetLng: number,
    force = false
  ) => {
    // Skip if moved less than ~40 meters unless forced
    if (!force && lastRoutedLocationRef.current) {
      const dlat = Math.abs(lastRoutedLocationRef.current.lat - myLat);
      const dlng = Math.abs(lastRoutedLocationRef.current.lng - myLng);
      if (dlat < 0.00035 && dlng < 0.00035) return;
    }

    setRouteLoading(true);
    try {
      const result = await routingService.getDrivingRoute(myLat, myLng, targetLat, targetLng);
      if (result) {
        lastRoutedLocationRef.current = { lat: myLat, lng: myLng };
        setRouteInfo(result);

        if (mapReady.current && webViewRef.current) {
          const payload = {
            type: 'set_route',
            coords: result.coordinates,
            fit: false,
          };
          webViewRef.current.injectJavaScript(
            `handleMessage(${JSON.stringify(payload)}); true;`
          );
        }
      }
    } catch {
      // silently fail
    } finally {
      setRouteLoading(false);
    }
  }, []);

  // ── Fetch tracking status from server ────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const data = await trackingService.getStatus(numericOfferId);

      if (data.offer_status !== 'matched') {
        stopAll();
        setLoading(false);
        Alert.alert(
          'Pelacakan Selesai',
          'Transaksi barter telah selesai atau tidak lagi aktif.',
          [{ text: 'Kembali', onPress: () => router.back() }]
        );
        return;
      }

      setTrackingData(data);
      setLoading(false);

      // Push map update with latest data
      setMyLocation(prev => {
        pushMapUpdate(data, prev);
        if (prev && data.meeting_point) {
          fetchRoute(
            prev.lat,
            prev.lng,
            Number(data.meeting_point.latitude),
            Number(data.meeting_point.longitude)
          );
        }
        return prev;
      });
    } catch (err: any) {
      if (!loading) return; // Silently fail on background polling errors
      setLoading(false);
      stopAll();
      Alert.alert(
        'Pelacakan Tidak Aktif',
        err?.message || 'Transaksi barter telah selesai atau tidak dapat diakses.',
        [{ text: 'Kembali', onPress: () => router.back() }]
      );
    }
  }, [numericOfferId, loading, pushMapUpdate, stopAll, router, fetchRoute]);

  // ── Upload my GPS location to server ─────────────────────────────────────
  const uploadLocation = useCallback(async (lat: number, lng: number) => {
    try {
      // Skip if position barely changed (<3m)
      const prev = lastUploadedRef.current;
      if (prev) {
        const dlat = Math.abs(prev.lat - lat);
        const dlng = Math.abs(prev.lng - lng);
        if (dlat < 0.00003 && dlng < 0.00003) return;
      }
      lastUploadedRef.current = { lat, lng };

      await trackingService.updateLocation(numericOfferId, {
        latitude: lat,
        longitude: lng,
        status: 'otw',
      });
    } catch {
      // Silently fail — GPS upload errors are non-critical
    }
  }, [numericOfferId]);

  // ── Start GPS watching ────────────────────────────────────────────────────
  const startGPS = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Izin GPS Diperlukan',
        'Aktifkan izin lokasi agar pelacakan berjalan.',
      );
      return;
    }

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5, // update every 5 meters
        timeInterval: 5000,  // or every 5 seconds
      },
      (loc) => {
        const { latitude, longitude, accuracy } = loc.coords;
        const newLoc = { lat: latitude, lng: longitude, accuracy: accuracy ?? undefined };
        setMyLocation(newLoc);

        setTrackingData(prev => {
          if (prev) {
            pushMapUpdate(prev, newLoc);
            if (prev.meeting_point) {
              fetchRoute(
                latitude,
                longitude,
                Number(prev.meeting_point.latitude),
                Number(prev.meeting_point.longitude)
              );
            }
          }
          return prev;
        });

        uploadLocation(latitude, longitude);
      }
    );
  }, [pushMapUpdate, uploadLocation, fetchRoute]);

  // ── Polling for partner status (every 5 seconds) ──────────────────────────
  const startPolling = useCallback(() => {
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, 5000);
  }, [fetchStatus]);

  // ── Handle app going to background ───────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState === 'background') {
        // App going background: stop GPS to save battery, keep polling
        locationSubRef.current?.remove();
        locationSubRef.current = null;
      } else if (nextState === 'active' && appStateRef.current === 'background') {
        // App back to foreground: restart GPS
        startGPS();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [startGPS]);

  // ── Mount / Unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    startGPS();
    startPolling();

    return () => {
      stopAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStatusUpdate = useCallback(async (newStatus: TrackingStatus) => {
    if (!myLocation) {
      Alert.alert('GPS Belum Aktif', 'Tunggu sebentar hingga posisi GPS terdeteksi.');
      return;
    }
    setStatusLoading(newStatus);
    try {
      await trackingService.updateLocation(numericOfferId, {
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        status: newStatus,
      });
      await fetchStatus();
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Tidak dapat mengubah status.');
    } finally {
      setStatusLoading(null);
    }
  }, [myLocation, numericOfferId, fetchStatus]);

  const handleStopTracking = useCallback(() => {
    Alert.alert(
      'Hentikan Lacak Perjalanan?',
      'Posisi Anda tidak akan dibagikan ke lawan barter lagi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hentikan',
          style: 'destructive',
          onPress: async () => {
            setIsStopping(true);
            try {
              await trackingService.stopTracking(numericOfferId);
              stopAll();
              router.back();
            } catch (err: any) {
              Alert.alert('Gagal', err?.message || 'Tidak dapat menghentikan pelacakan.');
              setIsStopping(false);
            }
          },
        },
      ]
    );
  }, [numericOfferId, stopAll, router]);

  const handleFitMap = useCallback(() => {
    webViewRef.current?.injectJavaScript('fitAll(); true;');
  }, []);

  const handleOpenMaps = useCallback(() => {
    const mp = trackingData?.meeting_point;
    if (!mp) return;
    const url = mp.maps_url || `https://www.google.com/maps/search/?api=1&query=${mp.latitude},${mp.longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Gagal', 'Tidak dapat membuka Google Maps.')
    );
  }, [trackingData]);

  const handleOpenNavigation = useCallback(() => {
    const mp = trackingData?.meeting_point;
    if (!mp) return;
    const destLat = mp.latitude;
    const destLng = mp.longitude;
    const myLat = myLocation?.lat;
    const myLng = myLocation?.lng;

    const navUrl = getGoogleMapsNavigationUrl(destLat, destLng, myLat, myLng);
    Linking.openURL(navUrl).catch(() => {
      Alert.alert('Gagal Membuka Navigasi', 'Tidak dapat membuka aplikasi Google Maps.');
    });
  }, [trackingData, myLocation]);

  // ── WebView message handler ───────────────────────────────────────────────
  const onWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'map_ready') {
        mapReady.current = true;
        // Push initial data if already loaded
        setTrackingData(prev => {
          if (prev) {
            setMyLocation(loc => {
              pushMapUpdate(prev, loc);
              if (loc && prev.meeting_point) {
                fetchRoute(
                  loc.lat,
                  loc.lng,
                  Number(prev.meeting_point.latitude),
                  Number(prev.meeting_point.longitude),
                  true
                );
              }
              return loc;
            });
          }
          return prev;
        });
      }
    } catch { }
  }, [pushMapUpdate, fetchRoute]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const mp = trackingData?.meeting_point;
  const myTracking = trackingData?.my_tracking;
  const partnerTracking = trackingData?.partner_tracking;
  const partner = trackingData?.partner;

  const myStatus: TrackingStatus = myTracking?.status ?? 'idle';
  const partnerSharing = partnerTracking?.is_sharing === true;

  return (
    <View className="flex-1 bg-slate-900">
      {/* ── Map Area ────────────────────────────────────────────────────── */}
      <View className="flex-1 relative">
        {mapVisible && (
          <WebView
            ref={webViewRef}
            source={mapSource}
            style={{ flex: 1, backgroundColor: '#1e293b' }}
            onMessage={onWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        )}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => {
            stopAll();
            router.back();
          }}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 items-center justify-center shadow-md z-10"
        >
          <Icon name="chevron-back" size={22} color="#1e293b" />
        </TouchableOpacity>

        {/* Fit-map button */}
        <TouchableOpacity
          onPress={handleFitMap}
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 items-center justify-center shadow-md z-10"
        >
          <Icon name="scan-outline" size={20} color="#1e293b" />
        </TouchableOpacity>

        {/* Floating Route Info Banner (Nearest Driving Route & ETA like Google Maps) */}
        {routeInfo && (
          <View className="absolute top-24 left-4 right-4 bg-white/95 dark:bg-slate-800/95 rounded-2xl p-3 shadow-lg flex-row items-center justify-between border border-blue-200 dark:border-blue-900/60 z-10">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 items-center justify-center shrink-0">
                <Icon name={'car'} color={'blue'} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <AppText className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Rute Terdekat
                  </AppText>
                  {routeLoading && <ActivityIndicator size="small" color="#3b82f6" />}
                </View>
                <AppText className="text-sm font-extrabold text-slate-900 dark:text-white" numberOfLines={1}>
                  ~{formatRouteDuration(routeInfo.durationSeconds)} ({formatRouteDistance(routeInfo.distanceMeters)})
                </AppText>
                {Boolean(routeInfo.summary) && (
                  <AppText className="text-[10px] text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    via {routeInfo.summary}
                  </AppText>
                )}
              </View>
            </View>

          </View>
        )}

        {/* Loading overlay */}
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-slate-900/70">
            <ActivityIndicator size="large" color="#34d399" />
            <AppText className="text-slate-200 text-sm mt-3">Memuat peta pelacakan...</AppText>
          </View>
        )}

        {/* GPS not active indicator */}
        {!myLocation && !loading && (
          <View className="absolute bottom-2 left-4 right-4 bg-blue-600/90 rounded-xl px-3 py-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#ffffff" />
            <AppText className="text-white text-xs font-semibold">Mendeteksi posisi GPS...</AppText>
          </View>
        )}
      </View>

      {/* ── Bottom Card ─────────────────────────────────────────────────── */}
      <View className="bg-white dark:bg-slate-800  shadow-xl pt-1">
        {/* Drag handle */}
        <View className="items-center py-2">
          <View className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
        </View>

        <ScrollView
          className="max-h-72"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4">
            {/* ── Meeting Point ─────────────────────────────────────── */}
            {mp && (
              <TouchableOpacity
                onPress={handleOpenNavigation}
                className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl mb-3 border border-slate-200 dark:border-slate-700"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center shrink-0">
                    <Icon name={'location'} color={'#ef4444'} size={18} />
                  </View>
                  <View className="flex-1">
                    <AppText className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                      Titik Temu COD
                    </AppText>
                    <AppText className="text-sm font-extrabold text-slate-900 dark:text-white" numberOfLines={1}>
                      {mp.place_name}
                    </AppText>
                    {Boolean(mp.address) && (
                      <AppText className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                        {mp.address}
                      </AppText>
                    )}
                  </View>
                  <Icon name="open-outline" size={16} color="#ef4444" />
                </View>

                {/* Route ETA pill inside card */}
                {routeInfo && (
                  <View className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-600/50 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5 flex-1 pr-1">
                      <Icon name="navigate-outline" size={14} color="#2563eb" />
                      <AppText className="text-xs text-slate-700 dark:text-slate-200" numberOfLines={1}>
                        Rute Terdekat: <AppText className="font-extrabold text-blue-600 dark:text-blue-400">{formatRouteDistance(routeInfo.distanceMeters)} (~{formatRouteDuration(routeInfo.durationSeconds)})</AppText>
                      </AppText>
                    </View>
                    <AppText className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      Buka Rute ›
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* ── Users Status Row ──────────────────────────────────── */}
            <View className="flex-row gap-3 mb-3">
              {/* My status */}
              <View className="flex-1 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                <View className='flex-row gap-1 items-center justify-start mb-2'>
                  <Icon name={'location-sharp'} size={18} color={'blue'} />
                  <AppText className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                    Saya
                  </AppText>
                </View>
                <AppText className={`text-xs font-semibold ${statusColor(myStatus)}`}>
                  {statusLabel(myStatus)}
                </AppText>
                {myTracking?.distance_to_target_meters != null && (
                  <AppText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatDistance(myTracking.distance_to_target_meters)} dari titik temu
                  </AppText>
                )}
                {myLocation && (
                  <AppText className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    GPS aktif
                  </AppText>
                )}
              </View>

              {/* Partner status */}
              <View className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
              <View className='flex-row items-center justify-start mb-2'>
                <Icon name={'location-sharp'} color={'green'} size={18}/>
                <AppText className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1" numberOfLines={1}>
                  {partner?.name ?? 'Lawan'}
                </AppText>
              </View>
                {partnerSharing ? (
                  <>
                    <AppText className={`text-xs font-semibold ${statusColor(partnerTracking?.status)}`}>
                      {statusLabel(partnerTracking?.status)}
                    </AppText>
                    {partnerTracking?.distance_to_target_meters != null && (
                      <AppText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDistance(partnerTracking.distance_to_target_meters)} dari titik temu
                      </AppText>
                    )}
                    <AppText className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatLastSeen(partnerTracking?.last_seen_at)}
                    </AppText>
                  </>
                ) : (
                  <AppText className="text-xs text-slate-400 dark:text-slate-500">
                    Tidak berbagi lokasi
                  </AppText>
                )}
              </View>
            </View>

            {/* ── Distance between users ───────────────────────────── */}
            {trackingData?.distance_between_users_meters != null && (
              <View className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5 mb-3 flex-row items-center justify-between">
                <AppText className="text-xs text-slate-500 dark:text-slate-400">
                  Jarak antar kalian:
                </AppText>
                <AppText className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {formatDistance(trackingData.distance_between_users_meters)}
                </AppText>
              </View>
            )}

            {/* ── Action Buttons ────────────────────────────────────── */}
            <View className="flex-row gap-2 mb-2">
              {/* OTW button */}
              <TouchableOpacity
                onPress={() => handleStatusUpdate('otw')}
                disabled={myStatus === 'otw' || statusLoading !== null || isStopping}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm ${myStatus === 'otw'
                    ? 'bg-blue-600 opacity-70'
                    : 'bg-blue-600 active:bg-blue-700'
                  }`}
              >
                {statusLoading === 'otw' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Icon name={'car'} color={'white'} />
                    <AppText className="text-white text-xs font-bold">OTW</AppText>
                  </>
                )}
              </TouchableOpacity>

              {/* Arrived button */}
              <TouchableOpacity
                onPress={() => handleStatusUpdate('arrived')}
                disabled={myStatus === 'arrived' || statusLoading !== null || isStopping}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm ${myStatus === 'arrived'
                    ? 'bg-emerald-600 opacity-70'
                    : 'bg-emerald-600 active:bg-emerald-700'
                  }`}
              >
                {statusLoading === 'arrived' ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AppText className="text-lg">📍</AppText>
                    <AppText className="text-white text-xs font-bold">Sudah Tiba</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2">
              {/* Google Maps Turn-by-Turn Navigation button */}
              <TouchableOpacity
                onPress={handleOpenNavigation}
                className="flex-1 py-2.5 bg-blue-600 active:bg-blue-700 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
              >
                <Icon name="navigate" size={16} color="#ffffff" />
                <AppText className="text-white text-xs font-bold">GMaps</AppText>
              </TouchableOpacity>

              {/* Stop button */}
              <TouchableOpacity
                onPress={handleStopTracking}
                disabled={isStopping}
                className="flex-1 py-2.5 bg-red-50 dark:bg-red-950/30 active:bg-red-100 rounded-xl flex-row items-center justify-center gap-1.5 border border-red-200 dark:border-red-900/40"
              >
                {isStopping ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Icon name="stop-circle-outline" size={16} color="#ef4444" />
                    <AppText className="text-red-600 dark:text-red-400 text-xs font-bold">Stop Lacak</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
