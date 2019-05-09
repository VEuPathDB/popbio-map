function bindEvents() {
    "use strict"


    // declare timeout function name
    var timeoutHandler;


    // add event listener to map for movement
    // this is to control Leaflet's annoying behavior when scrolling with a trackpad
    map.on('moveend', mapMoveHandler)
        .on('drag', mapDragHandler);
    function mapMoveHandler() {
        // cancel any timeout currently running
        window.clearTimeout(timeoutHandler);
        // create new timeout to fire sesarch function after 500ms (or whatever you like)
        timeoutHandler = window.setTimeout(function () {
            endingZoom = map.getZoom();
            loadSolr({clear: 1, zoomLevel: map.getZoom()});
        }, 500);
    }

    function mapDragHandler() {
        // cancel any timeout currently running
        window.clearTimeout(timeoutHandler);
    }

    // detect when user changes zoom or pans around the map
    map.on("movestart", function () {
        startingZooom = map.getZoom();
        removeHighlight();
        //Marker is not selected so disable the marker option from the download panel
        $("#select-export option[value=3]")[0].disabled = true;
        $("#select-export").selectpicker("refresh");
        // close open panels
        $('.collapse').collapse('hide');
        sidebar.close();
        setTimeout(function () {
            resetPlots()
        }, delay);
    })
    .on("click", PopulationBiologyMap.methods.resetMap);

    var refreshLegend = function () {
        var selValue = $(this).attr('value');
        var selText = $(this).text();
        var parentID = $(this).closest("div").attr('id');

        switch (parentID) {
            case 'summByDropdown':
                glbSummarizeBy = selValue;

                var url = solrPopbioUrl + viewMode  + 'Palette?q=*:*&geo=geohash_2&term=' +
                    mapSummarizeByToField(glbSummarizeBy).summarize +
                    '&json.wrf=?&callback=?';

                highlightedId = $('.highlight-marker').attr('id');

                $.getJSON(url, function (data) {
                    legend._populateLegend(data, glbSummarizeBy)
                    $(".legend .dropdown").tooltip({
                        placement: "left",
                        delay: { "show": 1000, "hide": 0 }
                    });
                });
                $('#Filter-Terms').val('');
                break;
            case 'sortByDropdown':
                legend.options.sortBy = selValue;
                legend.refreshLegend(legend.options.palette);

                var val = $.trim($('#Filter-Terms').val()).replace(/ +/g, ' ').toLowerCase();

                $('.table-legend-term').show().filter(function () {
                    var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                    return !~text.indexOf(val);
                }).hide();
                break;
            default:
                $(this).parents(".dropdown").find('.btn').html($(this).attr('value') + ' <span class="caret"></span>');
                $(this).parents(".dropdown").find('.btn').val($(this).attr('value'));
                break;
        }
        //DKDK VB-8372 need to reset map when changing legend's dropdown menu
        map.on("click", PopulationBiologyMap.methods.resetMap);
    }

    $(document).on('click', '.dropdown-menu li a', refreshLegend);

    $('#Reset-Filter').click(function () {
        $('#Filter-Terms').val('');
        $('.table-legend-term').show();

    });

    // Rescale colors
    /*$('.legend').on('click', '#rescale_colors', function() {
        legend._setPalette(reescale=true);
        loadSolr({clear: 1, zoomLevel: map.getZoom()});
    });

    $(document).on('click', '#reset_colors', function() {
        legend._setPalette(false);
        loadSolr({clear: 1, zoomLevel: map.getZoom()});
    });*/


    // download data
    $('#download-button').click(function () {
        var selectedOption = $('#select-export').val(),
            url = solrExportUrl,
            viewBox = buildBbox(map.getBounds()),
            fieldsStr = '&fl=',
            zeroFilter = '';
        var notBoolean = false;
        var query = qryUrl;


        if (viewMode === 'abnd') {
            zeroFilter = '&zeroFilter=' + ($('#checkbox-export-zeroes').is(":checked") ? '' : '-sample_size_i:0');
        }

        // clear the error area
        $('#export-error').fadeOut();

        // reset the button link
        $(this).removeAttr('href');

        if ($('#select-export-fields').val()) {
            fieldsStr += $('#select-export-fields').val().join();
            fieldsStr += ',exp_citations_ss,exp_licenses_ss'; // mandatory citations field + license (DKDK)
            //DKDK VB-7133 add exp_sample_name_s for ir and path
            if (viewMode === "ir" || viewMode === "path") {
                fieldsStr += ',exp_sample_name_s';
            }
        } else {
            // no marker is selected
            // inform the user that there are no selected markers
            $('#export-error').addClass('alert alert-warning')
                .html('<h5><i class="fa fa-exclamation-triangle fa-fw"></i> Please select at least one field</h5>')
                .fadeIn();
            return;
        }

        //Check if one of terms is a NOT Query, if it is, update flag
        $('#search_ac').tagsinput('items').forEach(function (item) {
            if (item.notBoolean) {
                notBoolean = true;
                return;
            }
        });

        //Preprend query with *:* if notBoolean is true otherwise export will not work
        if (notBoolean) {
            query = query.split(/\((.+)/);
            query.pop();
            query = query.join("(*:* ");
        }

        switch (selectedOption) {
            // data matching search
            case "1":
                url += viewMode + 'Export?' + query + fieldsStr + '&sort=exp_id_s+asc' + zeroFilter;
                this.href = url;
                break;
            // data visible on screen
            case "2":
                url += viewMode + 'Export?' + query + viewBox + fieldsStr + '&sort=exp_id_s+asc' + zeroFilter;
                this.href = url;
                break;
            // data for selected marker
            case "3":
                // grab the id (geohash) of the highlighted marker
                var highlightedMarkerId = $('.highlight-marker').attr('id');

                // was there a highlighed marker
                if (highlightedMarkerId) {
                    // using the marker id (geohash name) and the length construct an fq to query SOLR
                    var len = highlightedMarkerId.length,
                        geohashFq = '&fq=geohash_' + len + ':' + highlightedMarkerId;

                    //ToDo: Clear the warning area when a marker is highlighted. Best strategy would be to emmit an
                    // event whenever a marker is highlighted.

                    // clear the warning area from previous warnings
                    $('#export-error').fadeOut()
                        .removeClass('alert alert-warning')
                        .html('');

                    // build the url and download the data
                    url += viewMode + 'Export?' + query + geohashFq + fieldsStr + '&sort=exp_id_s+asc' + zeroFilter;
                    this.href = url;
                } else { // no marker is selected
                    // inform the user that there are no selected markers
                    $('#export-error').addClass('alert alert-warning')
                        .html('<h5><i class="fa fa-exclamation-triangle fa-fw"></i> Please select a marker first.</h5>')
                        .fadeIn();

                }
                break;
            //download all data
            case "4":
                url += viewMode + 'Export?q=*:*' + fieldsStr + '&sort=exp_id_s+asc' + zeroFilter;
                this.href = url;
                break
            default:
                break;

        }
    })

    // add the IR scale bars in the advanced options pane
    var inHtml = '';
    $.each(legend.options.trafficlight.colorBrewer.reverse(), function (index, value) {
        inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 10%; background-color: ' + value + ' ;"></i>';
    });
    $('#menu-scale-bars').html(inHtml);

    normIrSlider = $('#pre-norm-ir-slider').bslider({
        value: [0, 9],
        id: "norm-ir-slider",
        handle: "triangle",
        min: 0,
        max: 9,
        step: 1,
        tooltip: 'hide'
    });

    // trigger click event on highlighted marker when switching panels
    $('.sidebar-icon').on("click", function () {

        // Only execute this code if not clicking on generate link icon
        if ($(this).attr("id") !== "generate-link") {
            var highlightedMarker = $('.highlight-marker');
            if (highlightedMarker.length) {
                //Enable marker download option if it was disabled
                if ($("#select-export option[value=3]")[0].disabled) {
                    $("#select-export option[value=3]")[0].disabled = false;
                    $("#select-export").selectpicker("refresh");
                }

                sidebarClick = true;
                $(highlightedMarker).trigger("click");
                sidebarClick = false;
            } else {
                //Marker is not selected so disable the marker option from the download panel
                $("#select-export option[value=3]")[0].disabled = true;
                $("#select-export").selectpicker("refresh");
            }
        }
    });

    // VB entities popup (projects, samples, assays)
    $(document).on('click', '.active-hover', function (event) {

        if (stickyHover) {
            $('#beeswarmPointTooltip').css('z-index', "3000");
        }

        // select the right div
        var entityTooltip = $('#vbEntityTooltip');

        // identify the entity type
        var id = $(this).attr('value'), type = $(this).attr('type'),
            bgColor = $(this).data('bgcolor');
        var textColor = getContrastYIQ(bgColor);
        var template, entityRestURL, entityURL;

        // initial HTML for the tool

        var initialHTML = '<div class="row no-pad" style="width: 370px; height: 300px">' +
            '<div class="col-md-12">' +
            '<div class="cancel" id="entity-cancel-hover" style="display: inline;"><i class="fa fa-times"></i></div>' +
            '<h3 style="background-color: "' + bgColor + '"; color: "' + textColor + '";  margin: 0 -10px 0 0;">' +
            '</h3>' +
            '</div>' +
            '<div class="row less-margin">' +
            '<div class="col-md-12">' +
            '</div>' +
            '</div>' +
            '</div>';

        switch (type) {
            // VB-7622 Projects -> Project
            case 'Project':
                template = $.templates("#projectInfoTemplate");
                entityURL = '/popbio/project/?id=' + id;
                entityRestURL = '/popbio/REST/project/' + id + '/head';
                break;
            default:
                break;
        }

        // setup an ajax promise
        var entityPromise = $.getJSON(entityRestURL);

        // display the div and start the spinner
        entityTooltip.html(initialHTML);

        // get the proper position for the popup
        var winHeight = window.innerHeight;
        var tooltipHeight = 400;
        if (entityTooltip.height() > 0) tooltipHeight = entityTooltip.height();
        var tooltipY;

        if (event.pageY - tooltipHeight < 8) {
            tooltipY = 8
        } else if (event.pageY + tooltipHeight > winHeight) {
            tooltipY = event.pageY - tooltipHeight - 8;
        } else {
            tooltipY = event.pageY - 28;
        }

        // set up the popup position
        entityTooltip.css("left", (event.pageX + 10) + "px")
            .css("top", (tooltipY) + "px")

        entityTooltip.css("opacity", "1").css("z-index", "1000000");
        PaneSpin('vbEntityTooltip', 'start');

        // bind the events to close the popup
        $(document).on('click', '#entity-cancel-hover', function (event) {

            entityTooltip.animate(
                {
                    'opacity': 0,
                    'z-index': -1000000
                },
                delay);

            // if a beeswarm tooltip is open then keep the no-interactions active
            if (!stickyHover) {
                $('#no-interactions').removeClass('in').removeClass("foreground").off("click");
            } else {
                $('#beeswarmPointTooltip').css('z-index', "1000000");
            }
            PaneSpin('vbEntityTooltip', 'stop');

        });

        $('#no-interactions').addClass("in").addClass("foreground")
            .one("click", function () {
                entityTooltip.animate(
                    {
                        'opacity': 0,
                        'z-index': -1000000
                    },
                    delay);
                $('#no-interactions').removeClass("in").removeClass("foreground");
                $(document).off('click', '#entity-cancel-hover');
                PaneSpin('vbEntityTooltip', 'stop');

            });

        // interogate the popbio REST api
        entityPromise.done(function (entityJson) {

            // add the entity type
            entityJson.entityType = type;

            // convert the dates
            var newCreationDate = new Date(entityJson.creation_date);
            var newLastModifiedDate = new Date(entityJson.last_modified_date);

            entityJson.creation_date = newCreationDate.toLocaleString([], {
                timeZone: "UTC",
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric"
            });
            entityJson.last_modified_date = newLastModifiedDate.toLocaleString([], {
                timeZone: "UTC",
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric"
            });

            // add the background and text colour
            entityJson.bgColor = bgColor;
            entityJson.textColor = textColor;

            // add the URL to the entity page
            entityJson.entityURL = entityURL;
            // entityJson.publications = [];

            var tooltipHtml = template.render(entityJson);
            entityTooltip.html(tooltipHtml);

            // now that we have the final html of the popup recalculate its position
            tooltipHeight = entityTooltip.height();

            if (event.pageY - tooltipHeight < 8) {
                tooltipY = 8
            } else if (event.pageY + tooltipHeight > winHeight) {
                tooltipY = event.pageY - tooltipHeight - 8;
            } else {
                tooltipY = event.pageY - 28;
            }

            // set up the popup position
            entityTooltip.animate(
                {
                    'left': (event.pageX + 10) + "px",
                    'top': (tooltipY) + "px"
                },
                delay);

            // check if the popup has a vertical scrollbar
            if (entityTooltip.has_scrollbar()) {
                $('#entity-cancel-hover').css('margin-right', '10px')
            }

            PaneSpin('vbEntityTooltip', 'stop');

        })
            .fail(function () {
                PaneSpin('vbEntityTooltip', 'stop');

                return "Error while retrieving data";
            })
        ;

    })

    // Toggle grid
    $('#grid-toggle').change(function () {
        if (!$(this).prop('checked')) {
            map.removeLayer(geohashesGrid);
        } else {
            var geoLevel = geohashLevel(map.getZoom(), "geohash");
            addGeohashes(map, true);
        }
    });

    // collapse open panels
    // hide the main menu bar and other panels when advanced options are expanded
    $('#advanced-options').on('show.bs.collapse', function () {
        // $('.main-menu').collapse('hide');
        $('#bars-icon').toggleClass('down');
    })
    .on('hide.bs.collapse', function () {
        // $('#menu-bar').collapse('show');
        $('#bars-icon').toggleClass('down');
    });

    // clear the seasonal search panel once collapsed
    $('#seasonal').on('hidden.bs.collapse', function () {
        $('#season-select').removeClass('active');

        if (checkSeasonal()) return;

        $('.season-toggle').each(function () {
            if ($(this).prop('checked')) {
                $(this).bootstrapToggle('off');
            }
        })
    });

    $('#date-select, #season-select, [data-id="SelectView"]').click(function () {
        //Check what button was clicked and do its respective changes
        if (this.id === 'date-select') {
            if ($('#seasonal').attr("aria-expanded") == 'true') {
                $('#seasonal').collapse('hide');
            }

            //Checking if this click will expand the daterange UI
            //if expanding add active class otherwise remove it
            if ($('#daterange').attr('aria-expanded') !== 'true') {
                $(this).addClass('active');
            } else {
                $(this).removeClass('active');
            }
        } else if (this.id === 'season-select') {
            if ($('#daterange').attr("aria-expanded") == 'true') {
                $('#daterange').collapse('hide');
            }

            //Checking if this click will expand the seasonal UI
            //if expanding add active class
            if ($('#seasonal').attr('aria-expanded') !== 'true') {
                $(this).addClass('active');
            }
        } else {
            if ($('#seasonal').attr("aria-expanded") == 'true') {
                $('#seasonal').collapse('hide');
            }

            if ($('#daterange').attr("aria-expanded") == 'true') {
                $('#daterange').collapse('hide');
            }
        }
    });

    // collect the months to be included in the seasonal search
    $('.season-toggle').change(function () {
        var enable = false;
        $('.season-toggle').each(function () {
            var curMonth = $(this).val(), curMode = $(this).prop('checked');
            months[curMonth] = curMode;
            if (curMode) enable = true;
        });

        PopulationBiologyMap.methods.addSeason(months);

    });

    // add the seasonal filter into search
    $('#add-season').click(function () {
        PopulationBiologyMap.methods.addSeason(months);
    });

    // add the normalized IR filters into search
    $('#add-norm-ir').click(function () {
        // Map the values returned by the slider to Normalised IR values
        var scaleToIrMap = {
            0: 1,
            1: 0.9,
            2: 0.8,
            3: 0.7,
            4: 0.6,
            5: 0.4,
            6: 0.3,
            7: 0.2,
            8: 0.1,
            9: 0
        };

        var normIrValues = normIrSlider.bslider('getValue');
        var firstVal = normIrValues[0], secondVal = normIrValues[1];

        normIrValues = scaleToIrMap[secondVal] + ' TO ' + scaleToIrMap[firstVal];

        $('#search_ac').tagsinput('add', {
            value: normIrValues,
            //html: inHtml,
            normIrValues: normIrValues,
            type: 'Norm-IR',
            field: 'phenotype_rescaled_value_f'
        });
    });
}

/*
 function initialize_map
 date: 18/6/2015
 purpose:
 inputs:
 outputs:
 */
function initializeMap(parameters) {
    "use strict";

    var flyTo = parameters.flyTo;

    //Getting zoom level and center point to initialize the map
    var zoomLevel = PopulationBiologyMap.data.zoomLevel;
    var center = PopulationBiologyMap.data.center
    var maxZoom = 15;

    //Check if zoomLevel was sent as parameter
    if (zoomLevel == undefined) {
        zoomLevel = 3;
    }

    //Check if center was sent as parameter
    if (center == undefined) {
        center = [23.079, 3.515];
    }

    // create a map in the "map" div, set the view to a given place and zoom
    map = L.map('map', {
        center: center,
        minZoom: 1,
        maxZoom: maxZoom,
        zoom: zoomLevel,
        zoomControl: false,
        zoomAnimationThreshold: 16,
        fullscreenControl: {
            pseudoFullscreen: true
        },
        worldCopyJump: true  //  the map tracks when you pan to another "copy" of the world and seamlessly jumps to the
                             // original one so that all overlays like markers and vector layers are still visible.
    });

    map.spin(true);
    startingZooom = map.getZoom();
    endingZoom = map.getZoom();

    map.addControl(new L.Control.ZoomMin({position: "topright"}));
    sidebar = L.control.sidebar('sidebar').addTo(map);
    //L.DomEvent.disableClickPropagation(sidebar);
    //Adding scale to map
    L.control.scale({position: "bottomright"}).addTo(map);

    /* http://leaflet-extras.github.io/leaflet-providers/preview/ */
    /* Map Layers */
    var street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    });

    var terrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 18,
        ext: 'png'
    });

    var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });


    var light = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var dark = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19
    });

    var mp3 = new L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: maxZoom,
        noWrap: 0,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>'
    });

    map.addLayer(street);

    // initialize markers layer
    markers = new L.Map.SelectMarkers(map);

    // assetLayerGroup = new L.LayerGroup();
    assetLayerGroup = new L.PopbioMarkers();
    assetLayerGroup.addTo(map);
    // tempParentLayerGroup = new L.PopbioMarkers();
    // tempParentLayerGroup.addTo(map);

    // assetLayerGroup.initLatLngStorage();
    var layerCtl = new L.Control.Layers({
        'Street': street,
        'Terrain': terrain,
        'Satellite': satellite,
        'Light': light,
        'Dark': dark,
        'OpenStreetMap': mp3,
    });
    layerCtl.setPosition('topright');
    layerCtl.addTo(map);

    // add geohashes grid or not
    if ( urlParams.grid === "false" ) {
        $('#grid-toggle').prop('checked', false);
        $('#grid-toggle').trigger('change');
    } else {
        addGeohashes(map, true);
    }

    //Default glbSummarizeBy is Species set in the html file, updating it for Genotype, Pathogen, and Blood Meal views here
    if (viewMode === "geno" && urlParams.summarizeBy === undefined) glbSummarizeBy = "Allele";
    if (viewMode === "path" && urlParams.summarizeBy === undefined) glbSummarizeBy = "Pathogen";
    if (viewMode === "meal" && urlParams.summarizeBy === undefined) glbSummarizeBy = "Blood meal host";

    // Now generate the legend
    // hardcoded species_category
    var url = solrPopbioUrl + viewMode + 'Palette?q=*:*&geo=geohash_2&term=' + mapSummarizeByToField(glbSummarizeBy).summarize + '&json.wrf=?&callback=?';

    legend = new L.control.legend(url, {
        summarizeBy: glbSummarizeBy,
        flyTo: flyTo,
        rescale: PopulationBiologyMap.data.rescale
    });

    if (rectHighlight !== null) map.removeLayer(rectHighlight);
    rectHighlight = null;
    map.spin(false);

    //Initialize all tooltips from vb_geohashes_mean.html
    $("[data-tooltip='tooltip']").tooltip({
        trigger: "hover",
        delay: { "show": 1000, "hide": 0 }
    });

    //Initialize tooltips for special cases
    $("[data-id='SelectView']").attr("title", "Select map view").tooltip({
        trigger: "hover",
        delay: { "show": 1000, "hide": 0 }
    });

    $(".leaflet-control-zoom a").tooltip({
        placement: "left",
        trigger: "hover",
        delay: { "show": 1000, "hide": 0 }
    });

    $(".leaflet-bottom.leaflet-right .leaflet-bar").tooltip({
        title: "Toggle to view/hide marker colorization and metadata categorization options",
        placement: "left",
        trigger: "hover",
        delay: { "show": 1000, "hide": 0 }
    });
}


/**
 Created by Ioannis on 11/08/2016
 Given the view mode update the fields selection dropdown
 **/
// these fields do not contain the obligatory Citations field
// which is always appended
function updateExportFields(viewMode) {
    var smplFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];
    var irFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_assay_id_s',
            label: 'Assay ID',
            icon: mapTypeToIcon('Assay ID')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_insecticide_s',
            label: 'Insecticide',
            icon: mapTypeToIcon('Insecticide')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_concentration_f,exp_concentration_unit_s',
            label: 'Concentration',
            subtext: 'value, unit',
            icon: mapTypeToIcon('Concentration')
        },
        {
            value: 'exp_duration_f,exp_duration_unit_s',
            label: 'Duration',
            subtext: 'value, unit',
            icon: mapTypeToIcon('Duration')
        },
        {
            value: 'exp_phenotype_value_f,exp_phenotype_value_unit_s,exp_phenotype_value_type_s',
            label: 'Phenotype value',
            subtext: 'value, unit, type',
            icon: mapTypeToIcon('Phenotype')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];
    var abndFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_sample_size_i',
            label: 'Specimens collected',
            icon: mapTypeToIcon('Count')
        },
        {
            value: 'exp_collection_duration_days_i',
            label: 'Collection duration (days)',
            icon: mapTypeToIcon('Duration')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];
    var genoFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_description_s',
            label: 'Description',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_sample_size_i',
            label: 'Specimens collected',
            icon: mapTypeToIcon('Count')
        },
        {
            value: 'exp_assay_id_s',
            label: 'Assay ID',
            icon: mapTypeToIcon('Assay ID')
        },
        {
            value: 'exp_phenotypes_ss',
            label: 'Phenotypes',
            icon: mapTypeToIcon('Phenotypes')
        },
        {
            value: 'exp_genotype_type_s',
            label: 'Genotype Type',
            icon: mapTypeToIcon('Genotype Type')
        },
        {
            value: 'exp_genotype_name_s',
            label: 'Genotype Name',
            icon: mapTypeToIcon('Genotype Name')
        },
        {
            value: 'exp_locus_name_s',
            label: 'Locus',
            icon: mapTypeToIcon('Locus')
        },
        /* Not needed for now
        {
            value: 'exp_genotype_inverted_allele_count_i',
            label: 'Inverted Allele Count',
            icon: mapTypeToIcon('Inverted Allele Count')
        },
        {
            value: 'exp_genotype_microsatellite_length_i',
            label: 'Microsatellite Length',
            icon: mapTypeToIcon('Microsatellite Length')
        },
        */
        {
            value: 'exp_genotype_mutated_protein_value_f',
            label: 'Mutated Protein Value',
            icon: mapTypeToIcon('Mutated Protein Value')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];

    var pathFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_assay_id_s',
            label: 'Assay ID',
            icon: mapTypeToIcon('Assay ID')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_phenotype_value_f,exp_phenotype_value_unit_s,exp_phenotype_value_type_s',
            label: 'Phenotype value',
            subtext: 'value, unit, type',
            icon: mapTypeToIcon('Phenotype')
        },
        {
            value: 'exp_infection_source_s',
            label: 'Pathogen',
            icon: mapTypeToIcon('Pathogen')
        },
        {
            value: 'exp_infection_status_s',
            label: 'Infection status',
            icon: mapTypeToIcon('Infection status')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];

    var mealFields = [
        {
            value: 'exp_sample_id_s',
            label: 'Sample ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_assay_id_s',
            label: 'Assay ID',
            icon: mapTypeToIcon('Assay ID')
        },
        {
            value: 'exp_bundle_name_s',
            label: 'Record type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_species_s',
            label: 'Species',
            icon: mapTypeToIcon('Taxonomy')
        },
        {
            value: 'exp_sample_type_s',
            label: 'Sample type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_label_s',
            label: 'Label',
            icon: mapTypeToIcon('Description')
        },
        {
            value: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            icon: mapTypeToIcon('Collection ID')
        },
        {
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocol',
            icon: mapTypeToIcon('Collection protocol')
        },
        {
            value: 'exp_projects_ss',
            label: 'Project',
            icon: mapTypeToIcon('Project')
        },
        {
            value: 'exp_geo_coords_s',
            label: 'Coordinates (lat, long)',
            icon: mapTypeToIcon('Coordinates')
        },
        {
            value: 'exp_geolocations_ss',
            label: 'Locations',
            icon: mapTypeToIcon('Location')
        },
        {
            value: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            icon: mapTypeToIcon('Sample type')
        },
        {
            value: 'exp_protocols_ss',
            label: 'Protocol',
            icon: mapTypeToIcon('Protocol')
        },
        {
            value: 'exp_phenotype_value_f,exp_phenotype_value_unit_s,exp_phenotype_value_type_s',
            label: 'Phenotype value',
            subtext: 'value, unit, type',
            icon: mapTypeToIcon('Phenotype')
        },
        {
            value: 'exp_blood_meal_source_s',
            label: 'Blood meal host',
            icon: mapTypeToIcon('Blood meal host')
        },
        {
            value: 'exp_tags_ss',
            label: 'Tag',
            icon: mapTypeToIcon('Tag')
        },
        {
            value: 'exp_attractants_ss',
            label: 'Attractants',
            icon: mapTypeToIcon('Attractants')
        },
        {
            value: 'exp_sex_s',
            label: 'Sex',
            icon: mapTypeToIcon('Sex')
        },
        {
            value: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            icon: mapTypeToIcon('Developmental stage')
        }
    ];

    // empty the dropdown
    $('#select-export-fields').empty();

    //Set fields that can be downloaded for the view
    var simpleFields = smplFields;
    // Need to update this code since it is just repetivie
    if (viewMode === 'abnd') simpleFields = abndFields;
    if (viewMode === 'geno') simpleFields = genoFields;
    if (viewMode === 'ir') simpleFields = irFields;
    if (viewMode === 'path') simpleFields = pathFields;
    if (viewMode === 'meal') simpleFields = mealFields;
    $.each(simpleFields, function (index, obj) {
        if (!obj.subtext) {
            $('#select-export-fields')
                .append(
                    $("<option></option>")
                        .attr("value", obj.value)
                        .text(obj.label)
                        .data('icon', obj.icon)
                );
        } else {
            // IR and path fields have grouped fields, with subtext, e.g.
            // text: Concentration
            // subtext: value, uniA
            $('#select-export-fields')
                .append(
                    $("<option></option>")
                        .attr("value", obj.value)
                        .text(obj.label)
                        .data('subtext', obj.subtext)
                        .data('icon', obj.icon)
                 );
        }
    })

    var checkboxDiv = $('#div-export-zeroes');
    if (viewMode === 'abnd') {
        checkboxDiv.show();
    } else {
        checkboxDiv.hide();
    }

    $('#select-export-fields')
        .selectpicker('refresh')
        .selectpicker('selectAll');
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
    var flyTo = parameters.flyTo;
    // detect the zoom level and request the appropriate facets
    var geoLevel = geohashLevel(zoomLevel, "geohash");

    // Store the visible marker geo limits to build a bbox
    var minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

    // this function processes the JSON file requested by jquery
    var buildMap = function (result) {
        var terms = [];
        //Storing how many results were found so it can be used later
        PopulationBiologyMap.data.numFound = result.response.numFound;

        // using the facet.stats we return statistics for lat and lng for each geohash
        // we are going to use these statistics to calculate the mean position of the
        // landmarks in each geohash
        // display the number of results
        if (viewMode === "ir" || viewMode === "path" || viewMode === "meal") {
            $("#markersCount").html(result.response.numFound + ' visible assays summarized by ' + glbSummarizeBy + '</u>');
        } else if (viewMode === "abnd") {

            if (result.facets.sumSmp === undefined) {
                result.facets.sumSmp = 0;
            }

            $("#markersCount").html(result.facets.sumSmp + ' visible individuals summarized by ' + glbSummarizeBy + '</u>');
        } else if (viewMode === "geno") {

            if (result.facets.alleleCount === undefined) {
                result.facets.alleleCount = 0;
            }

            $("#markersCount").html(result.facets.alleleCount.roundDecimals(0) + ' visible genotypes summarized by ' + glbSummarizeBy + '</u>');
        } else {
            $("#markersCount").html(result.response.numFound + ' visible samples summarized by ' + glbSummarizeBy + '</u>');
        }
        // detect empty results set
        if (result.response.numFound === 0) {
            if (clear) {
                assetLayerGroup.clearLayers();
            }
            if (rectHighlight !== null) map.removeLayer(rectHighlight);
            rectHighlight = null;

            // Update the legend if no results
            legend.refreshLegend();
            map.spin(false);
            return;
        }

        var facetResults = result.facets.geo.buckets,
            populations = {}, // keep the total marker count for each geohash
            statistics = {}, // keep the species/term count for each geohash
            fullStatistics = {}; // keep the species/term count for each geohash

        facetResults.forEach(function (el) {
            // Depending on zoom level and the number of clusters in the geohash add the to smallClusters to be
            // processed later at the same time exclude them from [terms] so as to not display them twice

            //Will remove if not necessary, but just for testing
            if (viewMode === 'abnd') { // || viewMode === 'geno') {
                var geoCount = el.sumSmp;
            } else if (viewMode === 'geno') {
                //Using this to return a number
                //el.alleleCount = Math.round(el.alleleCount * 10) / 10;
                var geoCount = el.alleleCount.roundDecimals(0);
            } else {
                var geoCount = el.count;
            }

            var key = el.val,
                elStats = [],
                fullElStats = [],
                tagsTotalCount = 0;
            var geoTerms = el.term.buckets;

            geoTerms.forEach(function (inEl) {
                var inKey = inEl.val;

                // store normalised abundance for abundance mode, else store samples/assay counts
                if (viewMode === 'abnd') { // || viewMode ==='geno') {
                    var inCount = inEl.sumSmp;
                } else if (viewMode === 'geno') {
                    //Using this to return a number
                    var inCount = inEl.alleleCount.roundDecimals(0);
                } else {
                    var inCount = inEl.count;
                }
                //var inCount = viewMode === 'abnd' ? inEl.sumSmp : inEl.count;

                if (inCount > 0) {
                    fullElStats.push({
                        "label": inKey,
                        "value": inCount,
                        "color": (legend.options.palette[inKey] ? legend.options.palette[inKey] : "#000000")
                    });
                }

                // store the total counts
                tagsTotalCount += inCount;
            });

            if (geoCount - tagsTotalCount > 0) {
                fullElStats.push({
                    "label": 'Unknown',
                    "value": geoCount - tagsTotalCount,
                    "color": (legend.options.palette['Unknown'])
                });
            }

            fullStatistics[key] = fullElStats;

            var arr = {};
            arr.term = key;
            // arr.cumulativeCount = tagsTotalCount
            arr.count = geoCount;
            if (viewMode === 'abnd') {
                // arr.normAbnd = geoAvgAbnd.roundDecimals(1);
                // arr.avgDuration = el.avgDur.roundDecimals(1);
                // arr.avgSampleSize = el.avgSmp.roundDecimals(1);
                // arr.abndSum = geoAbndSum;
            }
            arr.latLng = [el.ltAvg, el.lnAvg];
            arr.bounds = [[el.ltMin, el.lnMin], [el.ltMax, el.lnMax]];
            arr.atomic = el.atomicCount === 1;

            if (viewMode === 'ir') {
                arr.trafficlight = el.irAvg;
            } else {
                arr.trafficlight = -1;
            }
            arr.fullstats = fullStatistics[key];
            terms.push(arr);

            // store the limits of the markers, including the bounding boxex of the samples in them
            if (minLat > el.ltMin) minLat = el.ltMin;
            if (maxLat < el.ltMax) maxLat = el.ltMax;
            if (minLon > el.lnMin) minLon = el.lnMin;
            if (maxLon < el.lnMax) maxLon = el.lnMax;
        });

        // update bounding box containing all markers
        markersBounds = [[minLat, minLon], [maxLat, maxLon]];

        if (flyTo) {
            map.setMinZoom(map.getZoom());
            var maxZoom = map.getZoom() < 4 ? 6 : map.getZoom();
            map.fitBounds(markersBounds, {duration: 1, maxZoom: maxZoom});
            map.setMinZoom(1);
            map.spin(false);
            return;
        }

        var convertedJson = {};
        convertedJson.terms = terms;

        var options = {
            recordsField: "terms",
            latitudeField: "latLng.0",
            longitudeField: "latLng.1",
            layerOptions: {
                fill: false,
                stroke: false,
                weight: 0,
                color: "#80FF00",
                dropShadow: false,
                opacity: 0.2

            },

            setIcon: function (record) {
                // if in abundance mode then resize the icons based on the samples count
                var size = 40;
                // if (viewMode === 'abnd') { size = 60 };
                var markerText = record.count;

                //if ((viewMode === 'abnd' || viewMode === 'geno') && record.count > 999) {
                if (viewMode === 'abnd' && record.count > 999) {
                    markerText = Math.round(record.count/1000)+"k";
                }
                return new L.Icon.Canvas({
                    iconSize: new L.Point(size, size),
                    markerText: markerText,
                    count: record.count,
                    trafficlight: record.trafficlight,
                    id: record.term,
                    stats: record.fullstats,
                    // avgSampleSize: (viewMode === 'abnd') ? record.avgSampleSize : -1,
                    // avgDuration: (viewMode === 'abnd') ? record.avgDuration : -1,
                    atomic: record.atomic
                });
            },
            onEachRecord: function (layer, record) {
                var tooltip = $('#plotTooltip');

                layer.on("dblclick", function () {
                    clearTimeout(timer);
                    prevent = true;

                    map.fitBounds(record.bounds, {padding: [100, 50]});
                })
                .on("click", function (marker) {
                    // add GA
                    // ga('send', 'event', 'Popbio', 'mappoint', 'Map point');
                    gtag('event', 'mappoint', {'event_category': 'Popbio', 'event_label': 'Map point'});
                    //Store the record information so it can be referenced later in other parts of the code
                    PopulationBiologyMap.data.record = record;
                     //Enable marker download option if it was disabled
                    if ($("#select-export option[value=3]")[0].disabled) {
                        $("#select-export option[value=3]")[0].disabled = false;
                        $("#select-export").selectpicker("render");
                    }
                    //Reset download panel
                    $("#select-export").selectpicker("val", "0");
                    $("#export-message").hide();

                    if (marker.originalEvent.ctrlKey) {
                        if (marker.target instanceof L.Marker) {
                            markers.toggleMarker(marker.target, assetLayerGroup)
                            if (urlParams.grid === "true" || $('#grid-toggle').prop('checked')) addGeohashes(map, true);
                        }
                    } else {
                        var panel = $('.sidebar-pane.active');
                        var panelId = panel.attr('id');
                        var recBounds = L.latLngBounds(record.bounds);

                        // Enable or disable the resizable functionality of the panel
                        // Only the abundance and pathogen views should have this functionality
                        if (panelId === "swarm-plots" && (viewMode === "abnd" || viewMode === "path" || viewMode === "meal")) {
                            $("#active-pane").resizable({
                                handles: 'e',
                                minWidth: 420,
                                stop:  function(e, ui) {
                                    var chart = Highcharts.charts[0];
                                    var chartWidth = ui.size.width - 40;
                                    //Change width, but keep same height
                                    chart.setSize(chartWidth, chart.chartHeight);
                                    console.log("resized");
                                }
                            });

                            // Add the handler font-awesome icon so users know it can be dragged
                            $(".ui-resizable-e").addClass("fas fa-grip-lines-vertical");
                        }
                        else {
                            // Check if we were in a resizable panel and return it to the old state
                            if ($("#active-pane.ui-resizable").length) {
                                // Need to get original value and replace it with 420
                                $("#active-pane.ui-resizable").animate({
                                    width: "420px"
                                },
                                {
                                    duration: 300,
                                    complete: function() {
                                        $("#active-pane.ui-resizable").removeAttr("style");
                                        $("#active-pane.ui-resizable").resizable("destroy");
                                    }
                                });

                                // Restore highcarts to its old width
                                var chart = Highcharts.charts[0];
                                chart.setSize(380, chart.chartHeight);
                            }
                        }

                        // was a marker already highlighted?
                        if (highlightedId) {
                            $('.sidebar-pane').data('has-graph', false);

                            switch (panelId) {
                                case "graphs":
                                    updatePieChart(record.count, record.fullstats);
                                    panel.data('has-graph', true);
                                    break;
                                case "swarm-plots":
                                    // Geno viewmode will say that it is not availble in that mode
                                    if (viewMode === 'abnd' || viewMode == 'path' || viewMode === 'meal') {
                                        PopulationBiologyMap.methods.createHighchartsGraph(buildBbox(recBounds));
                                    } else {
                                        createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                                    }
                                    panel.data('has-graph', true);
                                    break;
                                case "marker-table":
                                    updateTable("#table-contents", buildBbox(recBounds));
                                    panel.data('has-graph', true);
                                    break;
                                default:
                                    break;
                            }

                            prevent = false;
                            return;
                        }

                        if (sidebarClick) {
                            // gtag: check View selection
                            var selected_value = $( "#SelectView option:selected" ).text();
                            if (selected_value == 'Insecticide Resistance') {
                                selected_value = 'IR';
                            }

                            // VB-7595 dynamic graph title
                            var graph_selected_value = $("#summByDropdown").find('.dropdown-toggle').text();

                            switch (panelId) {
                                case "graphs":
                                    // gtag
                                    var graph_name = 'graph_' + selected_value;
                                    gtag('event', graph_name, {'event_category': 'Popbio', 'event_label': 'Popbio graph'});

                                    // VB-7595 dynamic graph title
                                    $('#graphs h3').text(graph_selected_value + ' summary');

                                    if (!panel.data('has-graph')) {
                                        updatePieChart(record.count, record.fullstats);
                                        panel.data('has-graph', true);
                                    }
                                    break;
                                case "swarm-plots":
                                    // gtag
                                    var swarm_name = 'swarm_' + selected_value;
                                    gtag('event', swarm_name, {'event_category': 'Popbio', 'event_label': 'Popbio swarm'});

                                    // Geno viewmode will say that it is not availble in that mode
                                    if (!panel.data('has-graph')) {
                                        if (viewMode === 'abnd' || viewMode === 'path' || viewMode === 'meal') {
                                            PopulationBiologyMap.methods.createHighchartsGraph(buildBbox(recBounds));
                                        } else {
                                            createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                                        }
                                        panel.data('has-graph', true);
                                    }
                                    break;
                                case "marker-table":
                                    // gtag
                                    var table_name = 'table_' + selected_value;
                                    gtag('event', table_name, {'event_category': 'Popbio', 'event_label': 'Popbio table'});

                                    if (!panel.data('has-graph')) {
                                        updateTable("#table-contents", buildBbox(recBounds));
                                        panel.data('has-graph', true);
                                    }
                                    break;
                                default:
                                    break;
                            }

                            prevent = false;
                            return;
                        }

                        var wasHighlighted = false;
                        if (layer._icon === highlight) wasHighlighted = true;
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
                                    if (panelId === 'help' || panelId === 'vectorbase') {
                                       sidebar.open('graphs');
                                       panelId = 'graphs';
                                    } else {
                                        $('#swarm-chart-area').empty();
                                        $('#table-contents').empty();
                                        sidebar.open(panelId);
                                    }
                                }

                                // Determine the open pane and update the right graph
                                $('.sidebar-pane').data('has-graph', false);

                                // gtag: check View selection
                                var selected_value = $( "#SelectView option:selected" ).text();
                                if (selected_value == 'Insecticide Resistance') {
                                    selected_value = 'IR';
                                }

                                // VB-7595 dynamic graph title
                                var graph_selected_value = $("#summByDropdown").find('.dropdown-toggle').text();

                                switch (panelId) {
                                    case "graphs":
                                        // gtag
                                        var graph_name = 'graph_' + selected_value;
                                        gtag('event', graph_name, {'event_category': 'Popbio', 'event_label': 'Popbio graph'});

                                        // VB-7595 dynamic graph title
                                        $('#graphs h3').text(graph_selected_value + ' summary');

                                        updatePieChart(record.count, record.fullstats);
                                        panel.data('has-graph', true);
                                        break;
                                    case "swarm-plots":
                                        // gtag
                                        var swarm_name = 'swarm_' + selected_value;
                                        gtag('event', swarm_name, {'event_category': 'Popbio', 'event_label': 'Popbio swarm'});

                                        // Geno viewmode will say that it is not availble in that mode
                                        if (viewMode === 'abnd' || viewMode === 'path' || viewMode === 'meal') {
                                            PopulationBiologyMap.methods.createHighchartsGraph(buildBbox(recBounds));
                                        } else {
                                            createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                                            panel.data('has-graph', true);
                                        }
                                        break;
                                    case "marker-table":
                                        // gtag
                                        var table_name = 'table_' + selected_value;
                                        gtag('event', table_name, {'event_category': 'Popbio', 'event_label': 'Popbio table'});

                                        updateTable("#table-contents", buildBbox(recBounds));
                                        panel.data('has-graph', true);
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }, delay);
                        prevent = false;
                    }
                })
                .on("mouseover", function (e) {
                    moveTopMarker(layer);
                    var recBounds = L.latLngBounds(record.bounds);
                    if (rectHighlight !== null) map.removeLayer(rectHighlight);
                    rectHighlight = L.rectangle(recBounds, {
                        color: "grey",
                        weight: 1,
                        fill: true,
                        clickable: false
                    }).addTo(map);
                })
                .on("mouseout", function () {
                    removeTopMarker(layer);
                    if (rectHighlight !== null) map.removeLayer(rectHighlight);
                    rectHighlight = null;
                    tooltip.clearQueue()
                        .animate({
                            opacity: 0
                        }, 400, function () {
                            //Animation complete
                    });
                });
            }
        };

        // set options for the main markers layer
        L.Util.setOptions(assetLayerGroup, options);

        // create a temporary markers layer and load it with SOLR data
        var tempLayerGroup = new L.PopbioMarkers(convertedJson, options);

        // detect zoom changes
        var zoomDelta = endingZoom - startingZooom;

        // clear the main layer after copying everything to a temp layer to enable animations
        if (clear) {
            assetLayerGroup.eachLayer(function (marker) {
                if (marker instanceof L.Marker) {
                    marker.options.remove = true;
                }
            })
            // assetLayerGroup.clearLayers()
        }
        // initiate storage of marker coordinates on the temp layer but don't attach it on the map
        //ToDo: move this to the initiliasize function of the library
        tempLayerGroup.initLatLngStorage();

        // Go through each of the markers in the temp layer
        tempLayerGroup.eachLayer(function (marker) {
            if (marker instanceof L.Marker) {
                // store the final location of the marker based on the values stored/calculated in SOLR
                var finalLatLng = marker.getLatLng();
                tempLayerGroup.saveLatLng(marker);

                // has the marker a starting location? If not it will use the final location instead
                var startingLatLng = assetLayerGroup.startingLatLng(marker);

                // Move the marker to the starting location
                marker.setLatLng(startingLatLng);

                //DKDK VB-8116
                var markerNewTooltipLabel = '';
                if (viewMode !== 'smpl') {
                    if (viewMode == 'ir')   markerNewTooltipLabel = ' insecticide resistance assays performed';
                    if (viewMode == 'geno') markerNewTooltipLabel = ' insecticide resistance allele genotypes performed';
                    if (viewMode == 'abnd') markerNewTooltipLabel = ' mosquitoes collected';
                    if (viewMode == 'path') markerNewTooltipLabel = ' pathogen stats assays performed';
                    if (viewMode == 'meal') markerNewTooltipLabel = ' blood meal assays collected';
                    marker.bindTooltip(marker.options.icon.options.count + markerNewTooltipLabel, {
                        // permanent: false,
                        className: 'markerNewTooltipLabelClass',
                        direction: 'top',
                        offset: [0,-13]
                    }).openTooltip();
                }

                // Copy the marker to the main layer (but its opacity it's still only 0.2)
                assetLayerGroup.addLayer(marker);
                var icon = marker._icon;
                // add the class needed to enable animation of the marker
                if (!marker.options.remove) $(icon).addClass("leaflet-marker-icon-anim");
                $(icon).one("webkitAnimationEnd oanimationend msAnimationEnd animationend", function (e) {
                    $(icon).removeClass("leaflet-marker-icon-anim");
                });
            }
        });

        //IMPORTANT: copy the stored coords from the temp layer to the main layer
        // We'll use this values later to determine the starting location of the marker
        // assetLayerGroup.initLatLngStorage();
        assetLayerGroup.storedMarkerCoords = tempLayerGroup.storedMarkerCoords;

        // inform the user that data is loaded
        if (rectHighlight !== null) map.removeLayer(rectHighlight);
        rectHighlight = null;
        map.spin(false);

        // wrap this around a timeout call since it's not working otherwise
        setTimeout(function () {
            assetLayerGroup.eachLayer(function (marker) {
                // set the final location of the marker
                if (marker instanceof L.Marker) {
                    if (marker.options.remove) {
                        var icon = marker._icon;

                        // zooming in or panning
                        if (zoomDelta >= 0) {
                            $(icon).addClass("leaflet-marker-icon-fout");
                            setTimeout(function () {
                                marker.setOpacity(0);
                                setTimeout(function () {
                                    assetLayerGroup.removeLayer(marker);
                                }, 300)
                            })
                        } else { // zoomingOut
                            $(icon).addClass("leaflet-marker-icon-anim")
                            var finalLatLng = assetLayerGroup.startingLatLng(marker);
                            setTimeout(function () {
                                marker.setLatLng(finalLatLng);
                                marker.setOpacity(0);
                                setTimeout(function () {
                                    assetLayerGroup.removeLayer(marker);
                                    if (PopulationBiologyMap.data.highlightedId != undefined) {
                                        PopulationBiologyMap.data.highlightedId = undefined;
                                    }
                                }, 300)
                            })
                        }
                    } else {
                        var finalLatLng = assetLayerGroup.startingLatLng(marker);
                        marker.setLatLng(finalLatLng);

                        // Set it's opacity to 1. CSS will take care of the rest
                        marker.setOpacity(1);
                    }
                }
            });

            //
            setTimeout(function() {
                //Handles the automatic clicking of a marker when rendering a shared link
                highlightedId = PopulationBiologyMap.data.highlightedId;
                if (highlightedId) {
                    var marker = $('#' + highlightedId);
                    //In order to avoid changing the click event code, unsetting highlightedID
                    highlightedId = false

                    if (marker.length > 0) {
                        $(marker).trigger("click");
                    } else {
                        removeHighlight();
                        sidebar.close();
                        setTimeout(function () {
                            resetPlots()
                        }, delay);
                    }
                    highlightedId = false;
                } else {
                    PopulationBiologyMap.methods.resetMap();
                }

                // Refresh legend when all the new markers have been added and old markers have been removed
                legend.refreshLegend();
                if (PopulationBiologyMap.data.initialLoad) {
                    if (PopulationBiologyMap.data.rescale) {
                        $("#rescale_colors").click();
                        //DKDK VB-8372 need to reset map - this is needed to solve shared link case
                        map.on("click", PopulationBiologyMap.methods.resetMap);
                        // This needed to be set in order to fix some synching issues with setTimeouts
                        // Best solution would be to refactor the code (remove setTimeouts!!!!)
                        prevent = true;
                    }

                    PopulationBiologyMap.data.initialLoad = false;
                }
            }, 800);
        }, 50)

        // build a geohash grid
        if ($('#grid-toggle').prop('checked')) addGeohashes(map, false);
    };

    // inform the user that data is loading
    map.spin(true);
    var qryParams = {
        bbox: buildBbox(map.getBounds()).replace(/&fq=/, ''),
        geo: geoLevel,
        geomax: geohashLevel(map.options.maxZoom, "geohash"),
        term: mapSummarizeByToField(glbSummarizeBy).summarize
    };
    var url = solrPopbioUrl + viewMode + 'Geoclust?' + qryUrl + '&' + $.param(qryParams) + "&json.wrf=?&callback=?";

    $.getJSON(url, {
        cache: true,
        headers: {
            'Cache-Control': 'max-age=2592000'
        }
    }, buildMap)
    .done(function () {
        $(document).trigger("jsonLoaded");
    })
    .fail(function () {
        console.log("Failed to load json");
        map.spin(false);
    });
}

/*
 function checkSeasonal
 date: 6/4/2016
 purpose: go through the search terms and check whether a seasonal tag already exits
 inputs: none
 outputs: the value of the seasonal tag if it exists, otherwise false
 */

function checkSeasonal() {
    var activeTerms = $('#search_ac').tagsinput('items');

    for (var i = 0; i < activeTerms.length; i++) {
        var obj = activeTerms[i];
        if (obj.type === 'Seasonal') return obj.value;

    }

    return false;
}

function checkDate() {
    var activeTerms = $('#search_ac').tagsinput('items');

    for (var i = 0; i < activeTerms.length; i++) {
        var obj = activeTerms[i];
        if (obj.type === 'Date' && obj.source !== 'Datepicker') return obj.value;

    }

    return false;
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
    //typeof attr !== typeof undefined && attr !== false
    if (typeof bounds.getEast() !== undefined && bounds.getEast() !== false) {
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
        console.log("bounds is not an object");
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
            case 12:
            case 13:
            case 14:
                geoLevel = "geohash_6";
                break;
            default:
                geoLevel = "geohash_7";
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

        var vSize = 400 + 10*stats.length;

        d3.select("#pie-chart-area svg")
            .attr("width", "100%")
            .attr("height", vSize+"px")
            .style({width: "100%" , height: vSize+"px"});

        nv.addGraph(function () {
            var chart = nv.models.pieChart()
                .x(function (d) {
                    return d.label.capitalizeFirstLetter();
                })
                .y(function (d) {
                    return d.value
                })
                .color(function (d) {
                    // return d.data["color"]
                    return d.color
                })
                .showLabels(true)     //Display pie labels
                .labelThreshold(.05)  //Configure the minimum slice size for labels to show up
                .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or
                // "percent"
                .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
                .donutRatio(0.5)     //Configure h ow big you want the donut hole size to be.
                .growOnHover(false)
                .title(population)   // VB-7427 set title
            ;

            // Must manually remove <title>s lingering from previous draw
            $('#pie-chart-area .nv-series title').remove();

            chart.legend.vers('classic')
                .rightAlign(false)
                .maxKeyLength(23)
                .margin({left: 0, right: 0})
                .width(380)
                .padding(20);

            if (legend.options.summarizeBy === 'Species') {
                chart.legend.applyClass('nv-legend-text-italics');
                chart.tooltip.applyClass('nv-legend-text-italics');
            }

            //DKDK VB-8112 disable donut legend (nvd3)
            chart.legend.updateState(false);

            // Overwrite valueFormatter to return integers
            chart.tooltip.valueFormatter(function (d, i) {
                return d.roundDecimals(0);
            })

            d3.select("#pie-chart-area svg")
                .datum(stats)
                .transition().duration(delay)
                .call(chart);

            // VB-7427 placing legend in the bottom
            d3.select(".nv-pieChart")
               .attr("transform","translate(20,-30)");
            d3.select(".nv-legendWrap")
               .attr("transform","translate(20,350)");

            // VB-7427 set not to change position when clicking legend
	  	    d3.select(".nv-legendWrap").on("click", function(){
		        d3.select(".nv-pieChart").attr("transform","translate(20,-30)")
	           	d3.select(".nv-legendWrap").attr("transform","translate(20,350)")
		    })

	  	    // VB-7427 need to set for double click event too!
	  	    d3.select(".nv-legendWrap").on("dblclick", function(){
		        d3.select(".nv-pieChart").attr("transform","translate(20,-30)")
	           	d3.select(".nv-legendWrap").attr("transform","translate(20,350)")
		    })

            // VB-7427 set font color
            d3.select(".nv-pie-title")
                .style("fill","inherit");

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

    // generate table's data url
    var searchHandler = viewMode + 'Table?';
    var url = solrPopbioUrl + searchHandler + qryUrl + filter + '&sort=id asc&json.wrf=?&callback=?';

    // generate a url with cursorMark
    var cursorUrl = url + '&cursorMark=*', cursorMark = '*', nextCursorMark;

    // start spinning
    PaneSpin('marker-table', 'start');

    var self = this;

    $('.marker-row').fadeOut();


    $('#table-contents').infiniteScrollHelper('destroy');


    $.getJSON(cursorUrl)
        .done(function (json) {
            // make sure the parent div is empty
            if (json.response.numFound && json.response.numFound > 0) {
                var docs = json.response.docs;

                // set the next cursorMark
                nextCursorMark = json.nextCursorMark;
                cursorUrl = url + '&cursorMark=' + nextCursorMark;

                setTimeout(function () {
                    $(divid).empty();

                    tableHtml(divid, docs);
                    PaneSpin('marker-table', 'stop');
                }, delay);
            }

            var pageCount;

            // wait until the table is plotted and animated before setting-up infinite scroll
            setTimeout(function () {
                $('#table-contents').infiniteScrollHelper({
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
                                    // $(divid).empty();

                                    tableHtml(divid, docs);
                                    PaneSpin('marker-table', 'stop');
                                    // tableHtml(divid, docs);
                                }
                                done();
                            })
                            .fail(function () {
                                PaneSpin('marker-table', 'stop');

                                console.log('Failed while loading smplTable');
                                done();
                            });
                    }
                });
            }, delay);
            // $(document).trigger("jsonLoaded");

        })
        .fail(function () {
            PaneSpin('marker-table', 'stop');

            console.log('Failed while loading smplTable')
        });

}

function tableHtml(divid, results) {

    results.forEach(function (element) {
        var dates = element.collection_date_range;
        var collectionDates = [];

        if (dates && dates.length > 0) {
            //Go throught the dates of document and store then in array
            $.each( dates, function (index, value) {
                var frmDate;
                var dateString = value;
                // Match date ranges such as [2009-10 TO 2009-12]
                if (/TO/.test(dateString)) {
                    // Successful match
                    var myregexp = /\[(\S+)\sTO\s(\S+)\]/;
                    var match = myregexp.exec(dateString);
                    var startDateString = match[1], endDateString = match[2];
                    frmDate = dateResolution(startDateString) + ' to ' + dateResolution(endDateString);

                    // match 2009 or 2009-10 but not 2009-10-11 or any longer dates
                } else if (/^\d{4}(?:-\d{2})?$/.test(dateString)) {

                    frmDate = dateResolution(dateString);

                    // Match ISO any other date formats (currently only ISO)
                } else {
                    var date = new Date(dateString);
                    frmDate = date.toLocaleString([], {
                        timeZone: "UTC",
                        weekday: "short",
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                    });
                }

                collectionDates.push(frmDate);
            });
        }

        // hardcoded species_category
        var species = element.species_category ? element.species_category[0] : 'Unknown';
        var bgColor;
        if (glbSummarizeBy === 'Species') {
            bgColor = legend.options.palette[species]
        } else {
            var field = mapSummarizeByToField(glbSummarizeBy).field;
            var fieldContents = element[field];
            if (fieldContents) {
                typeof fieldContents === 'object' ? bgColor = legend.options.palette[fieldContents[0]] : bgColor = legend.options.palette[fieldContents];

            } else {
                bgColor = legend.options.palette['Unknown']
            }

        }

        var row, template;

        switch (viewMode) {
            case "ir":
                row = {
                    accession: element.accession,
                    accessionType: 'Assay ID',
                    bundleName: 'Assay',
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    phenotypeValue: element.phenotype_value_f,
                    phenotypeValueType: element.phenotype_value_type_s,
                    phenotypeValueUnit: element.phenotype_value_unit_s,
                    insecticide: element.insecticide_s,
                    insecticideType: 'Insecticide',
                    sampleSize: element.sample_size_i,
                    concentration: element.concentration_f,
                    concentrationUnit: element.concentration_unit_s,
                    duration: element.duration_f,
                    durationUnit: element.duration_unit_s,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                template = $.templates("#irRowTemplate");
                break;
            case "abnd":
                row = {
                    accession: element.accession,
                    accessionType: 'Sample ID',
                    bundleName: element.bundle_name,
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    attractants: borderColor('Attractant', element.attractants_ss),
                    attractantsType: 'Attractant',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    sampleSize: element.sample_size_i,
                    collectionDuration: element.collection_duration_days_i,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                //DKDK VB-8161 rounding to 2 decimal places
                row.smplAvgAbnd = row.sampleSize / row.collectionDuration;
                if (Number.isInteger(row.smplAvgAbnd) == false) {
                    row.smplAvgAbnd = row.smplAvgAbnd.toFixed(2);
                }
                template = $.templates("#abndRowTemplate");
                break;
            case "geno":
                row = {
                    accession: element.accession,
                    accessionType: 'Assay ID',
                    bundleName: 'Assay',
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    sampleSize: element.sample_size_i,
                    label: element.label,
                    genotypeName: element.genotype_name_s,
                    mutatedProteinValue: element.genotype_mutated_protein_value_f,
                    mutatedProteinUnit: element.genotype_mutated_protein_unit_s,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                row.alleleCount = (element.sample_size_i * element.genotype_mutated_protein_value_f / 50).roundDecimals(0);
                template = $.templates("#genoRowTemplate");
                break;
            case "path":
                row = {
                    accession: element.assay_id_s,
                    accessionType: 'Assay ID',
                    bundleName: 'Assay',
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    phenotypeValue: element.phenotype_value_f,
                    phenotypeValueType: element.phenotype_value_type_s,
                    phenotypeValueUnit: element.phenotype_value_unit_s,
                    sampleSize: element.sample_size_i,
                    infectionStatus: element.infection_status_s,
                    pathogen: element.infection_source_s,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                template = $.templates("#pathRowTemplate");
                break;
             case "meal":
                row = {
                    accession: element.assay_id_s,
                    accessionType: 'Assay ID',
                    bundleName: 'Assay',
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    phenotypeValue: element.phenotype_value_f,
                    phenotypeValueType: element.phenotype_value_type_s,
                    phenotypeValueUnit: element.phenotype_value_unit_s,
                    sampleSize: element.sample_size_i,
                    bloodMealHost: element.blood_meal_source_s,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                template = $.templates("#mealRowTemplate");
                break;
            default:
                row = {
                    accession: element.accession,
                    accessionType: 'Sample ID',
                    bundleName: element.bundle_name,
                    url: element.url,
                    sampleType: element.sample_type,
                    sampleTypeType: 'Sample type',
                    geoCoords: element.geo_coords,
                    geolocation: element.geolocations[0],
                    geolocationType: 'Geography',
                    species: species,
                    speciesType: 'Taxonomy',
                    bgColor: bgColor,
                    textColor: getContrastYIQ(bgColor),
                    collectionDate: collectionDates,
                    projects: borderColor('Project', element.projects),
                    projectsType: 'Project',
                    collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                    collectionProtocolsType: 'Collection protocol',
                    protocols: borderColor('Protocol', element.protocols),
                    protocolsType: 'Protocol',
                    sampleSize: element.sample_size_i,
                    //DKDK VB-8114 displaying sex_s and dev_stage_ss for smpl view (add comma)
                    sex: element.sex_s,
                    devstages: element.dev_stages_ss
                };

                template = $.templates("#smplRowTemplate");
                break;
        }

        var htmlOutput = template.render(row);
        $(divid).append(htmlOutput);
        $('.marker-row').fadeIn();
    });

    //Applying tooltip to active terms in table
    $(".row div:first-child .active-term").tooltip({
        title: "Active term, click to add as a search filter",
        placement:"right",
        delay: { "show": 1000, "hide": 0 }
    });

    $(".row div:nth-child(2) .active-term").tooltip({
        title: "Active term, click to add as a search filter",
        placement:"bottom",
        delay: { "show": 1000, "hide": 0 }
    });
}

function filterMarkers(items, flyTo) {
    "use strict";
    if (items.length === 0) {
        qryUrl = 'q=*:*';
        loadSolr({clear: 1, zoomLevel: map.getZoom(), flyTo: flyTo});
        return;
    }

    // gtag
    gtag('event', 'search_popbio', {'event_category': 'Popbio', 'event_label': 'Popbio search'});

    var terms = {};

    items.forEach(function (element) {

        //VB-7318
        //Prevent Datepicker from creating an entry in terms object
        if (element.type !== "Datepicker") {
            if (!terms.hasOwnProperty(element.type)) terms[element.type] = [];
        }

        if (element.type === 'Date') {
            var format = "YYYY-MM-DD";

            if (element.ranges) {
                //Go through the object date range
                for (var key in  element.ranges) {
                    var endDate = dateConvert(element.ranges[key].endDate, format);
                    var startDate = dateConvert(element.ranges[key].startDate, format);

                    terms[element.type].push({
                        "field": element.field, "value": '[' + startDate + ' TO ' + endDate + ']'
                    });
                }
            }

            return
        }

        if (element.type === 'Datepicker') {
            //For Datepicker items, will populate same index as Date items
            if (!terms.hasOwnProperty("Date")) terms["Date"] = [];
            var format = "YYYY-MM-DD";
            var startDate = dateConvert(element.startDate, format);
            var endDate = dateConvert(element.endDate, format);

            terms["Date"].push({
                "field": element.field, "value": '[' + startDate + ' TO ' + endDate + ']', "notBoolean": element.notBoolean
            });

            return
        }

        if (element.type === 'Seasonal') {

            //Check if element.ranges is defined first
            if (element.ranges) {
                for (var j = 0; j < element.ranges.length; j++) {
                    var range = element.ranges[j];
                    terms[element.type].push({
                        "field": element.field, "value": '[' + range + ']'
                    });
                }
            }

            return

        }

        if (element.type === 'Norm-IR') {

            terms[element.type].push({
                "field": element.field, "value": '[' + element.normIrValues + ']'
            });
            return

        }

        // VB-7318 add field, notBoolean, to terms
        if (element.qtype == 'exact') {
            // VB-7318
            terms[element.type].push({"field": element.field, "value": '"' + element.value + '"', "notBoolean": element.notBoolean});
        } else {
            if (/^".+"$/.test(element.value)) {
                // Successful match
                // VB-7318
                terms[element.type].push({"field": element.field, "value": element.value, "notBoolean": element.notBoolean});
            } else {
                // Match attempt failed
                // VB-7318
                terms[element.type].push({"field": element.field, "value": '*' + element.value + '*', "notBoolean": element.notBoolean});
            }
        }
        // VB-7318 add this to accommodate shared view
        if (element.notBoolean) {
            $('div.bootstrap-tagsinput span.tag.label.label-not').css('background-color', 'red');
        }

    });

    var i = 0;
    var fqUrl = [];
    qryUrl = [];

    // get the count of terms categories (types)
    var tlen = Object.keys(terms).length;

    for (var obj in terms) {
        var qries = {}; // store category terms grouped by field
        var term = terms[obj];
        var termQueries = [];
        var field = undefined;
        //Will store the parts that will be concatenated to create qryUrl
        var queryObject;

        //Construct an array of all the terms that will be used to construct the query
        term.forEach(function (element, index) {  // concatenate and store the terms for each field
            if (qries[element.field] === undefined) {
              qries[element.field] = [];
            }

            //All the elements should have the same field
            if (field === undefined && obj !== "Anywhere") {
              field = element.field
            }
            //Might be possible to set the field value to text instead of using this
            else if (field === undefined && obj === "Anywhere") {
              field = "text";
            }

            termQueries.push({value: element.value, notBoolean: element.notBoolean});
        });

        //Get the q and fq parts of the query
        queryObject = getSolrQueryFromTerm(obj, field, termQueries);

        if (queryObject.q !== undefined) {
            qryUrl.push(queryObject.q);
        }

        if (queryObject.fq !== undefined) {
            fqUrl.push(queryObject.fq);
        }

        i++;
    }

    //Concatenate fqUrl and qryUrl into global variable qryUrl
    //Construct a different query depending on the type of terms we are searching
    if (qryUrl.length !== 0 && fqUrl.length !== 0) {
        qryUrl = "q=(" + qryUrl.join(" AND ") + ")&fq=" + fqUrl.join("&fq=");
    }
    else if (qryUrl.length !== 0) {
        qryUrl = "q=(" + qryUrl.join(" AND ") + ")"
    }
    else {
        qryUrl = "q=*:*&fq=" + fqUrl.join("&fq=");
    }

    // VB-7318 need to remove !!! as it is generated whenever pressing share link
    qryUrl = qryUrl.replace('!!!','');

    // url encode the query string
    qryUrl = encodeURI(qryUrl);
    loadSolr({clear: 1, zoomLevel: map.getZoom(), flyTo: flyTo})
}

function getSolrQueryFromTerm(obj, field, termQueries) {
    var solrQuery = [];
    var solrNotQuery = [];
    var queryString;
    var fqString;

    if ( obj === "Date" ) {
        $.each(termQueries, function (index, query) {
          if (query.notBoolean) {
            solrNotQuery.push("!{!field f=" + field + " op=Within v='" + query.value + "'}");
          }
          else {
            solrQuery.push("{!field f=" + field + " op=Within v='" + query.value + "'}");
          }
        });

        if (solrQuery.length !== 0) {
            queryString = "(" + solrQuery.join(" OR ") + ")";
        }

        if (solrNotQuery.length !== 0) {
            fqString = solrNotQuery.join("&fq=");
        }
    } else {
        $.each(termQueries, function (index, query) {
          if (query.notBoolean) {
              solrNotQuery.push(query.value);
          }
          else {
              solrQuery.push(query.value);
          }
        });

        if (solrQuery.length !== 0) {
            queryString = field + ":(" + solrQuery.join(" OR ") + ")";
        }

        if (solrNotQuery.length !== 0) {
            fqString = "!" + field + ":(" + solrNotQuery.join(" OR ") + ")";
        }
    }

    return {q: queryString, fq: fqString};
}

function borderColor(type, element) {
    var objWithBorderColors = [];

    if (!element) {
        objWithBorderColors.push(
            {
                name: 'Unknown',
                brdColor: type === glbSummarizeBy ? legend.options.palette['Unknown'] : ''
            }
        )
        return objWithBorderColors;
    }

    for (var i = 0; i < element.length; i++) {
        var obj = element[i];

        objWithBorderColors.push({
            name: obj,
            brdColor: type === glbSummarizeBy ? legend.options.palette[obj] : ''
        });
    }

    return objWithBorderColors;
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
        case "Collection protocol":
            return "collection_protocols_cvterms";
        case "Attractant":
            return "attractants_cvterms";
        case "Protocol":
            return "protocols_cvterms";
        case "Collection ID":
            return "collection_assay_id_s";
        case "Insecticide":
            return "insecticide_cvterms";
        case "Allele":
            return "genotype_name_s";
        case "Locus":
            return "locus_name_s";
        case "Collection date":
            return "collection_date_range";
        case "Normalised IR":
            return "phenotype_rescaled_value_f";
        case "Project":
            return "projects";
        case "Author":
            return "project_authors_txt";
        case "Project title":
            return "project_titles_txt";
        case "Sample ID":
            return "exp_sample_id_s";
        case "Assay ID":
            return "assay_id_s";
        case "Seasonal":
            return "collection_season";
        case "Date":
            return "collection_date_range";
        case "Pathogen":
            return "infection_source_cvterms";
        case "Blood meal host":
            return "blood_meal_source_s";
        case "Infection status":
            return "infection_status_s";
        case "Sex":
            return "sex_s";
        case "Developmental stage":
            return "dev_stages_cvterms";
        case "License":
            return "licenses_cvterms";
        case "Tag":
            return "tags_cvterms";
        default :
            return type.toLowerCase()

    }

}

function mapSummarizeByToField(type) {
    var fields = {};
    switch (type) {
        case "Species":
            fields.summarize = "species_category";
            fields.type = "Taxonomy";
            fields.field = "species_category";
            break;
        case "Sample type":
            fields.summarize = "sample_type";
            fields.type = "Sample type";
            fields.field = "sample_type";
            break;
        case "Collection protocol":
            fields.summarize = "collection_protocols_category";
            fields.type = "Collection protocol";
            fields.field = "collection_protocols";
            break;
        case "Attractant":
            fields.summarize = "attractants_ss"; // may have to copyField to attractants_category
            fields.type = "Attractant";
            fields.field = "attractants_ss";
            break;
        case "Protocol":
            fields.summarize = "protocols_category";
            fields.type = "Protocol";
            fields.field = "protocols";
            break;
        case "Insecticide":
            fields.summarize = "insecticide_s";
            fields.type = "Insecticide";
            fields.field = "insecticide_s";
            break;
        case "Allele":
            fields.summarize = "genotype_name_s";
            fields.type = "Allele";
            fields.field = "genotype_name_s";
            break;
        case "Locus":
            fields.summarize = "locus_name_s";
            fields.type = "Locus";
            fields.field = "locus_name_s";
            break;
        case "Project":
            fields.summarize = "projects_category";
            // VB-7318 fields.type = Project -> Projects to fix avtive-legend
            fields.type = "Project";
            fields.field = "projects";
            break;
        case "Pathogen":
            fields.summarize = "infection_source_s";
            fields.type = "Pathogen";
            fields.field = "infection_source_s";
            break;
        case "Infection status":
            fields.summarize = "infection_status_s";
            fields.type = "Infection status";
            fields.field = "infection_status_s";
            break;
        case "Blood meal host":
            fields.summarize = "blood_meal_source_s";
            fields.type = "Blood meal host";
            fields.field = "blood_meal_source_s";
            break;
        default :
            fields.summarize = "species_category";
            fields.type = "Taxonomy";
            fields.field = "species_category";
            break;
    }
    return fields;

}

// VB-7318 changes are made when calling this function, instead
// bootstrap classes here: https://www.w3schools.com/bootstrap/bootstrap_badges_labels.asp
// needs some rational overhaul
function mapTypeToLabel(type) {
        switch (type) {
            case 'Taxonomy'   :
                return 'label label-primary label-taxonomy';   // dark blue
            case 'Geography':
                return 'label label-primary label-geography';  // dark blue
            case 'Title'  :
                return 'label label-success label-title';    // green
            case 'Description':
                return 'label label-success label-description';   // green
            case 'Project'   :
                return 'label label-success label-project';   // green
            case 'Project title'   :
                return 'label label-success label-project-title';   // green
            case 'Anywhere'   :
                return 'label label-default label-anywhere';   // grey
            case 'PubMed' :
                return 'label label-success label-pubmed';
            case 'Insecticide' :
                return 'label label-success label-insecticide';
            //Color of the text
            case 'Allele' :
                return 'label label-success label-allele';
            case 'Locus' :
                return 'label label-success label-locus';
            case 'Collection protocol' :
                return 'label label-success label-collection-protocol';
            case 'Attractant' :
                return 'label label-success label-attractant';
            case 'Date' :
                return 'label label-info label-date'
            case 'Datepicker' :
                return 'label label-info label-date'
            case 'Seasonal' :
                return 'label label-info label-seasonal'
            case 'Norm-IR' :
                return 'label label-secondary label-norm-ir';
            case 'Collection ID' :
                return 'label label-warning label-collection-id';
            case 'Sample ID' :
                return 'label label-success label-sample-id';
            case 'Assay ID' :
                return 'label label-success label-assay-id';
            case 'Sample' :
                return 'label label-warning label-sample';
            case 'Sample type' :
                return 'label label-warning label-sample-type';
            case 'Protocol' :
                return 'label label-warning label-protocol';
            case 'Author' :
                return 'label label-success label-author';
            case 'Coordinates':
                return 'label label-success label-coordinates';
            case 'Pathogen':
                return 'label label-success label-allele';
            case 'Blood meal host':
                return 'label label-success label-blood-meal-host';
            case 'Infection status':
                return 'label label-success label-geography';
            case 'Sex':
                return 'label label-info label-sex';
            case 'Developmental stage':
                return 'label label-warning label-dev-stage';
            case 'License':
                return 'label label-info label-license';
            case 'Tag':
                return 'label label-info label-tag';
            default :
                return 'label label-warning label-default';
        }
}

function mapTypeToIcon(type) {
    switch (type) {
        case 'Taxonomy'   :
            return 'fas fa-sitemap';
        case 'Geography':
            return 'fas fa-map-marker-alt';
        case 'Title'  : // think about renaming this to External ID
            return 'fas fa-sign';
        case 'Description':
            return 'fas fa-info-circle';
        case 'Project'   :
            return 'fas fa-database';
        case 'Project title'   :
            return 'fas fa-sign';
        case 'Anywhere'   :
            return 'fas fa-search';
        case 'PubMed' :
            return 'fas fa-book';
        case 'Insecticide' :
            return 'fas fa-eye-dropper';
        case 'Collection protocol' :
            return 'fas fa-shopping-cart';
        case 'Attractant' :
            return 'fas fa-magnet';
        case 'Date' :
            return 'far fa-calendar-alt';
        case 'Datepicker' :
            return 'far fa-calendar-alt';
        case 'Seasonal' :
            return 'far fa-calendar-check';
        case 'Norm-IR' :
            return 'fas fa-bolt';
        case 'Collection ID' :
            return 'fas fa-shopping-cart';
        case 'Sample ID' :
            return 'fas fa-id-card';
        case 'Assay ID' :
            return 'fas fa-vial';
        case 'Sample' :
            return 'fas fa-map-pin';
        case 'Sample type' :
            return 'fas fa-cookie';
        case 'Protocol' :
            return 'fas fa-sort-amount-down';
        case 'Author' :
            return 'fas fa-user';
        case 'Coordinates':
            return 'fas fa-map-marker-alt';
        case 'Location':
            return 'fas fa-location-arrow';
        case 'Allele':
            return 'fas fa-sliders-h';
        case 'Locus':
            return 'fas fa-thumbtack';
        case 'Concentration':
            return 'fas fa-tachometer-alt';
        case 'Duration':
            return 'far fa-clock';
        case 'Phenotype':
            return 'far fa-eye';
        case 'Count':
            return 'fas fa-hashtag';
        case 'Pathogen':
            return 'fas fa-thermometer-half';
        case 'Infection status':
            return 'fas fa-bullseye';
        case 'Sex':
            return 'fas fa-venus-mars';
        case 'Developmental stage':
            return 'fas fa-sync';
        case 'Tag':
            return 'fas fa-tag';
        case 'License':
            return 'fab fa-creative-commons';
        case 'Blood meal host':
            return 'fas fa-tint';
        default :
            return 'fas fa-search';

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
    // $(marker).addClass("highlight-marker");
    $(marker._icon).addClass("highlight-marker");

    //Update the highlightedID variable
    PopulationBiologyMap.data.highlightedId = marker._icon.id;

    // highlight = marker;
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
    $(".highlight-marker").removeClass("highlight-marker")
}

function resetPlots() {
    "use strict";

    var pieHTML, violinHTML, tableHTML;

    // VB-7595 dynamic title for an initial visit
    var graph_selected_initial = $("#summByDropdown").find('.dropdown-toggle').text();

    if (firstClick) {
        pieHTML =
            // VB-7595 change initial title
            // '<h3>Summary view for selected samples</h3>' +
            '<h3>' + graph_selected_initial + ' summary' + '</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<span class="fa-stack fa-stack-lg">' +
            '<i class="fab fa-chrome fa-stack-2x"></i>' +
            '<i class="fa fa-circle fa-stack-1x"/></i></span>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to plot some real data</h4> ' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-chart-area" style="color: #2C699E; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to plot some real data</h4> ' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-table" style="color: #2C699E; font-size: 12em"></i>' +
            '<h1>Go on!</h1>' +
            '<h4>click a marker on the map</h4>' +
            '<h4>to see some real data</h4> ' +
            '</div>';
    } else {

        pieHTML =
            // VB-7595 change initial title
            // '<h3>Summary view for selected samples</h3>' +
            '<h3>' + graph_selected_initial + ' summary' + '</h3>' +
            '<div id="pie-chart-header" style="text-align: center; margin-top: 30px">' +
            '<span class="fa-stack fa-stack-lg">' +
            '<i class="fab fa-chrome fa-stack-2x"></i>' +
            '<i class="fa fa-circle fa-stack-1x"/></i></span>' +
            '<h4>click a marker on the map</h4>' +
            '</div>' +
            '<div id="pie-chart-area">' +
            '<svg></svg>' +
            '</div>';
        violinHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-chart-area" style="color: #2C699E; font-size: 12em"></i>' +
            '<h4>click a marker on the map</h4>' +
            '</div>';
        tableHTML =
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-table" style="color: #2C699E; font-size: 12em"></i>' +
            '<h4>click a marker on the map</h4>' +
            '</div>';
    }

    $('#graphs').html(pieHTML);
    $('#swarm-chart-area').html(violinHTML);
    $('#marker-table').off("scroll");
    $('#table-contents-header').html(tableHTML);
    $('#table-contents').empty();
    //Reset download panel
    $("#select-export").selectpicker("val", "0");
    $("#export-message").hide();
}


function getContrastYIQ(hexcolor) {
    // strip # from the hexcolor
    hexcolor = hexcolor.replace(/#/, '');
    // parse RGB values
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);

    // build a yiq represantation that takes into account the sensitivity of our eyes to R, G and B
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // calculate the contrast
    // the original had a value of 128 for the comparison but I get better results with 200 (more white text)
    return (yiq >= 200) ? '#000000' : '#ffffff';
}

String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
Number.prototype.roundDecimals = function (decimals) {
    return Number(Math.round(this.valueOf() + 'e' + decimals) + 'e-' + decimals);
};

function constructSeasonal(selectedMonths) {
    // build ranges
    var format = "YYYY-MM", formatText = "MMM";
    var ranges = [], rangesText = [];
    var range, rangeText, inRange = false;
    var startDate = new Date(1600, 0, 1), endDate = new Date(1600, 0, 1);

    for (var i = 1; i < 13; i++) {
        var month = selectedMonths[i];
        if (month) {
            if (!inRange) {

                startDate.setMonth(i - 1);
                endDate.setMonth(i - 1);
                inRange = true;
            } else {
                endDate.setMonth(i - 1);
            }

            if (i === 12) {

                range = dateConvert(startDate, format) + ' TO ' + dateConvert(endDate, format);
                ranges.push(range);

                if (startDate.getTime() === endDate.getTime()) {

                    rangeText = dateConvert(startDate, formatText);
                } else {

                    rangeText = dateConvert(startDate, formatText) + '-' + dateConvert(endDate, formatText);
                }

                rangesText.push(rangeText);
                inRange = false;
            }

        } else {
            if (inRange) {

                range = dateConvert(startDate, format) + ' TO ' + dateConvert(endDate, format);
                ranges.push(range);

                if (startDate.getTime() === endDate.getTime()) {

                    rangeText = dateConvert(startDate, formatText);
                } else {

                    rangeText = dateConvert(startDate, formatText) + '-' + dateConvert(endDate, formatText);
                }

                rangesText.push(rangeText);
                inRange = false;
            }

        }
    }

    return {
        ranges: ranges,
        rangesText: rangesText
    };
}

function constructIrNorm(min, max) {

    return {}
}

/*
 function dateResolution
 date: 7/4/2016
 purpose: Given a SOLR date string return the proper date format based on the resolution of the string
 inputs: dateString: a SOLR date string e.g. 2016-01 or 2016-01-03
 outputs: a string e.g Jan 2016 or Mon Jan 3 2016
 */

function dateResolution(dateString) {
    // very complex regex I got from https://gist.github.com/philipashlock/8830168
    // could probably simplify it a lot for our needs but I'm leaving it like this for possible future use
    // match[1] is year, match[5] is month, match[7] is day
    var myregexp = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/g;
    var match = myregexp.exec(dateString);
    var year = match[1], month = match[5], day = match[7];

    var date = new Date(dateString);

    if (typeof day !== 'undefined') {
        return date.toLocaleString([], {
            timeZone: "UTC",
            weekday: "short",
            month: "short",
            day: "2-digit",
            year: "numeric"
        });
    }

    if (typeof month !== 'undefined') {
        var format = "MMM YYYY";
        return dateConvert(date, format, true);
    }

    if (typeof year !== 'undefined') {
        var format = "YYYY";
        return dateConvert(date, format, true);
    }

    return false;
}

function getRandom(min, max) {
    return Math.random() * (max - min + 1) + min;
}

function dateConvert(dateobj, format, utc) {
    //Minimizing code complains if we do utc = false as parameter so doing it this way
    if (utc === undefined) {
        utc = false;
    }

    //Some parts of the map use this function to display things (not just to create the query)
    //So when using it when displaying the dates, use UTC
    if (utc) {
        var year = dateobj.getUTCFullYear();
        var month = ("0" + (dateobj.getUTCMonth() + 1)).slice(-2);
        var date = ("0" + dateobj.getUTCDate()).slice(-2);
        var hours = ("0" + dateobj.getUTCHours()).slice(-2);
        var minutes = ("0" + dateobj.getUTCMinutes()).slice(-2);
        var seconds = ("0" + dateobj.getUTCSeconds()).slice(-2);
        var day = dateobj.getUTCDay();
    }
    else {
        var year = dateobj.getFullYear();
        var month = ("0" + (dateobj.getMonth() + 1)).slice(-2);
        var date = ("0" + dateobj.getDate()).slice(-2);
        var hours = ("0" + dateobj.getHours()).slice(-2);
        var minutes = ("0" + dateobj.getMinutes()).slice(-2);
        var seconds = ("0" + dateobj.getSeconds()).slice(-2);
        var day = dateobj.getDay();
    }
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var dates = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var converted_date = "";

    switch (format) {
        case "YYYY-MM-DD":
            converted_date = year + "-" + month + "-" + date;
            break;
        case "YYYY-MM":
            converted_date = year + "-" + month;
            break;
        case "MMM YYYY":
            converted_date = months[parseInt(month) - 1] + " " + year;
            break;
        case "YYYY-MMM-DD DDD":
            converted_date = year + "-" + months[parseInt(month) - 1] + "-" + date + " " + dates[parseInt(day)];
            break;
        case "MMM":
            converted_date = months[parseInt(month) - 1];
            break;
        case "YYYY":
            converted_date = year;
            break;
    }

    return converted_date;
}

// truncate any string longer than *max* and append *add* at the end (three ellipses by default)
String.prototype.truncate = function (max, add) {
    add = add || '...';
    return (this.length > max ? this.substring(0, max) + add : this);
};

// Add an URL parser to JQuery that returns an object
// This function is meant   to be used with an URL like the window.location
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

// plugtrade.com - jQuery detect vertical scrollbar function //
(function ($) {
    $.fn.has_scrollbar = function () {
        var divnode = this.get(0);
        if (divnode.scrollHeight > divnode.clientHeight)
            return true;
    }
})(jQuery);

//End the flashing of sidebar icons when any icon is clicked
$(document).on('click', '.sidebar-icon', function() {
    $('.sidebar-icon.flash').removeClass('flash');
});

$(document).on('click', '.sidebar-x', function() {

    // Check if we were in a resizable panel and return it to the old state
    if ($("#active-pane.ui-resizable").length) {
        $("#active-pane.ui-resizable").removeAttr("style");
        $("#active-pane.ui-resizable").resizable("destroy");

        // Restore highcarts to its old width
        var chart = Highcharts.charts[0];
        chart.setSize(380, chart.chartHeight);
    }
    sidebar.close();
});

//fill used in the vb_geohashes_mean.html file is not supported in IE11 so need this function to make it work
if (!Array.prototype.fill) {
    Object.defineProperty(Array.prototype, 'fill', {
        value: function(value) {

            // Steps 1-2.
            if (this == null) {
                throw new TypeError('this is null or not defined');
            }

            var O = Object(this);

            // Steps 3-5.
            var len = O.length >>> 0;

            // Steps 6-7.
            var start = arguments[1];
            var relativeStart = start >> 0;

            // Step 8.
            var k = relativeStart < 0 ?
            Math.max(len + relativeStart, 0) :
            Math.min(relativeStart, len);

            // Steps 9-10.
            var end = arguments[2];
            var relativeEnd = end === undefined ?
            len : end >> 0;

            // Step 11.
            var final = relativeEnd < 0 ?
            Math.max(len + relativeEnd, 0) :
            Math.min(relativeEnd, len);

            // Step 12.
            while (k < final) {
                O[k] = value;
                k++;
            }

            // Step 13.
            return O;
        }
    });
}
