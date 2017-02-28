/**
 * Created by Ioann on 16/4/2016.
 */

function loadSmall(mode, zoomLevel) {
    "use strict";
    var pruneCluster = new PruneClusterForLeaflet(120, 20);

    pruneCluster.BuildLeafletClusterIcon = function (cluster) {
        var e = new L.Icon.MarkerCluster();

        e.stats = cluster.stats;
        e.population = cluster.population;
        e.trafficlight = cluster.totalWeight / cluster.population;
        return e;
    };

    // Override PrepareLeafletMarker to add event listeners

    pruneCluster.PrepareLeafletMarker = function (marker, data, category) {
        marker.on("dblclick", function () {
            clearTimeout(timer);
            prevent = true;

            // Zoom-in to marker
            if (map.getZoom() < 15) {
                map.setView(marker._latlng, 15, {animate: true});
            } else {
                removeHighlight();
                sidebar.close();
                setTimeout(function () {
                    resetPlots()
                }, delay);
            }

        });
        marker.on("click", function () {

            var wasHighlighted = false;
            if (marker === highlight) wasHighlighted = true;
            removeHighlight(marker._icon);
            // removeHighlight(marker);
            highlightMarker(marker._icon);
            // highlightMarker(marker);
            timer = setTimeout(function () {
                if (wasHighlighted) {
                    removeHighlight();
                    sidebar.close();
                    setTimeout(function () {
                        resetPlots()
                    }, delay);
                    return;
                }
                if (!prevent) {

                    // first we need a list of all categories

                    var fullElStats = [];

                    fullElStats.push({
                        "label": category.replace(/sensu lato/, "sl")
                            .replace(/chromosomal form/, "cf"),
                        "value": 1,
                        "color": (palette[category] ? palette[category] : "#000000")
                    });

                    if ($('#sidebar').hasClass('collapsed')) {
                        if ($('.sidebar-pane.active').attr('id') === 'help') {
                            sidebar.open('graphs');
                        } else {
                            sidebar.open($('.sidebar-pane.active').attr('id'));
                        }
                    }
                    updatePieChart(1, fullElStats);
                    var filter = '&fq=id:' + data.id;
                    createBeeViolinPlot("#swarm-chart-area", filter);
                    updateTable("#table-contents", filter);

                }
                prevent = false;
            }, delay);
        });

        if (data.icon) {
            if (typeof data.icon === 'function') {
                marker.setIcon(data.icon(data, category));
            }
            else {
                marker.setIcon(data.icon);
            }
        }
        if (data.popup) {
            var content = typeof data.popup === 'function' ? data.popup(data, category) : data.popup;
            if (marker.getPopup()) {
                marker.setPopupContent(content, data.popupOptions);
            }
            else {
                marker.bindPopup(content, data.popupOptions);
            }
        }
    };

    L.Icon.MarkerCluster = L.Icon.extend({
        options: {
            iconSize: new L.Point(30, 30),
            className: 'prunecluster leaflet-markercluster-icon'
        },

        createIcon: function () {
            // based on L.Icon.Canvas from shramov/leaflet-plugins (BSD licence)
            var e = document.createElement('canvas');
            this._setIconStyles(e, 'icon');
            var s = this.options.iconSize;
            e.width = s.x;
            e.height = s.y;
            this.draw(e.getContext('2d'), s.x, s.y);
            return e;
        },

        createShadow: function () {
            return null;
        },

        draw: function (canvas) {
            var pi2 = Math.PI * 2;
            var start = Math.PI * 1.5;
            var iconSize = this.options.iconSize.x, iconSize2 = iconSize / 2, iconSize3 = iconSize / 2.5;

            for (var key in this.stats) if (this.stats.hasOwnProperty(key)) {

                var size = this.stats[key] / this.population;
                //console.log(key + ":" + this.stats[key]);

                if (size > 0) {
                    canvas.beginPath();
                    canvas.moveTo(iconSize2, iconSize2);
                    if (palette.hasOwnProperty(key)) {
                        //console.log(key + '=' + palette[key])
                        canvas.fillStyle = palette[key];
                    } else {
                        canvas.fillStyle = palette["others"];
                        //console.log(key + '*' + palette["others"]);
                    }
                    var from = start,
                        to = start + size * pi2;

                    if (to < from) {
                        from = start;
                    }
                    canvas.arc(iconSize2, iconSize2, iconSize2, from, to);

                    start = start + size * pi2;
                    canvas.lineTo(iconSize2, iconSize2);
                    canvas.fill();
                    canvas.closePath();
                }

            }

            canvas.beginPath();
            canvas.fillStyle = 'white';
            canvas.arc(iconSize2, iconSize2, iconSize3, 0, Math.PI * 2);
            canvas.fill();
            canvas.closePath();

            var colors = markerColor(this.trafficlight);

            if ($('#SelectView').val() === 'ir') {

                canvas.beginPath();
                canvas.fillStyle = colors[0];
                canvas.arc(iconSize2, iconSize2, iconSize2 - 7, 0, Math.PI * 2);
                canvas.fill();
                canvas.closePath();
            }

            canvas.fillStyle = ($('#SelectView').val() === 'ir') ? colors[1] : '#555';
            //canvas.fillStyle = ($('#SelectView').val() === 'ir') ? colors[1] : '#555';
            canvas.textAlign = 'center';
            canvas.textBaseline = 'middle';
            canvas.font = 'bold 12px sans-serif';

            canvas.fillText(this.population, iconSize2, iconSize2, iconSize);
        }
    });

    pruneCluster.BuildLeafletCluster = function (cluster, position) {
        var m = new L.Marker(position, {
            icon: pruneCluster.BuildLeafletClusterIcon(cluster)
        });

        m.on("dblclick", function () {
            clearTimeout(timer);
            prevent = true;

            // Compute the  cluster bounds (it"s slow : O(n))
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

                    removeHighlight();
                    sidebar.close();
                    setTimeout(function () {
                        resetPlots()
                    }, delay);

                    // Send an event for the LeafletSpiderfier
                    pruneCluster._map.fire("overlappingmarkers", {
                        cluster: pruneCluster,
                        markers: markersArea,
                        center : m.getLatLng(),
                        marker : m
                    });

                }
                else {
                    pruneCluster._map.fitBounds(bounds);
                }
            }
        });
        m.on("click", function () {

            var wasHighlighted = false;
            if (m === highlight) wasHighlighted = true;

            removeHighlight(m._icon);
            // removeHighlight(m);
            highlightMarker(m._icon);
            // highlightMarker(m);
            timer = setTimeout(function () {
                if (!prevent) {
                    // is this marker already active?
                    if (wasHighlighted) {
                        removeHighlight();
                        sidebar.close();
                        setTimeout(function () {
                            resetPlots()
                        }, delay);
                        return;
                    }
                    //do click stuff here
                    // first we need a list of all categories
                    var fullElStats = [];

                    //FixMe: Remove these replacements when proper names are returned from the popbio API
                    var stats = cluster.stats;
                    for (var key in stats) {
                        fullElStats.push({
                            //"label": key.replace(/^([A-Z])(\w+)(.+)$/, "$1.$3")
                            "label": key.replace(/sensu lato/, "sl")
                                .replace(/chromosomal form/, "cf"),
                            "value": stats[key],
                            "color": (palette[key] ? palette[key] : "#000000")
                        });
                    }

                    if ($('#sidebar').hasClass('collapsed')) {
                        if ($('.sidebar-pane.active').attr('id') === 'help') {
                            sidebar.open('graphs');
                        } else {
                            sidebar.open($('.sidebar-pane.active').attr('id'));
                        }
                    }
                    updatePieChart(cluster.population, fullElStats);

                    var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
                    var b = pruneCluster.Cluster.ComputeBounds(markersArea);

                    if (b) {
                        var bounds = new L.LatLngBounds(
                            new L.LatLng(b.minLat, b.maxLng),
                            new L.LatLng(b.maxLat, b.minLng));

                    }

                    createBeeViolinPlot("#swarm-chart-area", buildBbox(bounds));
                    updateTable("#table-contents", buildBbox(bounds));

                }
            }, delay);
            prevent = false;

        });

        m.on("mouseover", function () {
            moveTopMarker(m);
            var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
            var b = pruneCluster.Cluster.ComputeBounds(markersArea);

            if (b) {
                var recBounds = new L.LatLngBounds(
                    new L.LatLng(b.minLat, b.maxLng),
                    new L.LatLng(b.maxLat, b.minLng));

            }

            if (rectHighlight !== null) map.removeLayer(rectHighlight);

            rectHighlight = L.rectangle(recBounds, {
                color    : "grey",
                weight   : 1,
                fill     : true,
                clickable: false
            }).addTo(map);

        });
        m.on("mouseout", function () {
            removeTopMarker(m);
            if (rectHighlight !== null) map.removeLayer(rectHighlight);
            rectHighlight = null;

        });
        return m;
    };

    // detect the zoom level and request the appropriate facets
    var geoLevel = geohashLevel(zoomLevel, "geohash");

    var geoQuery;

    if (mode === 0) {
        //geoQuery = "(";
        geoQuery = "(";

        for (var i = 0; i < smallClusters.length; i++) {
            if (i === smallClusters.length - 1) {
                geoQuery += smallClusters[i];
                break;
            }
            //geoQuery += smallClusters[i] + " OR ";
            geoQuery += smallClusters[i] + " ";
        }

        geoQuery += ")";
    } else {

        geoQuery = "*";

    }

    var buildMap = function (result) {

        var doc = result.response.docs;

        for (var key in doc) if (doc.hasOwnProperty(key)) {
            var coords = doc[key].geo_coords.split(" ");
            var pheVal = ($('#SelectView').val() === 'ir') ? doc[key].phenotype_rescaled_value_f : -1;
            var marker = new PruneCluster.Marker(coords[1], coords[0]);
            marker.data.id = doc[key].id;
            if (doc[key].hasOwnProperty("species_category")) {
                var species = doc[key].species_category[0];
                marker.category = doc[key].species_category[0];
                // store trafficlight value as weights
                marker.weight = pheVal;
                marker.data.trafficlight = pheVal;
                //console.log(doc[key].species_category[0]);
            } else {
                console.log(key + ": no species defined")
            }
            marker.data.icon = L.VectorMarkers.icon({
                prefix      : 'fa',
                icon        : 'circle',
                markerColor : palette[species] ? palette[species] : "red",
                iconColor   : markerColor(pheVal)[0],
                extraClasses: 'single-marker-icon'
            });

            pruneCluster.RegisterMarker(marker);
        }

        if (mode) {
            assetLayerGroup.clearLayers();
            $("#markersCount").html(result.response.numFound + ' samples in current view');

        }
        assetLayerGroup.addLayer(pruneCluster);
        //inform the user loading is done
        if (rectHighlight !== null) map.removeLayer(rectHighlight);
        rectHighlight = null;
        map.spin(false);
    };

    var url = solrPopbioUrl + $('#SelectView').val() + 'Markers?' + qryUrl + "&fq=" + geoLevel + ":" + geoQuery + buildBbox(map.getBounds()) + "&json.wrf=?&callback=?";

    // inform the user that data is loading

    map.spin(true);
    $.getJSON(url, buildMap);

}
