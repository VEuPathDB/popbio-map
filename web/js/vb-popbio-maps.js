function bindEvents() {
    "use strict"

    if (urlParams.view === 'ir') {
        $("#SelectViewDropdown").find(".dropdown-menu li a").parents(".dropdown").find(".btn").html("<i class='fa fa-eye' id='view-icon'></i> Insecticide Resistance" + ' <span class="caret"></span>');
        $('#view-mode').val('ir');
    } else {
        $("#SelectViewDropdown").find(".dropdown-menu li a").parents(".dropdown").find(".btn").html("<i class='fa fa-eye' id='view-icon'></i> Samples" + ' <span class="caret"></span>');
        $('#view-mode').val('smpl');
    }

    // update the export fields dropdown
    updateExportFields($("#view-mode").val());


    $(document).on("click", '.dropdown-menu li a', function () {

        var selValue = $(this).data('value');
        var selText = $(this).text();
        var parentID = $(this).closest("div").attr('id');

        switch (parentID) {
            case 'summByDropdown':
                glbSummarizeBy = selValue;

                var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*:*&facet.pivot=geohash_2,' +
                    mapSummarizeByToField(glbSummarizeBy).summarize +
                    '&json.wrf=?&callback=?';

                removeHighlight();
                sidebar.close();
                setTimeout(function () {
                    resetPlots()
                }, delay);
                $.getJSON(url, function (data) {
                    legend._populateLegend(data, glbSummarizeBy)
                });
                $('#Filter-Terms').val('');
                break;

            case 'sortByDropdown':
                legend.options.sortBy = selText;
                legend.refreshLegend(palette);

                // $('#Filter-Terms').keyup(function() {
                var val = $.trim($('#Filter-Terms').val()).replace(/ +/g, ' ').toLowerCase();

                $('.table-legend-term').show().filter(function () {
                    var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                    return !~text.indexOf(val);
                }).hide();
                // });


                break;

            default:
                $(this).parents(".dropdown").find('.btn').html($(this).data('value') + ' <span class="caret"></span>');
                $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
                break;
        }


    });


    $('#Reset-Filter').click(function () {
        $('#Filter-Terms').val('');
        $('.table-legend-term').show();

    });

    // download data
    $('#download-button').click(function () {
        var selectedOption = $('#select-export').val(),
            viewMode = $("#view-mode").val(),
            url = solrExportUrl,
            viewBox = buildBbox(map.getBounds()),
            fieldsStr = '&fl=';

        // clear the error area
        $('#export-error').fadeOut();

        // reset the button link
        $(this).removeAttr('href');

        if ($('#select-export-fields').val()) {
            fieldsStr += $('#select-export-fields').val().join();

        } else {
            // no marker is selected
            // inform the user that there are no selected markers
            $('#export-error').addClass('alert alert-warning')
                .html('<h5><i class="fa fa-exclamation-triangle fa-fw"></i> Please select at least one field</h5>')
                .fadeIn();
            return;
        }


        //console.log($('#select-export-fields').val().join());

        switch (selectedOption) {
            //download all data
            case "1":
                url += viewMode + 'Export?q=*:*' + fieldsStr + '&sort=exp_id_s+asc';
                this.href = url;
                break
            // data matching search
            case "2":
                url += viewMode + 'Export?' + qryUrl + fieldsStr + '&sort=exp_id_s+asc';
                this.href = url;
                break;
            // data visible on screen
            case "3":
                url += viewMode + 'Export?' + qryUrl + viewBox + fieldsStr + '&sort=exp_id_s+asc';
                this.href = url;
                break;
            // data for selected marker
            case "4":
                // grab the id (geohash) of the highlighted marker
                var highlightedMarkerId = $('.highlight-marker').attr('id');

                // was there a highlighed marker
                if (highlightedMarkerId) {
                    //console.log(highlightedMarkerId)
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
                    url += viewMode + 'Export?' + qryUrl + geohashFq + fieldsStr + '&sort=exp_id_s+asc';
                    //console.log(url);
                    this.href = url;
                } else { // no marker is selected
                    // inform the user that there are no selected markers
                    $('#export-error').addClass('alert alert-warning')
                        .html('<h5><i class="fa fa-exclamation-triangle fa-fw"></i> Please select a marker first.</h5>')
                        .fadeIn();

                }
                break;
            default:
                break;

        }
    })


    // add the IR scale bars in the advanced options pane
    var inHtml = '';
    $.each(colorBrewer.slice().reverse(), function (index, value) {
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
        var highlightedMarker = $('.highlight-marker');
        if (highlightedMarker) {
            sidebarClick = true;
            $(highlightedMarker).trigger("click");
            sidebarClick = false;
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
            case 'Projects':
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
        $(document).one('click', '#entity-cancel-hover', function (event) {

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

            entityJson.creation_date = newCreationDate.toDateString();
            entityJson.last_modified_date = newLastModifiedDate.toDateString();

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

            // entityTooltip.css("left", (event.pageX + 10) + "px")
            //     .css("top", (tooltipY) + "px")

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


    // Active terms
    $(document).on("click", '.active-term', function () {
        highlightedId = $('.highlight-marker').attr('id');

        if ($('.sidebar-pane.active').attr('id') === 'swarm-plots') {
            selectedPlotType = $('#plotType').val();

        } else {
            $('#plotType').val('none');
        }

        $('#search_ac').tagsinput('add', {
            value: $(this).attr('value'),
            activeTerm: true,
            type: $(this).attr('type'),
            field: mapTypeToField($(this).attr('type')),
            qtype: 'exact'

        });

        var tooltip = d3.select('#beeswarmPointTooltip');
        if ($('#no-interactions').hasClass("foreground")) {

            tooltip.transition()
                .duration(500)
                .style("opacity", 0)
                .style("z-index", -1000000);
            $('#no-interactions').removeClass("in").removeClass("foreground");
            stickyHover = false;

        }
    })
        .on("click", '.active-legend', function () {

            $('#search_ac').tagsinput('add', {
                value: $(this).attr('value'),
                activeTerm: true,
                type: $(this).attr('type'),
                field: mapTypeToField($(this).attr('type')),
                qtype: 'exact'

            });

            var tooltip = d3.select('#beeswarmPointTooltip');
            if ($('#no-interactions').hasClass("foreground")) {

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
                    .style("z-index", -1000000);
                $('#no-interactions').removeClass("foreground");
                stickyHover = false;

            }
        })
        // This is here to trigger an update of the graphs when an active-term is clicked
        // FixMe: Have to solve the issue with pruneclusters first
        .on("jsonLoaded", function () {
            if (highlightedId) {
                var marker = $('#' + highlightedId);
                if (marker.length > 0) {
                    $(marker).trigger("click");
                    highlightMarker(marker);
                } else {
                    sidebar.close();
                    setTimeout(function () {
                        resetPlots()
                    }, delay);
                }
                highlightedId = false;
            }

        });


    // Toggle grid
    $('#grid-toggle').change(function () {

        if (!$(this).prop('checked')) {
            map.removeLayer(geohashesGrid);
        } else {
            var geoLevel = geohashLevel(map.getZoom(), "geohash");
            addGeohashes(map, geoLevel.slice(-1));
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


    // clear the date selection panel once collapsed
    $('#daterange').on('hidden.bs.collapse', function () {
        $("#date-start").datepicker("clearDates");
        $("#date-end").datepicker("clearDates");
        $("#add-dates").prop('disabled', true);
        $("#add-season").prop('disabled', true);
    });

    // clear the seasonal search panel once collapsed
    $('#seasonal').on('hidden.bs.collapse', function () {
        if (checkSeasonal()) return;

        $('.season-toggle').each(function () {
//                console.log($(this).prop('checked'));
            if ($(this).prop('checked')) {
                $(this).bootstrapToggle('off');
            }
        })

    });


    $('#date-select, #SelectViewDropdown').click(function () {
        if ($('#seasonal').attr("aria-expanded") == 'true') {
            $('#seasonal').collapse('hide');
        }
    });

    $('#season-select, #SelectViewDropdown').click(function () {

        if ($('#daterange').attr("aria-expanded") == 'true') {
            $('#daterange').collapse('hide');
        }
    });


    // bind the date range text fields to the datepicker
    $('#daterange').find('.input-daterange').datepicker({
        format: "dd/mm/yyyy",
        startView: 2,
        todayBtn: "linked",
        autoclose: true,
        todayHighlight: true,
        endDate: "Date.now()"
    });

    // collect the months to be included in the seasonal search
    $('.season-toggle').change(function () {
        var enable = false;
        $('.season-toggle').each(function () {
            var curMonth = $(this).val(), curMode = $(this).prop('checked');
            months[curMonth] = curMode;
            if (curMode) enable = true;
        });

        if (enable) {
            $("#add-season").prop('disabled', false);
        } else {
            $("#add-season").prop('disabled', true);
        }
    });

    // add the seasonal filter into search
    $('#add-season').click(function () {
        var objRanges = constructSeasonal(months);
        // add the filter, by keeping the value the same ('seasonal') we ensure
        // that there's only one seasonal filter enabled at any given point
        if (checkSeasonal()) {

            // adding the item with replace: true will prevent the map from updating
            // it will update once we remove the old tag
            $('#search_ac').tagsinput('add', {
                value: objRanges.rangesText.toString(),
                ranges: objRanges.ranges,
                replace: true,
                type: 'Seasonal',
                field: 'collection_season'

            });

            $('#search_ac').tagsinput('remove', checkSeasonal());
        } else {
            $('#search_ac').tagsinput('add', {
                value: objRanges.rangesText.toString(),
                ranges: objRanges.ranges,
                replace: false,
                type: 'Seasonal',
                field: 'collection_season'

            });
        }
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


        var inHtml = '';
        console.log(firstVal + ' - ' + secondVal);
        $.each(colorBrewer.slice().reverse().slice(firstVal, secondVal + 1), function (index, value) {
            inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 6px; background-color: ' + value + ' ;">&nbsp &nbsp</i>';
        });
        // $('#menu-scale-bars').html(inHtml);

        // reverse the values, 0-> high resistance, 1-> low resistance
        // normIrValues = (1 - (secondVal / 10 + 0.1)).roundDecimals(1) + ' TO ' + (1 - (firstVal / 10)).roundDecimals(1);
        normIrValues = scaleToIrMap[secondVal] + ' TO ' + scaleToIrMap[firstVal];
        console.log(normIrValues);

        $('#search_ac').tagsinput('add', {
            value: normIrValues,
            html: inHtml,
            normIrValues: normIrValues,
            type: 'Norm-IR',
            field: 'phenotype_rescaled_value_f'

        });
    });

    // Enable the add dates button only if the date fields are populated
    $("#date-start").datepicker()
        .on('changeDate', function (e) {
            $("#add-dates").prop('disabled', false);
        });

    // add the date filter into search
    $("#add-dates").click(function () {
        var dateStart = new Date($("#date-start").datepicker('getUTCDate'));
        var dateEnd = new Date($("#date-end").datepicker('getUTCDate'));
        var value;
        if (dateStart.getTime() === dateEnd.getTime()) {
            value = dateStart.toLocaleDateString('en-GB')
        } else {
            value = dateStart.toLocaleDateString('en-GB') + '-' + dateEnd.toLocaleDateString('en-GB')
        }

        $('#search_ac').tagsinput('add', {
            value: value,
            dateStart: dateStart,
            dateEnd: dateEnd,
            type: 'Date',
//                field: 'collection_date',
            field: 'collection_date_range'

        });

    });

    $('.date-shortcut').click(function () {
        console.log(this.value);
        setDateRange('#date-start', "#date-end", this.value);

    });


    $('#search_ac').on('itemAdded', function (event) {
        // don't update the map. So far only used when altering (removing and adding again) a seasonal filter
        if (event.item.replace) return;

        if (event.item.activeTerm) {
            $('#search-bar').animate({
                left: "+=4"
            }, 15)
                .animate({
                    left: "-=8"
                }, 30)
                .animate({
                    left: "+=8"
                }, 30)
                .animate({
                    left: "-=8"
                }, 30)
                .animate({
                    left: "+=8"
                }, 30)
                .animate({
                    left: "-=4"
                }, 15)
            ;
            filterMarkers($("#search_ac").tagsinput('items'));
            return;
        }

        sidebar.close();
        setTimeout(function () {
            removeHighlight();
            resetPlots()
            filterMarkers($("#search_ac").tagsinput('items'));
        }, delay);

    });
    $('#search_ac').on('itemRemoved', function () {
        // reset the seasonal search panel
        if (!checkSeasonal()) {

            $('.season-toggle').each(function () {
                if ($(this).prop('checked')) {
                    $(this).bootstrapToggle('off');
                }
            })
        }


        sidebar.close();
        setTimeout(function () {
            removeHighlight();
            resetPlots()
            filterMarkers($("#search_ac").tagsinput('items'));
        }, delay);

    });
}

/*
 function initialize_map
 date: 18/6/2015
 purpose:
 inputs:
 outputs:
 */

function initializeMap() {
    "use strict";

    // new MapQuest way of adding layers
    var mapQuestLayers = MQ.mapLayer();
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


    var mp3 = new L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 2,
        maxZoom: 15,
        noWrap: 0,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>'
    });

    map.addLayer(mapQuestLayers);
    assetLayerGroup = new L.LayerGroup();
    assetLayerGroup.addTo(map);
    var layerCtl = new L.Control.Layers({
        'Map': mapQuestLayers,
        'Hybrid': MQ.hybridLayer(),
        'Satellite': MQ.satelliteLayer(),
        'Dark': MQ.darkLayer(),
        'Light': MQ.lightLayer(),
        'OpenStreetMap': mp3,
    });
    layerCtl.setPosition('topright');
    layerCtl.addTo(map);


    // Now generate the legend

    // hardcoded species_category
    var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*:*&facet.pivot=geohash_2,' + mapSummarizeByToField(glbSummarizeBy).summarize + '&json.wrf=?&callback=?';
    //console.log('url: ' + url);
    //$.getJSON(url, generatePalette);
    legend = new L.control.legend(url, {summarizeBy: glbSummarizeBy});

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

        // reset seasonal search panel
        $('.season-toggle').each(function () {
            if ($(this).prop('checked')) {
                $(this).bootstrapToggle('off');
            }
        });


        removeHighlight();
        sidebar.close();
        setTimeout(function () {
            resetPlots()
            filterMarkers('');
        }, delay);
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
                    if ($('#world-toggle').prop('checked')) {
                        return solrTaUrl + $('#view-mode').val() + 'Acat?q=' + encodeURI(match[1]) + buildBbox(map.getBounds());
                    } else {
                        return solrTaUrl + $('#view-mode').val() + 'Acat?q=' + encodeURI(match[1]);
                    }
                } else {
                    // Match attempt failed
                    partSearch = false;

                    if ($('#world-toggle').prop('checked')) {
                        return url + encodeURI(query) + buildBbox(map.getBounds());
                    } else {
                        return url + encodeURI(query);
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
                if ($('#world-toggle').prop('checked')) {
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
            return mapTypeToLabel(item.type);
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
                            if ($('#world-toggle').prop('checked')) {
                                msg = 'No suggestions found. Try enabling world search or hit enter to perform a free text search instead.';

                            } else {
                                msg = 'No suggestions found. Hit Enter to perform a free text search instead.';
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

    $("#SelectViewDropdown").find(".dropdown-menu li a").click(function () {

        var selText = $(this).text();
        if (selText === "Samples") {
            $('#view-mode').val('smpl');
        } else {
            $('#view-mode').val('ir');
        }

        // update the export fields dropdown
        updateExportFields($("#view-mode").val());

        // var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*&facet.pivot=geohash_2,species_category&json.wrf=?&callback=?';
        var url = solrPopbioUrl + $('#view-mode').val() + 'Palette?q=*:*&facet.pivot=geohash_2,' +
            mapSummarizeByToField(glbSummarizeBy).summarize +
            '&json.wrf=?&callback=?';

        removeHighlight();
        sidebar.close();
        setTimeout(function () {
            resetPlots()
        }, delay);
        $.getJSON(url, function (data) {
            legend._populateLegend(data, glbSummarizeBy)
        });
        acSuggestions.initialize(true);
        acOtherResults.initialize(true);
    });

}

/**
 Created by Ioannis on 11/08/2016
 Given the view mode update the fields selection dropdown
 **/

function updateExportFields(viewMode) {
    var smplFields = [
        {
            value: 'exp_accession_s',
            label: 'Accession',
            icon: mapTypeToIcon('Stable ID')
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
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            icon: mapTypeToIcon('Collection protocols')
        },
        {
            value: 'exp_projects_ss',
            label: 'Projects',
            icon: mapTypeToIcon('Projects')
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
            label: 'Protocols',
            icon: mapTypeToIcon('Protocols')
        }

    ];
    var irFields = [
        {
            value: 'exp_accession_s',
            label: 'Accession',
            icon: mapTypeToIcon('Stable ID')
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
            value: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            icon: mapTypeToIcon('Date')
        },
        {
            value: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            icon: mapTypeToIcon('Collection protocols')
        },
        {
            value: 'exp_projects_ss',
            label: 'Projects',
            icon: mapTypeToIcon('Projects')
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
            label: 'Protocols',
            icon: mapTypeToIcon('Protocols')
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
        }

    ]

    // empty the dropdown
    $('#select-export-fields').empty();

    if (viewMode === 'ir') {
        $.each(irFields, function (index, obj) {
            $('#select-export-fields')
                .append(
                    $("<option></option>")
                        .attr("value", obj.value)
                        .text(obj.label)
                        .data('subtext', obj.subtext)
                        .data('icon', obj.icon)
                );
        })

    } else {
        $.each(smplFields, function (index, obj) {
            $('#select-export-fields')
                .append(
                    $("<option></option>")
                        .attr("value", obj.value)
                        .text(obj.label)
                        .data('icon', obj.icon)
                );
        })
    }

    $('#select-export-fields')
        .selectpicker('selectAll')
        .selectpicker('refresh');
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
    if (urlParams.grid === "true" || $('#grid-toggle').prop('checked')) addGeohashes(map, geoLevel.slice(-1));
    //ToDo: change the grid checkbox value to true when grid is switched on trough a URL parameter

    //we are too deep in, just download the landmarks instead

    // if (zoomLevel > 16) {
    //     loadSmall(1, zoomLevel);
    //
    //     return;
    //
    // }

    var terms = [];

    // this function processes the JSON file requested by jquery
    var buildMap = function (result) {
        // using the facet.stats we return statistics for lat and lng for each geohash
        // we are going to use these statistics to calculate the mean position of the
        // landmarks in each geohash

        var viewMode = $('#view-mode').val();
        // display the number of results
        if (viewMode === "ir") {
            $("#markersCount").html(result.response.numFound + ' visible assays summarized by ' + glbSummarizeBy + '</u>');
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
            map.spin(false);
            return;
        }

        var docLat, docLng, docSpc, docPhe;

        var statFields = result.stats.stats_fields;
        var facetCounts = result.facet_counts;

        var sumField = mapSummarizeByToField(glbSummarizeBy).summarize;

        // process the correct geohashes based on the zoom level
        switch (zoomLevel) {
            case 1:
            case 2:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_1;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_1;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_1 : null;
                // this is were we are forcing species_category as the summarizing field
                docSpc = facetCounts.facet_pivot["geohash_1," + sumField];
                break;
            case 3:
            case 4:
            case 5:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_2;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_2;
                docPhe = ((viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_2 : null);
                docSpc = facetCounts.facet_pivot["geohash_2," + sumField];
                break;
            case 6:
            case 7:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_3;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_3;
                docPhe = ((viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_3 : null);
                docSpc = facetCounts.facet_pivot["geohash_3," + sumField];
                break;
            case 8:
            case 9:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_4;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_4;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_4 : null;
                docSpc = facetCounts.facet_pivot["geohash_4," + sumField];
                break;
            case 10:
            case 11:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_5;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_5;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_5 : null;
                docSpc = facetCounts.facet_pivot["geohash_5," + sumField];
                break;
            case 12:
            case 13:
            case 14:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_6;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_6;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_6 : null;
                docSpc = facetCounts.facet_pivot["geohash_6," + sumField];
                break;
            default:
                docLat = statFields.geo_coords_ll_0_coordinate.facets.geohash_7;
                docLng = statFields.geo_coords_ll_1_coordinate.facets.geohash_7;
                docPhe = (viewMode === "ir") ? statFields.phenotype_rescaled_value_f.facets.geohash_7 : null;
                docSpc = facetCounts.facet_pivot["geohash_7," + sumField];
                break;

        }

        // depending on the zoom level and the count of landmarks in each geohash we are saving
        // geohashes that contain few enough landmarks to display them using the prune cluster
        // layer. This needs tweaking to get the right balance of info, performance and transfer times
        // The following values seem to work well. Most of the latency is due to SOLR taking a long
        // time to return the landmarks of several geohashes.
        smallClusters = [];

        var populations = {}; // keep the total marker count for each geohash
        var statistics = {}; // keep the species count for each geohash
        var fullStatistics = {}; // keep the species count for each geohash


        for (var key in docLat) {
            // Depending on zoom level and the number of clusters in the geohash add the to smallClusters to be processed later
            // at the same time exclude them from [terms] so as to not display them twice
            if (docLat.hasOwnProperty(key)) {
                var count = docLat[key].count;
                // if (count < 0) {
                //     smallClusters.push(key);
                //     continue;
                // }

                // go over the facet pivots and save the population and statistics
                docSpc.forEach(function (element, array) {
                    var elStats = [];
                    var fullElStats = [];
                    var tagsTotalCount = 0;
                    // check if pivot is empty
                    if (element.pivot) {


                        element.pivot.forEach(function (innElement) {
                            var key = innElement.value,
                                count = innElement.count;
                            tagsTotalCount += count;

                            elStats[key] = count;


                            if (legend.options.summarizeBy === 'Species') {

                                //FixMe: Remove these replacements when proper names are returned from the popbio API
                                fullElStats.push({
                                    "label": key.replace(/sensu lato/, "sl")
                                        .replace(/chromosomal form/, "cf"),
                                    //"label": key,
                                    "value": count,
                                    "color": (palette[key] ? palette[key] : "#000000")
                                });
                            } else {
                                fullElStats.push({
                                    "label": key,
                                    "value": count,
                                    "color": (palette[key] ? palette[key] : "#000000")
                                });
                            }
                            ;

                        });

                        if (element.count - tagsTotalCount > 0) {
                            elStats["Unknown"] = element.count - tagsTotalCount;

                            fullElStats.push({
                                "label": 'Unknown',
                                "value": element.count - tagsTotalCount,
                                "color": (palette['Unknown'])
                            });
                            tagsTotalCount = element.count;
                        }

                    } else {
                        tagsTotalCount = element.count;
                        elStats["Unknown"] = tagsTotalCount;
                        fullElStats.push({
                            "label": 'Unknown',
                            "value": tagsTotalCount,
                            "color": (palette['Unknown'])
                        });

                        // console.log("ERROR: Pivot for element " + element.value + " appears to be empty");
                    }


                    // populations[element.value] = element.count;
                    populations[element.value] = tagsTotalCount;

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
            // displayOptions: {
            //     "count": {
            //         title: function (value) {
            //             return value;
            //         }
            //     }
            // },
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
                    count: record.count,
                    population: record.population,
                    trafficlight: record.trafficlight,
                    stats: record.stats,
                    id: record.term
                });
            },
            onEachRecord: function (layer, record) {
                layer.on("dblclick", function () {
                    clearTimeout(timer);
                    prevent = true;

                    map.fitBounds(record.bounds);
                })
                    .on("click", function () {

                        var panel = $('.sidebar-pane.active');
                        var panelId = panel.attr('id');

                        var recBounds = L.latLngBounds(record.bounds);

                        // was a marker already highlighted?
                        if (highlightedId) {

                            $('.sidebar-pane').data('has-graph', false);

                            switch (panelId) {
                                case "graphs":
                                    updatePieChart(record.population, record.fullstats);
                                    panel.data('has-graph', true);
                                    break;
                                case "swarm-plots":
                                    createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
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


                            switch (panelId) {
                                case "graphs":
                                    if (!panel.data('has-graph')) {
                                        updatePieChart(record.population, record.fullstats);
                                        panel.data('has-graph', true);
                                    }
                                    break;
                                case "swarm-plots":
                                    if (!panel.data('has-graph')) {
                                        createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                                        panel.data('has-graph', true);
                                    }
                                    break;
                                case "marker-table":
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
                        removeHighlight(layer._icon);
                        highlightMarker(layer._icon);
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
                                        $('#swarm-chart-area').empty();
                                        $('#table-contents').empty();
                                        sidebar.open(panelId);
                                    }
                                }

                                // Determine the open pane and update the right graph
                                $('.sidebar-pane').data('has-graph', false);

                                switch (panelId) {
                                    case "graphs":
                                        updatePieChart(record.population, record.fullstats);
                                        panel.data('has-graph', true);
                                        break;
                                    case "swarm-plots":
                                        createBeeViolinPlot("#swarm-chart-area", buildBbox(recBounds));
                                        panel.data('has-graph', true);
                                        break;
                                    case "marker-table":
                                        updateTable("#table-contents", buildBbox(recBounds));
                                        panel.data('has-graph', true);
                                        break;
                                    case "help":
                                        updatePieChart(record.population, record.fullstats);
                                        panel.data('has-graph', true);
                                        sidebar.open('graphs');

                                        break;

                                    default:
                                        break;
                                }

                            }
                        }, delay);
                        prevent = false;
                    })
                    .on("mouseover", function () {
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

        // if (smallClusters.length > 0) {
        //     loadSmall(0, zoomLevel);
        //
        // }


        // inform the user that data is loaded
        if (rectHighlight !== null) map.removeLayer(rectHighlight);
        rectHighlight = null;
        map.spin(false);

    };


    // hardcoded species_category
    var url = solrPopbioUrl + $('#view-mode').val() + 'Geoclust?' + qryUrl + buildBbox(map.getBounds()) + "&stats.facet="
        + geoLevel + "&facet.pivot=" + geoLevel + "," + mapSummarizeByToField(glbSummarizeBy).summarize + "&json.wrf=?&callback=?";


    //console.log(url);

    // inform the user that data is loading
    map.spin(true);
    $.getJSON(url, buildMap)
        .done(function () {
            $(document).trigger("jsonLoaded");

        })
        .fail(function () {
            console.log("Ahhh");
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

        d3.select("#pie-chart-area svg")
            .attr("width", "100%")
            .attr("height", "500px")
            .style({width: "100%", height: "500px"});

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
                    .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or "percent"
                    .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
                    .donutRatio(0.5)     //Configure h ow big you want the donut hole size to be.
                    .growOnHover(false)
                ;

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

            // Overwrite valueFormatter to return integers
            chart.tooltip.valueFormatter(function (d, i) {
                return d.roundDecimals(0);
            })

            d3.select("#pie-chart-area svg")
                .datum(stats)
                .transition().duration(delay)
                .call(chart);


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

    $('.marker-row').fadeOut();

    // setTimeout(function () {
    // }, delay);

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


                setTimeout(function () {
                    $(divid).empty();

                    tableHtml(divid, docs);
                    PaneSpin('marker-table', 'stop');
                }, delay);
            }

            var pageCount;

            // wait until the table is plotted and animated before setting-up infinite scroll
            setTimeout(function () {
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
        var frmDate;

        if (dates && dates.length > 0) {
            var dateString = dates[0];
            if (/TO/.test(dateString)) {
                // Successful match
                var myregexp = /\[(\S+)\sTO\s(\S+)\]/;
                var match = myregexp.exec(dateString);
                var startDateString = match[1], endDateString = match[2];
                frmDate = dateResolution(startDateString) + ' to ' + dateResolution(endDateString);
                // dateResolution(match[2]);
            } else if (/^\d{4}$/.test(dateString)) {

                frmDate = dateResolution(dateString);

            } else {
                // Match attempt failed
                var date = new Date(dateString);
                frmDate = date.toDateString();

            }

        }

        // hardcoded species_category
        var species = element.species_category ? element.species_category[0] : 'Unknown';
        var bgColor;
        if (glbSummarizeBy === 'Species') {
            bgColor = palette[species]
        } else {
            var field = mapSummarizeByToField(glbSummarizeBy).field;
            var fieldContents = element[field];
            if (fieldContents) {
                typeof fieldContents === 'object' ? bgColor = palette[fieldContents[0]] : bgColor = palette[fieldContents];

            } else {
                bgColor = palette['Unknown']
            }

        }

        if ($('#view-mode').val() === 'smpl') {

            var row = {
                accession: element.accession,
                accessionType: 'Stable ID',
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
                collectionDate: frmDate,
                projects: borderColor('Project', element.projects),
                projectsType: 'Projects',
                collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                collectionProtocolsType: 'Collection protocols',
                protocols: borderColor('Protocol', element.protocols),
                protocolsType: 'Protocols'
            };

            var template = $.templates("#smplRowTemplate");
        } else {

            var row = {
                accession: element.accession,
                accessionType: 'Stable ID',
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
                collectionDate: frmDate,
                projects: borderColor('Project', element.projects),
                projectsType: 'Projects',
                collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
                collectionProtocolsType: 'Collection protocols',
                protocols: borderColor('Protocol', element.protocols),
                protocolsType: 'Protocols',
                phenotypeValue: element.phenotype_value_f,
                phenotypeValueType: element.phenotype_value_type_s,
                phenotypeValueUnit: element.phenotype_value_unit_s,
                insecticide: element.insecticide_s,
                insecticideType: 'Insecticides',
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
        $('.marker-row').fadeIn();
        // $('.marker-row').each(function (i, e) {
        //     $(this).delay(i*50).slideDown('fast');
        // });

    });

}


function filterMarkers(items) {
    "use strict";
    if (items.length === 0) {
        qryUrl = 'q=*:*';
        loadSolr({clear: 1, zoomLevel: map.getZoom()});
        return;
    }

    var terms = {};

    items.forEach(function (element) {

        if (!terms.hasOwnProperty(element.type)) terms[element.type] = [];

        if (element.type === 'Date') {

            var format = "YYYY-MM-DD";


            var dateEnd = dateConvert(element.dateEnd, format);
            var dateStart = dateConvert(element.dateStart, format);

            terms[element.type].push({
                "field": element.field, "value": '[' + dateStart + ' TO ' + dateEnd + ']'
            });
            return

        }

        if (element.type === 'Seasonal') {


            for (var j = 0; j < element.ranges.length; j++) {
                var range = element.ranges[j];
                terms[element.type].push({
                    "field": element.field, "value": '[' + range + ']'
                });

            }


            return

        }

        if (element.type === 'Norm-IR') {

            // console.log(element.normIrValues);
            terms[element.type].push({
                "field": element.field, "value": '[' + element.normIrValues + ']'
            });
            return


        }

        if (element.qtype == 'exact') {
            terms[element.type].push({"field": element.field, "value": '"' + element.value + '"'});
        } else {
            if (/^".+"$/.test(element.value)) {
                // Successful match
                terms[element.type].push({"field": element.field, "value": element.value});

            } else {
                // Match attempt failed
                terms[element.type].push({"field": element.field, "value": '*' + element.value + '*'});

            }

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
                    qryUrl += 'text:(' + qries['anywhere'] + ') AND ';
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
                    qryUrl += 'text:(' + qries['anywhere'] + ') AND ';
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
                    qryUrl += 'text:(' + qries['anywhere'] + '))';
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

function borderColor(type, element) {
    var objWithBorderColors = [];

    if (!element) {
        objWithBorderColors.push(
            {
                name: 'Unknown',
                brdColor: type === glbSummarizeBy ? palette['Unknown'] : ''
            }
        )
        return objWithBorderColors;
    }

    for (var i = 0; i < element.length; i++) {
        var obj = element[i];
        // var brdColor = type === glbSummarizeBy ? palette[obj] : 'transparent';
        objWithBorderColors.push(
            {
                name: obj,
                brdColor: type === glbSummarizeBy ? palette[obj] : ''
            }
        )

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
        case "Collection protocols":
            return "collection_protocols_cvterms";
        case "Protocols":
            return "protocols_cvterms";
        case "Stable ID":
            return "accession";
        case "Insecticides":
            return "insecticide_cvterms";
        case "Collection date":
            return "collection_date_range";
        case "Normalised IR":
            return "phenotype_rescaled_value_f";
        case "Projects":
            return "projects";
        case "Authors":
            return "project_authors_txt";
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
            fields.type = "Collection protocols";
            fields.field = "collection_protocols";
            break;
        case "Protocol":
            fields.summarize = "protocols_category";
            fields.type = "Protocols";
            fields.field = "protocols";
            break;
        case "Insecticide":
            fields.summarize = "insecticide_s";
            fields.type = "Insecticides";
            fields.field = "insecticide_s";
            break;
        case "Project":
            fields.summarize = "projects_category";
            fields.type = "Projects";
            fields.field = "projects";
            break;
        default :
            fields.summarize = "species_category";
            fields.type = "Taxonomy";
            fields.field = "species_category";
            break;
    }
    return fields;

}

//
function mapTypeToLabel(type) {
    switch (type) {
        case 'Taxonomy'   :
            return 'label label-primary fa ' + mapTypeToIcon(type);   // dark blue
        case 'Geography':
            return 'label label-primary fa ' + mapTypeToIcon(type);  // dark blue
        case 'Title'  :
            return 'label label-success fa ' + mapTypeToIcon(type);    // green
        case 'Description':
            return 'label label-success fa ' + mapTypeToIcon(type);   // green
        case 'Projects'   :
            return 'label label-success fa ' + mapTypeToIcon(type);   // green
        case 'Anywhere'   :
            return 'label label-default fa ' + mapTypeToIcon(type);   // grey
        case 'Pubmed references' :
            return 'label label-success fa ' + mapTypeToIcon(type);
        case 'Insecticides' :
            return 'label label-success fa ' + mapTypeToIcon(type);
        case 'Collection protocols' :
            return 'label label-success fa ' + mapTypeToIcon(type);
        case 'Date' :
            return 'label label-info fa ' + mapTypeToIcon(type);
        case 'Seasonal' :
            return 'label label-info fa ' + mapTypeToIcon(type);
        case 'Norm-IR' :
            return 'label label-secondary fa ' + mapTypeToIcon(type);
        case 'Stable ID' :
            return 'label label-warning fa ' + mapTypeToIcon(type);
        case 'Sample' :
            return 'label label-warning fa ' + mapTypeToIcon(type);
        case 'Sample type' :
            return 'label label-warning fa ' + mapTypeToIcon(type);
        case 'Protocols' :
            return 'label label-warning fa ' + mapTypeToIcon(type);
        case 'Authors' :
            return 'label label-success fa ' + mapTypeToIcon(type);
        case 'Coordinates':
            return 'label label-success fa ' + mapTypeToIcon(type);
        default :
            return 'label label-warning fa ' + mapTypeToIcon(type);

    }
}

function mapTypeToIcon(type) {
    switch (type) {
        case 'Taxonomy'   :
            return 'fa-sitemap';
        case 'Geography':
            return 'fa-map-marker';
        case 'Title'  :
            return 'fa-tag';
        case 'Description':
            return 'fa-info-circle';
        case 'Projects'   :
            return 'fa-database';
        case 'Anywhere'   :
            return 'fa-search';
        case 'Pubmed references' :
            return 'fa-book';
        case 'Insecticides' :
            return 'fa-eyedropper';
        case 'Collection protocols' :
            return 'fa-shopping-cart';
        case 'Date' :
            return 'fa-calendar';
        case 'Seasonal' :
            return 'fa-calendar-check-o';
        case 'Norm-IR' :
            return 'fa-bolt';
        case 'Stable ID' :
            return 'fa-tag';
        case 'Sample' :
            return 'fa-map-pin';
        case 'Sample type' :
            return 'fa-file-o';
        case 'Protocols' :
            return 'fa-sort-amount-desc';
        case 'Authors' :
            return 'fa-user';
        case 'Coordinates':
            return 'fa-map-marker';
        case 'Location':
            return 'fa-location-arrow';
        case 'Insecticide':
            return 'fa-eyedropper';
        case 'Protocols':
            return 'fa-sort-amount-desc';
        case 'Concentration':
            return 'fa-tachometer';
        case 'Duration':
            return 'fa-clock-o';
        case 'Phenotype':
            return 'fa-eye';
        default :
            return 'fa-search';

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
    $(marker).addClass("highlight-marker");
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
        $(highlight).removeClass("highlight-marker");
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
                // console.log(i + ': ' + month + ' ' + range);
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
        return date.toDateString();
    }

    if (typeof month !== 'undefined') {
        var format = "MMM YYYY";
        return dateConvert(date, format);
    }

    if (typeof year !== 'undefined') {
        var format = "YYYY";
        return dateConvert(date, format);
    }

    return false;
    console.log(match[1] + '-' + match[5] + '-' + match[7]);


}

function setDateRange(elementStart, elementEnd, yearsAgo) {

    var startingYear = new Date();
    // When initialing the datepicker end date is limited to the current time,
    // As a result we must set endDate to earlier tonight for "Today" to be allowed in the date-end field
    var endDate = new Date(Date.UTC(startingYear.getUTCFullYear(), startingYear.getUTCMonth(), startingYear.getUTCDate()));

    // Find the starting year
    startingYear.setUTCFullYear(startingYear.getUTCFullYear() - yearsAgo);
    // Set the start date as the January 1st of the starting year
    var startDate = new Date(Date.UTC(startingYear.getUTCFullYear(), 0, 1));

    // Udated the input fields
    $(elementStart).datepicker('setUTCDate', startDate);
    $(elementEnd).datepicker('setUTCDate', endDate);

}

function dateConvert(dateobj, format) {
    var year = dateobj.getFullYear();
    var month = ("0" + (dateobj.getMonth() + 1)).slice(-2);
    var date = ("0" + dateobj.getDate()).slice(-2);
    var hours = ("0" + dateobj.getHours()).slice(-2);
    var minutes = ("0" + dateobj.getMinutes()).slice(-2);
    var seconds = ("0" + dateobj.getSeconds()).slice(-2);
    var day = dateobj.getDay();
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

// plugtrade.com - jQuery detect vertical scrollbar function //
(function ($) {
    $.fn.has_scrollbar = function () {
        var divnode = this.get(0);
        if (divnode.scrollHeight > divnode.clientHeight)
            return true;
    }
})(jQuery);