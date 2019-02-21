(function (PopulationBiologyMap, $, undefined) {
    //Private variables used for the chart
    var dataEndpoint = "Graphdata";
    var resolutionEndpoint = "MarkerYearRange"
    var statsFilter = "&stats.field=collection_month_s&stats.field=collection_year_s&stats.field=collection_epiweek_s&stats.field=collection_day_s";
    var resultLimit = 500000;
    var collectionResolutions;
    var highestResolution;
    var lowestResolution;
    var resultCount;
    var maxTerms;
    var limitTerms = true;
    var limitTermsMessage;
    var highchartsFilter;
    var resolution;
    var minDate;
    var maxDate;
    var minYearDate;
    var maxYearDate;
    var minMonthDate;
    var maxMonthDate;
    var minDayDate;
    var maxDayDate;
    var minRange;
    var graphConfig;
    var ordinal;
    var afterSetExtremesTriggered = false;
    var externalAction = false;
    var resolutionSelector = false;
    var highcharts = {};
    var monthString = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    var disabledResolutions = {
      Yearly: false,
      Monthly: false,
      EpiWeekly: false,
      Daily: false,
    }

    //Object that contain the configuration of how certain views are supposed to be graphed with highcharts
    //Preferably, this configuration should be constructed using information stored in a database
    var viewGraphConfig = {
        abnd : {
            //Will be used to support different type of data that gets graphed
            dataType: "timeplot",
            graphTitle: "Population abundance",
            quantityLabel: "Abundance",
            yAxis: [{
                value: ["sum_abundance", "num_collections"],
                operator: '/',
                decimalPlaces: 1,
                title: "Average individuals (per night per trap)",
                chartType: "column",
                offset: 20
            }],
            plotOptions: {
                column: {
                    stacking: 'normal',
                    groupPadding: 0.01,
                    events: {
                        //DKDK VB-8112 disable legend click at highstock
                        // legendItemClick: setExternalActionFlag
                        legendItemClick: function () {
                            return false;
                        }
                    }
                }
            },
            collectionKey: "facets.term.buckets"
        },
        path: {
            //Will be used to support different type of data that gets graphed
            dataType: "timeplot",
            graphTitle: "Pathogen infection data",
            quantityLabel: "Number of assays",
            yAxis: [{
                value: "count",
                title: "Total number of assays",
                chartType: "column",
                transparent: true,
                offset: 15
            },
            {
                value: "infected.count",
                title: "Number of infected assays",
                chartType: "line",
                offset: 0,
                tooltip: {
                    data: [{
                        key: "pathogen",
                        value: "infected.pathogen.buckets",
                        label: "Pathogen(s)",
                        type: "variable"
                    }]
                } //Will contain the configuration to set the tooltip of the graph
            }],
            plotOptions: {
                column: {
                    stacking: 'normal',
                    groupPadding: 0.01,
                    events: {
                        //DKDK VB-8112 disable legend click at highstock
                        // legendItemClick: setExternalActionFlag
                        legendItemClick: function () {
                            return false;
                        }                    }
                },
                line: {
                    events: {
                        //DKDK VB-8112 disable legend click at highstock
                        // legendItemClick: setExternalActionFlag
                        legendItemClick: function () {
                            return false;
                        }
                    },
                    marker: {
                        enabled: true,
                        radius: 5
                    }
                }
            },
            collectionKey: "facets.term.buckets"
        }
    } 

    //Object that maps the resolution value to solr field
    var resolutionToSolrField = {
        Yearly: "collection_year_s",
        Monthly: "collection_month_s",
        EpiWeekly: "collection_epiweek_s",
        Daily: "collection_day_s"
    }

    //Mapping from solr to what is used in the code
    var solrToResolutionName = {
        year: "Yearly",
        month: "Monthly",
        day: "Daily"
    }

    //Used to compare resolutions to see which one should be used
    var resolutionRank = {
        day: 1,
        month: 3,
        year: 4,
        Daily: 1,
        EpiWeekly: 2,
        Monthly: 3,
        Yearly: 4
    }

    var performOperation = {
        "+": function (x,y) { return x + y },
        "-": function (x,y) { return x - y },
        "*": function (x,y) { return x * y },
        "/": function (x,y) { return x / y }
    }

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    PopulationBiologyMap.methods.createHighchartsGraph = function(filter) {
        //How the URL will be constructed
        var term  = "&term=" + mapSummarizeByToField(glbSummarizeBy).summarize;
        var baseUrl = solrPopbioUrl + viewMode + resolutionEndpoint + "?";
        var queryUrl = baseUrl + qryUrl + filter + statsFilter + term;
        
        //Resets/updates variables related to the data being graphed
        collectionResolutions = [];
        lowestResolution = undefined;
        highestResolution = undefined;
        minRange = undefined;
        graphConfig = viewGraphConfig[viewMode];
        $('#limit-terms-toggle-title span').text('Limit ' + glbSummarizeBy);

        //Set title of graph panel
        $("#swarm-plots h3").text(graphConfig.graphTitle);

        //Hide plots control panel to not show the changes the code does to the buttons
        $("#plots-control-panel").hide();
        //Reset any buttons that were disabled
        $.each($("#resolution-selector .disabled"), function() {
            $(this).removeClass("disabled");
        });
        $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");

        //Storing filter in object to use later
        highchartsFilter = filter;

        //Will need to find a better way of organizing these ajax calls
        //$('#swarm-chart-area').fadeOut();
        $.ajax({
            type: "GET",
            url: queryUrl,
            dataType: "json",
            success: function (json) {
                // Get the resolutions of the data being graphed
                var collectionResolutionList = json.facets.collection_resolution.buckets;
                maxTerms = json.facets.term.buckets.length;
                
                // Get the maximum and minimum boundaries of the different resolutions
                // For now specifying 
                var collectionDate = json.stats.stats_fields.collection_date;
                var collectionDateMin = new Date(collectionDate.min);
                var collectionDateMax = new Date(collectionDate.max);
                var minYear = collectionDateMin.getUTCFullYear();
                var maxYear = collectionDateMax.getUTCFullYear();
                var minMonth = collectionDateMin.getUTCMonth();
                var maxMonth = collectionDateMax.getUTCMonth();
                var minDay = collectionDateMin.getUTCDate();
                var maxDay = collectionDateMax.getUTCDate();
                var tempMaxMonth = maxMonth + 1;

                minYearDate = new Date(Date.UTC(minYear,0,1)).getTime();
                maxYearDate = new Date(Date.UTC(maxYear, 11, 31)).getTime();
                minMonthDate = new Date(Date.UTC(minYear, minMonth, 1)).getTime();
                maxMonthDate = new Date(Date.UTC(maxYear, tempMaxMonth, 0)).getTime();
                minDayDate = new Date(Date.UTC(minYear, minMonth, pad(minDay, 2))).getTime();
                maxDayDate = new Date(Date.UTC(maxYear, maxMonth, pad(maxDay, 2))).getTime();

                var numberOfDays = (maxYearDate-minYearDate) / (1000 * 3600 * 24);

                //Store the resolutions of the data
                for (var j = 0; j < collectionResolutionList.length; j++) {
                    var resolutionValue = collectionResolutionList[j].val
                    collectionResolutions.push(resolutionValue);
                }

                //Get the possible ranges for the chart navigator
                var rangesList = {};
                for (var j = 0; j < collectionResolutions.length; j++) {
                    //Check the collection resolution and set the appropriate range for the chart
                    if (collectionResolutions[j] == "year") {
                        //Possible range is approx. 3 years
                        rangesList["year"] = 3600 * 1000 * 24 * 365 * 3;
                    } else if (collectionResolutions[j] == "month") {
                        //Possible range is approx. 3 months
                        rangesList["month"] = 3600 * 1000 * 24 * 90;
                    } else {
                       //Possible range is 10 days
                       rangesList["day"] = 3600 * 1000 * 24 * 10;
                    }
                }

                for (var key in rangesList) {
                    //Now get the minimum range the navigator can go since it is possible
                    //for the data returned to not be available for a certain range
                    if (rangesList[key] < minRange || minRange == undefined) {
                        minRange = rangesList[key];
                        highestResolution = key;
                    }

                    //Also find the lowest resolution of the data
                    if (lowestResolution == undefined) {
                        lowestResolution = key;
                    } else if (resolutionRank[key] > resolutionRank[lowestResolution]) {
                        lowestResolution = key;
                    }
                }

                //Decide what resolution of data to get based on the number of days the data covers for performance
                if (numberOfDays > 3650) {
                    //More than 10 years gets yearly data
                    resolution = "Yearly";
                    
                    //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                    disabledResolutions.EpiWeekly = true;
                    disabledResolutions.Daily = true;
                } else if (numberOfDays > 1095) {
                    //More than 3 years but less than 10 years get monthly data
                    resolution = "Monthly";
                    //More than 3 years but less than 10 years, do not allow users to see Daily data
                    $("#Daily").addClass("disabled");
                    disabledResolutions.Daily = true;
                } else if (numberOfDays > 365) {
                    //More than 1 year, but less than 3 years gets EpiWeekly
                    resolution = "EpiWeekly";
                } else {
                    //Less than one year gets daily data
                    resolution = "Daily";
                }

                //Set the default tooltip message for disabled buttons
                $.each($("#resolution-selector button"), function() {
                    if ($(this).attr('data-original-title')) {
                        $(this).attr('title', "Date range graphed is too broad.  Narrow down date range to enable.").tooltip("fixTitle");
                    } else {
                        $(this).tooltip({
                            position: "top",
                            title: "Date range graphed is too broad.  Narrow down date range to enable."
                        });
                    }
                });


                $("#resolution-selector button").tooltip("disable");

                //Update the calculated resolution since the data being graphed is not available
                //in the resolution that was calculated
                if (resolutionRank[lowestResolution] > resolutionRank[resolution]) {
                    resolution = solrToResolutionName[lowestResolution];
                }

                //Disable buttons based on the highest resolution available
                if (highestResolution === "year") {
                    $("#Monthly").addClass("disabled");
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                } else if (highestResolution === "month") {
                    $("#EpiWeekly").addClass("disabled");
                    $("#Daily").addClass("disabled");
                }

                //Add a tooltip letting user know the buttons are disabled because
                //no higher resolution is available
                if (highestResolution !== "day") {
                    $("#resolution-selector button")
                        .attr('title', "The data is not available at a higher resolution")
                        .tooltip("fixTitle");
                }

                $("#resolution-selector .disabled").tooltip("enable");
                $("#" + resolution).addClass("btn-primary").removeClass("btn-default");

                //Hide warning icon if only one resolution is present in data being graphed
                if (collectionResolutions.length == 1) {
                    $("#resolution-selector-title .fa-exclamation-triangle").hide();
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").show();
                }

                // Set the minDate and maxDate for the xAxis based on the resolution being graphed
                setxAxisDates(resolution); 

                //resultCount = json.response.numFound;
            },
            error: function() {
                PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        })
        .then(function () {
            // add GA - VB-4680
            // Will eventually move to GTM so we do not have to add code related to analytics
            Highcharts.setOptions({
                exporting: {
                    buttons: {
                        contextButton: {
                            text: '',
                            menuItems: [{
                                text: 'Print chart',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance Print'});
                                    this.print();
                                }
                            }, {
                                separator: true,
                            }, {
                                text: 'Download PNG image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PNG'});
                                    this.exportChart();
                                }
                            }, {
                                text: 'Download JPEG image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance JPEG'});
                                    this.exportChart({
                                        type: 'image/jpeg'
                                    });
                                }
                            }, {
                                text: 'Download PDF document',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PDF'});
                                    this.exportChart({
                                        type: 'application/pdf'
                                    });
                                }
                            }, {
                                text: 'Download SVG vector image',
                                onclick: function() {
                                    gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance SVG'});
                                    this.exportChart({
                                        type: 'image/svg+xml'
                                    });
                                },
                                separator: false
                            }]
                        }
                    }
                }
            });

            //Construct URL used to retrieve data from solr
            var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
            var dateResolutionField = resolutionToSolrField[resolution];
            var baseUrl = solrPopbioUrl + viewMode + dataEndpoint + "?";
            // unfortunately 'term' seems to be a misnomer.  'field' would be better!
            var facetTerm = "&term=" + term + "&date_resolution=" + dateResolutionField;
            var queryUrl = baseUrl + qryUrl + facetTerm + filter;

            // Set the default message
            limitTermsMessage = "All categories shown";

            //limit results in query if needed and also update message
            if (limitTerms && maxTerms > 14) {
                // TODO: Might not want a hardcoded termlimit
                queryUrl = queryUrl + "&termLimit=14";
                $('#limit-terms-toggle-input').bootstrapToggle('enable');
                $('#limit-terms-toggle .toggle').removeClass('disabled');
                $('#limit-terms-toggle label').removeClass('disabled');
                limitTermsMessage = "Top 14 (of " + maxTerms + ") categories shown";
            }
            else if (maxTerms > 14) {
                // This ensures to reenable the button when moving between markers
                // and the marker has more than 14 terms
                $('#limit-terms-toggle-input').bootstrapToggle('enable');
                $('#limit-terms-toggle .toggle').removeClass('disabled');
                $('#limit-terms-toggle label').removeClass('disabled');
            }
            else {
                // Disable the button since there are less than 14 terms available to be graphed
                $('#limit-terms-toggle-input').bootstrapToggle('disable');
                $('#limit-terms-toggle .toggle').addClass('disabled');
                $('#limit-terms-toggle label').addClass('disabled');
            }

            $('#limit-terms-toggle-details').text(limitTermsMessage);

            $.ajax({
                beforeSend: function(xhr) {
                    //Clear chart area and start the spinner
                    PaneSpin('swarm-plots', 'start');
                    $('#swarm-chart-area').empty();

                    //Probably not nessary
                    if (xhr && xhr.overrideMimeType) {
                        xhr.overrideMimeType('application/json;charset-utf-8');
                    }
                },
                url: queryUrl,
                dataType: 'json',
                success: function(json) {
                    setHighchartsData(json);
                },
                error: function() {
                    PaneSpin('swarm-plots', 'stop');
                    console.log("An error has occurred");
                },
                complete: function() {
                    //Construct graph using the data that was received from Solr
                    var data = highcharts.series;
                    var yAxis = highcharts.yAxis;
                    createStockchart(yAxis, data);
                    //Display the control panel that allows users to select the resolution and limit terms graphed
                    $("#plots-control-panel").fadeIn();
                    PaneSpin('swarm-plots', 'stop');
                }
            });
            //}
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    function initialize() {
        //Event used to graph data based on the resolution selected by user
        $("#resolution-selector button").click(function () {
            //Only get data if button is not disabled
            if (!$(this).hasClass("disabled")) {
                //Update button that is selected
                $("#resolution-selector .btn-primary").addClass("btn-default").removeClass("btn-primary");
                $(this).addClass("btn-primary").removeClass("btn-default");
                resolution = this.value;

                //Show that data has already disappeared by checking the lowest resolution that was available
                //for data that is being graphed
                if (resolutionRank[lowestResolution] > resolutionRank[resolution]) {
                    $("#resolution-selector-title .fa-exclamation-triangle").addClass("danger");
                } else {
                    $("#resolution-selector-title .fa-exclamation-triangle").removeClass("danger");
                }

                var chart = Highcharts.charts[0];
                var extremes = chart.xAxis[0].getExtremes();
                var startDate = new Date(extremes.min);
                var endDate = new Date(extremes.max);
                var numberOfDays = (extremes.max-extremes.min) / (1001 * 3600 * 24);

                // Prevents overlap of yearly resolution in projects selection in legend
                if (resolution === "Yearly" && glbSummarizeBy === "Project") {
                    ordinal = true;
                } else {
                    ordinal = false;
                }

                //Update the graph
                updateHighchartsGraph(startDate, endDate, resolution);
            }
        });

        $("#limit-terms-toggle-input").change(function() {
            if ($(this).prop('checked')) {
              limitTerms = true;
              limitTermsMessage = "Top 14 (of " + maxTerms + ") categories shown";
            }
            else {
              limitTerms = false;
              limitTermsMessage = "All categories shown";
            }

            $("#limit-terms-toggle-details").hide().text(limitTermsMessage).fadeIn();

            // Rerender the graph
            $("#resolution-selector .btn-primary").click();
        });

        // Initialize the info tooltip for Limit Categories control
        $("#limit-terms-toggle-title .fa-info-circle").tooltip();

        //Give info on why buttons might get greyed out
        $("#resolution-selector-title .fa-info-circle").tooltip({placement: "top", title: "A higher resolution might get disabled if viewing a broad timeline or when a higher resolution is not available."});
        $("#resolution-selector-title .fa-exclamation-triangle").tooltip({placement: "top", title: "Graphed data contains mixed temporal resolution.  Selecting a higher resolution will cause some data to disappear."});
    }

    function createStockchart(yAxis, data) {
        var plotOptions = viewGraphConfig[viewMode].plotOptions;
        
        //Delete previous created chart object and add a new one
        //when clicking a different marker
        if (Highcharts.charts[0] !== undefined ) {
            Highcharts.charts[0].destroy();
            Highcharts.charts.splice(0,1);
        }

        //Add additional plot options than what is required by the different views
        if (!plotOptions['series']) {
            plotOptions['series'] = {
                dataGrouping: {
                    enabled: false
                }
            }
        }

        //Add graph to the swarm-chart-area div
        Highcharts.stockChart('swarm-chart-area', {
            rangeSelector: {
                enabled: false
            },
            legend: {
                enabled: true,
                labelFormat: "<i>{name}</i>",
                symbolRadius: 0,
                //DKDK VB-8112 disabling cursor change on swarm chart legend
                itemStyle: {
                    cursor: 'default'
                },
            },
            chart: {
                height: "200%"
            },
            navigator: {
                adaptToUpdateData: false,
                series: {
                    data: []
                },
                height: 20
            },
            scrollbar: {
                enabled: false,
                liveRedraw: false
            },
            tooltip: {
                useHTML: true,
                split: false,
                formatter: customTooltipFormatter 
            },
            plotOptions: plotOptions,
            xAxis: {
                //DKDK VB-8096 set ordinal false for highchart.stockchart
                ordinal: ordinal,
                events: {
                    afterSetExtremes: afterSetExtremes
                },
                min: minDate,
                max: maxDate,
                minRange: minRange
            },
            yAxis: yAxis, 
            credits: {
                enabled: false
            },
            series: data
        }, function() {
            var navDates = PopulationBiologyMap.data.navDates;
            if (navDates) {
                var navDates = PopulationBiologyMap.data.navDates;
                var minNavDate = parseInt(navDates[0]);
                var maxNavDate = parseInt(navDates[1]);
                this.xAxis[0].setExtremes(minNavDate, maxNavDate);
                PopulationBiologyMap.data.navDates = undefined;

                if (PopulationBiologyMap.data.resolution != resolution) {
                    resolution = PopulationBiologyMap.data.resolution;
                    $("#" + resolution).click();
                }
            }
        });


    };

    /**
     * Load new data depending on the selected min and max
     */
    function afterSetExtremes(e) {
        var chart = Highcharts.charts[0];
        var startDate = new Date(e.min);
        var endDate = new Date(e.max);
        var numberOfDays = (e.max-e.min) / (1000 * 3600 * 24);
        var oldResolution = resolution;

        //The following code is to fix a small bug where setAfterExtreme gets executed when clicking on a 
        //legend item if setAfterExtreme has not been executed before
        //Update the flag that the afterSetExtreme function has already been accessed
        if (!afterSetExtremesTriggered) {
            afterSetExtremesTriggered = true;

            //Since accessing afterSetExtremes for the first time, check if it was triggered due to a legend
            //and do not execute rest of function if that is the case
            if (externalAction) {
                externalAction = false;
                return;
            }
        }

        //Only enable buttons if the highestResolution in the data is not year
        if (highestResolution !== "year") {
            //Based on how many days are viewing viewed, disable certain resolutions
            if (numberOfDays > 3650 + 730 || highestResolution === "month") {
                //More than 10 years, do not give users option of viewing EpiWeekly and Daily
                $("#EpiWeekly").addClass("disabled");
                $("#Daily").addClass("disabled");
                $("#resolution-selector .disabled").tooltip("enable");

                if (resolution === "Daily" || resolution === "EpiWeekly") {
                    resolution = "Monthly";
                    $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                    $("#Monthly").addClass("btn-primary").removeClass("btn-default");
                };
            } else if (numberOfDays > 1095 + 60) {
                //More than 3 years but less than 10 years, do not allow users to see Daily data
                //Also make sure we are not trying to disable a button that is not available for that dataset
                $("#Daily").addClass("disabled");
                $("#resolution-selector .disabled").tooltip("enable");

                if (resolution === "Daily") {
                    resolution = "EpiWeekly";
                    $("#resolution-selector .btn-primary").removeClass("btn-primary").addClass("btn-default").blur();
                    $("#EpiWeekly").addClass("btn-primary").removeClass("btn-default");
                };
            } else {
                $("#resolution-selector .disabled").tooltip("disable");
                $("#EpiWeekly").removeClass("disabled");
                $("#Daily").removeClass("disabled");
            }
        }

        //Only update the graph if the resolution was changed
        // @todo: Find a better way of knowing when to update HighchartsGraph.dd
        // This check causes a bug that if one decreases the navigator in a lower resolution, 
        // and then switches to a higher resolution, the graph will not retrieve additional data
        if (oldResolution !== resolution || disabledResolutions[resolution]) {
            updateHighchartsGraph(startDate, endDate, resolution);
        }
    }

    //Creaates query for new data, does a request, and updates the graph
    function updateHighchartsGraph(startDate, endDate, resolution) {
        setxAxisDates(resolution);
        startDate  = updateNavigatorStartDate(startDate, resolution);

        //Construct the URL that will be used to get the new data
        var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
        var dateResolutionField = resolutionToSolrField[resolution];

        if (disabledResolutions[resolution]) {
          var startDateString = startDate.toISOString();
          endDate = updateNavigatorEndDate(endDate, resolution)
          var endDateString = endDate.toISOString();
        }
        else {
          var newStartDate = new Date(minDate);
          var newEndDate = new Date(maxDate);
          var startDateString = newStartDate.toISOString();
          var endDateString = newEndDate.toISOString();
        } 

        var baseUrl = solrPopbioUrl + viewMode + dataEndpoint + "?";
        var facetTerm = "&term=" + term + "&date_resolution=" + dateResolutionField;
        var queryUrl = baseUrl + qryUrl + facetTerm + highchartsFilter + "&fq=collection_date:[" + startDateString + " TO " + endDateString +"]";

        if (limitTerms && maxTerms > 14) {
          // TODO: Might not want a hardcoded term limit
          queryUrl = queryUrl + "&termLimit=14";
        }

        var chart = Highcharts.charts[0];

        chart.showLoading("Loading data from server...");
        //Get new data based on the Date range selected with Highcharts' navigator
        $.getJSON(queryUrl, function (json) {
            //Show series in graph in case it was hidden when no data was found
            $(".highcharts-series-group").show();

            if (json.facets.term) {
                setHighchartsData(json);
                setExternalActionFlag();
                var data = highcharts.series;

                //Remove all the old series
                while(chart.series.length > 0)
                    chart.series[0].remove(false);

                //Add each series to the graph
                for (var i = 0; i < data.length; i++) {
                    chart.addSeries(data[i], false);
                }

                chart.redraw();
                chart.hideLoading();
                chart.xAxis[1].update({min: minDate, max: maxDate});
                chart.xAxis[0].update({ordinal: ordinal});
                chart.xAxis[0].setExtremes(startDate.getTime(), endDate.getTime());
            } else {
                chart.showLoading("No data found");

                //Hide the left over series data, might be a better way, but do not have time
                $(".highcharts-series-group").hide();
            }
        });
    }

    //Uses the response from SOLR to construct the data array that will be used by Highcharts
    function setHighchartsData(json) {
        //Reset what is used to set the properties to create the graph
        highcharts.series = [];
        highcharts.yAxis = [];

        //Get species (or protocols etc) collection info from response
        if (json.facets.term) {
            var collectionKey = graphConfig.collectionKey;
            //Use the collection key to that was set to get the data that will be used
            var termCollectionsList = Object.byString(json, collectionKey); 

            //Used to choose what side to place the y-axis
            var opposite = false;
            graphConfig.yAxis.forEach(function (yAxis) {

                //Flag used to tell if there is non-zero data in series for column charts
                var noData = true;
                
                //Go through response to parse data out that will be plotted
                termCollectionsList.forEach(function (termCollections) {
                    //Get the key of the y-axis we are population
                    var yAxisKey = opposite ? " infected" : "";
                    var marker = opposite ? "diamond" : "circle";

                    //Used to hold the formatted data for a single species (or protocol, etc)  chart
                    var markerColor = legend.options.palette[termCollections.val];
                    var chartType = yAxis.chartType;
                    var transparent = yAxis.transparent;
                    
                    if (transparent) {
                        var r = hexToRgb(markerColor).r;
                        var g = hexToRgb(markerColor).g;
                        var b = hexToRgb(markerColor).b;

                        markerColor = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
                    }

                    var singleTermData = {
                        "name": termCollections.val + yAxisKey,
                        "marker": {
                            "symbol": marker
                        },
                        "type": chartType,
                        "color": markerColor,
                        //Use the opposite boolean to decide which yAxis to map the series
                        "yAxis": opposite ? 1 : 0,
                        "data": []
                    };

                    //Will need to standardize in the future since the "collection_info" could be in a different location
                    collectionsInfo = termCollections.collection_dates.buckets;
                    collectionsInfo.forEach(function (collectionsDate) {
                        //Get the key of the y-axis we are population
                        var yAxisKey = opposite ? 1 : 0;
                        var operator = yAxis.operator;
                        var valueKey = yAxis.value;
                        var data = {};

                        //Decide how we will get the actual yValue
                        if (operator) {
                            var x = Object.byString(collectionsDate, valueKey[0]);
                            var y = Object.byString(collectionsDate, valueKey[1]);
                            var yValue = performOperation[operator](x,y).roundDecimals(1);
                        } else {
                            var yValue = Object.byString(collectionsDate, valueKey);
                        }
                        
                        //Could support different values on x-axis so checking the data_type which will not do anything for now
                        if (graphConfig.dataType === "timeplot") {
                            if (resolution === "Yearly") {
                                var unixDate = new Date(collectionsDate.val + '-01-01T00:00:00Z').getTime();
                            } else if (resolution === "Monthly") {
                                var unixDate = new Date(collectionsDate.val + '-01T00:00:00Z').getTime();
                            } else if (resolution === "EpiWeekly") {
                                [epiWeekYear, epiWeek] = collectionsDate.val.split("-");
                                epiWeek = epiWeek.replace("W", "");
                                var epiWeekDate = getDateFromWeek(epiWeek, epiWeekYear);
                                var unixDate = epiWeekDate.getTime();
                            } else {
                                var unixDate = new Date(collectionsDate.val + 'T00:00:00Z').getTime();
                            }

                            //Check what additional data needs to be sent with the series
                            if (yAxis.tooltip && yAxis.tooltip.data) {
                                //Go through each additional tooltip data config to add the additional data for the tooltip
                                yAxis.tooltip.data.forEach(function (dataConfig) {
                                    var dataPoints = Object.byString(collectionsDate, dataConfig.value);

                                    if (dataPoints) {
                                        data[dataConfig.key] = {label: dataConfig.label, value: []};

                                        dataPoints.forEach(function (dataPoint) {
                                            data[dataConfig.key].value.push(dataPoint.val)
                                        });
                                    }
                                });
                            }
                            
                            if (resolution === "EpiWeekly") {
                                data.epiWeek = {label: "Epi Week", value: [epiWeek]};
                            }

                            singleTermData.data.push({x:unixDate, y:yValue, data:data});
                        }
                    });

                    // Prevents overlap of yearly resolution in projects selection in legend
                    if (resolution === "Yearly" && glbSummarizeBy === "Project") {
                        ordinal = true;

                        // Prevents the left and right columns from getting cut off by adding dummy data
                        if (singleTermData.data.length === 1) {
                            termDataDate = singleTermData.data[0].x;

                            if (termDataDate === minDate) {
                                singleTermData.data.push({x:maxDate, y:0});
                                tempDate = new Date(maxDate);
                            }
                        }
                    } else {
                        ordinal = false;
                    }

                    //Add series data
                    highcharts.series.push(singleTermData);
                });

                //Add the y-axis that will be used
                highcharts.yAxis.push({
                    opposite: opposite,
                    allowDecimals: false,
                    reversedStacks: false,
                    min: 0,
                    offset: yAxis.offset,
                    title: {
                        text: yAxis.title
                    },
                    labels: {
                        align: "left",
                        x: 0
                    },
                    visible: true //no_data ? false : true
                });

                //Change opposite to true so the next yAxis will be in the opossite side of graph
                opposite = true;
            });
        }
    }

    //Usec to customize the information showed in the tooltip
    function customTooltipFormatter() {
        var startDate = new Date(this.x);
        var year = startDate.getUTCFullYear();
        var month = startDate.getUTCMonth();
        var day = startDate.getUTCDate();
        var collectionDate;
        var endDate;
        var dataType;
        var quantityLabel = graphConfig.quantityLabel;

        //Right now we are only doing timeplots, but if it changes will need to use graphConfig.dataType to customize how 
        //the tooltip will look with different type of data
        if (resolution === "Yearly") {
            dataType = "Year";
            startDate = Highcharts.dateFormat('%b %d', startDate);
            endDate = Highcharts.dateFormat('%b %d', new Date(year, 11, 31));
            collectionDate = startDate + " to " + endDate;
        } else if (resolution === "Monthly") {
            dataType = "Month";
            startDate = Highcharts.dateFormat('%b %d', startDate);
            month += 1;
            endDate = Highcharts.dateFormat('%b %d',new Date(year, month, 0));
            collectionDate = startDate + " to " + endDate;
        } else if (resolution === "EpiWeekly") {
            dataType = "Epi Week";
            day = startDate.getDate() + 6;
            startDate = Highcharts.dateFormat('%b %d', startDate);
            endDate = Highcharts.dateFormat('%b %d', new Date(year, month, day));
            collectionDate = startDate + " to " + endDate;
        } else {
            dataType = "Day";
            collectionDate = Highcharts.dateFormat('%b %d, %Y',new Date(this.x));
        }

        if (glbSummarizeBy === "Species") {
            var tooltip = '<i><b>' + this.series.name + '</b></i><br/>';
        } else {
            var tooltip =  '<b>' + this.series.name +'</b><br>';
        }

        tooltip += '<b>Date:</b> ' + collectionDate  + '<br>' +
            '<b>' + quantityLabel + ':</b> ' + this.y + '<br>' +
            '<b>Resolution:</b> ' + dataType + '<br>' +
            '<b>Year:</b> ' + year;

        var data = this.point.data;
        for (var key in data) {
            tooltip += '<br>' + '<b>' + data[key].label + ':</b> ' + data[key].value.join(', ');
        }

        return tooltip;
    }

    //Return first Sunday of the Epi-Week
    function getDateFromWeek(w, y) {
        var days;

        //Use the first of January to eventually find Sunaday of first Epi-Week
        var date = new Date(y,0,1);

        //Decide when to start first Epi-Week
        if (date.getDay() <= 3) {
            //Start on Sunday before 1st of month
            date.setDate(date.getDate() - date.getDay());
        } else {
            //Start on Sunday after 1st of the month
            date.setDate(date.getDate() + (7 - date.getDay()));
        }

        //Fron the beginning of the first epiWeek, skip forward number of days 
        days = (w - 1) * 7;
        date.setDate(date.getDate() + days);

        return date;
    }

    //Allows one to use strings representing an object key to access the value of an object
    Object.byString = function(o, s) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        var a = s.split('.');
        for (var i = 0, n = a.length; i < n; ++i) {
            var k = a[i];
            if (k in o) {
                o = o[k];
            } else {
                return;
            }
        }
        return o;
    }

    //In order to set opacity on highcharts, need to set the color in rgb format
    //Function below allows me to retrieve the r, g, b values for hex
    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    //Sets legend_flag flag to prevent afterSetExtremes from re-rendeing 
    //the graph when toggling a legend item
    function setExternalActionFlag() {
        if (!afterSetExtremesTriggered) {
            externalAction = true;
        }
    }

    function setxAxisDates(resolution) {
        // Set the minDate and maxDate based on the resolution being graphed
        if (resolution == "Yearly") {
            minDate = minYearDate;
            maxDate = maxDayDate;
        } else if (resolution == "Monthly") {
            minDate = minMonthDate;
            maxDate = maxDayDate; 
        } else if (resolution == "EpiWeekly") {
            minDate = new Date(minDayDate);
            minDate.setDate(minDate.getUTCDate() - (minDate.getUTCDay() + 1));
            minDate = minDate.getTime();
            maxDate = maxDayDate;
           
        } else {
            minDate = minDayDate;
            maxDate = maxDayDate;
        }
    }

    // Used to ensure the extremes make a bit more sense when changing resolutions in the graph
    function updateNavigatorStartDate(startDate, resolution) {
      var startDateYear = startDate.getUTCFullYear();
      var startDateMonth = startDate.getUTCMonth();
      var startDateDay = startDate.getUTCDate();

      if (resolution == "Yearly") {
          startDate = new Date(Date.UTC(startDateYear, 0, 1));
      } else if (resolution == "Monthly") {
          startDate = new Date(Date.UTC(startDateYear, startDateMonth, 1));
      } else if (resolution == "EpiWeekly") {
          startDate.setDate(startDate.getDate() - startDate.getDay());
      }

      if (startDate.getTime() < minDate) {
        startDate = new Date(minDate);
      }

      return startDate;
    }

    // Allows the data to be retrieved correctly when continously updating what gets graphed for resolutions that were initially disabled
    function updateNavigatorEndDate(endDate, resolution) {
      var endDateYear = endDate.getUTCFullYear();
      var endDateMonth = endDate.getUTCMonth() + 1;
      var endDateDay = endDate.getUTCDate();

      if (resolution == "Yearly") {
          endDate = new Date(Date.UTC(endDateYear, 11, 31));
      } else if (resolution == "Monthly" || resolution == "EpiWeekly") {
          endDate = new Date(Date.UTC(endDateYear, endDateMonth, 0));
      }

      return endDate;
    }

    function pad(number, size) {
      var stringNumber = String(number);
      while (stringNumber.length < size) {
        stringNumber = "0" + stringNumber;
      }

      return stringNumber;
    }

    $(document).ready(function () {
        //Initialize things needed for the graph
        initialize();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
