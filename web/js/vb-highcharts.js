(function (PopulationBiologyMap, $, undefined) {
    //Private variables used for the chart
    var endpoint = "Graphdata";
    var result_limit = 100000;
    var highcharts_filter;
    var resolution;
    var min_date;
    var max_date;

    //Object that maps the resolution value to solr field
    var resolution_to_solr_field = {
        Yearly:"collection_year_s",
        Monthly:"collection_month_s",
        EpiWeekly:"collection_epiweek_s",
        Daily:"collection_day_s"
    }

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    PopulationBiologyMap.data.highcharts = {};
    
    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    PopulationBiologyMap.methods.createAbundanceGraph = function(divid, filter) {
        $('#swarm-plots h3').text('Population Abundance');
        //How the URL will be constructed
        var abundanceUrl = solrPopbioUrl + viewMode + "Projects?";
        var queryUrl = abundanceUrl + qryUrl + filter;

        //Storing filter in object to use later
         highcharts_filter = filter;

        //Will need to find a better way of organizing these ajax calls
        //$('#swarm-chart-area').fadeOut();
        $.ajax({
            type: 'GET',
            url: queryUrl,
            dataType: 'json',
            success: function (json) {
                //Get the min and max dates of the data
                var collection_year_list = json.facets[resolution_to_solr_field.Yearly].buckets;
                var last_year_position = collection_year_list.length - 1;
                min_date = new Date(collection_year_list[0].val + '-01-01T00:00:00Z').getTime();
                max_date = new Date(collection_year_list[last_year_position].val + '-12-31T00:00:00Z').getTime();
                var number_of_days = (max_date-min_date) / (1000 * 3600 * 24);

                //Decide what resolution of data to get
                if (number_of_days > 3650) {
                    //More than 10 years gets yearly data
                    resolution = "Yearly";
                    min_date -= (3600 * 1000 * 24 * 365);
                    max_date += (3600 * 1000 * 24 * 365);
                } else if (number_of_days > 1095) {
                    //More than 3 years but less than 10 years get monthly data
                    resolution = "Monthly";
                    min_date -= (3600 * 1000 * 24 * 30);
                    max_date += (3600 * 1000 * 24 * 30);

                } else if (number_of_days > 365) {
                    //More than 1 year, but less than 3 years gets EpiWeekly
                    //Using monthly for now since EpiWeekly needs a function to take care of correctly
                    resolution = "EpiWeekly";
                    min_date -= (3600 * 1000 * 24 * 7);
                    max_date += (3600 * 1000 * 24 * 7);
                    //min_date -= (3600 * 1000 * 24 * 30);
                    //max_date += (3600 * 1000 * 24 * 30);
                } else {
                    //Less than one year gets daily data
                    resolution = "Daily";
                    min_date -= (3600 * 1000 * 24);
                    max_date += (3600 * 1000 * 24);
                }
        
                PopulationBiologyMap.data.projects_list = json.facets.projects_category.buckets;
                PopulationBiologyMap.data.result_count = json.response.numFound;
            },
            error: function() {
                PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        })
        .then(function () {
            // add GA - VB-4680
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

            //Get graph data for project and build chart                
            //Construct URL used to retrieve data from solr
            var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
            var date_resolution_field = resolution_to_solr_field[resolution]; 
            var abundanceUrl = solrPopbioUrl + viewMode + endpoint + "?";
            //var project = "&project=projects_category:" + project_id;
            // unfortunately 'term' seems to be a misnomer.  'field' would be better!
            //var facet_term = "&term=" + mapSummarizeByToField(glbSummarizeBy).summarize + "&date_resolution;
            var facet_term = "&term=" + term + "&date_resolution=" + date_resolution_field;
            var queryUrl = abundanceUrl + qryUrl + facet_term + filter;

            //Hopefully this will not be needed anymore
            if (PopulationBiologyMap.data.result_count > result_limit) {
                $("#swarm-chart-area").html(
                    '<div style="text-align: center; margin-top: 30px">' +
                    '<i class="fa fa-area-chart" style="color: #C3312D; font-size: 12em"></i>' +
                    '<h4>Too many points to plot</h4>' +
                    '<h4>Apply filters to plot less data</h4>' +
                    '<h4><b>Points</b>: ' + PopulationBiologyMap.data.result_count.toString() + '</h4>' +
                    '<h4><b>Limit</b>: ' + result_limit.toString() + '</h4>' +
                    '</div>'
                );
            } else {
                //This variable does not get populated fast enough so need to get it before creating the grap
                //Seems like I will need to go to the past codebaseh
                projects_list = PopulationBiologyMap.data.projects_list;
                if (projects_list.length > 1) {
                    $("#projects-notice").show();
                    PopulationBiologyMap.data.project_title = undefined;
                } else {
                    $("#projects-notice").hide();
                    PopulationBiologyMap.data.project_title = '';
                    PopulationBiologyMap.data.project_id = projects_list[0].val;
                }
                
                $.ajax({
                    beforeSend: function(xhr) {
                        //Clear chart area and start the spinner
                        PaneSpin('swarm-plots', 'start');
                        $('#swarm-chart-area').empty();
                        $(divid + ' select').remove();
                        $(divid + ' label').remove();

                        //Probably not nessary
                        if (xhr && xhr.overrideMimeType) {
                            xhr.overrideMimeType('application/json;charset-utf-8');
                        }
                    },
                    url: queryUrl,
                    dataType: 'json',
                    success: function(json) {
                        //Get species (or protocols etc) collection info from response
                        //var term_collections_list = json.facets.term.buckets;
                        //var endpoint = PopulationBiologyMap.data.highcharts.endpoint;
                        //PopulationBiologyMap.data.highcharts.data = [];

                        if (PopulationBiologyMap.data.project_title != undefined) {
                            PopulationBiologyMap.data.project_title = json.response.docs[0].project_titles_txt;
                        } else {
                            PopulationBiologyMap.data.project_title = '';
                        }

                        setHighchartsData(json);
                    },
                    error: function() {
                        PaneSpin('swarm-plots', 'stop');
                        console.log("An error has occurred");
                    },
                    complete: function() {
                        //Construct graph with ajax call to Solr servr
                        var data = PopulationBiologyMap.data.highcharts.data;
                        var project_title = PopulationBiologyMap.data.project_title;
                        var project_id = PopulationBiologyMap.data.project_id;
                        var title = "<a href=/popbio/project?id=" + project_id + ">" + project_title + "</a>";
                        PopulationBiologyMap.methods.createStockchart(data, title); 
                        //Add tooltip to the title of the chart
                        $(".highcharts-title").tooltip({placement: "bottom", title:project_title});
                        PaneSpin('swarm-plots', 'stop');
                        //$('#swarm-chart-area').show()
                    }
                });
            }
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.init = function() {
        //Change event should no longer be needed since removing project select
        /*$("#swarm-plots").on("change", "#agSelectProject", function() {
            var project_id = $("#agSelectProject").val();
            createAbundanceGraph(project_id);
        });*/
    }

    PopulationBiologyMap.methods.createStockchart = function(data, title) {
        //$('#swarm-chart-area').highcharts('StockChart',{
        //Delete previous created chart object and add a new one
        if (Highcharts.charts[0] !== undefined ) {
            Highcharts.charts[0].destroy();
            Highcharts.charts.splice(0,1);
        }

        Highcharts.stockChart('swarm-chart-area', {
            rangeSelector: {
                enabled: false
            },
            legend: {
                enabled: true,
                labelFormat: "<i>{name}</i>"
            },
            title: {
                useHTML: true,
                text: title
            },
            chart: {
                type: 'scatter',
                //zoomType: 'xy',
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
                formatter: function () {
                    var start_date = new Date(this.x);
                    var year = start_date.getUTCFullYear();
                    var month = start_date.getUTCMonth();
                    var day = start_date.getUTCDate();
                    var collection_date;
                    var end_date;
                    var data_type;

                    if (resolution === "Yearly") {
                        data_type = "Year";
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        end_date = Highcharts.dateFormat('%b %d', new Date(year, 12, 31));
                        collection_date = start_date + " to " + end_date;
                    } else if (resolution === "Monthly") {
                        data_type = "Month";
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        month += 1;
                        end_date = Highcharts.dateFormat('%b %d',new Date(year, month, 0));
                        collection_date = start_date + " to " + end_date;
                    } else if (resolution === "EpiWeekly") {
                        data_type = "Epi Week";
                        day = start_date.getDate() + 6;
                        start_date = Highcharts.dateFormat('%b %d', start_date);
                        end_date = Highcharts.dateFormat('%b %d', new Date(year, month, day));
                        collection_date = start_date + " to " + end_date;
                    } else {
                        data_type = "Day";
                        collection_date = Highcharts.dateFormat('%b %d, %Y',new Date(this.x));
                    }

                    if (glbSummarizeBy === "Species") {
                        var tooltip = '<i><b>' + this.series.name + '</b></i><br/>';
                    } else { 
                        var tooltip =  '<b>' + this.series.name +'</b><br>';
                    }

                    tooltip += '<b>Date:</b> ' + collection_date  + '<br>' + 
                        '<b>Abundance:</b> ' + this.y + '<br>' + 
                        '<b>Resolution:</b> ' + data_type;

                    if (resolution === "EpiWeekly") {
                        tooltip += '<br>' + '<b>Epi Week:</b> ' + this.point.epi_week;
                    }

                    return tooltip;
                }
            },
            xAxis: {
                events: {
                    afterSetExtremes: afterSetExtremes
                },
                min: min_date,
                max: max_date,
                //Set minimum range to 10 days
                minRange: 3600 * 1000 * 24 * 10
            },
            yAxis: {
                opposite: false,
                title: {
                    text: "Average individuals (per night per trap)"
                },
                labels: {
                    align: "left",
                    x: 0
                }
            },
            credits: {
                enabled: false
            },
            series: data
        });
    };

    /**
     * Load new data depending on the selected min and max
     */
    function afterSetExtremes(e) {
        var chart = Highcharts.charts[0];
        var start_date = new Date(e.min).toISOString();
        var end_date = new Date(e.max).toISOString();
        var number_of_days = (e.max-e.min) / (1000 * 3600 * 24);

        //Decide what resolution of data to get, adding the padding added to dates when getting data for the first time
        if (number_of_days > 3650 + 730) {
            //More than 10 years gets yearly data
            resolution = "Yearly";
        } else if (number_of_days > 1095 + 60) {
            //More than 3 years but less than 10 years get monthly data
            resolution = "Monthly";
        } else if (number_of_days > 365 + 14) {
            //More than 1 year, but less than 3 years gets EpiWeekly
            resolution = "EpiWeekly";
        } else {
            //Less than one year gets daily data
            resolution = "Daily";
        }

        //Construct the URL that will be used to get the new data
        var term  = mapSummarizeByToField(glbSummarizeBy).summarize;
        var date_resolution_field = resolution_to_solr_field[resolution]; 
        var abundanceUrl = solrPopbioUrl + viewMode + endpoint + "?";
        var facet_term = "&term=" + term + "&date_resolution=" + date_resolution_field;
        var queryUrl = abundanceUrl + qryUrl + facet_term + highcharts_filter + "&fq=collection_date:[" + start_date + " TO " + end_date +"]";

        //chart.showLoading('Loading data from server...');
        //Get new data based on the Date range selected with Highcharts' navigator
        $.getJSON(queryUrl, function (json) {
            if (json.facets.term) {
                chart.showLoading('Loading data from server...');
                setHighchartsData(json);
                var data = PopulationBiologyMap.data.highcharts.data;

                //Do not remove the padding data so the navigator does not get messed up
                while(chart.series.length > 0)
                    chart.series[0].remove(false);

                for (var i = 0; i < data.length; i++) {
                    chart.addSeries(data[i], false);
                }

                chart.redraw();
                chart.hideLoading();
            }
        });
    }

    //Uses the response from SOLR to construct the data array that will be used by Highcharts
    function setHighchartsData(json) {
        PopulationBiologyMap.data.highcharts.data = [];

        //Get species (or protocols etc) collection info from response
        if (json.facets.term) {
            var term_collections_list = json.facets.term.buckets;

            term_collections_list.forEach(function (term_collections) {
                //Used to hold the formatted data for a single species (or protocol, etc)  chart
                var marker_color = legend.options.palette[term_collections.val];
                var single_term_data = {
                    "name": term_collections.val, 
                    "marker": {
                    "symbol": "circle"
                },
                    "color": marker_color,
                    "data": []
                };

                collections_info = term_collections.collection_dates.buckets;
                collections_info.forEach(function (collections_date) {
                    var average_abundance = (collections_date.sum_abundance/collections_date.num_collections).roundDecimals(1);

                    if (resolution === "Yearly") {
                        var unix_date = new Date(collections_date.val + '-01-01T00:00:00Z').getTime();
                    } else if (resolution === "Monthly") {
                        var unix_date = new Date(collections_date.val + '-01T00:00:00Z').getTime();
                    } else if (resolution === "EpiWeekly") {
                        [epi_week_year, epi_week] = collections_date.val.split("-");
                        epi_week = epi_week.replace("W", "");
                        var epi_week_date = getDateFromWeek(epi_week, epi_week_year);
                        var unix_date = epi_week_date.getTime();
                    } else {
                        var unix_date = new Date(collections_date.val + 'T00:00:00Z').getTime();
                    }

                    if (resolution === "EpiWeekly") {
                        single_term_data.data.push({x:unix_date, y:average_abundance, epi_week:epi_week});
                    } else {
                        single_term_data.data.push([unix_date, average_abundance]);
                    }
                });            
                PopulationBiologyMap.data.highcharts.data.push(single_term_data);
            });
        }
    }

    //Return first Sunday of the epi week
    function getDateFromWeek(w, y)
    {
        var _days;
        if(w == 53){
            _days = (1 + (w - 1) * 7);
        } else {
            _days = (w * 7); 
        }
        
        var _date = new Date(y,0,_days);
        _date.setDate(_date.getDate() - _date.getDay());
        
        return _date;
}

    $(document).ready(function () {
        PopulationBiologyMap.init();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
