import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { AppText, Icon } from '@/components/atoms';
import {
  meetingPointService,
  ProposeMeetingPointPayload,
} from '@/services/meetingPointService';

interface SearchResultItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// ── Static HTML: Leaflet Map (HANYA dimuat 1 kali oleh WebView agar TIDAK reload terus-menerus) ──
const STATIC_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f1f5f9; font-family: -apple-system, sans-serif; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-6.200000, 106.816666], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    function notifyRN(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }

    var isUserMoving = false;

    map.on('movestart', function() {
      isUserMoving = true;
      notifyRN('drag_start', {});
    });

    map.on('moveend', function() {
      if (!isUserMoving) return;
      isUserMoving = false;
      var center = map.getCenter();
      notifyRN('drag_end', { lat: center.lat, lng: center.lng });
    });

    window.panToCoords = function(lat, lng) {
      isUserMoving = false; // programmatically moved, don't trigger drag_start loop
      map.setView([lat, lng], 16, { animate: true });
    };

    // Initial ready notification
    setTimeout(function() {
      var center = map.getCenter();
      notifyRN('map_ready', { lat: center.lat, lng: center.lng });
    }, 300);
  </script>
</body>
</html>
`;

export default function MeetingPointScreen() {
  const { offerId, mode } = useLocalSearchParams<{
    offerId: string;
    mode?: 'propose' | 'counter';
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const isCounter = mode === 'counter';

  // Static webview source memoized with [] dependency so it NEVER causes WebView reload!
  const mapSource = useMemo(() => ({ html: STATIC_MAP_HTML }), []);

  // Coordinates
  const currentCoordsRef = useRef({ lat: -6.200000, lng: 106.816666 });
  const [currentLat, setCurrentLat] = useState<number>(-6.200000);
  const [currentLng, setCurrentLng] = useState<number>(106.816666);
  const [isDragging, setIsDragging] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Location info
  const [locatingUser, setLocatingUser] = useState(false);
  const [placeName, setPlaceName] = useState<string>('Pusat Kota Jakarta');
  const [address, setAddress] = useState<string>('Jl. M.H. Thamrin, Jakarta Pusat');
  const [notes, setNotes] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Search places
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Actions
  const [submitting, setSubmitting] = useState(false);

  // Fetch existing meeting point if counter or already proposed
  useEffect(() => {
    if (!offerId) return;

    meetingPointService
      .getDetails(parseInt(offerId, 10))
      .then((data) => {
        const existing = data.pending || data.locked;
        if (existing) {
          const lat = parseFloat(String(existing.latitude));
          const lng = parseFloat(String(existing.longitude));
          if (!isNaN(lat) && !isNaN(lng)) {
            currentCoordsRef.current = { lat, lng };
            setCurrentLat(lat);
            setCurrentLng(lng);
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(`window.panToCoords(${lat}, ${lng}); true;`);
            }
          }
          if (existing.place_name) setPlaceName(existing.place_name);
          if (existing.address) setAddress(existing.address);
          if (existing.notes) setNotes(existing.notes);
        }
      })
      .catch((e) => console.log('Error fetching meeting point details:', e.message));
  }, [offerId]);

  // Debounced reverse geocode (HANYA dijalankan saat benar-benar selesai menggeser peta)
  const reverseGeocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchReverseGeocode = useCallback((lat: number, lng: number) => {
    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
    }

    // Hindari re-request jika koordinat hampir sama persis
    if (
      lastGeocodedCoordsRef.current &&
      Math.abs(lastGeocodedCoordsRef.current.lat - lat) < 0.0001 &&
      Math.abs(lastGeocodedCoordsRef.current.lng - lng) < 0.0001
    ) {
      return;
    }

    setLoadingAddress(true);
    reverseGeocodeTimeoutRef.current = setTimeout(async () => {
      try {
        lastGeocodedCoordsRef.current = { lat, lng };
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'AdaBarterApp/1.0', 'Accept-Language': 'id' } }
        );
        const data = await res.json();
        if (data) {
          const a = data.address || {};
          const detectedName =
            data.name ||
            a.amenity ||
            a.shop ||
            a.building ||
            a.road ||
            a.suburb ||
            'Titik Terpilih di Peta';
          setPlaceName(detectedName);
          setAddress(data.display_name || `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setPlaceName(`Titik Temu (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setAddress(`Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setLoadingAddress(false);
      }
    }, 700); // 700ms debounce
  }, []);

  // Deteksi lokasi GPS real-time pengguna (Jogja / lokasi saat ini)
  const detectCurrentLocation = useCallback(async (isAuto = false) => {
    setLocatingUser(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isAuto) {
          Alert.alert(
            'Izin Lokasi Diperlukan',
            'Izinkan akses lokasi di pengaturan HP Anda agar peta dapat langsung mengarah ke posisi Anda.'
          );
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      currentCoordsRef.current = { lat, lng };
      setCurrentLat(lat);
      setCurrentLng(lng);

      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`window.panToCoords(${lat}, ${lng}); true;`);
      }

      fetchReverseGeocode(lat, lng);
    } catch (e: any) {
      console.log('Error detecting GPS location:', e.message);
      if (!isAuto) {
        Alert.alert('Gagal Mendeteksi Lokasi', 'Pastikan sinyal GPS perangkat Anda aktif.');
      }
    } finally {
      setLocatingUser(false);
    }
  }, [fetchReverseGeocode]);

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_ready') {
        setMapReady(true);
        // Jika sudah ada koordinat tersimpan dari usulan sebelumnya, gunakan itu
        if (currentCoordsRef.current.lat !== -6.200000) {
          webViewRef.current?.injectJavaScript(
            `window.panToCoords(${currentCoordsRef.current.lat}, ${currentCoordsRef.current.lng}); true;`
          );
        } else if (!isCounter) {
          // Otomatis deteksi GPS real-time perangkat saat peta pertama kali dibuka!
          detectCurrentLocation(true);
        }
      } else if (data.type === 'drag_start') {
        setIsDragging(true);
      } else if (data.type === 'drag_end') {
        setIsDragging(false);
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          currentCoordsRef.current = { lat, lng };
          setCurrentLat(lat);
          setCurrentLng(lng);
          fetchReverseGeocode(lat, lng);
        }
      }
    } catch {
      // ignore
    }
  };

  // Search places
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setSearching(true);
    setShowSearchDropdown(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=id&limit=5`,
        { headers: { 'User-Agent': 'AdaBarterApp/1.0', 'Accept-Language': 'id' } }
      );
      const data: SearchResultItem[] = await res.json();
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    currentCoordsRef.current = { lat, lng };
    setCurrentLat(lat);
    setCurrentLng(lng);
    setPlaceName(item.display_name.split(',')[0]);
    setAddress(item.display_name);
    setShowSearchDropdown(false);
    setSearchQuery('');

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.panToCoords(${lat}, ${lng}); true;`);
    }
  };

  // Submit & Lock Titik Temu
  const handleSubmit = async () => {
    if (!offerId) return;

    if (!placeName.trim() || placeName.trim().length < 2) {
      Alert.alert('Perhatian', 'Nama tempat pertemuan belum terdeteksi. Silakan geser peta.');
      return;
    }

    const payload: ProposeMeetingPointPayload = {
      place_name: placeName.trim(),
      address: address.trim() || undefined,
      latitude: currentCoordsRef.current.lat,
      longitude: currentCoordsRef.current.lng,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const oid = parseInt(offerId, 10);
      if (isCounter) {
        await meetingPointService.counter(oid, payload);
      } else {
        await meetingPointService.propose(oid, payload);
      }

      Alert.alert(
        'Usulan Titik Temu Terkirim! 📍',
        'Titik lokasi pada peta telah diajukan ke pihak lawan untuk disepakati.',
        [{ text: 'Selesai', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Gagal Mengusulkan', e.message || 'Terjadi kesalahan pada server.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <View className="flex-1 bg-slate-900">
      {/* ── 1. Interactive Map View (1x load, TANPA refresh) ── */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={mapSource}
          onMessage={handleWebViewMessage}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-800">
              <ActivityIndicator size="large" color="#059669" />
              <AppText variant="caption" className="text-slate-500 mt-2">
                Memuat peta interaktif...
              </AppText>
            </View>
          )}
        />

        {/* ── 2. Floating Pin Marker in Map Center ── */}
        <View
          pointerEvents="none"
          style={[
            styles.floatingMarkerContainer,
            { transform: [{ translateY: isDragging ? -12 : 0 }] },
          ]}
        >
          {isDragging ? (
            <View className="bg-slate-900/90 px-3 py-1 rounded-full mb-1 border border-white/20 shadow-md">
              <AppText className="text-[11px] font-bold text-white">
                Lepas untuk pilih lokasi
              </AppText>
            </View>
          ) : (
            <View className="bg-emerald-700 px-3 py-1 rounded-full mb-1 border border-white/20 shadow-md">
              <AppText className="text-[11px] font-bold text-white">
                Titik Terpilih
              </AppText>
            </View>
          )}

          {/* Marker Icon */}
          <View className="w-11 h-11 rounded-full bg-emerald-600 items-center justify-center border-2 border-white shadow-lg">
            <Icon name="location" size={24} color="#ffffff" />
          </View>
          {/* Pointer triangle */}
          <View style={styles.markerPointer} />
          {/* Ground shadow */}
          <View
            style={[
              styles.markerShadow,
              { width: isDragging ? 10 : 16, opacity: isDragging ? 0.3 : 0.6 },
            ]}
          />
        </View>

        {/* ── 3. Top Floating Search & Nav Header ── */}
        <SafeAreaView
          edges={['top']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }}
        >
          <View className="px-4 pt-2">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-md border border-slate-200 dark:border-slate-700"
              >
                <AppText className="text-xl font-bold">‹</AppText>
              </TouchableOpacity>

              {/* Search Bar Input */}
              <View className="flex-1 flex-row items-center bg-white dark:bg-slate-800 rounded-full px-3.5 py-2 shadow-md border border-slate-200 dark:border-slate-700">
                <Icon name="search-outline" size={17} color="#94a3b8" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchPlaces}
                  placeholder="Cari lokasi / mall / stasiun..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2 text-xs text-slate-800 dark:text-white"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Icon name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSearchPlaces}
                  className="bg-emerald-600 px-2.5 py-1 rounded-full ml-1"
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppText className="text-[11px] font-bold text-white">Cari</AppText> 
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Dropdown Results */}
            {showSearchDropdown && searchResults.length > 0 && (
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-2 mt-2 shadow-xl border border-slate-200 dark:border-slate-700 max-h-56">
                <ScrollView keyboardShouldPersistTaps="handled">
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      onPress={() => handleSelectSearchResult(item)}
                      className="py-2 px-2.5 border-b border-slate-100 dark:border-slate-700 flex-row items-center gap-2"
                    >
                      <Icon name="location-outline" size={16} color="#059669" />
                      <View className="flex-1">
                        <AppText
                          className="text-xs font-bold text-slate-800 dark:text-white"
                          numberOfLines={1}
                        >
                          {item.display_name.split(',')[0]}
                        </AppText>
                        <AppText
                          className="text-[10px] text-slate-400"
                          numberOfLines={1}
                        >
                          {item.display_name}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </SafeAreaView>

        {/* ── Floating My Location (GPS) Button ── */}
        <TouchableOpacity
          onPress={() => detectCurrentLocation(false)}
          disabled={locatingUser}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 16,
            zIndex: 25,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 6,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
          activeOpacity={0.8}
        >
          {locatingUser ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <Icon name="locate" size={22} color="#059669" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── 4. Bottom Sheet: Details & Lock Button ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="items-center pt-2.5 pb-1">
          <View className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </View>

        <View className="px-4 pt-2">
          {/* Location Info Banner */}
          <View className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-2xl mb-3 border border-slate-200 dark:border-slate-700">
            <View className="flex-row items-start gap-2.5">
              <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center mt-0.5">
                <Icon name="navigate" size={16} color="#059669" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <AppText variant="caption" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Titik Temu Terpilih (Geser Peta)
                  </AppText>
                  {loadingAddress && (
                    <ActivityIndicator size="small" color="#059669" />
                  )}
                </View>

                <AppText className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5" numberOfLines={1}>
                  {placeName}
                </AppText>

                <AppText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-4" numberOfLines={2}>
                  {address}
                </AppText>
              </View>
            </View>
          </View>

          {/* Patokan Tambahan (Optional) */}
          <View className="mb-3">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Patokan tambahan (misal: di depan kedai kopi / lobi utara)..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700"
            />
          </View>

          {/* ── 5. Main Action Button: LOCK TITIK TEMU ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 active:bg-emerald-700 py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg mb-1"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Icon name="lock-closed" size={18} color="#ffffff" />
                <AppText className="text-white font-extrabold text-sm">
                  {isCounter ? 'Ajukan Perubahan Titik Ini' : ' Kunci Titik Temu Ini'}
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -75,
    marginTop: -65,
    width: 150,
    alignItems: 'center',
    zIndex: 20,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#059669',
    alignSelf: 'center',
  },
  markerShadow: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginTop: 2,
    alignSelf: 'center',
  },
});
