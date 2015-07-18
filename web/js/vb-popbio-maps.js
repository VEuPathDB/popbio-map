/*
 function initialize_map
 date: 18/6/2015
 purpose:
 inputs:
 outputs:
 */

function initializeMap() {
    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map', {
        center: [23.079, 3.515],
        zoom: 3,
        zoomControl: false
    });

    map.spin(true);

    map.addControl(new L.Control.FullScreen({
        position: "topright",
        forcePseudoFullscreen: true
    }));

    map.addControl(new L.Control.ZoomMin({position: "topright"}));
    var sidebar = L.control.sidebar('sidebar').addTo(map);


    var mp1 = new L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        subdomains: ["otile1", "otile2", "otile3", "otile4"],
        noWrap: 1,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>'
    });

    var mp2 = new L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        maxNativeZoom: 11,
        subdomains: ["otile1", "otile2", "otile3", "otile4"],
        noWrap: 1,
        attribution: 'Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
    });

    var mp3 = new L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        noWrap: 1,
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

    //    Add a legend control on the bottom right but don't show it just yet
    legend = L.control({position: 'bottomright'});
    legendDiv = L.DomUtil.create('div', 'info legend');

    L.easyButton('fa-info',
        function () {
            if (L.DomUtil.hasClass(legendDiv, "active")) {
                legend.removeFrom(map);
                L.DomUtil.removeClass(legendDiv, "active");
            } else {
                legend.addTo(map);
                L.DomUtil.addClass(legendDiv, "active");
            }

        },
        'Toggle legend ON of OFF'
    );

    // Now generate the legend and .

    var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*&facet.pivot=geohash_2,species_category&json.wrf=?&callback=?';
    $.getJSON(url, generatePalette);


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
        resetPlots();
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
                    console.log(url + encodeURI(match[1]));
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
//            url: 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_ta/smplAcgrouped?q=',
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

        resetPlots();
        $.getJSON(url, generatePalette);
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
                    resetPlots();
                });
                layer.on("click", function () {
                    removeHighlight(layer);
                    highlightMarker(layer);
                    timer = setTimeout(function () {
                        if (!prevent) {

                            updatePieChart(record.population, record.fullstats);
                            var recBounds = L.latLngBounds(record.bounds);
                            createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                            updateTable("#table-contents", buildBbox(recBounds));
                        }
                    }, delay);
                    prevent = false;
                });
                layer.on("mouseover", function (e) {
                    //console.log(e.target);
                    //var elem = L.DomUtil.get(e.target);
                    //L.DomUtil.addClass(elem, 'marker-cluster-selected')
                    //this.options.icon.options.className = 'marker-cluster-selected';
                });
                layer.on("mouseout", function () {
                    //updatePieChart()
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
    var pruneCluster = new PruneClusterForLeaflet(100);

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
            resetPlots()
            // Zoom-in to marker
            if (map.getZoom() < 11) map.setView(marker._latlng, 11, {animate: true});


        });
        marker.on("click", function () {
            removeHighlight(marker);
            highlightMarker(marker);
            timer = setTimeout(function () {
                if (!prevent) {

                    //do click stuff here
                    // first we need a list of all categories

                    var fullElStats = [];

                    fullElStats.push({
                        "label": category.replace(/sensu lato/, "sl")
                            .replace(/chromosomal form/, "cf"),
                        "value": 1,
                        "color": (palette[category] ? palette[category] : "#000000")
                    });

                    updatePieChart(1, fullElStats);
                    //var bounds = L.latLngBounds(marker._latlng, marker._latlng);
                    //createBeeViolinPlot("#swarm-chart-area", buildBbox(bounds));
                    var filter = '&fq=id:' + data.id;
                    createBeeViolinPlot("#swarm-chart-area", filter);
                    //updateTable("#table-contents", buildBbox(bounds));
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
            resetPlots();
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
            removeHighlight(m);
            highlightMarker(m);
            timer = setTimeout(function () {
                if (!prevent) {

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

        m.on("mouseover", function (e) {


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
                //console.log(doc[key].species_category[0]);
            } else {
                console.log(key + ": no species defined")
            }
            marker.data.icon = L.VectorMarkers.icon({
                prefix: 'fa',
                icon: 'circle',
                markerColor: palette[species] ? palette[species] : "red",
                iconColor: markerColor(pheVal)[0]
            });

            pruneCluster.RegisterMarker(marker);
        }

        if (mode) {
            assetLayerGroup.clearLayers();
            $("#markersCount").html(result.response.numFound + ' samples in current view');

        }
        assetLayerGroup.addLayer(pruneCluster);
        //inform the user loading is done
        map.spin(false);
    };


    //var url = "http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/smplMarkers?" + qryUrl + "&fq=" + geoLevel + ":" + geoQuery + buildBbox(map.getBounds()) + "&json.wrf=?&callback=?";
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

function buildPalette(items, nmColors, paletteType) {
    /*
     function buildPalette
     date: 17/03/2015
     purpose:
     inputs: {items} a list of items to be associated with colors, {mColors} the number of colors in the palette
     {paletteType} 1 for Kelly's 2 for boytons
     outputs: an associative array with items names as the keys and color as the values
     */
    "use strict";

    var newPalette = [];

    // from http://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors
    var kelly_colors_hex = [
        "#FFB300", // Vivid Yellow
        "#803E75", // Strong Purple
        "#FF6800", // Vivid Orange
        "#A6BDD7", // Very Light Blue
        "#C10020", // Vivid Red
        "#CEA262", // Grayish Yellow
        "#817066", // Medium Gray

        // The following don't work well for people with defective color vision
        "#007D34", // Vivid Green
        "#F6768E", // Strong Purplish Pink
        "#00538A", // Strong Blue
        "#FF7A5C", // Strong Yellowish Pink
        "#53377A", // Strong Violet
        "#FF8E00", // Vivid Orange Yellow
        "#B32851", // Strong Purplish Red
        "#F4C800", // Vivid Greenish Yellow
        "#7F180D", // Strong Reddish Brown
        "#93AA00", // Vivid Yellowish Green
        "#593315", // Deep Yellowish Brown
        "#F13A13", // Vivid Reddish Orange
        "#232C16" // Dark Olive Green
    ];

    // from http://alumni.media.mit.edu/~wad/color/palette.html
    var boytons_colors_hex = [
        //"#000000", // Black
        "#575757", // Dark Gray
        "#A0A0A0", // Light Gray
        "#FFFFFF", // White
        "#2A4BD7", // Blue
        "#1D6914", // Green
        "#814A19", // Brown
        "#8126C0", // Purple
        "#9DAFFF", // Light Purple
        "#81C57A", // Light Green
        "#E9DEBB", // Cream
        "#AD2323", // Red
        "#29D0D0", // Teal
        "#FFEE33", // Yellow
        "#FF9233", // Orange
        "#FFCDF3", // Pink
    ];

    var noItems = items.length,
        stNoItems = noItems;

    for (var i = 0; i < nmColors; i++) {
        if (typeof (items[i]) !== 'undefined') {
            var item = items[i][0];
            newPalette[item] = kelly_colors_hex[i];
            //console.log(item);

            noItems--; // track how many items don't have a proper color
        }

    }

    var lumInterval = 0.5 / noItems,
        lum = 0.7;
    for (var c = 0; c < noItems; c++) {
        var element = stNoItems - noItems + c;
        var item = items[element][0];
        newPalette[item] = colorLuminance("#FFFFFF", -lum);
        lum -= lumInterval;
        //console.log(item);


    }

    newPalette["others"] = "radial-gradient(" + colorLuminance("#FFFFFF", -0.7) + ", " + colorLuminance("#FFFFFF", -lum) + ")";
    newPalette["Unknown"] = "black";

    return newPalette;
}

function sortHashByValue(hash) {
    var tupleArray = [];
    for (var key in hash) tupleArray.push([key, hash[key]]);
    tupleArray.sort(function (a, b) {
        return b[1] - a[1]
    });
    return tupleArray;
}

function updatePieChart(population, stats) {
    if (stats) {


        $('#pie-chart-header').empty();

        d3.select("#pie-chart-area svg")
            .attr("width", 380)
            .attr("height", 500)
            .style({'width': '380', 'height': '500'});

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
        var url = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/smplTable?&' + qryUrl + filter + '&sort=id asc&json.wrf=?&callback=?';

    } else {

        var url = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irTable?&' + qryUrl + filter + '&sort=id asc&json.wrf=?&callback=?';
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

        // get the numbeer of different field queries per catego (this is usually one or two)
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

function generatePalette(result) {
    var doc = result.facet_counts.facet_pivot["geohash_2,species_category"];
    var items = [];
    for (var obj in doc) if (doc.hasOwnProperty(obj)) {
        var count = doc[obj].count;

        var pivot = doc[obj].pivot;
        for (var pivotElm in pivot) if (pivot.hasOwnProperty(pivotElm)) {
            var ratio = pivot[pivotElm].count / count;
            var species = pivot[pivotElm].value;
            var index = parseInt(pivotElm);
            var points;
            // Use a scoring scheme to make sure species with a good presence per region get a proper color (we only have 20 good colours)
            switch (index) {
                case 1:
                    points = 7 * ratio;
                    break;
                case 2:
                    points = 3 * ratio;
                    break;
                case 3:
                    points = 1 * ratio;
                    break;
                default:
                    points = 0;
                    break

            }

            if (items.hasOwnProperty(species)) {
                items[species] += points;

            } else {

                items[species] = points;

            }
        }
    }

    var sortedItems = sortHashByValue(items);
    palette = buildPalette(sortedItems, legendSpecies, 1);

    var inHtml = "";
    var cntLegend = 1;
    for (var obj1 in palette) {
        if (cntLegend > legendSpecies - 1) {
            inHtml += '<i style="background:' + palette["others"] + '"></i> ' + 'Others<br />';
            $("#legend").html(inHtml);
            break;
        }
        var abbrSpecies = obj1.replace(/^(\w{2})\S+\s(\w+)/, "$1. $2");
        inHtml += '<i style="background:' + palette[obj1] + '" title="' + obj1 + '"></i> ' + (obj1 ? '<em>' + abbrSpecies + '</em><br>' : '+');
        cntLegend++;
    }

    if ($('#view-mode').val() === 'ir') {

        inHtml += '<div class="data-layer-legend" style="border: 0">';
        inHtml += '<p>Resistance</p>';
        inHtml += '<div class="min-value" style="border: 0">Low</div>';
        inHtml += '<div class="scale-bars">';
        var colorsArr = L.ColorBrewer.Diverging.RdYlBu[7].slice(); //copy array by value
        $.each(colorsArr.reverse(), function (index, value) {
            inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 10px; background-color: ' + value + ' ;"></i>';
        });

        inHtml += '</div><div class="max-value" style="border: 0">High</div>' +
            '</div>' +
            '<p style="font-size: smaller; word-wrap: break-word; width: 200px; margin-top: 20px">Values have been rescaled globally and only give a relative indication of resistance/susceptibility</p>';

    }

    // Populate legend when added to map
    legend.onAdd = function (map) {
        legendDiv.innerHTML = inHtml;
        return legendDiv;
    };

    // Was the legend already active? Refresh it!
    if (L.DomUtil.hasClass(legendDiv, "active")) {
        legend.removeFrom(map);
        legend.addTo(map);
    }


    // moved this here to avoid querying SOLR before the palette is done building
    loadSolr({clear: 1, zoomLevel: map.getZoom()});
//        filterMarkers('');
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
    if (highlight !== null) {

        pieHTML =
            '<h3>Sample summary data</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-pie-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h3>click a marker</h3>' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-area-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h3>click a marker</h3>' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-th-list" style="color: #2c699e; font-size: 12em"></i>' +
            '<h3>click a marker</h3>' +
            '</div>';
    } else {
        pieHTML =
            '<h3>Sample summary data</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-pie-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h3>click a marker</h3>' +
            '<h3>to plot some real data</h3> ' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-area-chart" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h3>click a marker</h3>' +
            '<h3>to plot some real data</h3> ' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-th-list" style="color: #2c699e; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h3>click a marker</h3>' +
            '<h3>to see some real data</h3> ' +
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
        if (value < 0.2) {
            textColor = "#fff";
        } else if (value > 0.8) {
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
