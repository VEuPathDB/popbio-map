/*  This file is currently an "extra" file for vb-popbio, but I hope to eventually turn 
 *  this into the vb-popbio.js file.
 */
(function (PopulationBiologyMap, $, undefined) {

    //Local variables used withing the object
    var monthIndex = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12};

    var clickType = {ctrlKey: false, shiftKey: false, metaKey: false};
    var pivotDate;

    //Object specific to this file
    PopulationBiologyMap.extra = {};

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    //Thhis code was used in multiple locations, thought it would be a good
    //idea to make its own function.  Name can be changed, couldn't think of
    //a better one
    PopulationBiologyMap.methods.resetMap = function() {
        $("#plots-control-panel").hide();

        // Check if we were in a resizable panel and return it to the old state
        if ($("#active-pane.ui-resizable").length) {
            $("#active-pane.ui-resizable").removeAttr("style");
            $("#active-pane.ui-resizable").resizable("destroy");

            // Restore highcarts to its old width
            var chart = Highcharts.charts[0];
            chart.setSize(380, chart.chartHeight);
        }

        removeHighlight();
        sidebar.close();

        // close open panels
        //$('.collapse').collapse('hide');
        setTimeout(function () {
            resetPlots()
        }, delay);
    }

    /*
     function initializeSearch
     date: 18/6/2015
     purpose:
     inputs:
     outputs:
     */
    PopulationBiologyMap.methods.initializeSearch = function () {
        // Reset search button
        $('#reset-search').click(function () {
            $('#search_ac').tagsinput('removeAll');

            // reset seasonal search panel
            $('.season-toggle').each(function () {
                if ($(this).prop('checked')) {
                    $(this).bootstrapToggle('off');
                }
            });

            // reset half-decacde quick date search
            $(".date-shortcut").each(function () {
                $(this).prop('checked', false);
                $(this).parent('div').removeClass('btn-primary');
                $(this).parent('div').addClass('btn-default');
                $(this).parent('div').addClass('off');
            });

            removeHighlight();
            sidebar.close();
            setTimeout(function () {
                resetPlots()
                filterMarkers('');
            }, delay);
        });

        // FixMe: Result counts from acOtherResults and the main SOLR core don't match, possibly due to different case
        // handling update: the issue was with the number of results Anywhere. When within a certain categories the results
        // seem to match will keep an eye on it ToDo: Add copy/paste support of IDs (low priority)
        var acSuggestions = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 7,
            minLength: 2,
            hint: false,

            remote: {
                url: solrTaUrl + viewMode + 'Ac?q=',
                ajax: {
                    dataType: 'jsonp',
                    data: {
                        'wt': 'json',
                        'rows': 7
                    },
                    jsonp: 'json.wrf'
                },
                replace: function (url, query) {
                    url = solrTaUrl + viewMode + 'Ac?q=';
                    var match = query.match(/([^@]+)@([^@]*)/);
                    if (match != null) {
                        // matched text: match[0]
                        // match start: match.index
                        // capturing group n: match[n]
                        partSearch = match[1];
                        if ($('#world-toggle').prop('checked')) {
                            return solrTaUrl + viewMode + 'Acat?q=' + encodeURI(match[1]) + buildBbox(map.getBounds());
                        } else {
                            return solrTaUrl + viewMode + 'Acat?q=' + encodeURI(match[1]);
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
                url: solrTaUrl + viewMode + 'Acgrouped?q=',
                ajax: {
                    dataType: 'jsonp',

                    data: {
                        'wt': 'json',
                        'rows': 10
                    },

                    jsonp: 'json.wrf'
                },
                replace: function (url, query) {
                    url = solrTaUrl + viewMode + 'Acgrouped?q=';
                    if ($('#world-toggle').prop('checked')) {
                        return url + encodeURI(query) + '*' + buildBbox(map.getBounds());
                    } else {
                        return url + encodeURI(query) + '*';
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
                // VB-7318 add new class for notSelected, label-not - add item.notBoolean for shared view (need to check with === 'true')
                if (((clickType.ctrlKey || clickType.metaKey) || (item.notBoolean)) && (item.type !== 'Anywhere' && item.type !== 'Date' && item.type !== 'Seasonal') ) {
                    return mapTypeToLabel(item.type) + ' label-not';
                } else {
                    return mapTypeToLabel(item.type);
                }    
            },
            itemValue: 'value',
            itemText: function (item) {
                // VB-7318 add NOT text in front of value here - add item.notBoolean for shared view - added more conditions after refactoring
                if (((clickType.ctrlKey || clickType.metaKey) || (item.notBoolean)) && (item.type !== 'Anywhere' && item.type !== 'Date' && item.type !== 'Seasonal')) {
                    return '<i class="' + mapTypeToIcon(item.type) + '"></i> ' + 'NOT ' + item.value.truncate(80)
                } else {
                    return '<i class="' + mapTypeToIcon(item.type) + '"></i> ' + item.value.truncate(80)
                }   
            },
            itemHTML: function (item) {
                // VB-7318 add NOT text in front of value here - add item.notBoolean for shared view - added more conditions after refactoring
                if (((clickType.ctrlKey || clickType.metaKey) || (item.notBoolean))  && (item.type !== 'Anywhere' && item.type !== 'Date' && item.type !== 'Seasonal')) {
                    return '<i class="' + mapTypeToIcon(item.type) + '"></i> ' + 'NOT ' + item.value.truncate(80)
                } else {
                    return '<i class="' + mapTypeToIcon(item.type) + '"></i> ' + item.value.truncate(80)
                }    
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
                                // VB-7318 add onclick function
                               // return '<p>' + item.value +
                                return '<p class="ac_items">' + item.value + 
                                    (item.is_synonym ?
                                        ' (<i class="fa fa-list-ul" title="Duplicate term / Synonym" style="cursor: pointer"></i>)'
                                        : '') +
                                    ' <em> in ' + item.type + '</em></p>';
                            }

                        }
                    },
                    {
                        //  ToDo: Partial searches should display wildcards in the tag
                        //  ToDo: Add hovers on tags to display the term and field description
                        name: 'acOtherResults',
                        displayKey: 'value',
                        source: acOtherResults.ttAdapter(),
                        templates: {
                            header: '<h4 class="more-results">More suggestions</h4>',
                            suggestion: function (item) {
                                // VB-7318 need to add onclick function for acgroup too
                                // return '<p>~' + item.count + ' <em>in ' + item.type + '</em></p>';
                                return '<p class="ac_items">~' + item.count + ' <em>in ' + item.type + '</em></p>';
                            }

                        }
                    }
                ]
            })

        });

        
        $('#SelectView').change(function () {
            viewMode = $('#SelectView').val()

            // VB-7622 default with ?view=geno at URL (e.g., selecting the menu from Popbio page or using Share Link) is set to Allele (active-legend) at initializeMap()
            // Thus, for consistency, add below to cope with the case when selecting Genotypes view through pull-down menu
            if (viewMode === "geno") glbSummarizeBy = "Allele";
            if (viewMode === "path") glbSummarizeBy = "Pathogen";

            if (viewMode !== "ir") {
                // $('#SelectView').val('smpl');
                if (glbSummarizeBy === "Insecticide") {
                    if (viewMode === "geno") {
                        glbSummarizeBy = "Allele";
                    } else if  (viewMode === "path") {
                        glbSummarizeBy = "Pathogen";
                    } else {
                        glbSummarizeBy = "Species";
                    } 
                }
            }

            // Might not be needed will remove once done testing
            if (viewMode !== "geno") {
                // $('#SelectView').val('smpl');
                if (glbSummarizeBy === "Allele" || glbSummarizeBy === "Locus") {
                    if (viewMode === "path") {
                        glbSummarizeBy = "Pathogen";
                    } else {
                        glbSummarizeBy = "Species";
                    }
                }
            }

            if (viewMode !== "path") {
                // $('#SelectView').val('smpl');
                if (glbSummarizeBy === "Pathogen" || glbSummarizeBy === "Infection status") {
                    if (viewMode === "geno") {
                        glbSummarizeBy = "Allele";
                    } else {
                        glbSummarizeBy = "Species";
                    }
                }
            }

            if (viewMode !== "abnd") {
                if (glbSummarizeBy === "Attractant") {
                    if (viewMode === "path") {
                        glbSummarizeBy = "Pathogen";
                    } else if (viewMode === "geno") {
                        glbSummarizeBy = "Allele";
                    } else {
                        glbSummarizeBy = "Species";
                    }
                }
            }

            // Add and remove the disabled class for the sidebar
            if (viewMode !== "ir" && viewMode !== "abnd" && viewMode !== "path") {
                // Get the current sidebar that is active
                var active_sidebar = $(".sidebar-icon.active a").attr("id");

                // Check if the previous active panel was the plots and switch to the pie panel
                if (active_sidebar === "#swarm-plots") {
                    $(".sidebar-pane.active").removeClass("active");
                    $(".sidebar-icon.active").removeClass("active");
                    $('[id="#graphs"]').parent().addClass("active");
                    $("#graphs").addClass("active");
                }

                $('#\\#swarm-plots').addClass('disabled');
                $("#\\#swarm-plots").parent("li").attr("data-original-title", "Disabled on this view");
            } else {
                $('#\\#swarm-plots').removeClass('disabled');
                $("#\\#swarm-plots").parent("li").attr("data-original-title", "View-specific data visualizations");
            }

            if (viewMode !== 'abnd') {
                // Hiding the notices from the abundance graph
                $("#projects-notice").hide();
                $("#plots-control-panel").hide();
            }

            // update the export fields dropdown
            updateExportFields(viewMode);

            // Note right now this URL is called, but does not really do anything at the moment since only
            // Use the data from the markers to construct the legend
            var url = solrPopbioUrl + viewMode + 'Palette?q=*:*&geo=geohash_2&term=' +
                mapSummarizeByToField(glbSummarizeBy).summarize + //buildBbox(map.getBounds()) +
                '&json.wrf=?&callback=?';

            //highlightedId = $('.highlight-marker').attr('id');
            removeHighlight();
            sidebar.close();
            setTimeout(function () {
                resetPlots()
            }, delay);
            $.getJSON(url, function (data) {
                legend._populateLegend(data, glbSummarizeBy, true)
            });
            acSuggestions.initialize(true);
            acOtherResults.initialize(true);
        });
    }

    // Handle updating legend
    // Could probably just remove this
    PopulationBiologyMap.methods.refreshLegend = function () {
        legend.refreshLegend();
    }

    // Properly add the seasonal filter to search
    PopulationBiologyMap.methods.addSeason = function (months) {
        var objRanges = constructSeasonal(months);

        // Check if no months are toggled on
        if (objRanges.ranges.length) {
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
        } else {
            $('#search_ac').tagsinput('remove', checkSeasonal());
        }
    }

    // Gets the dates from datepicker query parameter and returns them in format to use in the addDatepickerItem function
    function retrieveDatepickerDates(dateRange) {
        var dateStartString;
        var dateEndString;
        var dateStart;
        var dateEnd;
        var month;
        var day;
        var year;

        // Get the start and end date
        dateRange = dateRange.split("-");

        dateStartString = dateRange[0];

        //Fixing issue when only one day was searched
        if (dateRange[1] === undefined) {
            dateEndString = dateRange[0];
        } else {
            dateEndString = dateRange[1];
        }

        dateStartString.split('/').map( function (value, index) {
            if (index === 0) {
                day = value;
            } else if (index === 1) {
                month = value;
            } else {
                year = value;
            }
        });

        //Constructing string as MM/DD/YYYY
        dateStartString = month + "/" + day + "/" + year;

        dateEndString.split('/').map( function (value, index) {
            if (index === 0) {
                day = value;
            } else if (index === 1) {
                month = value;
            } else {
                year = value;
            }
        });

        //Constructing string as MM/DD/YYYY
        dateEndString = month + "/" + day + "/" + year;

        dateStart = new Date(dateStartString);
        dateEnd = new Date(dateEndString);

        return [dateStart, dateEnd];
    }

    //Gets the dates of the query parameters in a format that can be used by the addDate function
    function retrieveDates(dateRange) {
        var now = new Date();
        var startYear;
        var endYear;
        var startDate;
        var endDate;

        //Check if we pressed the 2015-now range
        if (dateRange === '2015-now') {
            //Get only 2015
            startYear = dateRange.split('-')[0];
            startDate = new Date(Date.UTC(startYear, 0, 1));
            endDate = now;   
        } else {
            //[startYear, endYear] = dateRange.split('-');
            dateRange = dateRange.split('-');
            startYear = dateRange[0];
            endYear = dateRange[1];
            startDate = new Date(Date.UTC(startYear, 0, 1));
            endDate = new Date(Date.UTC(endYear, 11, 31) + now.getTimezoneOffset() * 60000);
        }

        return [startDate, endDate];
    }


    //Using the date ranges, returns the string that will be displayed in the search bar
    function getDateItemText(date_ranges) {
        var dateItemText = '';
        var keys = Object.keys(date_ranges);

        for (var j = 0; j < keys.length; j++) {
            if ( j !== keys.length - 1 ) {
                dateItemText += keys[j] + ',';
            } else {
                dateItemText += keys[j];
            }
        }

        return dateItemText;  
    }

    //Add the dates picked through the datepicker range to the search bar
    function addDatepickerItem(startDate, endDate, notBoolean) {
        var value;

        //Minimizer code complains when doing notBoolean = false in parameters
        if (notBoolean === undefined) {
            notBoolean = false;
        }

        if (startDate.getTime() === endDate.getTime()) {
            value = startDate.toLocaleDateString('en-GB', {timezone: 'utc'});
        } else {
            value = startDate.toLocaleDateString('en-GB', {timezone: 'utc'}) + '-' + endDate.toLocaleDateString('en-GB', {timezone: 'utc'});
        }

        //Specify that this date was added through the datepicker
        $('#search_ac').tagsinput('add', {
            value: value,
            startDate: startDate,
            endDate: endDate,
            notBoolean: notBoolean,
            type: 'Datepicker',
            field: 'collection_date_range',
        });
    }

    //Add the dateItem constructed through the quick date range toggles to the search bar
    function addDateItem(dateItemInfo, dateItem) {
        if (dateItem) {
            //The replace property prevents addint this item from running the solr query
            $('#search_ac').tagsinput('add', {
                value: dateItemInfo.text,
                ranges: dateItemInfo.ranges,
                type: 'Date',
                replace: true,
                field: 'collection_date_range'
            });

            //Remove old date item and update by running solr query
            $("#search_ac").tagsinput('remove', dateItem);
        } else {
            $('#search_ac').tagsinput('add', {
                value: dateItemInfo.text,
                ranges: dateItemInfo.ranges,
                type: 'Date',
                field: 'collection_date_range'
            });
        }
    }

    //Adds the daterange filter to the search bar
    function addDateRangeFilter(dateRangeString, dateItemInfo, dateItem, shiftKey) {
        var dateRange;
        var startDate;
        var endDate;

        //Check if shiftKey was pressed when date range clicked.
        //If it was, means we need to also activate all the other date ranges between
        //the pivot and the selected date range
        if (shiftKey) {
            //Contains the current selected toggle split
            var splitValue = dateRangeString.split('-');
            var splitPivotDate = pivotDate.split('-');

            if (splitValue[0] < splitPivotDate[0]) {
                $(".date-shortcut").each(function () {
                    if (this.value.split('-')[0] < splitValue[0] || this.value.split('-')[1] > splitPivotDate[1]) {
                        $(this).prop('checked', false);
                        $(this).parent('div').removeClass('btn-primary');
                        $(this).parent('div').addClass('btn-default');
                        $(this).parent('div').addClass('off');
                    } else {
                        $(this).prop('checked', true);
                        $(this).parent('div').addClass('btn-primary');
                        $(this).parent('div').removeClass('btn-default');
                        $(this).parent('div').removeClass('off');

                        dateRange = retrieveDates(this.value);
                        startDate = dateRange[0];
                        endDate = dateRange[1];

                        //Adding the date range to the object
                        dateItemInfo.ranges[this.value] = { startDate: startDate, endDate: endDate };
                    }
                });
            } else {
                $(".date-shortcut").each(function () {
                    if (this.value.split('-')[0] < splitPivotDate[0] || this.value.split('-')[1] > splitValue[1]) {
                        $(this).prop('checked', false);
                        $(this).parent('div').removeClass('btn-primary');
                        $(this).parent('div').addClass('btn-default');
                        $(this).parent('div').addClass('off');
                    } else {
                        $(this).prop('checked', true);
                        $(this).parent('div').addClass('btn-primary');
                        $(this).parent('div').removeClass('btn-default');
                        $(this).parent('div').removeClass('off');

                        dateRange = retrieveDates(this.value);
                        startDate = dateRange[0];
                        endDate = dateRange[1];

                        //Adding the date range to the object
                        dateItemInfo.ranges[this.value] = { startDate: startDate, endDate: endDate };
                    }
                });
            }
        } else {
            dateRange = retrieveDates(dateRangeString);
            startDate = dateRange[0];
            endDate = dateRange[1];

            //Adding the date range to the object
            dateItemInfo.ranges[dateRangeString] = { startDate: startDate, endDate: endDate };
        }

        //Function that parses the date ranges that will be queried to return what will be dispalyed in the UI
        dateItemInfo.text = getDateItemText(dateItemInfo.ranges);
        //Add the new dateItem and remove the old one in the search bar
        addDateItem(dateItemInfo, dateItem);
    }

    //Function used to update the pivotDate variable when using CTRL key to uncheck the currect pivotDate
    //Logic is find closest selected date range to current pivot and set it as the new pivot
    function updatePivotDate(changedDateRange) {
        //Get closest date ranges next to the pivot date that  are toggled on
        var prevToggledDate = $(changedDateRange).closest('.toggle').prevAll('.btn-primary:first');
        var nextToggledDate = $(changedDateRange).closest('.toggle').nextAll('.btn-primary:first');

        //From closest toggled date ranges, find the closest to the pivot
        if (prevToggledDate.length && nextToggledDate) {
            //Both on the left and right of pivot there are toggled dates
            //Find the distance of the toggled dates from the pivot
            var minPivotDate = pivotDate.split('-')[0];
            var maxPivotDate = pivotDate.split('-')[1];
            var maxPrevDate = prevToggledDate.find('input').val().split('-')[1];
            var minNextDate = nextToggledDate.find('input').val().split('-')[0];
            var prevDateDistance = minPivotDate - maxPrevDate;
            var nextDateDistance = minNextDate - maxPivotDate;

            //Compare the dates to see which on is the closest to the pivot
            //If same distance, make left toggled date the pivot
            if (prevDateDistance > nextDateDistance) {
                pivotDate = nextToggledDate.find('input').val();
            } else {
                pivotDate = prevToggledDate.find('input').val();
            }

        } else if (prevToggledDate.length) {
            //Only on the left of the pivot date there is a toggled date
            pivotDate = prevToggledDate.find('input').val();

        } else if (nextToggledDate) {
            //Only on the right of the pivot date there is a toggled date
            pivotDate = nextToggledDate.find('input').val();
        }
    } 

    //Function used to enable/disable the add-dates button if conditions are met
    function toggleAddDatesButton() {
        //Disable button if one of the texboxes does not have a date
        if ($("#date-end").datepicker('getDate') && $("#date-start").datepicker('getDate')) {
            //Check that the year is 4 characters otherwise don't enable it either
            if ($("#date-end").val().split("/")[2].length === 4 && $("#date-start").val().split("/")[2].length === 4) {
                $("#add-dates").prop('disabled', false);
                $("#add-dates-tooltip").tooltip('disable');
                $("#add-dates-tooltip").removeClass('disabled');
            } else {
                $("#add-dates").prop('disabled', true);
                $("#add-dates-tooltip").tooltip('enable');
                $("#add-dates-tooltip").addClass('disabled');
            }
        } else {
            $("#add-dates").prop('disabled', true);
            $("#add-dates-tooltip").tooltip('enable');
            $("#add-dates-tooltip").addClass('disabled');
        }
    }


    //Might change to private function, but making it public for now until I know
    //that it is not needed anywhere else
    PopulationBiologyMap.methods.applyParameters = function () {
        // parse the URL parameters and update views and search terms
        var hasParameters = false;
        if (typeof urlParams.view === 'undefined' || urlParams.view === null) {
            $('#SelectView').selectpicker('val', 'smpl');
            // $('#view-mode').val('smpl');
        }

        // VB-7318 set valueForNot variable for shared view
        var valueForNot = false;
        // Adding a way to tell when we first load the map
        PopulationBiologyMap.data.initialLoad = true;

        for (var key in urlParams) {
            if (urlParams.hasOwnProperty(key)) {
                switch (key) {
                    case "view":
                        var view = urlParams[key];
                        $('#SelectView').selectpicker('val', view);
                        viewMode = view;
                        break;
                    case "collectionID":
                    case "projectID":
                    case "sampleID":
                    case "assayID":
                    case "species":
                    case "collection_protocol":
                    case "attractant":
                    case "protocols_cvterms":
                    case "sample_type":
                    case "insecticide":
                    case "allele":
                    case "locus":
                    case "geography":
                    case "project_title":
                    case "author":
                    case "title":
                    case "pathogen":
                    case "infection_status":
                    case "pubmed":
                    case "tag":
                    case "devstage":
                    case "license":
                        // have we passed multiple IDs??
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                // VB-7318 add notBoolean field depending on the presence of !!!
                                if (element.startsWith('!!!')) {
                                    valueForNot = true;
                                } else {
                                    valueForNot = false;
                                }   
                                $('#search_ac').tagsinput('add', {
                                    // VB-7318 add replace
                                    value: element.replace('!!!',''),
                                    activeTerm: true,
                                    type: URLParamToMapType(key),
                                    field: mapTypeToField(URLParamToMapType(key)),
                                    qtype: 'exact',
                                    // VB-7318 add notBoolean field
                                    notBoolean: valueForNot
                                });
                            })
                        } else {
                            // VB-7318
                            if (urlParams[key].startsWith('!!!')) {
                                valueForNot = true;
                            } 
                            $('#search_ac').tagsinput('add', {
                                // VB-7318 add replace
                                value: urlParams[key].replace('!!!',''),
                                activeTerm: true,
                                type: URLParamToMapType(key),
                                field: mapTypeToField(URLParamToMapType(key)),
                                qtype: 'exact',
                                // VB-7318 add notBoolean field
                                notBoolean: valueForNot
                            });
                        }
                        break;
                    case "text":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    text: element,
                                    value: element,
                                    type: 'Anywhere',
                                    field: mapTypeToField('Anywhere'),
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                text: urlParams[key],
                                value: urlParams[key],
                                type: 'Anywhere',
                                field: mapTypeToField('Anywhere'),
                            });
                        }
                        break;
                    case "norm-ir":
                        var param = urlParams[key];
                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                $('#search_ac').tagsinput('add', {
                                    value: element,
                                    normIrValues: element,
                                    type: 'Norm-IR',
                                    field: 'phenotype_rescaled_value_f'
                                });
                            })
                        } else {
                            $('#search_ac').tagsinput('add', {
                                value: param,
                                normIrValues: param,
                                type: 'Norm-IR',
                                field: 'phenotype_rescaled_value_f'
                            });
                        }
                        break;
                    case "collection_season":
                        var param = urlParams[key];

                        param.split(',').map( function (monthRanges) {
                            //See if what was passed was a range and take care of
                            //it accordingly
                            monthRange = monthRanges.split('-');

                            if (monthRange.length == 1) {
                                month = monthRange[0];
                                index = monthIndex[month];
                                months[index] = true;
                            } else {
                                startMonth = monthRange[0];
                                endMonth = monthRange[1];
                                startIndex = monthIndex[startMonth];
                                endMonth = monthIndex[endMonth];

                                for (startIndex; startIndex <= endMonth; ++startIndex) {
                                    months[startIndex] = true;
                                }
                            }
                        });

                        PopulationBiologyMap.methods.addSeason(months);

                        break;
                    case "date":
                        var param = urlParams[key];
                        var dateItemInfo = {ranges: {}, text: ''}
                        var startDate;
                        var endDate;

                        //Get the ranges
                        dateItemRanges = param.split(',');

                        for (var j = 0; j < dateItemRanges.length; j++) {
                            //[startDate, endDate] = retrieveDates(dateItemRanges[j]);
                            dateRange = retrieveDates(dateItemRanges[j]);
                            startDate = dateRange[0];
                            endDate = dateRange[1];
                            dateItemInfo.ranges[dateItemRanges[j]] = {startDate: startDate, endDate: endDate};
                        } 

                        //Function that parses the date ranges that will be queried to return what will be dispalyed in the UI
                        dateItemInfo.text = getDateItemText(dateItemInfo.ranges);

                        //Setting the color of the date search panel
                        $('.date-shortcut').each(function () {
                            if (dateItemInfo.ranges[this.value]) {
                                $(this).prop('checked', true);
                                $(this).parent('div').addClass('btn-primary');
                                $(this).parent('div').removeClass('btn-default');
                                $(this).parent('div').removeClass('off');
                            }
                        })

                        addDateItem(dateItemInfo);
                        break
                    case "datepicker":
                        var param = urlParams[key];
                        var startDate;
                        var endDate;
                        var dateRange;

                        if (Array.isArray(param)) {
                            param.forEach(function (element) {
                                if (element.startsWith('!!!')) {
                                    valueForNot = true;
                                } else {
                                    valueForNot = false;
                                }
                                dateRange = retrieveDatepickerDates(element.replace('!!!', ''));
                                startDate = dateRange[0];
                                endDate = dateRange[1];
                                addDatepickerItem(startDate, endDate, valueForNot);
                            })
                        } else {
                            if (param.startsWith('!!!')) {
                                valueForNot = true;
                            } else {
                                valueForNot = false;
                            }
                            dateRange = retrieveDatepickerDates(param.replace('!!!', ''));
                            startDate = dateRange[0];
                            endDate = dateRange[1];
                            addDatepickerItem(startDate, endDate, valueForNot);
                        }
                        break   
                    case "markerID":
                        highlightedId  = urlParams[key];
                        break;
                    case "zoom_level":
                        PopulationBiologyMap.data.zoomLevel = urlParams[key];
                        break;
                    case "center":
                        PopulationBiologyMap.data.center = urlParams[key].split(",").map(Number);
                        break;
                    case "panelID":
                        var panelId = urlParams[key];
                        $(".sidebar-pane.active").removeClass("active");
                        $(".sidebar-icon.active").removeClass("active");
                        $('[id="#' + panelId + '"]').parent().addClass("active");
                        $("#" + panelId).addClass("active");
                        break;
                    case "summarizeBy":
                        //Update global variable with value we want to summarize by
                        glbSummarizeBy = urlParams[key];
                        break;
                        //Use to switch the legend data-toggle
                        //$('.legend .dropdown-menu li').find("[data-value='" + summarizeBy + "']").click()
                    case "limitTerms":
                        // Toggle the limit to off if we are not limiting terms
                        if (urlParams[key] === 'false') {
                            $('#limit-terms-toggle-input').bootstrapToggle('toggle');
                        }
                        break;
                    case "optimizeColors":
                        // Check if we are optimizing the legend
                        if (urlParams[key] === 'true') {
                            PopulationBiologyMap.data.rescale = true;
                        }
                        break;
                    case "navDates":
                        // Let the Highcharts code know we will be updating the navigator
                        PopulationBiologyMap.data.navDates = urlParams[key].split(',');
                    case "resolution":
                        // Store the resolution in case we need to update it
                        PopulationBiologyMap.data.resolution = urlParams[key];
                    default:
                        break;
                }
            }

            // VB-7318 set valueForNot to be false at each loop
            valueForNot = false;    
        }
               
        // update the export fields dropdown
        updateExportFields(viewMode);

        // Add and remove the disabled class for the sidebar
        if (viewMode !== "ir" && viewMode !== "abnd" && viewMode !== "path") {
            $('#\\#swarm-plots').addClass('disabled');
            $("#\\#swarm-plots").parent("li").attr("title", "Disabled on this view");

            //$("#\\#swarm-plots").tooltip({placement: "right", title: "Disabled On This View"});
        } else {
            $('#\\#swarm-plots').removeClass('disabled'); 
        }

        // Check if a center parameter was passed with a projectID, assayID, sampleID, or collectionID, if not, find the center to ensure marker will be visible
        // NOTE: Code might need to get improved if there is a case when a link has two of either projectID, assayID, and sampleID
        // but no center query parameter.  
        if ((urlParams["projectID"] || urlParams["assayID"] || urlParams["sampleID"] || urlParams["collectionID"]) && !urlParams["center"]) {
            var coordinatesUrl = solrPopbioUrl + "projectsCoordinates?";
            var key;
            var filter;
            var queryUrl;

            if (urlParams["projectID"]) {
                filter = "projects=";
                key = "projectID";
            } else if (urlParams["collectionID"]) {
                filter = "collection_assay_id=";
                key = "collectionID";
            } else {
                filter = "accession=";

                if (urlParams["assayID"]) {
                    key = "assayID";
                } else {
                    key = "sampleID";
                }
            }
                
            if (Array.isArray(urlParams[key])) {
                filter += "(" + urlParams[key].join(" OR ") + ")";
            } else {
                filter += urlParams[key];
            }
            
            queryUrl = coordinatesUrl + filter;

            //Get the avarge coordinates of the projects and use that as the center of the map view
            $.ajax({
                type: "GET",
                url: queryUrl,
                dataType: "json",
                async: false,
                success: function(json) {
                    var ltAvg = json.facets.ltAvg;
                    var lnAvg = json.facets.lnAvg;
                    PopulationBiologyMap.data.center = [ltAvg, lnAvg];
                },
                error: function() {
                    console.log("Unable to retrieve center coordinate");
                }
            });
        }

        return hasParameters;
    }

    //Private function to map the field types to the URL query parameters that we accept
    function mapTypeToURLParam(type) {
        switch (type) {
            case "Project":
                return "projectID";
            case "Sample ID":
                return "sampleID";                
            case "Collection ID":
                return "collectionID";
            case "Assay ID":
                return "assayID";                                
            case "Anywhere":
                return "text";
            case "Collection protocol":
                return "collection_protocol";
            case "Attractant":
                return "attractant";
            case "Taxonomy":
                return "species";
            case "Protocol":
                return "protocols_cvterms";
            case "Seasonal":
                return "collection_season";
            case "Date":
                return "date";
            case "Sample type":
                return "sample_type";
            case "Insecticide":
                return "insecticide";
            case "Allele":
                return "allele";
            case "Locus":
                return "locus";
            case "Geography":
                return "geography";
            case "Project title":
                return "project_title";
            case "Author":
                return "author";
            case "Title":
                return "title";
            case "Norm-IR":
                return "norm-ir";
            case "PubMed":
                return "pubmed";
            case "Datepicker":
                return "datepicker";
            case "Pathogen":
                return "pathogen";
            case "Infection status":
                return "infection_status";
            case "Sex":
                return "sex";
            case "Developmental stage":
                return "devstage";
            case "Tag":
                return "tag";
            case "License":
                return "license";
            default:
                return "text"
                break;
        }
    }

    //Private function to map the field types to the URL query parameters that we accept
    function URLParamToMapType(param_name) {
        switch (param_name) {
            // VB-7318 Project to Projects? VB-7622 revert to Project
            case "projectID":
                return "Project";
            case "sampleID":
                return "Sample ID";
            case "assayID":
                return "Assay ID";
            case "collectionID":
                return "Collection ID";
            case "text":
                return "Anywhere";
            case "collection_protocol":
                return "Collection protocol";
            case "attractant":
                return "Attractant";
            case "species":
                return "Taxonomy";
            case "protocols_cvterms":
                return "Protocol";
            case "collection_season":
                return "Seasonal";
            case "date":
                return "Date";
            case "sample_type":
                return "Sample type";
            case "insecticide":
                return "Insecticide";
            case "allele":
                return "Allele";
            case "locus":
                return "Locus";
            case "geography":
                return "Geography";
            case "project_title":
                return "Project title";
            case "author":
                return "Author";
            case "title":
                return "Title";
            case "norm-ir":
                return "Norm-IR";
            case "pubmed":
                return "PubMed";
            case "datepicker":
                return "Datepicker";
            case "pathogen":
                return "Pathogen";
            case "infection_status":
                return "Infection status";
            case "sex":
                return "Sex";
            case "devstage":
                return "Developmental stage";
            case "tag":
                return "Tag";
            case "license":
                return "License";
            default:
                return "Anywhere";
        }
    }

                //Used to update the download count message for the download panel
    function updateDownloadCountMessage(selectedOption) {
        $("#export-message").hide();

        //Replace red border with default color
        if (selectedOption) {
            $("[data-id='select-export']").css("border-color", "rgb(231,231,231)");
            var url = solrPopbioUrl + viewMode + "Table?rows=0&";

            //Update the Url for abundance if we want to include or not include zero values
            if (viewMode === "abnd") {
                url += "zeroFilter=" + ($("#checkbox-export-zeroes").is(":checked") ? "" : "-sample_size_i:0") + "&";
            }

            if (selectedOption === "1") {
                url += qryUrl;
                setDownloadCountMessage(url);
            } else if (selectedOption === "2") {
                if (viewMode !== "abnd") {
                    $("#export-message").text(PopulationBiologyMap.data.numFound + " row(s)will be downloaded").fadeIn();;
                } else {
                    url += qryUrl + buildBbox(map.getBounds());
                    setDownloadCountMessage(url);
                }
            } else if (selectedOption === "3") {
                //Use record count for the message for certain views since record count matches what would have been returned from the AJAX call
                if (viewMode !== "abnd" && viewMode !== "geno") {
                    $("#export-message").text(PopulationBiologyMap.data.record.count + " row(s) will be downloaded").fadeIn();
                } else {
                    //for abnd and geno view do an ajax call to get the rows that will be downloaded since number in marker means something different 
                    //e.g for abnd, the number in marker means the number of mosquitoes
                    var recBounds = L.latLngBounds(PopulationBiologyMap.data.record.bounds);
                    url += qryUrl + buildBbox(recBounds);
                    setDownloadCountMessage(url);
                }
            } else {
                url += "q=*:*";
                setDownloadCountMessage(url);
            }
        }
    }

    //Use a URL to get the number of rows that will be in the download and display it to the user
    function setDownloadCountMessage(url) {
        $.getJSON(url, {
            cache: true,
            headers: {
                'Cache-Control': 'max-age=2592000'
            }
        }, function (result) {
            $("#export-message").text(result.response.numFound + " row(s) will be downloaded").fadeIn();;
            
        })
        .fail(function () {
            $("#export-message").text("Failed to get download counts").fadeIn();
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.extra.init = function() {
        new Clipboard('#generate-link');
        // PopulationBiologyMap.methods.applyParameters();
        $("#generate-link").click(function () {
            var view_param = "view=" + viewMode;
            var zoom_param = "&zoom_level=" + map.getZoom();
            var center = map.getCenter();
            var center_param = "&center=" + center.lat.toString() + "," + center.lng.toString();
            var highlighted_id = $(".highlight-marker").attr("id");
            var summarize_by = "&summarizeBy=" + $('.legend #summByDropdown button').text().trim();
            var grid = "&grid=" + $('#grid-toggle').prop('checked');
            var shared_link = "&shared_link=true";
            var marker_param = '';
            var panel_param = "";
            var url = window.location.origin + window.location.pathname + "?";
            var search_items = $('#search_ac').tagsinput('items');
            var limitTerms = "&limitTerms=" + $('#limit-terms-toggle-input').prop('checked');
            var rescale = PopulationBiologyMap.data.rescale;
            var chartResolution = "";
            var navDates = "";
            var rescaleParam = "";
            
            //Using an object to store search terms that will be used to generate link
            var search_terms = {};
            var query_parameters = '';

            //Retrieve all the terms that were entered in the search box and organize them by type
            search_items.forEach(function(search_item) {
                if (search_terms[search_item.type] == undefined) {
                    search_terms[search_item.type] = [];
                }
                // VB-7318 add ! for NOT boolean case - and add condition not to repeat to add !!! whenever pressing share link (pre-existing value preserves string!)
                if ((search_item.notBoolean) && (search_item.value.startsWith('!!!') != 1)) {
                    search_item.value = '!!!' + search_item.value;
                } 

                search_terms[search_item.type].push(search_item.value);
            });

            //Go through the search terms and add them to the correct query parameter
            $.each(search_terms, function(index, values) {
                if (values.length > 1) {
                    values.forEach(function(value) {
                        // VB-7490 ~ Replace spaces for serialization purposes.
                        query_parameters = query_parameters + mapTypeToURLParam(index) + "[]=" + value + "&";
                    });
                } else {
                    query_parameters = query_parameters + mapTypeToURLParam(index) + "=" + values[0] + "&";
                }
            });

            //Set the selected marker and panel that was being viewed
            if (highlighted_id != undefined) {
                marker_param = "&markerID=" + highlighted_id;
                activePanel = $(".sidebar-pane.active").attr("id");
                panel_param = "&panelID=" + activePanel;
            }

            if (rescale) {
                rescaleParam = "&optimizeColors=true";
                $("#rescale_colors").click();
            }

            if (Highcharts.charts.length && activePanel === "swarm-plots") {
                navigatorExtremes = Highcharts.charts[0].xAxis[0].getExtremes();
                navDates = "&navDates=" + navigatorExtremes.min + "," + navigatorExtremes.max;
                resolution = $("#resolution-selector .btn-primary").val();
                chartResolution = "&resolution=" + resolution;

                // For some reason clicking on share link button re-renders graph so need to add this in
                // so graph gets re-rendered to how it was before.
                PopulationBiologyMap.data.navDates = [navigatorExtremes.min, navigatorExtremes.max];
                PopulationBiologyMap.data.resolution = resolution;
            }

            query_parameters = query_parameters + view_param + zoom_param + center_param + summarize_by + marker_param + panel_param + grid + shared_link + limitTerms + rescaleParam + navDates + chartResolution;

            url = url + encodeURI(query_parameters);

            //Add URL to attribute used to copy to clipboard
            $("#generate-link").attr("data-clipboard-text", url);
        });
        
        //Disable the panel from opening if it was disabled
        $(".sidebar-icon a").click(function (e) {
            if ($(this).hasClass("disabled")) {
                e.stopImmediatePropagation();
            }
        });

        //Store the type of click the user is doing so we can
        //do the correct action in the change event
        $(".date-shortcut").parent("div").click(function(e) {
            clickType.ctrlKey = e.ctrlKey;
            clickType.shiftKey = e.shiftKey;
            clickType.metaKey = e.metaKey; 
        });

        //Adding a date filter through the UI
        $(".date-shortcut").change(function (e) {
            var items = $("#search_ac").tagsinput('items');
            var dateItemInfo = {ranges: {}, text: ''}
            var dateItem;

            for (var j = 0; j < items.length; j++) {
                if ( items[j].type === 'Date' ) {
                    dateItem = items[j];
                    break;
                }
            }

            //Setting the pivotRange variable when we are selecting the first date filter
            //Used when pressing the shift key
            if (!dateItem && $(this).prop('checked')) {
                pivotDate = this.value;
                addDateRangeFilter(this.value, dateItemInfo);

                return
            }

            if (clickType.ctrlKey || clickType.metaKey) {
                //Set the range to the date item if there is one already
                if (dateItem) {
                    dateItemInfo.ranges = dateItem.ranges;
                }

                //Check if we are removing or adding or removing a range and update date item accordingly
                if ($(this).prop('checked')) {
                    addDateRangeFilter(this.value, dateItemInfo, dateItem);
                } else {
                    delete dateItemInfo.ranges[this.value];

                    //Check if there ranges is not empty so we do not remove the item from the query
                    if (Object.keys(dateItemInfo.ranges).length) {
                        dateItemInfo.text = getDateItemText(dateItemInfo.ranges);
                        addDateItem(dateItemInfo, dateItem);

                        //Check if we are unchecking the pivot date and update the pivotDate if we are 
                        if (pivotDate === this.value) {
                            //update the pivotDate to use with the shift click event
                            updatePivotDate(this);
                        }
                    } else {
                        //Remove date item since ranges is empty
                        $("#search_ac").tagsinput('remove', dateItem);
                    }
                }
            } else if (clickType.shiftKey) {
                addDateRangeFilter(this.value, dateItemInfo, dateItem, true);
            } else {
                //Check if we are adding or removing a range and update date item accordingly
                if ($(this).prop('checked')) {
                    //Update the pivot date since we are only using this date as a filter
                    pivotDate = this.value;

                    addDateRangeFilter(this.value, dateItemInfo, dateItem);
                } else {
                    $("#search_ac").tagsinput('remove', dateItem);
                }

                //Change date-range toggles to not active apart from the date range that was clicked on
                $(".date-shortcut").each(function () {
                    if (this.name !== e.target.name && $(this).prop('checked')) {
                        $(this).prop('checked', false);
                        $(this).parent('div').removeClass('btn-primary');
                        $(this).parent('div').addClass('btn-default');
                        $(this).parent('div').addClass('off');
                    }
                });
            }

            //Reset the click properties
            clickType = {ctrlKey: false, shiftKey: false, metaKey: false};
        });


        $(document).on("mouseenter", ".detailedTip", function () {
            var $this = $(this);
            if (this.offsetWidth < this.scrollWidth && !$this.attr('title')) {
                $this.tooltip({
                    title: $this.text(),
                    placement: "bottom"
                });
                $this.tooltip('show');
            }
        });

        //clear the date selection panel once collapsed
        $('#daterange').on('hidden.bs.collapse', function () {
            $("#date-start").datepicker("clearDates");
            $("#date-end").datepicker("clearDates");
            $("#add-dates").prop('disabled', true);
            $("#add-dates-tooltip").tooltip('enable');
            $("#add-dates-tooltip").addClass('disabled');
            $("#date-select").removeClass('active');
        });

        //bind the date range text fields to the datepicker
        $('#datepicker').datepicker({
            format: "dd/mm/yyyy",
             startView: 2,
             todayBtn: "linked",
             autoclose: true,
             todayHighlight: true,
             endDate: "Date.now()"
        }).on('changeDate', function() {
            toggleAddDatesButton();
        });

        //When removing the date value, if texbox is empty, it does not run changeDate event,
        //so need this event to disable the "add-dates" button
        $(".input-daterange input").change(function() {
            toggleAddDatesButton();
        });

        //add the date filter into search
        $("#add-dates").click(function () {
            var startDate = new Date($("#date-start").datepicker('getDate'));
            var endDate = new Date($("#date-end").datepicker('getDate'));
            
            addDatepickerItem(startDate, endDate);
        });

        $("#add-dates-tooltip").tooltip({
            title: "Expected Date Format: DD/MM/YYYY",
            placement: "bottom"
        });

        // Active terms
        // VB-7318 add NOT boolean for active-term
        // $(document).on("click", '.active-term', function () {
        $(document).on("click", '.active-term', function (e) {
            highlightedId = $('.highlight-marker').attr('id');
            //var highlightedId = $('.highlight-marker').attr('id');

            if ($('.sidebar-pane.active').attr('id') === 'swarm-plots') {
                selectedPlotType = $('#plotType').val();

            } else {
                $('#plotType').val('none');
            }
            // VB-7318 add checking ctrlKey or metaKey for active-term
            // Using keyUp and keyDown do not think this is necessary anymore
            //clickType.ctrlKey = e.ctrlKey;
            //clickType.metaKey = e.metaKey;

            // VB-7622 Change plural element.type defined in HTML to single format
            var setCorrectTerms = $(this).attr('type');
            if (setCorrectTerms == 'Projects') {
                setCorrectTerms = 'Project';
            } else if (setCorrectTerms == 'Protocols') {
                setCorrectTerms = 'Protocol';
            } else if (setCorrectTerms == 'Collection protocols') {
                setCorrectTerms = 'Collection protocol';
            } else if (setCorrectTerms == 'Insecticides') {
                setCorrectTerms = 'Insecticide';
            } 
            $('#search_ac').tagsinput('add', {
                value: $(this).attr('value'),
                activeTerm: true,
                // VB-7622 single/plural form
                // type: $(this).attr('type'),
                // field: mapTypeToField($(this).attr('type')),
                type: setCorrectTerms,                
                field: mapTypeToField(setCorrectTerms),                
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
        // VB-7318 add NOT boolean for active legend
        // .on("click", '.active-legend', function () {
        .on("click", '.active-legend', function (e) {
            highlightedId = $('.highlight-marker').attr('id');
            PopulationBiologyMap.data.highlightedId = $('.highlight-marker').attr('id');

            // VB-7318 add checking ctrlKey or metaKey for active-legend
            // Using keyUp and keyDown do not think this is necessary anymore
            //clickType.ctrlKey = e.ctrlKey;
            //clickType.metaKey = e.metaKey;

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

            //Adding the click event for the map
            map.on("click", PopulationBiologyMap.methods.resetMap);
        })
        // This is here to trigger an update of the graphs when an active-term is clicked
        // FixMe: Have to solve the issue with pruneclusters first
        // With the code change I have done, it seems that this function might not be needed anymore
        // I could add this code somwhere else and it would work fine, but keeping it for now
        // in case it is needed again
        .on("jsonLoaded", function () {
            if (highlightedId && PopulationBiologyMap.data.highlightedId == undefined) {
                PopulationBiologyMap.data.highlightedId = highlightedId;
            } 
        });

        $('#search_ac').on('itemAdded', function (event) {
            // itemAdded gets executed by applyParameters now so need to check if notBoolean was set - added more conditions after refactoring!
            if (((clickType.ctrlKey  || clickType.metaKey) || event.item.notBoolean) && (event.item.type !== 'Anywhere' && event.item.type !== 'Date' && event.item.type !== 'Seasonal'))  {
                event.item.notBoolean = true;
                $('div.bootstrap-tagsinput span.tag.label.label-not').css('background-color', 'red');           
                // set below two to be false after processing something here
                //clickType.ctrlKey = false;
                //clickType.metaKey = false;
            } else {
                event.item.notBoolean = false;
                // cntrlIsPressed = false;      // set this to be false just in case?
            }

            // don't update the map. So far only used when altering (removing and adding again) a seasonal filter
            // Checking if map object is set because applyParameter executes this function before initializeMap
            // is executed to setup the map object
            if (event.item.replace || map === undefined) return;

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

            //sidebar.close();
            setTimeout(function () {
                highlightedId = $('.highlight-marker').attr('id');
                PopulationBiologyMap.data.highlightedId = $('.highlight-marker').attr('id');
                /*removeHighlight();

                resetPlots()*/
                filterMarkers($("#search_ac").tagsinput('items'));
            }, delay);

        });

        $('#search_ac').on('itemRemoved', function () {
            // reset the seasonal search panel
            if (!checkSeasonal()) {
                $('.season-toggle').each(function () {
                    if ($(this).prop('checked')) {
                        //Unchecking and adding class to parent div to prevent change event from firing
                        //with other method
                        $(this).prop('checked', false);
                        $(this).parent('div').removeClass('btn-primary');
                        $(this).parent('div').addClass('btn-default');
                        $(this).parent('div').addClass('off');
                    }
                });
            }

            // reset the date search panel
            if (!checkDate()) {
                $('.date-shortcut').each(function () {
                    if ($(this).prop('checked')) {
                        //Unchecking and adding class to parent div to prevent change event from firing
                        //with other method
                        $(this).prop('checked', false);
                        $(this).parent('div').removeClass('btn-primary');
                        $(this).parent('div').addClass('btn-default');
                        $(this).parent('div').addClass('off');
                    }
                });
            }

            //sidebar.close();
            setTimeout(function () {
                highlightedId = $('.highlight-marker').attr('id');
                PopulationBiologyMap.data.highlightedId = $('.highlight-marker').attr('id');
                /*removeHighlight();
                resetPlots()*/
                filterMarkers($("#search_ac").tagsinput('items'));
            }, delay);
        });

        //Adding keydown and keyup, click events might not be needed anymore to set the ctrl, meta, and shift key for dateShortcut
        //Will remove the click events for dateShortcut later
        $(document).keydown(function(event){
            clickType.ctrlKey = event.ctrlKey;
            clickType.metaKey = event.metaKey;
            clickType.shiftKey = event.shiftKey;
        });

        $(document).keyup(function(event){
            clickType.ctrlKey = event.ctrlKey;
            clickType.metaKey = event.metaKey;
            clickType.shiftKey = event.shiftKey;
        });

        //Adding mouseenter and mouseleave to nicely show/hide tooltip
        $("#map").on("mouseenter", ".leaflet-control-layers-expanded", function () {
            //Initialize tooltip only if it has not been initialized already
            if ($(this).attr("data-original-title") == undefined) {
                $(this).tooltip({
                    title: "Select map type (satellite, street map, etc)",
                    delay: { "show": 1000, "hide": 0 }
                });

                //Only way I was able to get the tooltip to appear after a certain time
                //when it is first initialized
                setTimeout(function() {
                    $(".leaflet-control-layers-expanded").tooltip("show")
                }, 1000);
            }
        }).on("mouseleave", ".leaflet-control-layers", function () {
            $("[role='tooltip']").css("display", "none");
        });

        //Logic to only display the title one time in the legend
        $("#map").on("mouseenter", ".legend", function(event) {
            if (!$(this).data("preventTooltip")) {
                $(this).tooltip("disable");
                $(this).data("preventTooltip", true);
            }
        });

        //Doing some verification to ensure the user has selected an options from the dropdown to decide what data to download
        $("[data-target='#DownloadModal']").click ( function (event) {
            var selectedOption = $('#select-export').val()

            //Prevent the download modal from showing up if user did not select a valid options
            //Also add red border to signify an error
            if (!selectedOption) {
                event.stopPropagation();
                $("[data-id='select-export']").css("border-color", "red");
            }
        });

        $("#select-export").on("changed.bs.select", function(event) {
            var selectedOption = $(this).val();
            updateDownloadCountMessage(selectedOption);

        });

        $("#select-export").on("refreshed.bs.select", function (event) {
            var selectedOption = $(this).val();
            updateDownloadCountMessage(selectedOption);
        });

        //Modifying the text of the bootstrap selectpicker field when more than two options are checked
        $("#select-export-fields")
            .selectpicker({
                countSelectedText: "{0} fields selected",
                selectedTextFormat: "count > 2"
            });

        //Event used to update the counts in the download pannel
        $("#checkbox-export-zeroes").change(function (event) {
            $("#select-export").selectpicker("refresh");
        });
    }

    $(document).ready(function () {
        PopulationBiologyMap.extra.init();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
