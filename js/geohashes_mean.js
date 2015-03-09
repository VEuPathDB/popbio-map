function initMap() {

	// create a map in the "map" div, set the view to a given place and zoom
	map = L.map('map').setView([18, 0.0], 3);
	assetLayerGroup = new L.LayerGroup();
	assetLayerGroup.addTo(map);

	L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
		minZoom: 2,
		maxZoom: 13,
		noWrap: 1,
		detectRetina: 0,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'examples.map-i875mjb7'
	}).addTo(map);

	// var osm2 = new L.TileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
		// minZoom: 0, 
		// maxZoom: 8, 
		// noWrap: 1,
		// attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			// '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			// 'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		// id: 'examples.map-i875mjb7'});
	// var miniMap = new L.Control.MiniMap(osm2).addTo(map);    	
	
	map.spin(true);
	loadSolr(0, map.getZoom());
	map.spin(false);
	
	
	// detect when user changes zoom or pans around the map
	map.on( "moveend", function( e ) {
		loadSolr(1, map.getZoom());
		// map.spin(false);
		// console.log(map.getZoom());

	});
};


function loadSolr(clear, zoomLevel) {
	var bounds = map.getBounds();
	
	// fix endless bounds of leaflet to comply with SOLR limits
	var south = bounds.getSouth();
	if (south < -90) south = -90;
	var north = bounds.getNorth();
	if (north > 90) north = 90;
	var west = bounds.getWest();
	if (west < -180) west = -180;
	var east = bounds.getEast();
	if (east > 180) east = 180;
	
	// detect the zoom level and request the appropriate facets
	var geoLevel;
	
	switch (zoomLevel) {
		case 1:
		case 2:
			geoLevel = "geohash_1";
			break;
		case 3:
		case 4:
		case 5:
			geoLevel = "geohash_2";
			break;
		case 6:
		case 7:
			geoLevel = "geohash_3";
			break;
		case 8:
		case 9:
			geoLevel = "geohash_4";
			break;			
		case 10:
		case 11:
			geoLevel = "geohash_5";
			break;				
		default:
			geoLevel = "geohash_6";
			break;		
		
	}
	
	//we are too deep in, just download the landmarks instead
	if (zoomLevel > 11) {
		
		loadSmall(1, zoomLevel);	
		return;
		
	}
	
	// get the visible world to filter the records based on what the user is currently viewing
	SolrBBox = "&fq=geo_coords:[" + south + "," + west + " TO " + north + "," + east + "]";

	var terms = [];
	var maxCount = 0;
	
	// this function processes the JSON file requested by jquery
	var buildMap = function(result) {
		
		// using the facet.stats we return statistics for lat and lng for each geohash
		// we are going to use these statistics to calculate the mean position of the 
		// landmarks in each geohash
		
		// detect empty results set
		if (result.response.numFound == 0) {
			map.spin(false);
			return;		
		}
		
		var docLat;
		var docLng;
		
		// process the correct geohashed based on the zoomlevel
		switch (zoomLevel) {
			case 1:
			case 2:
				docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_1;
				docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_1;
				break;
			case 3:
			case 4:
			case 5:
				docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_2;
				docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_2;
				break;
			case 6:
			case 7:
				docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_3;
				docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_3;
				break;
			case 8:
			case 9:
				docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_4;
				docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_4;
				break;			
			case 10:
			case 11:
				docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_5;
				docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_5;		
				break;
			default:
			docLat = result.stats.stats_fields.geo_coords_ll_0___tdouble.facets.geohash_6;
			docLng = result.stats.stats_fields.geo_coords_ll_1___tdouble.facets.geohash_6;
				break;		
			
		}		
		
		// depending on the zoomlevel and the count of landmarks in each geohash we are saving
		// geohashes that contain few enough landmarks to display them using the prune cluster
		// layer. This needs tweaking to get the right balance of info, performance and transfer times
		// The following values seem to work well. Most of the latency is due to SOLR taking a long
		// time to return the landmarks of several geohashes.
		smallClusters = [];
		
		 for (var key in docLat) {
			var count = docLat[key].count;
			if (count < 2) {
				smallClusters.push(key);
				continue;
			}
			
			if (zoomLevel == 5 && count < 11) {
				smallClusters.push(key);
				continue;				
			}				
			if (zoomLevel == 6 && count < 26) {
				smallClusters.push(key);
				continue;				
			}	
			if (zoomLevel == 7 && count < 41) {
				smallClusters.push(key);
				continue;				
			}	
			if (zoomLevel == 8 && count < 61) {
				smallClusters.push(key);
				continue;				
			}					
			if (zoomLevel == 9 && count < 81) {
				smallClusters.push(key);
				continue;				
			}			
			if (zoomLevel > 9 && count < 101) {
				smallClusters.push(key);
				continue;				
			}

			// add to small clusters geocaches with all landmarks from the same location
			if (docLat[key].min == docLat[key].max && docLng[key].min == docLng[key].max) {
				smallClusters.push(key);
				continue;
			}
			// process the JSON returned from SOLR to make it compatible with leaflet-dvf
			var arr = {};
			arr['term'] = key;
			arr['count'] = docLat[key].count;
			arr['latLng'] = [docLat[key].mean, docLng[key].mean];
			arr['bounds'] = [[docLat[key].min, docLng[key].min], [docLat[key].max, docLng[key].max]];
			terms.push(arr);
		}
	
		var convertedJson = {};
		convertedJson['terms'] = terms;
		
		var sizeFunction = new L.LinearFunction([1, 28], [50000, 48]);
		
		var options = {
			recordsField: 'terms',
			latitudeField: 'latLng.0',
			longitudeField: 'latLng.1',
			displayOptions: {
				'count': {
					title: function (value) {
						return value;
					}
				},
			},
			layerOptions: {
				fill: false,
				stroke: false,
				weight: 0,
				color: '#80FF00',
				dropShadow: false,
			},
			setIcon: function (record, options) {
				var size = 40;
				var icon = new L.DivIcon({
					html: '<div><span>' + record.count + '</span></div>',
					iconSize: new L.Point(size, size),
					className: 'marker-cluster marker-cluster-large',
				});

				return icon;
			},
			onEachRecord: function (layer, record) {

				layer.on('click', function() {
					map.fitBounds(record.bounds);
				});
			}			
		
		};
	

		var layer = new L.MarkerDataLayer(convertedJson,options);
		
	
		if (clear) {
			assetLayerGroup.clearLayers();
			assetLayerGroup.addLayer(layer);
		} else {
			assetLayerGroup.addLayer(layer);
		}
		// map.addLayer(layer);
		
		if (smallClusters.length > 0) {
			loadSmall(0, zoomLevel);	
			
		}
		// inform the user that data is loaded
		map.spin(false);

	};
	

// var url = "http://vb-dev.bio.ic.ac.uk:7997/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata%3Atrue&rows=0" + SolrBBox + "&fl=geo_coords&stats=true&stats.field=geo_coords_ll_0___tdouble&stats.field=geo_coords_ll_1___tdouble&stats.facet=" + geoLevel + "&wt=json&indent=true&json.nl=map&json.wrf=?&callback=?";
// var url = "http://vb-dev.bio.ic.ac.uk:9090/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata%3Atrue&rows=0" + SolrBBox + "&fl=geo_coords&stats=true&stats.field=geo_coords_ll_0___tdouble&stats.field=geo_coords_ll_1___tdouble&stats.facet=" + geoLevel + "&wt=json&indent=true&json.nl=map&json.wrf=?&callback=?";
var url = "asolr/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata%3Atrue&rows=0" + SolrBBox + "&fl=geo_coords&stats=true&stats.field=geo_coords_ll_0___tdouble&stats.field=geo_coords_ll_1___tdouble&stats.facet=" + geoLevel + "&wt=json&indent=true&json.nl=map&json.wrf=?&callback=?";
	
	console.log(url);
	
	// inform the user that data is loading
	map.spin(true);
	$.getJSON(url, buildMap);
	

};
	
function loadSmall(mode, zoomLevel) {
	
	
	var bounds = map.getBounds();
	
	// fix endless bounds of leaflet to comply with SOLR limits
	var south = bounds.getSouth();
	if (south < -90) south = -90;
	var north = bounds.getNorth();
	if (north > 90) north = 90;
	var west = bounds.getWest();
	if (west < -180) west = -180;
	var east = bounds.getEast();
	if (east > 180) east = 180;
	
	
	var pruneCluster = new PruneClusterForLeaflet();

	pruneCluster.BuildLeafletCluster = function(cluster, position) {
		  var m = new L.Marker(position, {
			icon: pruneCluster.BuildLeafletClusterIcon(cluster)
		  });

		 
		  m.on('click', function() {
				// Compute the  cluster bounds (it's slow : O(n))
				var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
				var b = pruneCluster.Cluster.ComputeBounds(markersArea);

				if (b) {
				  var bounds = new L.LatLngBounds(
					new L.LatLng(b.minLat, b.maxLng),
					new L.LatLng(b.maxLat, b.minLng));

				  var zoomLevelBefore = pruneCluster._map.getZoom();
				  var zoomLevelAfter = pruneCluster._map.getBoundsZoom(bounds, false, new L.Point(20, 20, null));

				  // If the zoom level doesn't change
				  if (zoomLevelAfter === zoomLevelBefore) {
					// Send an event for the LeafletSpiderfier
					pruneCluster._map.fire('overlappingmarkers', {
					  cluster: pruneCluster,
					  markers: markersArea,
					  center: m.getLatLng(),
					  marker: m
					});

					// pruneCluster._map.setView(position, zoomLevelAfter);
				  }
				  else {
					pruneCluster._map.fitBounds(bounds);
				  }
				}		  });
		  m.on('mouseout', function() {
			//do mouseout stuff here
		  });
		  
		  m.on('mouseover', function(e) {
			
			// var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
				// pruneCluster._map.fire('overlappingmarkers', {
				  // cluster: pruneCluster,
				  // markers: markersArea,
				  // center: m.getLatLng(),
				  // marker: m
				// });				
		
		  });
		  return m;
	};	

	
	// detect the zoom level and request the appropriate facets
	var geoLevel;
		
	
	switch (zoomLevel) {
		case 1:
		case 2:
			geoLevel = "geohash_1";
			break;
		case 3:
		case 4:
		case 5:
			geoLevel = "geohash_2";
			break;
		case 6:
		case 7:
			geoLevel = "geohash_3";
			break;
		case 8:
		case 9:
			geoLevel = "geohash_4";
			break;			
		case 10:
		case 11:
			geoLevel = "geohash_5";
			break;				
		default:
			geoLevel = "geohash_6";
			break;		
		
	}
	
	// get the visible world to filter the records based on what the user is currently viewing
	SolrBBox = "&fq=geo_coords:[" + south + "," + west + " TO " + north + "," + east + "]";
	var geoQuery;
	
	if (mode == 0) {
		geoQuery = "(";
		
		for (i = 0; i < smallClusters.length; i++) {
			if ( i == smallClusters.length -1 ) {
				geoQuery += smallClusters[i];
				break;			
			}
			geoQuery += smallClusters[i] + " OR ";
		}
		
		geoQuery += ")";
	} else {
		
		geoQuery = "*";
		
	}
	
	var buildMap = function(result) {
		
		var doc = result.response.docs;
		
		 for (var key in doc) {
			// console.log(doc[key].geo_coords);
			var coords = doc[key].geo_coords.split(",");
			var marker = new PruneCluster.Marker(coords[0], coords[1]);
			pruneCluster.RegisterMarker(marker);
		}
		pruneCluster.Cluster.Size = 20;
		pruneCluster.ProcessView();
		
		if (mode) {assetLayerGroup.clearLayers()};
		
		assetLayerGroup.addLayer(pruneCluster)
		//inform the user loading is done
		map.spin(false);
	};
	

// var url = "http://vb-dev.bio.ic.ac.uk:7997/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";
// var url = "http://vb-dev.bio.ic.ac.uk:9090/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";
var url = "asolr/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";
	
	console.log(url);
	
	// inform the user that data is loading
	map.spin(true);
	$.getJSON(url, buildMap);

};