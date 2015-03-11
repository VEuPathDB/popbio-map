/**
 * Created by Ioannis on 10/03/2015.
 * A library that will gradually contain all the basic functions and objects for the VectorBase PopBio map
 * As my knowledge of javascript gets better I will try to optimize and include as much functionality in this
 * library as possible.
 */

function loadSolr(parameters) {
    "use strict";
    var clear = parameters.clear;
    var zoomLevel = parameters.zoomLevel;
    // detect the zoom level and request the appropriate facets
    var geoLevel = geohashLevel(zoomLevel,"geohash");

    //we are too deep in, just download the landmarks instead

    if (zoomLevel > 11) {
        loadSmall(1, zoomLevel);

        return;

    }

    // get the visible world to filter the records based on what the user is currently viewing
    var bounds = map.getBounds();
    var SolrBBox = "&fq=geo_coords:" + buildBbox(bounds);

    var terms = [];

    // this function processes the JSON file requested by jquery
    var buildMap = function (result) {
        // using the facet.stats we return statistics for lat and lng for each geohash
        // we are going to use these statistics to calculate the mean position of the
        // landmarks in each geohash

        // detect empty results set
        if (result.response.numFound === 0) {
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
            if (docLat.hasOwnProperty(key)) {
                var count = docLat[key].count;
                if (count < 2) {
                    smallClusters.push(key);
                    continue;
                }

                if (zoomLevel === 5 && count < 11) {
                    smallClusters.push(key);
                    continue;
                }
                if (zoomLevel === 6 && count < 26) {
                    smallClusters.push(key);
                    continue;
                }
                if (zoomLevel === 7 && count < 41) {
                    smallClusters.push(key);
                    continue;
                }
                if (zoomLevel === 8 && count < 61) {
                    smallClusters.push(key);
                    continue;
                }
                if (zoomLevel === 9 && count < 81) {
                    smallClusters.push(key);
                    continue;
                }
                if (zoomLevel > 9 && count < 101) {
                    smallClusters.push(key);
                    continue;
                }

                // add to small clusters geohashes with all landmarks from the same location
                if (docLat[key].min === docLat[key].max && docLng[key].min === docLng[key].max) {
                    smallClusters.push(key);
                    continue;
                }
                // process the JSON returned from SOLR to make it compatible with leaflet-dvf
                var arr = {};
                arr.term = key;
                arr.count = docLat[key].count;
                arr.latLng = [docLat[key].mean, docLng[key].mean];
                arr.bounds = [[docLat[key].min, docLng[key].min], [docLat[key].max, docLng[key].max]];
                terms.push(arr);
            }
        }

        var convertedJson = {};
        convertedJson.terms = terms;

        var options = {
            recordsField: "terms",
            latitudeField: "latLng.0",
            longitudeField: "latLng.1",
            displayOptions: {
                "count": {
                    title: function (value) {
                        return value;
                    }
                }
            },
            layerOptions: {
                fill: false,
                stroke: false,
                weight: 0,
                color: "#80FF00",
                dropShadow: false

            },
            setIcon: function (record) {
                var size = 40;
                return new L.DivIcon({
                    html: "<div><span>" + record.count + "</span></div>",
                    iconSize: new L.Point(size, size),
                    className: "marker-cluster marker-cluster-large"
                });
            },
            onEachRecord: function (layer, record) {

                layer.on("click", function () {
                    map.fitBounds(record.bounds);
                });
            }

        };


        var layer = new L.MarkerDataLayer(convertedJson, options);


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
    // bundle_name is here to only select samples and avoid displaying duplicate entries
    var url = "http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata%3Atrue&rows=0" + SolrBBox + "&fl=geo_coords&stats=true&stats.field=geo_coords_ll_0___tdouble&stats.field=geo_coords_ll_1___tdouble&stats.facet=" + geoLevel + "&wt=json&indent=true&json.nl=map&json.wrf=?&callback=?";

    //console.log(url);

    // inform the user that data is loading
    map.spin(true);
    $.getJSON(url, buildMap).fail(function () {
        console.log("Ahhh");
        return;
    });


}

function loadSmall(mode, zoomLevel, SolrBBox) {
    "use strict";
    var pruneCluster = new PruneClusterForLeaflet();

    pruneCluster.BuildLeafletCluster = function (cluster, position) {
        var m = new L.Marker(position, {
            icon: pruneCluster.BuildLeafletClusterIcon(cluster)
        });


        m.on("click", function () {
            // Compute the  cluster bounds (it"s slow : O(n))
            var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
            var b = pruneCluster.Cluster.ComputeBounds(markersArea);

            if (b) {
                var bounds = new L.LatLngBounds(
                    new L.LatLng(b.minLat, b.maxLng),
                    new L.LatLng(b.maxLat, b.minLng));

                var zoomLevelBefore = pruneCluster._map.getZoom();
                var zoomLevelAfter = pruneCluster._map.getBoundsZoom(bounds, false, new L.Point(20, 20, null));

                // If the zoom level doesn"t change
                if (zoomLevelAfter === zoomLevelBefore) {
                    // Send an event for the LeafletSpiderfier
                    pruneCluster._map.fire("overlappingmarkers", {
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
            }
        });
        m.on("mouseout", function () {
            //do mouseout stuff here
        });

        m.on("mouseover", function (e) {

            // var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
            // pruneCluster._map.fire("overlappingmarkers", {
            // cluster: pruneCluster,
            // markers: markersArea,
            // center: m.getLatLng(),
            // marker: m
            // });

        });
        return m;
    };


    // detect the zoom level and request the appropriate facets
    var geoLevel = geohashLevel(zoomLevel, "geohash");

    // get the visible world to filter the records based on what the user is currently viewing
    var bounds = map.getBounds();
    var SolrBBox = "&fq=geo_coords:" + buildBbox(bounds);

    var geoQuery;

    if (mode === 0) {
        geoQuery = "(";

        for (var i = 0; i < smallClusters.length; i++) {
            if (i === smallClusters.length - 1) {
                geoQuery += smallClusters[i];
                break;
            }
            geoQuery += smallClusters[i] + " OR ";
        }

        geoQuery += ")";
    } else {

        geoQuery = "*";

    }

    var buildMap = function (result) {

        var doc = result.response.docs;

        for (var key in doc) if (doc.hasOwnProperty(key)) { 
            var coords = doc[key].geo_coords.split(",");
            var marker = new PruneCluster.Marker(coords[0], coords[1]);
            pruneCluster.RegisterMarker(marker);
        }

        pruneCluster.Cluster.Size = 20;
        pruneCluster.ProcessView();

        if (mode) {
            assetLayerGroup.clearLayers();
        }
        assetLayerGroup.addLayer(pruneCluster);
        //inform the user loading is done
        map.spin(false);
    };


    // var url = "http://vb-dev.bio.ic.ac.uk:7997/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";
    // var url = "http://vb-dev.bio.ic.ac.uk:9090/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";
    var url = "http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/select?q=bundle_name:Sample AND has_geodata:true&fq=" + geoLevel + ":" + geoQuery + "&rows=10000000" + SolrBBox + "&fl=geo_coords&wt=json&indent=false&json.nl=map&json.wrf=?&callback=?";

    //console.log(url);

    // inform the user that data is loading
    map.spin(true);
    $.getJSON(url, buildMap);

}

function buildBbox(bounds){
    /*
     function buildBbox
     date: 11/03/2015
     purpose: a function that generates a SOLR compatible bounding box
     inputs: a LatLngBounds object
     outputs: a SOLR compatible bbox. If the input is not a valid LatLngBounds object it will return a generic bbox that
     covers the whole earth.
     */

    "use strict";
    var solrBbox;

    if (bounds.getEast()) {
        //console.log("bounds IS an object");
        // fix endless bounds of leaflet to comply with SOLR limits
        var south = bounds.getSouth();
        if (south < -90) {
            south = -90;
        }
        var north = bounds.getNorth();
        if (north > 90) {
            north = 90;
        }
        var west = bounds.getWest();
        if (west < -180) {
            west = -180;
        }
        if (west > 180) {
            west = 180;
        }
        var east = bounds.getEast();
        if (east > 180) {
            east = 180;
        }
        if (east < -180) {
            east = -180;
        }
        solrBbox = "[" + south + "," + west + " TO " + north + "," + east + "]";
    } else {
        console.log("bounds is not an object");
        solrBbox = "[-90,-180 TO 90, 180]"; // a generic Bbox
    }
    return(solrBbox);
}

function geohashLevel(zoomLevel, type) {
    /*
     function geohashLevel
     date: 11/03/2015
     purpose: return the proper geohash lever to use
     inputs: zoomLevel (integer), type (string)
     outputs:
     */
    var geoLevel;

    if (type === "geohash") {
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
    } else {
        // does nothing for now
    }
    return (geoLevel);
}