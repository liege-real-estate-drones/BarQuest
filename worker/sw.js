/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
// --- Configuration ---
const UAV_DATA_URLS = {
    geoFeatures: 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/0',
    specificTimeRules: 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/1',
    generalTimeRules: 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/2',
    conditionRules: 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/3',
    accessConditions: 'https://services3.arcgis.com/om3vWi08kAyoBbj3/arcgis/rest/services/Geozone_Download_Prod/FeatureServer/4',
};
const DB_NAME = 'UAVDataCache';
const DB_VERSION = 1;
// --- IndexedDB Helpers ---
function openDB() {
    return new Promise((resolve, reject) => {
        const request = self.indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject("Error opening IndexedDB.");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            Object.keys(UAV_DATA_URLS).forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                }
            });
        };
    });
}
function storeData(db, storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear(); // Clear old data before writing new data
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(`Error storing data in ${storeName}.`);
    });
}
// --- Data Fetching Logic ---
async function fetchAndCache(db, serviceUrl, storeName) {
    console.log(`[SW] Starting fetch for ${storeName}`);
    let allFeatures = [];
    let page = 1;
    const pageSize = 2000;
    let moreData = true;
    while (moreData) {
        const offset = (page - 1) * pageSize;
        const url = `${serviceUrl}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json&resultOffset=${offset}&resultRecordCount=${pageSize}`;
        try {
            console.log(`[SW] Fetching ${storeName} page ${page} from ${url}`);
            const response = await fetch(url, {
                cache: 'no-store',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'X-Requested-With': 'ServiceWorker' // Prevent SW from intercepting its own requests
                }
            });
            if (!response.ok) {
                throw new Error(`[SW] Network response was not ok for ${storeName}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`[SW] ArcGIS API error for ${storeName}: ${JSON.stringify(data.error)}`);
            }
            if (data.features && data.features.length > 0) {
                allFeatures = allFeatures.concat(data.features);
                moreData = data.exceededTransferLimit === true;
                page++;
            }
            else {
                moreData = false;
            }
        }
        catch (error) {
            console.error(`[SW] Fetch failed for ${storeName}:`, error);
            moreData = false; // Stop pagination on error
        }
    }
    if (allFeatures.length > 0) {
        await storeData(db, storeName, allFeatures);
        console.log(`[SW] Successfully fetched and cached ${allFeatures.length} records for ${storeName}.`);
    }
    else {
        console.warn(`[SW] No data returned for ${storeName}.`);
    }
}
async function syncAllUAVData() {
    console.log('[SW] Starting UAV data synchronization...');
    try {
        const db = await openDB();
        const syncPromises = Object.entries(UAV_DATA_URLS).map(([storeName, url]) => fetchAndCache(db, url, storeName));
        await Promise.all(syncPromises);
        console.log('[SW] All UAV data synchronization finished.');
    }
    catch (error) {
        console.error('[SW] Failed to sync UAV data:', error);
    }
}
// --- Service Worker Event Listeners ---
// Precache assets
precacheAndRoute(self.__WB_MANIFEST || []);
self.addEventListener('install', () => {
    console.log('[SW] Service worker installed.');
    self.skipWaiting();
});
self.addEventListener('activate', (event) => {
    console.log('[SW] Service worker activated.');
    event.waitUntil(self.clients.claim());
});
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_UAV_DATA') {
        console.log('[SW] Received SYNC_UAV_DATA message.');
        event.waitUntil(syncAllUAVData());
    }
});
self.addEventListener('fetch', (event) => {
    // This listener is to demonstrate that we can intercept fetch requests.
    // The ArcGIS data fetching is handled manually via the message event.
    // We also check for the custom header to avoid intercepting our own fetches.
    if (event.request.headers.has('X-Requested-With')) {
        return;
    }
    // Let Workbox handle precached assets, otherwise fall back to network.
    // This is the default behavior when using precacheAndRoute.
});
