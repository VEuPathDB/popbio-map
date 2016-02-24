/*
 function initialize_map
 date: 18/6/2015
 purpose:
 inputs:
 outputs:
 */

function initializeMap() {
    "use strict";

    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map', {
        center: [23.079, 3.515],
        zoom: 3,
        zoomControl: false,
        worldCopyJump: true  //  the map tracks when you pan to another "copy" of the world and seamlessly jumps to the original one so that all overlays like markers and vector layers are still visible.
    });

    map.spin(true);

    map.addControl(new L.Control.FullScreen({
        position: "topright",
        forcePseudoFullscreen: true
    }));

    map.addControl(new L.Control.ZoomMin({position: "topright"}));
    sidebar = L.control.sidebar('sidebar').addTo(map);


    var mp1 = new L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        subdomains: ["otile1", "otile2", "otile3", "otile4"],
        noWrap: 0,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>'
    });

    var mp2 = new L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        maxNativeZoom: 11,
        subdomains: ["otile1", "otile2", "otile3", "otile4"],
        noWrap: 0,
        attribution: 'Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
    });

    var mp3 = new L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        noWrap: 0,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>'
    });

    map.addLayer(mp1);
    assetLayerGroup = new L.LayerGroup();
    assetLayerGroup.addTo(map);
    var layerCtl = new L.Control.Layers({
        "MapQuest-OSM": mp1,
        'OpenStreetMap': mp3,
        'MapQuest Open Aerial': mp2
    });
    layerCtl.setPosition('topright');
    layerCtl.addTo(map);


    // Now generate the legend

    var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*&facet.pivot=geohash_2,species_category&json.wrf=?&callback=?';
    //console.log('url: ' + url);
    //$.getJSON(url, generatePalette);
    legend = new L.control.legend(url);

    if (rectHighlight !== null) map.removeLayer(rectHighlight);
    rectHighlight = null;
    map.spin(false);

}

/*
 function initializeSearch
 date: 18/6/2015
 purpose:
 inputs:
 outputs:
 */
function initializeSearch() {

    // Reset search "button"
    $('#reset-search').click(function () {
        $('#search_ac').tagsinput('removeAll');

        removeHighlight();
        sidebar.close();
        setTimeout(function () {
            resetPlots()
        }, delay);
        filterMarkers('');
    });

    // World search toggle
    $('#toggle-world').click(function () {

        if ($('#world-search').val() === '1') {
            $('#toggle-world').toggleClass("btn-primary", false)
                .attr('title', 'Enable global search suggestions');
            $('#world-search').val('0');
            $('#world-icon').css('color', '#265a88');
        } else {
            $('#toggle-world').toggleClass("btn-primary", true)
                .attr('title', 'Limit search suggestions to current view');
            $('#world-search').val('1');
            $('#world-icon').css('color', 'white');
        }
    });


    //FixMe: Result counts from acOtherResults and the main SOLR core don't match, possibly due to different case handling
    //       update: the issue was with the number of results Anywhere. When within a certain categories the results seem to match
    //              will keep an eye on it
    //ToDo: Add copy/paste support of IDs (low priority)

    var acSuggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        limit: 7,
        minLength: 2,
        hint: false,

        remote: {
            url: solrTaUrl + $('#view-mode').val() + 'Ac?q=',
            ajax: {
                dataType: 'jsonp',
                data: {
                    'wt': 'json',
                    'rows': 7
                },
                jsonp: 'json.wrf'
            },
            replace: function (url, query) {
                url = solrTaUrl + $('#view-mode').val() + 'Ac?q=';
                var match = query.match(/([^@]+)@([^@]*)/);
                if (match != null) {
                    // matched text: match[0]
                    // match start: match.index
                    // capturing group n: match[n]
                    partSearch = match[1];
                    //console.log(url + encodeURI(match[1]));
                    if ($('#world-search').val() === '1') {
                        return solrTaUrl + $('#view-mode').val() + 'Acat?q=' + encodeURI(match[1]);
                    } else {
                        return solrTaUrl + $('#view-mode').val() + 'Acat?q=' + encodeURI(match[1]) + buildBbox(map.getBounds());
                    }
                } else {
                    // Match attempt failed
                    partSearch = false;

                    if ($('#world-search').val() === '1') {
                        return url + encodeURI(query);
                    } else {
                        return url + encodeURI(query) + buildBbox(map.getBounds());
                    }
                }

            },
            filter: function (data) {
                if (partSearch) {
                    return $.map(data.grouped.type.doclist.docs, function (data) {
                        return {
                            value: partSearch,
                            id: data['id'],
                            type: data['type'],
                            field: data['field'],
                            is_synonym: data['is_synonym'],
                            qtype: 'partial'

                        };
                    });
                } else {
                    return $.map(data.grouped.textsuggest_category.doclist.docs, function (data) {
                        return {
                            value: data['textsuggest_category'],
                            type: data['type'],
                            id: data['id'],
                            field: data['field'],
                            is_synonym: data['is_synonym'],
                            qtype: 'exact'

                        };
                    });

                }
            }
        }
    });

    acSuggestions.initialize();

    var acOtherResults = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        limit: 10,
        minLength: 3,

        remote: {
            url: solrTaUrl + $('#view-mode').val() + 'Acgrouped?q=',
            ajax: {
                dataType: 'jsonp',

                data: {
                    'wt': 'json',
                    'rows': 10
                },

                jsonp: 'json.wrf'
            },
            replace: function (url, query) {
                url = solrTaUrl + $('#view-mode').val() + 'Acgrouped?q=';
                if ($('#world-search').val() === '1') {
                    return url + encodeURI(query) + '*';
                } else {
                    return url + encodeURI(query) + '*' + buildBbox(map.getBounds());
                }
            },
            filter: function (data) {
                var allResults = data.grouped.stable_id.ngroups;
                return $.map(data.facet_counts.facet_fields.type, function (data) {
                    if (data[1] > 0) {
                        return {
                            count: data[1],
                            type: data[0],
                            field: mapTypeToField(data[0]),
                            value: $('#search_ac').tagsinput('input')[0].value,
                            qtype: 'summary'

                        }
                    }
                });
            }
        }
    });

    acOtherResults.initialize();


    $('#search_ac').tagsinput({
        tagClass: function (item) {
            switch (item.type) {
                case 'Taxonomy'   :
                    return 'label label-primary fa fa-sitemap';   // dark blue
                case 'Geography':
                    return 'label label-primary fa fa-map-marker';  // dark blue
                case 'Title'  :
                    return 'label label-success fa fa-tag';    // green
                case 'Description':
                    return 'label label-success fa fa-info-circle';   // green
                case 'Projects'   :
                    return 'label label-success fa fa-database';   // green
//                    return 'label label-default fa fa-database';   // grey
                case 'Anywhere'   :
                    return 'label label-default fa fa-search';   // grey
//                    return 'label label-info fa fa-search';   // cyan
                case 'Pubmed references' :
                    return 'label label-success fa fa-book';
                case 'Insecticides' :
                    return 'label label-success fa fa-eyedropper';
                case 'Collection protocols' :
                    return 'label label-success fa fa-shopping-cart';
                default :
                    return 'label label-warning fa fa-search';   // orange
            }
        },
        itemValue: 'value',
        itemText: function (item) {
            // add a leading space to separate text from tag icon
            return ' ' + item.value;
        },
        typeaheadjs: ({
            options: {
                minLength: 3,
                hint: false,
                highlight: false
            },
            datasets: [
                {
                    name: 'acSuggestions',
                    displayKey: 'value',
                    source: acSuggestions.ttAdapter(),
                    templates: {
                        empty: function () {
                            var msg;
                            if ($('#world-search').val() === '1') {
                                msg = 'No results found';
                            } else {
                                msg = 'No results found. Try enabling world search.';

                            }
                            return [
                                '<span class="tt-suggestions" style="display: block;">',
                                '<div class="tt-suggestion">',
                                '<p style="white-space: normal;">',
                                msg,
                                '</p>',
                                '</div>',
                                '</span>'
                            ].join('\n')
                        },
                        suggestion: function (item) {
                            return '<p>' + item.value + (item.is_synonym ? ' (<i class="fa fa-list-ul" title="Duplicate term / Synonym" style="cursor: pointer"></i>)' : '') +
                                ' <em> in ' + item.type + '</em></p>';
                        }

                    }
                },
                {
//                    ToDo: Partial searches should display wildcards in the tag
//                    ToDo: Add hovers on tags to display the term and field description
                    name: 'acOtherResults',
                    displayKey: 'value',
                    source: acOtherResults.ttAdapter(),
                    templates: {
                        header: '<h4 class="more-results">More suggestions</h4>',
                        suggestion: function (item) {
                            return '<p>~' + item.count + ' <em>in ' + item.type + '</em></p>';
                        }

                    }
                }
            ]
        })

    });

    // Set current view
    $("#SelectView").find("li a").click(function () {
        var selText = $(this).text();
        if (selText === "Samples view") {
            $(this).parents(".dropdown").find(".dropdown-toggle").html(selText + ' <span class="caret"></span>');
            $('#view-mode').val('smpl');
        } else {
            $(this).parents(".dropdown").find(".dropdown-toggle").html('IR phenotypes view' + ' <span class="caret"></span>');
            $('#view-mode').val('ir');
        }
        var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*&facet.pivot=geohash_2,species_category&json.wrf=?&callback=?';

        removeHighlight();
        sidebar.close();
        setTimeout(function () {
            resetPlots()
        }, delay);
        $.getJSON(url, function (data) {
            legend.populateLegend(data, "species_category")
        });
        acSuggestions.initialize(true);
        acOtherResults.initialize(true);

    });

}

/**
 * Created by Ioannis on 10/03/2015.
 * A library that will gradually contain all the basic functions and objects for the VectorBase PopBio map
 * As my knowledge of javascript gets better I will try to optimize and include as much functionality in this
 * library as possible.
 */

function loadSolr(parameters) {

    //ToDo: Add AJAX error and timeout handling
    //FixMe: Missing values from species_category field messing up pie charts.
    "use strict";
    var clear = parameters.clear;
    var zoomLevel = parameters.zoomLevel;
    // detect the zoom level and request the appropriate facets
    var geoLevel = geohashLevel(zoomLevel, "geohash");

    // build a geohash grid
    var mapBounds = map.getBounds();
    var South = mapBounds.getSouth(), North = mapBounds.getNorth(), East = mapBounds.getEast(), West = mapBounds.getWest();
    if (urlParams.grid === "true") addGeohashes(map, South, West, North, East, geoLevel.slice(-1));

    //we are too deep in, just download the landmarks instead

    if (zoomLevel > 11) {
        loadSmall(1, zoomLevel);

        return;

    }

    var terms = [];

    // this function processes the JSON file requested by jquery
    var buildMap = function (result) {
        // using the facet.stats we return statistics for lat and lng for each geohash
        // we are going to use these statistics to calculate the mean position of the
        // landmarks in each geohash

        // display the number of results
        $("#markersCount").html(result.response.numFound + ' samples in current view');
        // detect empty results set
        if (result.response.numFound === 0) {
            if (clear) {
                assetLayerGroup.clearLayers();
            }
            if (rectHighlight !== null) map.removeLayer(rectHighlight);
            rectHighlight = null;
            map.spin(false);
            return;
        }

        var docLat, docLng, docSpc, docPhe;

        var statFields = result.stats.stats_fields;
        var facetCounts = result.facet_counts;

        var viewMode = $('#view-mode').val();

        // process the correct geohashes based on the zoom level
        switch (zoomLevel) {
            case 1:
            case 2:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_1;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_1;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_1 : null;
                docSpc = facetCounts.facet_pivot["geohash_1,species_category"];
                break;
            case 3:
            case 4:
            case 5:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_2;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_2;
                docPhe = ((viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_2 : null);
                docSpc = facetCounts.facet_pivot["geohash_2,species_category"];
                break;
            case 6:
            case 7:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_3;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_3;
                docPhe = ((viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_3 : null);
                docSpc = facetCounts.facet_pivot["geohash_3,species_category"];
                break;
            case 8:
            case 9:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_4;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_4;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_4 : null;
                docSpc = facetCounts.facet_pivot["geohash_4,species_category"];
                break;
            case 10:
            case 11:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_5;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_5;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_5 : null;
                docSpc = facetCounts.facet_pivot["geohash_5,species_category"];
                break;
            default:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_6;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_6;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_6 : null;
                docSpc = facetCounts.facet_pivot["geohash_6,species_category"];
                break;

        }

        // depending on the zoom level and the count of landmarks in each geohash we are saving
        // geohashes that contain few enough landmarks to display them using the prune cluster
        // layer. This needs tweaking to get the right balance of info, performance and transfer times
        // The following values seem to work well. Most of the latency is due to SOLR taking a long
        // time to return the landmarks of several geohashes.
        smallClusters = [];

        var populations = []; // keep the total marker count for each geohash
        var statistics = []; // keep the species count for each geohash
        var fullStatistics = []; // keep the species count for each geohash


        for (var key in docLat) {
            // Depending on zoom level and the number of clusters in the geohash add the to smallClusters to be processed later
            // at the same time exclude them from [terms] so as to not display them twice
            if (docLat.hasOwnProperty(key)) {
                var count = docLat[key].count;
                if (count < 2) {
                    smallClusters.push(key);
                    continue;
                }

                // go over the facet pivots and save the population and statistics
                docSpc.forEach(function (element, array) {
                    populations[element.value] = element.count;
                    var elStats = [];
                    var fullElStats = [];
                    // check if pivot is empty
                    if (element.pivot) {


                        element.pivot.forEach(function (innElement) {
                            var key = innElement.value,
                                count = innElement.count;

                            elStats[key] = count;

                            //FixMe: Remove these replacements when proper names are returned from the popbio API
                            fullElStats.push({
                                "label": key.replace(/sensu lato/, "sl")
                                    .replace(/chromosomal form/, "cf"),
                                //"label": key,
                                "value": count,
                                "color": (palette[key] ? palette[key] : "#000000")
                            });

                        });
                    } else {

                        console.log("ERROR: Pivot for element " + element.value + "appears to be empty");
                    }
                    statistics[element.value] = elStats;
                    fullStatistics[element.value] = fullElStats;
                });

                // process the JSON returned from SOLR to make it compatible with leaflet-dvf
                var arr = {};
                arr.term = key;
                arr.count = docLat[key].count;
                arr.latLng = [docLat[key].mean, docLng[key].mean];
                arr.bounds = [[docLat[key].min, docLng[key].min], [docLat[key].max, docLng[key].max]];
                arr.population = populations[key];
                arr.trafficlight = (viewMode === 'ir') ? docPhe[key].mean : -1;
                arr.stats = statistics[key];
                arr.fullstats = fullStatistics[key];
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
                return new L.Icon.Canvas({
                    iconSize: new L.Point(size, size),
                    className: "marker-cluster",
                    population: record.population,
                    trafficlight: record.trafficlight,
                    stats: record.stats
                });
            },
            onEachRecord: function (layer, record) {
                layer.on("dblclick", function () {
                    clearTimeout(timer);
                    prevent = true;

                    map.fitBounds(record.bounds);
                    //resetPlots();
                });
                layer.on("click", function () {

                    var wasHighlighted = false;
                    if (layer === highlight) wasHighlighted = true;
                    removeHighlight(layer);
                    highlightMarker(layer);
                    timer = setTimeout(function () {
                        if (!prevent) {

                            if (wasHighlighted) {
                                removeHighlight();
                                sidebar.close();
                                setTimeout(function () {
                                    resetPlots()
                                }, delay);
                                return;
                            }

                            if ($('#sidebar').hasClass('collapsed')) {
                                if ($('.sidebar-pane.active').attr('id') === 'help') {
                                    sidebar.open('graphs');
                                } else {
                                    sidebar.open($('.sidebar-pane.active').attr('id'));
                                }
                            }
                            updatePieChart(record.population, record.fullstats);
                            var recBounds = L.latLngBounds(record.bounds);
                            createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                            updateTable("#table-contents", buildBbox(recBounds));
                        }
                    }, delay);
                    prevent = false;
                });
                layer.on("mouseover", function () {
                    moveTopMarker(layer);
                    var recBounds = L.latLngBounds(record.bounds);
                    if (rectHighlight !== null) map.removeLayer(rectHighlight);

                    rectHighlight = L.rectangle(recBounds, {
                        color: "grey",
                        weight: 1,
                        fill: true,
                        clickable: false
                    }).addTo(map);

                });
                layer.on("mouseout", function () {
                    removeTopMarker(layer);
                    if (rectHighlight !== null) map.removeLayer(rectHighlight);
                    rectHighlight = null;

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
        if (rectHighlight !== null) map.removeLayer(rectHighlight);
        rectHighlight = null;
        map.spin(false);

    };


    var url = solrPopbioUrl + $('#view-mode').val() + 'Geoclust?' + qryUrl + buildBbox(map.getBounds()) + "&stats.facet=" + geoLevel + "&facet.pivot=" + geoLevel + ",species_category&json.wrf=?&callback=?";

    //console.log(url);

    // inform the user that data is loading
    map.spin(true);
    $.getJSON(url, buildMap).fail(function () {
        console.log("Ahhh");
        map.spin(false);

    });


}

function loadSmall(mode, zoomLevel) {
    "use strict";
    var pruneCluster = new PruneClusterForLeaflet(120);

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
            if (map.getZoom() < 11) {
                map.setView(marker._latlng, 11, {animate: true});
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
            removeHighlight(marker);
            highlightMarker(marker);
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
            iconSize: new L.Point(40, 40),
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

            if ($('#view-mode').val() === 'ir') {

                canvas.beginPath();
                canvas.fillStyle = colors[0];
                canvas.arc(iconSize2, iconSize2, iconSize2 - 7, 0, Math.PI * 2);
                canvas.fill();
                canvas.closePath();
            }

            canvas.fillStyle = ($('#view-mode').val() === 'ir') ? colors[1] : '#555';
            //canvas.fillStyle = ($('#view-mode').val() === 'ir') ? colors[1] : '#555';
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
                        center: m.getLatLng(),
                        marker: m
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

            removeHighlight(m);
            highlightMarker(m);
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
                color: "grey",
                weight: 1,
                fill: true,
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
            var coords = doc[key].geo_coords.split(",");
            var pheVal = ($('#view-mode').val() === 'ir') ? doc[key].phenotype_rescaled_value_f : -1;
            var marker = new PruneCluster.Marker(coords[0], coords[1]);
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
                prefix: 'fa',
                icon: 'circle',
                markerColor: palette[species] ? palette[species] : "red",
                iconColor: markerColor(pheVal)[0],
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


    var url = solrPopbioUrl + $('#view-mode').val() + 'Markers?' + qryUrl + "&fq=" + geoLevel + ":" + geoQuery + buildBbox(map.getBounds()) + "&json.wrf=?&callback=?";

    // inform the user that data is loading

    map.spin(true);
    $.getJSON(url, buildMap);

}

function buildBbox(bounds) {
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
        solrBbox = "&fq=geo_coords:[" + south + "," + west + " TO " + north + "," + east + "]";
    } else {
        //console.log("bounds is not an object");
        solrBbox = "&fq=geo_coords:[-90,-180 TO 90, 180]"; // a generic Bbox
    }
    return (solrBbox);
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
        //TODO: Automatically construct the proper facet statistics object based on zoomLevel
    }
    return (geoLevel);
}


function updatePieChart(population, stats) {
    if (stats) {


        $('#pie-chart-header').empty();

        d3.select("#pie-chart-area svg")
            .attr("width", "380px")
            .attr("height", "500px")
            .style({width: "380px", height: "500px"});

        nv.addGraph(function () {
            var chart = nv.models.pieChart()
                .x(function (d) {
                    return d.label
                })
                .y(function (d) {
                    return d.value
                })
                .color(function (d) {
                    return d.data["color"]
                })
                .showLabels(true)     //Display pie labels
                .labelThreshold(.05)  //Configure the minimum slice size for labels to show up
                .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or "percent"
                .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
                .donutRatio(0.5)     //Configure h ow big you want the donut hole size to be.
                .growOnHover(false);


            d3.select("#pie-chart-area svg")
                .datum(stats)
                .transition().duration(800)
                .call(chart);

            nv.utils.windowResize(chart.update);         //Renders the chart when window is resized.

            return chart;
        });


    } else {


    }
}
$.fn.redraw = function () {
    /*
     function redraw
     date: 20/03/2015
     purpose: This snippet can help in cases where the browser doesn't redraw an updated element properly.
     inputs: call it like $('.theElement').redraw();
     outputs:
     */

    $(this).each(function () {
        var redraw = this.offsetHeight;
    });
};


function updateTable(divid, filter, singleMarker) {
    "use strict";

    var header = divid + '-header';
    $(header).empty();

    if ($('#view-mode').val() === 'smpl') {
        var url = solrPopbioUrl + 'smplTable?&' + qryUrl + filter + '&sort=id asc&json.wrf=?&callback=?';

    } else {

        var url = solrPopbioUrl + 'irTable?&' + qryUrl + filter + '&sort=id asc&json.wrf=?&callback=?';
    }


    // generate a url with cursorMark
    var cursorUrl = url + '&cursorMark=*', cursorMark = '*', nextCursorMark;

    // start spinning
    PaneSpin('marker-table', 'start');

    var self = this;

    $(divid).empty();

    // turn off previous scroll event listeners
    //$('#marker-table').off("scroll");
    $('#marker-table').infiniteScrollHelper('destroy');

    $.getJSON(cursorUrl)
        .done(function (json) {
            // make sure the parent div is empty
            if (json.response.numFound && json.response.numFound > 0) {
                var docs = json.response.docs;

                // set the next cursorMark
                nextCursorMark = json.nextCursorMark;
                cursorUrl = url + '&cursorMark=' + nextCursorMark;

                tableHtml(divid, docs);
            }
            PaneSpin('marker-table', 'stop');

            var pageCount;

            $('#marker-table').infiniteScrollHelper({
                bottomBuffer: 80,
                loadMore: function (page, done) {

                    PaneSpin('marker-table', 'start');

                    $.getJSON(cursorUrl)
                        .done(function (json) {

                            if (json.response.numFound && json.response.numFound > 0) {
                                var docs = json.response.docs;

                                cursorMark = nextCursorMark;
                                nextCursorMark = json.nextCursorMark;
                                cursorUrl = url + '&cursorMark=' + nextCursorMark;

                                tableHtml(divid, docs);
                            }
                            PaneSpin('marker-table', 'stop');
                            done();
                        })
                        .fail(function () {
                            PaneSpin('marker-table', 'stop');

                            console.log('Failed while loading smplTable');
                            done()
                        });
                }
            });

        })
        .fail(function () {
            PaneSpin('marker-table', 'stop');

            console.log('Failed while loading smplTable')
        });


}

function tableHtml(divid, results) {


    results.forEach(function (element) {
        var dates = element.collection_date;
        var frmDate;

        // convert a pair of dates (date range) to a string
        if (dates && dates.length > 1) {

            var startDate = new Date(dates[0]), endDate = new Date(dates[1]);
            frmDate = startDate.toDateString() + '-' + endDate.toDateString();
        } else if (dates && dates.length > 0) {
            var date = new Date(dates[0]);
            frmDate = date.toDateString();
        }

        var species = element.species_category ? element.species_category[0] : 'Unknown';

        if ($('#view-mode').val() === 'smpl') {

            var row = {
                accession: element.accession,
                bundleName: element.bundle_name,
                url: element.url,
                sampleType: element.sample_type,
                geoCoords: element.geo_coords,
                geolocation: element.geolocations[0],
                species: species,
                bgColor: palette[species],
                textColor: getContrastYIQ(palette[species]),
                collectionDate: frmDate,
                projects: element.projects,
                collectionProtocols: element.collection_protocols
            };

            var template = $.templates("#smplRowTemplate");
        } else {

            var row = {
                accession: element.accession,
                bundleName: element.bundle_name,
                url: element.url,
                sampleType: element.sample_type,
                geoCoords: element.geo_coords,
                geolocation: element.geolocations[0],
                species: species,
                bgColor: palette[species],
                textColor: getContrastYIQ(palette[species]),
                collectionDate: frmDate,
                projects: element.projects,
                collectionProtocols: element.collection_protocols,
                protocols: element.protocols,
                phenotypeValue: element.phenotype_value_f,
                phenotypeValueType: element.phenotype_value_type_s,
                phenotypeValueUnit: element.phenotype_value_unit_s,
                insecticide: element.insecticide_s,
                sampleSize: element.sample_size_i,
                concentration: element.concentration_f,
                concentrationUnit: element.concentration_unit_s,
                duration: element.duration_f,
                durationUnit: element.duration_unit_s

            };

            var template = $.templates("#irRowTemplate");
        }
        var htmlOutput = template.render(row);
        $(divid).append(htmlOutput);


    });

}


function colorLuminance(hex, lum) {
    /*
     function colorLuminance
     date: 20/03/2015
     purpose: extracts the red, green and blue values in turn, converts them to decimal, applies the luminosity factor,
     and converts them back to hexadecimal.
     inputs: <hex> original hex color value <lum> level of luminosity from 0 (lightest) to 1 (darkest)
     outputs: a hex represantation of the color
     source: http://www.sitepoint.com/javascript-generate-lighter-darker-color/
     */

    // validate hex string
    "use strict";

    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }

    return rgb;
}

function filterMarkers(items) {
    "use strict";
    if (items.length === 0) {
        qryUrl = 'q=*';
        loadSolr({clear: 1, zoomLevel: map.getZoom()});
        return;
    }

    //qryUrl = 'q=';
    var terms = {};
    //items = $("#search_ac").tagsinput('items');
    items.forEach(function (element) {

        if (!terms.hasOwnProperty(element.type)) terms[element.type] = [];

        if (element.qtype == 'exact') {
            terms[element.type].push({"field": element.field, "value": '"' + element.value + '"'});
        } else {
            terms[element.type].push({"field": element.field, "value": '*' + element.value + '*'});
            //console.log("inexact");
        }
    });

    var i = 0;
    qryUrl = 'q=(';
    // get the count of terms categories (types)
    var tlen = Object.keys(terms).length;

    for (var obj in terms) {
        var qries = {}; // store category terms grouped by field
        var k = 0;
        var arr = terms[obj];

        // sort the elements by field
        arr.sort(function (a, b) {
            if (a.field < b.field) return -1;
            if (a.field > b.field) return 1;
            return 0;
        }).forEach(function (element, index) {  // concatenate and store the terms for each field
            qries[element.field] ? qries[element.field] += ' OR ' + element.value : qries[element.field] = element.value;
        });

        // get the numbeer of different field queries per category (this is usually one or two)
        var alen = Object.keys(qries).length;
        // more than one categories
        if (i < tlen - 1) {
            // more than one fields for this category
            if (k < alen - 1) {
                if (obj === 'Anywhere') {
                    qryUrl += '(' + qries['anywhere'] + ') AND ';
                } else {
                    qryUrl += '(';
                    for (var fieldQry in qries) {
                        qryUrl += fieldQry + ':(' + qries[fieldQry] + ')';
                        if (k === alen - 1) {
                            qryUrl += ') AND ';
                            continue;
                        }
                        qryUrl += ' OR ';
                        k++;
                    }
                }

            } else {
                if (obj === 'Anywhere') {
                    qryUrl += '(' + qries['anywhere'] + ') AND ';
                } else {
                    for (var fieldQry in qries) {

                        qryUrl += fieldQry + ':(' + qries[fieldQry] + ')';
                        if (k === alen - 1) {
                            qryUrl += ' AND ';
                            continue;
                        }
                        qryUrl += ' OR ';
                        k++;
                    }
                }

            }
        } else {
            if (k < alen - 1) {
                if (obj === 'Anywhere') {
                    //do nothing
                } else {
                    qryUrl += '(';
                    for (var fieldQry in qries) {
                        qryUrl += fieldQry + ':(' + qries[fieldQry] + ')';
                        if (k === alen - 1) {
                            qryUrl += '))';
                            continue;
                        }
                        qryUrl += ' OR ';
                        k++;
                    }
                }

            } else {
                if (obj === 'Anywhere') {
                    qryUrl += '(' + qries['anywhere'] + '))';
                } else {
                    for (var fieldQry in qries) {
                        qryUrl += fieldQry + ':(' + qries[fieldQry] + '))';
                    }
                }

            }
            k++;

        }
        i++;


        //console.log('lakis' + qryUrl);
    }

    // url encode the query string
    qryUrl = encodeURI(qryUrl);

    loadSolr({clear: 1, zoomLevel: map.getZoom()})
}

function mapTypeToField(type) {
    switch (type) {
        case "Taxonomy":
            return "species_cvterms";
        case "Title":
            return "label";
        case "Sample type":
            return "sample_type";
        case "Geography":
            return "geolocations_cvterms";
        case "Collection protocols":
            return "collection_protocols_cvterms";
        case "Protocols":
            return "protocols_cvterms";
        case "Stable ID":
            return "id";
        case "Insecticides":
            return "insecticide_cvterms";
        default :
            return type.toLowerCase()

    }

}

function mapTypeToIcon(type) {
    switch (type) {
        case "Taxonomy":
            return '<i class="fa fa-sitemap"></i>';
        case "Title":
            return '<i class="fa fa-info-circle"></i>';
        default :
            return '<i class="fa fa-camera-retro"></i>';

    }

}

function PaneSpin(divid, command) {

    var target = document.getElementById(divid);

    if (command === "start") {
        if (PaneSpinner == null) {
            PaneSpinner = new Spinner().spin(target);
        } else {
            PaneSpinner.spin(target)
        }

    } else {
        PaneSpinner.stop(target);
    }
}

function highlightMarker(marker) {
    $(marker._icon).addClass("highlight-marker");
    highlight = marker;
    if (firstClick) firstClick = false;
}

function moveTopMarker(marker) {
    $(marker._icon).addClass("top-marker");
}

function removeTopMarker(marker) {
    // check for highlight
    $(marker._icon).removeClass("top-marker");
}

function removeHighlight(marker) {
    // check for highlight
    if (highlight !== null) {
        $(highlight._icon).removeClass("highlight-marker");
        marker ? highlight = marker : highlight = null;
    }
}

function resetPlots() {
    "use strict";

    var pieHTML, violinHTML, tableHTML;
    if (firstClick) {
        pieHTML =
            '<h3>Summary view for selected samples</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-pie-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to plot some real data</h4> ' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-area-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to plot some real data</h4> ' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-table" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to see some real data</h4> ' +
            '</div>';
    } else {

        pieHTML =
            '<h3>Summary view for selected samples</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-pie-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h4>click a marker on the map</h4>' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-area-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h4>click a marker on the map</h4>' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-table" style="color: #2c699e; font-size: 12em"></i>' +
            '<h4>click a marker on the map</h4>' +
            '</div>';
    }

    $('#graphs').html(pieHTML);
    $('#swarm-chart-area').html(violinHTML);
    $('#marker-table').off("scroll");
    $('#table-contents-header').html(tableHTML);
    $('#table-contents').empty();


}

function markerColor(value) {
    var fillColor, textColor;

    if (value < 0) {
        return ["white", '#555'];
    } else {
        fillColor = trafficLight.evaluate(value);
        //textColor = getContrastYIQ(fillColor);
        if (value < 0.3) {
            textColor = "#fff";
        } else if (value > 0.7) {
            textColor = "#fff";

        } else {
            textColor = "#555";

        }
        //textColor = (value <= 0.5) ? markerText.evaluate(value): markerText.evaluate(1 - value);
        return [fillColor, textColor];
    }

}

function getContrastYIQ(hexcolor) {
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
Number.prototype.roundDecimals = function (decimals) {
    if (Math.floor(this.valueOf()) === this.valueOf()) return this.valueOf();
    var noDecimals = this.toString().split(".")[1].length;

    if (noDecimals < decimals) {
        return this.valueOf()
    } else {
        return this.valueOf().toFixed(decimals)
    }

};


// Add an URL parser to JQuery that returns an object
// This function is meant to be used with an URL like the window.location
// Use: $.parseParams('http://mysite.com/?var=string') or $.parseParams() to parse the window.location
// Simple variable:  ?var=abc                        returns {var: "abc"}
// Simple object:    ?var.length=2&var.scope=123     returns {var: {length: "2", scope: "123"}}
// Simple array:     ?var[]=0&var[]=9                returns {var: ["0", "9"]}
// Array with index: ?var[0]=0&var[1]=9              returns {var: ["0", "9"]}
// Nested objects:   ?my.var.is.here=5               returns {my: {var: {is: {here: "5"}}}}
// All together:     ?var=a&my.var[]=b&my.cookie=no  returns {var: "a", my: {var: ["b"], cookie: "no"}}
// You just cant have an object in an array, ?var[1].test=abc DOES NOT WORK
// Taken from https://gist.github.com/kares/956897 (scroll down, code in the comments)
(function ($) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decode = function (str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    };
    $.parseParams = function (query) {
        // recursive function to construct the result object
        function createElement(params, key, value) {
            key = key + '';
            // if the key is a property
            if (key.indexOf('.') !== -1) {
                // extract the first part with the name of the object
                var list = key.split('.');
                // the rest of the key
                var new_key = key.split(/\.(.+)?/)[1];
                // create the object if it doesnt exist
                if (!params[list[0]]) params[list[0]] = {};
                // if the key is not empty, create it in the object
                if (new_key !== '') {
                    createElement(params[list[0]], new_key, value);
                } else console.warn('parseParams :: empty property in key "' + key + '"');
            } else
            // if the key is an array
            if (key.indexOf('[') !== -1) {
                // extract the array name
                var list = key.split('[');
                key = list[0];
                // extract the index of the array
                var list = list[1].split(']');
                var index = list[0]
                // if index is empty, just push the value at the end of the array
                if (index == '') {
                    if (!params) params = {};
                    if (!params[key] || !$.isArray(params[key])) params[key] = [];
                    params[key].push(value);
                } else
                // add the value at the index (must be an integer)
                {
                    if (!params) params = {};
                    if (!params[key] || !$.isArray(params[key])) params[key] = [];
                    params[key][parseInt(index)] = value;
                }
            } else
            // just normal key
            {
                if (!params) params = {};
                params[key] = value;
            }
        }

        // be sure the query is a string
        if (!query) {
            query = window.location + '';
        } else {
            query = query + '';

        }

        var params = {}, e;
        if (query) {
            // remove # from end of query
            if (query.indexOf('#') !== -1) {
                query = query.substr(0, query.indexOf('#'));
            }

            // remove ? at the begining of the query
            if (query.indexOf('?') !== -1) {
                query = query.substr(query.indexOf('?') + 1, query.length);
            } else return {};
            // empty parameters
            if (query == '') return {};
            // execute a createElement on every key and value
            while (e = re.exec(query)) {
                var key = decode(e[1]);
                var value = decode(e[2]);
                createElement(params, key, value);
            }
        }
        return params;
    };
})(jQuery);


// Encode an object to an url string
// This function return the search part, beginning with "?"
// Use: $.encodeURL({var: "test", len: 1}) returns ?var=test&len=1
(function ($) {
    $.encodeURL = function (object) {

        // recursive function to construct the result string
        function createString(element, nest) {
            if (element === null) return '';
            if ($.isArray(element)) {
                var count = 0,
                    url = '';
                for (var t = 0; t < element.length; t++) {
                    if (count > 0) url += '&';
                    url += nest + '[]=' + element[t];
                    count++;
                }
                return url;
            } else if (typeof element === 'object') {
                var count = 0,
                    url = '';
                for (var name in element) {
                    if (element.hasOwnProperty(name)) {
                        if (count > 0) url += '&';
                        url += createString(element[name], nest + '.' + name);
                        count++;
                    }
                }
                return url;
            } else {
                return nest + '=' + element;
            }
        }

        var url = '?',
            count = 0;

        // execute a createString on every property of object
        for (var name in object) {
            if (object.hasOwnProperty(name)) {
                if (count > 0) url += '&';
                url += createString(object[name], name);
                count++;
            }
        }

        return url;
    };
})(jQuery);