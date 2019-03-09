const version     = 'v.1';
const staticCache = 'cachedFiles' + version;
const pagesCache  = 'cachedPages' + version;
const imagesCache = 'cachedImages' + version;

const cacheList = [
	staticCache,
	pagesCache,
	imagesCache
]



function stashInCache(request, cacheName) {
	fetch(request)
		
		.then( responseFromFetch => {
			caches.open(cacheName)
				.then(theCache => {
					return theCache.put(request, responseFromFetch);
				})
		})
}


// install sw and populate the cache
addEventListener('install', installEvent => {
	skipWaiting();
	installEvent.waitUntil(
		caches.open(cacheList)
			.then( cacheList => {
				// 2. cache the files
				
				caches.open(pagesCache)
					.then(pagesCache => {
						pagesCache.addAll([
							'/',
							'/img/',
							'/images/',
							'/css/',
							'/offline/'
						]);
					})
				
			})
	
	
	);
});


// fetch event is triggered every time the browser requests a file
addEventListener('fetch', fetchEvent => {
	
	const request = fetchEvent.request;
	
	
	// handling pages, we always want a fresh version of the page
	if(request.headers.get('Accept').includes('text/html')){
		fetchEvent.respondWith(  // intercept the fetch and do this:
			fetch(request)
				.then(responseFromFetch => {
					const copy = responseFromFetch.clone();
					fetchEvent.waitUntil(
						caches.open(pagesCache)
							.then( pagesCache => {
								pagesCache.put(request, copy)
							})
					);
					return responseFromFetch;
				})
				.catch( error => {
					return caches.match(request)
						.then(responseFromCache => {
							if(responseFromCache) {
								return responseFromCache;
							}
							return caches.match('index.html');
						})
				})
		);
		return;
	}
	
	if(request.headers.get('Accept').includes('image')){
		fetchEvent.respondWith(
			caches.match(request)
				.then( responseFromCache => {
					if(responseFromCache) {
						fetchEvent.waitUntil(
							stashInCache(request, imagesCache)
						)
						return responseFromCache;
					}

					else {
						return fetch(request)
							.then( responseFromFetch => {

								const copy = responseFromFetch.clone();
								fetchEvent.waitUntil(
									caches.open(imagesCache)
										.then( imageCache => {
											imageCache.put(request, copy);
										})
								);
								return responseFromFetch;
							})
							.catch( error => {
								return caches.match('/img/fallback.jpeg');
							})
					}
				})
		);

		return;
	}
	
	// for all other types of files (CSS, JS, etc.)
	fetchEvent.respondWith(
		caches.match(request)
			.then( responseFromCache => {
				fetchEvent.waitUntil(
					fetch(request)
						.then( responseFromFetch => {
							caches.open(pagesCache)
								.then( pagesCache => {
									return pagesCache.put(request, responseFromFetch);
								})
						})
				)
				return responseFromCache;
			})
	);
	
});	// end addEventListener


function trimCache(cacheName, maxItems) {
	
	caches.open(cacheName)
		.then( cache => {
			cache.keys()
				.then(keys => {
					if (keys.length > maxItems) {
						cache.delete(keys[0])
							.then(
								trimCache(cacheName, maxItems)
							);
					}// end if
				})
		})
}

addEventListener('message', messageEvent => {
	
	if (messageEvent.data.command == 'trimCaches') {
		
		
		trimCache(pagesCache, 30);
		trimCache(imagesCache, 30);
		
	}
	
});







